import mongoose from 'mongoose';

const collegeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            address: {
                type: String,
                required: true,
                trim: true
            },
            latitude: {
                type: Number,
                default: null
            },
            longitude: {
                type: Number,
                default: null
            }
        },

        type: {
            type: String,
            required: true,
            trim: true
        },

        naacGrade: {
            type: String,
            trim: true
        },

        ranking: {
            type: String,
            trim: true
        },

        // Extended fields for Higher Education Guidance (backward compatible)
        state: {
            type: String,
            trim: true,
            default: ''
        },

        district: {
            type: String,
            trim: true,
            default: ''
        },

        city: {
            type: String,
            trim: true,
            default: ''
        },

        description: {
            type: String,
            trim: true,
            default: ''
        },

        courses: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Course'
            }
        ],

        coursesOffered: [
            {
                type: String,
                trim: true
            }
        ],

        feeRange: {
            type: String,
            trim: true,
            default: ''
        },

        eligibility: {
            type: String,
            trim: true,
            default: ''
        },

        admissionProcess: {
            type: String,
            trim: true,
            default: ''
        },

        facilities: [
            {
                type: String,
                trim: true
            }
        ],

        website: {
            type: String,
            trim: true,
            default: ''
        },

        contactEmail: {
            type: String,
            trim: true,
            default: ''
        },

        contactPhone: {
            type: String,
            trim: true,
            default: ''
        },

        affiliation: {
            type: String,
            trim: true,
            default: ''
        },

        establishedYear: {
            type: Number,
            default: null
        },

        verificationStatus: {
            type: String,
            enum: ['Verified', 'Pending Verification', 'Unverified'],
            default: 'Verified'
        }
    },
    {
        timestamps: true
    }
);

const College = mongoose.model('College', collegeSchema);

export default College;
