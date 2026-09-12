import Admin from '../models/Admin.js';

/**
 * Automatically seeds or updates the initial administrator account with configured email and password.
 */
export const seedAdmin = async () => {
  try {
    const email = (process.env.ADMIN_EMAIL || 'admin@disha.edu').toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD || 'admin@1234#';
    const username = process.env.ADMIN_USERNAME || 'admin';
    const name = 'System Administrator';

    // 1. Check if an admin with the target email already exists
    let admin = await Admin.findOne({ email });

    if (!admin) {
      // 2. Check if a legacy admin document exists (e.g., has username but missing email)
      const existingByUsername = await Admin.findOne({ username });
      if (existingByUsername) {
        existingByUsername.email = email;
        existingByUsername.password = password; // triggers pre('save') bcrypt hashing
        await existingByUsername.save();
        console.log(`[Seed] Existing admin record updated with email: ${email}`);
        return;
      }

      // 3. Otherwise create a brand new admin account
      await Admin.create({
        name,
        username,
        email,
        password,
        role: 'superadmin',
        isActive: true
      });

      console.log(`[Seed] Initial admin account created successfully: ${email}`);
    } else {
      console.log(`[Seed] Admin account verified: ${email}`);
    }
  } catch (error) {
    console.error(`[Seed] Error seeding admin account: ${error.message}`);
  }
};

export default seedAdmin;
