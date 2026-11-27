import jwt from 'jsonwebtoken';
import { getJwtSecret } from './jwtSecret.js';

/**
 * Generate a JWT token for an admin
 * @param {Object} payload - { id, email, role }
 * @returns {string} Signed JWT token
 */
export const generateToken = ({ id, email, role }) => {
  return jwt.sign(
    { id, email, role },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    }
  );
};

export default generateToken;
