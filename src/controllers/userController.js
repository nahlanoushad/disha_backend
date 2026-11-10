import User from '../models/User.js';

/**
 * @desc    Update user location
 * @route   PUT /api/users/location
 * @access  Private (Protected by JWT)
 */
export const updateLocation = async (req, res, next) => {
    try {
        const { latitude, longitude } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide both latitude and longitude'
            });
        }

        // Validate coordinates
        if (
            typeof latitude !== 'number' || typeof longitude !== 'number' ||
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180
        ) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid coordinates provided'
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            });
        }

        // Update location
        user.location = {
            type: 'Point',
            coordinates: [longitude, latitude]
        };

        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'Location updated successfully',
            data: {
                location: user.location
            }
        });
    } catch (error) {
        next(error);
    }
};
