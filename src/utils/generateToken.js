import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token for an admin
 * @param {Object} payload - { id, email, role }
 * @returns {string} Signed JWT token
 */
export const generateToken = ({ id, email, role }) => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET || 'disha_default_jwt_secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
  );
};

export default generateToken;
