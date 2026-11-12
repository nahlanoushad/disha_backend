import College from '../models/College.js';

// Helper to format/normalize location payload
const formatLocationPayload = (body) => {
    const payload = { ...body };

    let address = '';
    let latitude = null;
    let longitude = null;

    if (typeof body.location === 'object' && body.location !== null) {
        address = body.location.address || '';
        latitude = body.location.latitude !== undefined && body.location.latitude !== '' ? Number(body.location.latitude) : null;
        longitude = body.location.longitude !== undefined && body.location.longitude !== '' ? Number(body.location.longitude) : null;
    } else if (typeof body.location === 'string') {
        address = body.location;
    }

    if (body.latitude !== undefined && body.latitude !== '' && body.latitude !== null) {
        latitude = Number(body.latitude);
    }
    if (body.longitude !== undefined && body.longitude !== '' && body.longitude !== null) {
        longitude = Number(body.longitude);
    }

    if (body.address) {
        address = body.address;
    }

    payload.location = {
        address,
        latitude,
        longitude
    };

    delete payload.latitude;
    delete payload.longitude;
    delete payload.address;

    return payload;
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
const getColleges = async (req, res) => {
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

        // Search across college name, address, courses, city, district
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
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
        if (state && state.trim() && state.toLowerCase() !== 'all') {
            const stateRegex = new RegExp(state.trim(), 'i');
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { state: stateRegex },
                    { 'location.address': stateRegex }
                ]
            });
        }

        // District filter
        if (district && district.trim() && district.toLowerCase() !== 'all') {
            const distRegex = new RegExp(district.trim(), 'i');
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
        if (type && type.trim() && type.toLowerCase() !== 'all') {
            filter.type = new RegExp(`^${type.trim()}$`, 'i');
        }

        // Course filter
        if (course && course.trim() && course.toLowerCase() !== 'all') {
            const courseRegex = new RegExp(course.trim(), 'i');
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { coursesOffered: courseRegex }
                ]
            });
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
        res.status(500).json({
            message: error.message
        });
    }
};

// Get one college by ID
const getCollegeById = async (req, res) => {
    try {
        const college = await College.findById(req.params.id)
            .populate('courses', 'name duration eligibility feeStructure');

        if (!college) {
            return res.status(404).json({
                message: 'College not found'
            });
        }

        res.status(200).json(college);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// Create a new college
const createCollege = async (req, res) => {
    try {
        const formattedData = formatLocationPayload(req.body);
        const college = await College.create(formattedData);

        res.status(201).json(college);
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// Update a college
const updateCollege = async (req, res) => {
    try {
        const formattedData = formatLocationPayload(req.body);
        const college = await College.findByIdAndUpdate(
            req.params.id,
            formattedData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!college) {
            return res.status(404).json({
                message: 'College not found'
            });
        }

        res.status(200).json(college);
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// Delete a college
const deleteCollege = async (req, res) => {
    try {
        const college = await College.findByIdAndDelete(req.params.id);

        if (!college) {
            return res.status(404).json({
                message: 'College not found'
            });
        }

        res.status(200).json({
            message: 'College deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

export {
    getColleges,
    getCollegeById,
    createCollege,
    updateCollege,
    deleteCollege
};
