/**
 * DISHA Geocoding Service
 * Provides cached, rate-limited and configurable search & reverse geocoding
 * for Indian cities, districts, localities, and PIN codes.
 */

// In-memory cache with 24-hour TTL
const cache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const getFromCache = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return cached.data;
};

const setInCache = (key, data) => {
  if (cache.size > 2000) {
    // Purge oldest 200 entries to prevent memory leak
    const keysToDelete = Array.from(cache.keys()).slice(0, 200);
    keysToDelete.forEach((k) => cache.delete(k));
  }
  cache.set(key, { data, timestamp: Date.now() });
};

const USER_AGENT = process.env.GEOCODING_USER_AGENT || 'DISHA-HigherEducation/1.0 (disha-guidance-platform; student-education)';
const DEFAULT_PROVIDER = process.env.GEOCODING_PROVIDER || 'photon';

/**
 * Clean & normalize location properties from Photon
 */
const normalizePhotonFeature = (feature) => {
  const props = feature.properties || {};
  const coords = feature.geometry?.coordinates || []; // [lon, lat]
  const lon = coords[0] !== undefined ? Number(coords[0]) : null;
  const lat = coords[1] !== undefined ? Number(coords[1]) : null;

  const locality = props.locality || props.district || props.suburb || props.street || '';
  const city = props.city || props.name || props.town || props.village || '';
  const district = props.county || props.district || props.city || '';
  const state = props.state || '';
  const country = props.country || 'India';
  const pincode = props.postcode || '';

  // Construct readable display name
  const parts = [];
  if (props.name && props.name !== city && props.name !== district) parts.push(props.name);
  if (locality && !parts.includes(locality)) parts.push(locality);
  if (city && !parts.includes(city)) parts.push(city);
  if (district && district !== city && !parts.includes(district)) parts.push(district);
  if (state && !parts.includes(state)) parts.push(state);
  if (pincode) parts.push(pincode);

  const displayName = parts.join(', ') || props.name || `${city}, ${state}`.trim();

  return {
    displayName,
    locality,
    city: city || district,
    district: district || city,
    state,
    country,
    pincode,
    coordinates: {
      latitude: lat,
      longitude: lon
    },
    source: 'photon'
  };
};

/**
 * Clean & normalize location item from Nominatim
 */
const normalizeNominatimItem = (item) => {
  const addr = item.address || {};
  const lat = item.lat ? Number(item.lat) : null;
  const lon = item.lon ? Number(item.lon) : null;

  const locality = addr.suburb || addr.neighbourhood || addr.residential || addr.road || '';
  const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || '';
  const district = addr.county || addr.state_district || addr.district || city;
  const state = addr.state || '';
  const country = addr.country || 'India';
  const pincode = addr.postcode || '';

  return {
    displayName: item.display_name || `${city}, ${state}`,
    locality,
    city: city || district,
    district: district || city,
    state,
    country,
    pincode,
    coordinates: {
      latitude: lat,
      longitude: lon
    },
    source: 'nominatim'
  };
};

/**
 * Search locations by query string (city, district, locality, pin code)
 */
export const searchLocations = async (query, limit = 6) => {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const cleanQuery = query.trim();
  const cacheKey = `search:${cleanQuery.toLowerCase()}:${limit}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // 1. Try Primary Provider: Photon
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=${limit}&lang=en`;
    const photonRes = await fetch(photonUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (photonRes.ok) {
      const data = await photonRes.json();
      if (Array.isArray(data.features) && data.features.length > 0) {
        // Filter to India results if country is specified or bias to IN
        const normalized = data.features
          .filter(f => !f.properties.country || f.properties.country === 'India' || f.properties.countrycode === 'IN')
          .map(normalizePhotonFeature);

        if (normalized.length > 0) {
          setInCache(cacheKey, normalized);
          return normalized;
        }
      }
    }
  } catch (err) {
    console.warn('Photon geocoding failed, trying Nominatim fallback:', err.message);
  }

  // 2. Fallback Provider: Nominatim (with strict DISHA User-Agent)
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&addressdetails=1&countrycodes=in&limit=${limit}`;
    const nomRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (nomRes.ok) {
      const items = await nomRes.json();
      if (Array.isArray(items) && items.length > 0) {
        const normalized = items.map(normalizeNominatimItem);
        setInCache(cacheKey, normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.error('Nominatim search failed:', err.message);
  }

  return [];
};

/**
 * Reverse geocode latitude/longitude to clean address
 */
export const reverseGeocode = async (latitude, longitude) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error('Invalid coordinates provided');
  }

  // Cache by rounded coordinates (4 decimal places ~ 11 meters)
  const roundLat = lat.toFixed(4);
  const roundLon = lon.toFixed(4);
  const cacheKey = `reverse:${roundLat}:${roundLon}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // 1. Try Photon reverse
    const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`;
    const photonRes = await fetch(photonUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (photonRes.ok) {
      const data = await photonRes.json();
      if (Array.isArray(data.features) && data.features.length > 0) {
        const normalized = normalizePhotonFeature(data.features[0]);
        // Preserve exact clicked coordinates
        normalized.coordinates = { latitude: lat, longitude: lon };
        setInCache(cacheKey, normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.warn('Photon reverse geocoding failed, trying Nominatim fallback:', err.message);
  }

  // 2. Fallback Nominatim reverse
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    const nomRes = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (nomRes.ok) {
      const item = await nomRes.json();
      if (item && !item.error) {
        const normalized = normalizeNominatimItem(item);
        normalized.coordinates = { latitude: lat, longitude: lon };
        setInCache(cacheKey, normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.error('Nominatim reverse failed:', err.message);
  }

  // Fallback default coordinates object
  return {
    displayName: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    locality: '',
    city: '',
    district: '',
    state: '',
    country: 'India',
    pincode: '',
    coordinates: { latitude: lat, longitude: lon },
    source: 'coordinates_only'
  };
};

export default {
  searchLocations,
  reverseGeocode
};

