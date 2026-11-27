import mongoose from 'mongoose';
import College from '../models/College.js';
import AppError from '../utils/appError.js';
import { parseCollegePayload } from '../utils/collegePayload.js';

// User input must be escaped before it is used inside a regular expression
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Query values can arrive as arrays/objects (?search[]=x); only accept plain text
const queryText = (value) => (typeof value === 'string' ? value.trim() : '');

const assertValidId = (id) => {
    if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid college ID format', 400);
};

// Coordinates are only usable as a pair
const assertCoordinatePair = (location) => {
    const hasLatitude = location?.latitude !== null && location?.latitude !== undefined;
    const hasLongitude = location?.longitude !== null && location?.longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
        throw new AppError('Provide both latitude and longitude, or neither', 400);
    }
};

// Same name in the same district is treated as the same college
const assertNotDuplicate = async ({ name, district }, excludeId) => {
    const filter = {
        name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
        district: new RegExp(`^${escapeRegex(district || '')}$`, 'i')
    };
    if (excludeId) filter._id = { $ne: excludeId };
    if (await College.exists(filter)) {
        throw new AppError(`College "${name}" already exists in this district`, 409);
    }
};

// Turn schema errors into 400s; everything else goes to the central error handler
const handleError = (error, next) => {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
        return next(new AppError(error.message, 400));
    }
    return next(error);
};

// Helper: Haversine distance in kilometers
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
        lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
        return null;
    }
    const nLat1 = Number(lat1);
    const nLon1 = Number(lon1);
    const nLat2 = Number(lat2);
    const nLon2 = Number(lon2);
    if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return null;

    const R = 6371; // Earth's radius in km
    const dLat = (nLat2 - nLat1) * (Math.PI / 180);
    const dLon = (nLon2 - nLon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(nLat1 * (Math.PI / 180)) *
        Math.cos(nLat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
};

// Helper: Determine proximity tier (nearby, district, state, national)
const determineProximityTier = (distanceKm, college, refCity = '', refDistrict = '', refState = '') => {
    if (distanceKm !== null) {
        if (distanceKm <= 50) return 'nearby';
        if (distanceKm <= 120) return 'district';
        if (distanceKm <= 450) return 'state';
        return 'national';
    }

    const norm = (s) => (s || '').toLowerCase().trim();
    const cCity = norm(college.city);
    const cDist = norm(college.district);
    const cState = norm(college.state);
    const rCity = norm(refCity);
    const rDist = norm(refDistrict);
    const rState = norm(refState);

    if (rCity && (cCity.includes(rCity) || rCity.includes(cCity))) return 'nearby';
    if (rDist && (cDist.includes(rDist) || rDist.includes(cDist))) return 'district';
    if (rState && (cState.includes(rState) || rState.includes(cState))) return 'state';

    return 'national';
};

// Get all colleges with optional search, filters, pagination, and location-aware proximity
const getColleges = async (req, res, next) => {
    try {
        const {
            search,
            state,
            district,
            type,
            course,
            sort,
            page,
            limit,
            format,
            lat,
            lng,
            studentCity,
            studentDistrict,
            studentState,
            maxDistance
        } = req.query;

        const filter = {};
        const searchText = queryText(search);
        const stateText = queryText(state);
        const districtText = queryText(district);
        const typeText = queryText(type);
        const courseText = queryText(course);

        // Search across college name, address, courses, city, district
        if (searchText) {
            const searchRegex = new RegExp(escapeRegex(searchText), 'i');
            filter.$or = [
                { name: searchRegex },
                { 'location.address': searchRegex },
                { state: searchRegex },
                { district: searchRegex },
                { city: searchRegex },
                { coursesOffered: searchRegex },
                { affiliation: searchRegex }
            ];
        }

        // State filter
        if (stateText && stateText.toLowerCase() !== 'all') {
            const stateRegex = new RegExp(escapeRegex(stateText), 'i');
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { state: stateRegex },
                    { 'location.address': stateRegex }
                ]
            });
        }

        // District filter
        if (districtText && districtText.toLowerCase() !== 'all') {
            const distRegex = new RegExp(escapeRegex(districtText), 'i');
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { district: distRegex },
                    { city: distRegex },
                    { 'location.address': distRegex }
                ]
            });
        }

        // Type filter (Government, Private, Aided, Autonomous, etc.)
        if (typeText && typeText.toLowerCase() !== 'all') {
            filter.type = new RegExp(`^${escapeRegex(typeText)}$`, 'i');
        }

        // Course filter
        if (courseText && courseText.toLowerCase() !== 'all') {
            filter.$and = filter.$and || [];
            filter.$and.push({ coursesOffered: new RegExp(escapeRegex(courseText), 'i') });
        }

        // Determine if reference coordinates exist
        const hasRefCoords = lat !== undefined && lat !== null && lat !== '' &&
            lng !== undefined && lng !== null && lng !== '' &&
            !isNaN(Number(lat)) && !isNaN(Number(lng));

        const refLat = hasRefCoords ? Number(lat) : null;
        const refLng = hasRefCoords ? Number(lng) : null;

        // Fetch colleges
        let queryBuilder = College.find(filter)
            .populate('courses', 'name duration eligibility feeStructure');

        // Initial database sorting
        let sortOption = { createdAt: -1 };
        if (sort === 'name_asc') sortOption = { name: 1 };
        if (sort === 'name_desc') sortOption = { name: -1 };
        if (sort === 'ranking') sortOption = { ranking: 1, name: 1 };

        const allMatchingColleges = await queryBuilder.sort(sortOption);

        // Attach computed distanceKm and proximityTier
        let augmented = allMatchingColleges.map((col) => {
            const doc = col.toObject ? col.toObject() : { ...col };
            const cLat = doc.location?.latitude;
            const cLng = doc.location?.longitude;

            const distanceKm = hasRefCoords
                ? calculateDistanceKm(refLat, refLng, cLat, cLng)
                : null;

            const proximityTier = determineProximityTier(
                distanceKm,
                doc,
                studentCity,
                studentDistrict,
                studentState
            );

            return {
                ...doc,
                distanceKm,
                proximityTier
            };
        });

        // Filter by maxDistance if requested
        if (maxDistance && maxDistance !== 'all' && !isNaN(Number(maxDistance))) {
            const maxD = Number(maxDistance);
            augmented = augmented.filter((c) => {
                if (c.distanceKm !== null) return c.distanceKm <= maxD;
                // If coordinate is absent, allow if district/city matches
                return c.proximityTier === 'nearby' || c.proximityTier === 'district';
            });
        }

        // Proximity sorting when sort === 'distance' or default with coordinates
        if (sort === 'distance' || (hasRefCoords && (!sort || sort === 'default' || sort === 'proximity'))) {
            const tierOrder = { nearby: 1, district: 2, state: 3, national: 4 };
            augmented.sort((a, b) => {
                // If both have distanceKm, sort by exact distance
                if (a.distanceKm !== null && b.distanceKm !== null) {
                    return a.distanceKm - b.distanceKm;
                }
                // If one has distanceKm and other does not, rank by tier
                const tierA = tierOrder[a.proximityTier] || 4;
                const tierB = tierOrder[b.proximityTier] || 4;
                if (tierA !== tierB) return tierA - tierB;
                if (a.distanceKm !== null) return -1;
                if (b.distanceKm !== null) return 1;
                return (a.name || '').localeCompare(b.name || '');
            });
        }

        const totalItems = augmented.length;

        // Pagination if requested
        const hasPagination = page !== undefined || limit !== undefined || format === 'envelope';
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const paginatedColleges = hasPagination
            ? augmented.slice(skip, skip + limitNum)
            : augmented;

        if (hasPagination) {
            return res.status(200).json({
                status: 'success',
                results: paginatedColleges.length,
                totalItems,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(totalItems / limitNum) || 1,
                    totalItems
                },
                data: {
                    colleges: paginatedColleges
                }
            });
        }

        // Backward-compatible default
        res.status(200).json(paginatedColleges);
    } catch (error) {
        handleError(error, next);
    }
};

// Get one college by ID
const getCollegeById = async (req, res, next) => {
    try {
        assertValidId(req.params.id);
        const college = await College.findById(req.params.id)
            .populate('courses', 'name duration eligibility feeStructure');

        if (!college) throw new AppError('College not found', 404);

        res.status(200).json(college);
    } catch (error) {
        handleError(error, next);
    }
};

// Create a new college
const createCollege = async (req, res, next) => {
    try {
        const { data, location } = parseCollegePayload(req.body);
        assertCoordinatePair(location);
        await assertNotDuplicate(data);

        const college = await College.create({ ...data, location });

        res.status(201).json(college);
    } catch (error) {
        handleError(error, next);
    }
};

// Update a college (only the fields that were sent)
const updateCollege = async (req, res, next) => {
    try {
        assertValidId(req.params.id);
        const { data, location } = parseCollegePayload(req.body, { partial: true });

        const college = await College.findById(req.params.id);
        if (!college) throw new AppError('College not found', 404);

        college.set(data);
        for (const [key, value] of Object.entries(location)) {
            college.set(`location.${key}`, value);
        }
        assertCoordinatePair(college.location);
        if (data.name !== undefined || data.district !== undefined) {
            await assertNotDuplicate(college, college._id);
        }

        await college.save();

        res.status(200).json(college);
    } catch (error) {
        handleError(error, next);
    }
};

// Delete a college
const deleteCollege = async (req, res, next) => {
    try {
        assertValidId(req.params.id);
        const college = await College.findByIdAndDelete(req.params.id);

        if (!college) throw new AppError('College not found', 404);

        res.status(200).json({
            message: 'College deleted successfully'
        });
    } catch (error) {
        handleError(error, next);
    }
};

export {
    getColleges,
    getCollegeById,
    createCollege,
    updateCollege,
    deleteCollege
};
