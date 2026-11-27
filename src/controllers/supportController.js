import SupportRequest from '../models/SupportRequest.js';

/**
 * @desc    Student submits a support request
 * @route   POST /api/support
 * @access  Private/Student (protectStudent)
 */
export const createSupportRequest = async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                status: 'fail',
                message: 'Title is required.'
            });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({
                status: 'fail',
                message: 'Description is required.'
            });
        }

        // Student identity is taken from the JWT — never from the request body
        const supportRequest = await SupportRequest.create({
            title: title.trim(),
            description: description.trim(),
            student: req.student._id
        });

        res.status(201).json({
            status: 'success',
            message: 'Support request submitted successfully.',
            data: {
                supportRequest
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to submit support request.'
        });
    }
};

/**
 * @desc    Admin retrieves all support requests (with student details)
 * @route   GET /api/support
 * @access  Private/Admin (protect)
 */
export const getSupportRequests = async (req, res) => {
    try {
        const { status, search, page, limit } = req.query;

        const filter = {};

        // Filter by status
        if (status && status !== 'all') {
            filter.status = status;
        }

        // Build the base query
        let query = SupportRequest.find(filter)
            .populate('student', 'name email phone')
            .sort({ createdAt: -1 });

        // Pagination
        const pageNum  = Math.max(1, parseInt(page,  10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const skip     = (pageNum - 1) * limitNum;

        const totalItems = await SupportRequest.countDocuments(filter);

        const requests = await query.skip(skip).limit(limitNum);

        // Post-fetch search filter across student name and title
        let results = requests;
        if (search && search.trim()) {
            const q = search.trim().toLowerCase();
            results = requests.filter((r) => {
                const studentName  = (r.student?.name  || '').toLowerCase();
                const studentEmail = (r.student?.email || '').toLowerCase();
                const title        = (r.title          || '').toLowerCase();
                return (
                    studentName.includes(q)  ||
                    studentEmail.includes(q) ||
                    title.includes(q)
                );
            });
        }

        res.status(200).json({
            status: 'success',
            results: results.length,
            totalItems,
            pagination: {
                page:       pageNum,
                limit:      limitNum,
                totalPages: Math.ceil(totalItems / limitNum) || 1
            },
            data: {
                supportRequests: results
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to retrieve support requests.'
        });
    }
};

/**
 * @desc    Admin updates the status of a support request
 * @route   PATCH /api/support/:id/status
 * @access  Private/Admin (protect)
 */
export const updateSupportRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowed = ['Pending', 'In Review', 'Resolved'];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                status: 'fail',
                message: `Invalid status. Must be one of: ${allowed.join(', ')}.`
            });
        }

        const supportRequest = await SupportRequest.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        ).populate('student', 'name email phone');

        if (!supportRequest) {
            return res.status(404).json({
                status: 'fail',
                message: 'Support request not found.'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Status updated.',
            data: { supportRequest }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message || 'Failed to update status.'
        });
    }
};

