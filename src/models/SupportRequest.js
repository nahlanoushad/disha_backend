import mongoose from 'mongoose';

const supportRequestSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true
        },

        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true
        },

        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: [true, 'Student reference is required']
        },

        status: {
            type: String,
            enum: ['Pending', 'In Review', 'Resolved'],
            default: 'Pending'
        }
    },
    {
        timestamps: true // createdAt and updatedAt auto-managed
    }
);

const SupportRequest = mongoose.model('SupportRequest', supportRequestSchema);

export default SupportRequest;

