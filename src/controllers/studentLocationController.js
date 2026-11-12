import Student from '../models/Student.js';
import geocodingService from '../services/geocodingService.js';

/**
 * @desc    Get current student's saved preferred location
 * @route   GET /api/student/location
 * @access  Private (Student)
 */
export const getStudentLocation = async (req, res, next) => {
  try {
    const student = await Student.findById(req.student._id);
    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student account not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        location: student.location || {
          displayName: '',
          locality: '',
          city: '',
          district: '',
          state: '',
          country: 'India',
          pincode: '',
          coordinates: { latitude: null, longitude: null },
          source: ''
        },
        locationSetupCompleted: Boolean(student.locationSetupCompleted),
        locationUpdatedAt: student.locationUpdatedAt || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update / confirm student's saved preferred location
 * @route   PUT /api/student/location
 * @access  Private (Student)
 */
export const updateStudentLocation = async (req, res, next) => {
  try {
    const student = await Student.findById(req.student._id);
    if (!student) {
      return res.status(404).json({
        status: 'fail',
        message: 'Student account not found'
      });
    }

    const {
      displayName,
      locality,
      city,
      district,
      state,
      country,
      pincode,
      coordinates,
      source
    } = req.body;

    // Validate coordinates if provided
    let latitude = null;
    let longitude = null;
    if (coordinates && typeof coordinates === 'object') {
      if (coordinates.latitude !== undefined && coordinates.latitude !== null && coordinates.latitude !== '') {
        const parsedLat = Number(coordinates.latitude);
        if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
          return res.status(400).json({
            status: 'fail',
            message: 'Latitude must be a valid number between -90 and 90'
          });
        }
        latitude = parsedLat;
      }

      if (coordinates.longitude !== undefined && coordinates.longitude !== null && coordinates.longitude !== '') {
        const parsedLng = Number(coordinates.longitude);
        if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
          return res.status(400).json({
            status: 'fail',
            message: 'Longitude must be a valid number between -180 and 180'
          });
        }
        longitude = parsedLng;
      }
    }

    // Determine clean strings
    const cleanCity = city !== undefined ? String(city).trim() : (student.location?.city || '');
    const cleanDistrict = district !== undefined ? String(district).trim() : (student.location?.district || '');
    const cleanState = state !== undefined ? String(state).trim() : (student.location?.state || '');
    const cleanCountry = country !== undefined ? String(country).trim() : (student.location?.country || 'India');
    const cleanLocality = locality !== undefined ? String(locality).trim() : (student.location?.locality || '');
    const cleanPincode = pincode !== undefined ? String(pincode).trim() : (student.location?.pincode || '');

    let cleanDisplayName = displayName !== undefined ? String(displayName).trim() : '';
    if (!cleanDisplayName) {
      const parts = [cleanLocality, cleanCity, cleanDistrict, cleanState].filter(Boolean);
      cleanDisplayName = parts.join(', ') || 'Preferred Location';
    }

    const cleanSource = source && ['manual', 'search', 'map', 'geolocation'].includes(source)
      ? source
      : (student.location?.source || 'manual');

    // Update student location object
    student.location = {
      displayName: cleanDisplayName,
      locality: cleanLocality,
      city: cleanCity,
      district: cleanDistrict,
      state: cleanState,
      country: cleanCountry,
      pincode: cleanPincode,
      coordinates: {
        latitude: latitude ?? (student.location?.coordinates?.latitude ?? null),
        longitude: longitude ?? (student.location?.coordinates?.longitude ?? null)
      },
      source: cleanSource
    };

    // Mark location setup completed and update timestamp
    student.locationSetupCompleted = true;
    student.locationUpdatedAt = new Date();

    await student.save();

    res.status(200).json({
      status: 'success',
      message: 'Preferred location confirmed and saved successfully',
      data: {
        location: student.location,
        locationSetupCompleted: true,
        locationUpdatedAt: student.locationUpdatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search Indian locations (cached, throttled backend proxy)
 * @route   GET /api/student/location/search
 * @access  Private (Student)
 */
export const searchLocation = async (req, res, next) => {
  try {
    const query = req.query.q || req.query.query || '';
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit, 10) || 6));

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: {
          locations: []
        }
      });
    }

    const locations = await geocodingService.searchLocations(query, limit);

    res.status(200).json({
      status: 'success',
      results: locations.length,
      data: {
        locations
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reverse geocode coordinates to location object (cached backend proxy)
 * @route   GET /api/student/location/reverse
 * @access  Private (Student)
 */
export const reverseGeocode = async (req, res, next) => {
  try {
    const lat = req.query.lat;
    const lng = req.query.lng || req.query.lon;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        status: 'fail',
        message: 'Both latitude (lat) and longitude (lng) query parameters are required'
      });
    }

    const location = await geocodingService.reverseGeocode(lat, lng);

    res.status(200).json({
      status: 'success',
      data: {
        location
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getStudentLocation,
  updateStudentLocation,
  searchLocation,
  reverseGeocode
};

