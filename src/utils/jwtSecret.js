// Values that are public (example file, old built-in default) and must never sign tokens.
const PUBLIC_VALUES = ['your_super_secret_jwt_key_here', 'disha_default_jwt_secret'];

/**
 * Returns the JWT signing secret. Throws instead of falling back to a default,
 * because anyone who knows the secret can create admin tokens.
 */
export const getJwtSecret = () => {
  const secret = (process.env.JWT_SECRET || '').trim();

  if (!secret || PUBLIC_VALUES.includes(secret)) {
    throw new Error('JWT_SECRET is missing or still a placeholder. Set a long random value in your .env file.');
  }

  return secret;
};
