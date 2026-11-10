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

// Get all colleges with optional search, filters, and pagination
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
            format
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
            filter.$or = filter.$or || [];
            // Match state field or address substring
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

        // Sorting
        let sortOption = { createdAt: -1 };
        if (sort === 'name_asc') sortOption = { name: 1 };
        if (sort === 'name_desc') sortOption = { name: -1 };
        if (sort === 'ranking') sortOption = { ranking: 1, name: 1 };

        // Pagination if requested
        const hasPagination = page !== undefined || limit !== undefined || format === 'envelope';
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const totalItems = await College.countDocuments(filter);

        let queryBuilder = College.find(filter)
            .sort(sortOption)
            .populate('courses', 'name duration eligibility feeStructure');

        if (hasPagination) {
            queryBuilder = queryBuilder.skip(skip).limit(limitNum);
        }

        const colleges = await queryBuilder;

        if (hasPagination) {
            return res.status(200).json({
                status: 'success',
                results: colleges.length,
                totalItems,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(totalItems / limitNum) || 1,
                    totalItems
                },
                data: {
                    colleges
                }
            });
        }

        // Backward-compatible default: return JSON array directly
        res.status(200).json(colleges);
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
