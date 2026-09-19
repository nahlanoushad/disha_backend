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

// Get all colleges
const getColleges = async (req, res) => {
    try {
        const colleges = await College.find();
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
        const college = await College.findById(req.params.id);

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
