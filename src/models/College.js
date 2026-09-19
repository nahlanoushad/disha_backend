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
        }
    },
    {
        timestamps: true
    }
);

const College = mongoose.model('College', collegeSchema);

export default College;
