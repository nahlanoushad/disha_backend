import mongoose from 'mongoose';
import AppError from './appError.js';

const TEXT_FIELDS = [
    'name', 'type', 'naacGrade', 'ranking', 'state', 'district', 'city', 'description',
    'feeRange', 'eligibility', 'admissionProcess', 'website', 'contactEmail',
    'contactPhone', 'affiliation'
];
const LIST_FIELDS = ['coursesOffered', 'facilities'];
const VERIFICATION_STATUSES = ['Verified', 'Pending Verification', 'Unverified'];

const fail = (message) => {
    throw new AppError(message, 400);
};

const toText = (value, field) => {
    if (value === null) return '';
    if (typeof value !== 'string' && typeof value !== 'number') fail(`${field} must be text`);
    return String(value).trim();
};

// Accepts an array, or a string with one item per line
const toList = (value, field) => {
    if (value === null || value === '') return [];
    const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split('\n') : null;
    if (!items) fail(`${field} must be a list`);
    return [...new Set(items.map((item) => toText(item, field)).filter(Boolean))];
};

const toCoordinate = (value, field, limit) => {
    if (value === null || (typeof value === 'string' && !value.trim())) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || Math.abs(number) > limit) {
        fail(`${field} must be a number between -${limit} and ${limit}`);
    }
    return number;
};

// Location may arrive as an object, an address string, or top-level fields
const parseLocation = (body) => {
    const source = typeof body.location === 'string'
        ? { address: body.location }
        : { ...(body.location || {}) };

    for (const key of ['address', 'latitude', 'longitude']) {
        if (body[key] !== undefined) source[key] = body[key];
    }

    const location = {};
    if (source.address !== undefined) location.address = toText(source.address, 'Address');
    if (source.latitude !== undefined) location.latitude = toCoordinate(source.latitude, 'Latitude', 90);
    if (source.longitude !== undefined) location.longitude = toCoordinate(source.longitude, 'Longitude', 180);
    return location;
};

/**
 * Validates a college request body and returns only known fields.
 * With partial: true (updates), fields that were not sent are left out.
 * @returns {{ data: Object, location: Object }}
 */
export const parseCollegePayload = (body = {}, { partial = false } = {}) => {
    const data = {};

    for (const field of TEXT_FIELDS) {
        if (body[field] !== undefined) data[field] = toText(body[field], field);
    }
    for (const field of LIST_FIELDS) {
        if (body[field] !== undefined) data[field] = toList(body[field], field);
    }

    const location = parseLocation(body);

    // Required fields: must be present on create, and can never be blanked
    if ((!partial || data.name !== undefined) && !data.name) fail('College name is required');
    if ((!partial || data.type !== undefined) && !data.type) fail('College type is required');
    if ((!partial || location.address !== undefined) && !location.address) fail('Address is required');

    // Students click this link, so only web addresses are allowed
    if (data.website && !/^https?:\/\/[^\s]+$/i.test(data.website)) {
        fail('Website must start with http:// or https://');
    }
    if (data.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
        fail('Contact email is not valid');
    }

    if (body.establishedYear !== undefined) {
        if (body.establishedYear === null || body.establishedYear === '') {
            data.establishedYear = null;
        } else {
            const year = Number(body.establishedYear);
            const currentYear = new Date().getFullYear();
            if (!Number.isInteger(year) || year < 1500 || year > currentYear) {
                fail(`Established year must be between 1500 and ${currentYear}`);
            }
            data.establishedYear = year;
        }
    }

    if (body.verificationStatus !== undefined) {
        if (!VERIFICATION_STATUSES.includes(body.verificationStatus)) {
            fail(`Verification status must be one of: ${VERIFICATION_STATUSES.join(', ')}`);
        }
        data.verificationStatus = body.verificationStatus;
    }

    if (body.courses !== undefined) {
        if (!Array.isArray(body.courses) || !body.courses.every((id) => mongoose.isValidObjectId(id))) {
            fail('courses must be a list of course IDs');
        }
        data.courses = body.courses;
    }

    return { data, location };
};
