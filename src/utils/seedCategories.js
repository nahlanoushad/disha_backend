import Category from '../models/Category.js';

const DISHA_CATEGORIES = [
  'Engineering',
  'Medical & Allied Health Sciences',
  'Computer Science & IT',
  'Commerce & Management',
  'Arts & Humanities',
  'Agriculture',
  'Nursing',
  'Pharmacy',
  'Law',
  'Architecture',
  'Design',
  'Aviation',
  'Hotel Management',
  'Journalism',
  'Fisheries',
  'Veterinary Science',
  'Teacher Education',
  'Paramedical Courses',
  'Other Professional Courses'
];

/**
 * Automatically seeds the database with the core 19 DISHA categories if they don't exist.
 * Safe to run repeatedly (idempotent).
 */
export const seedCategories = async () => {
  try {
    let createdCount = 0;
    let existingCount = 0;

    for (const categoryName of DISHA_CATEGORIES) {
      // Check case-insensitively if the category exists
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${categoryName}$`, 'i') }
      });

      if (!existing) {
        await Category.create({ name: categoryName, status: 'active' });
        createdCount++;
      } else {
        existingCount++;
      }
    }

    if (createdCount > 0) {
      console.log(`[Seed] Added ${createdCount} new categories. ${existingCount} existing categories verified.`);
    } else {
      console.log(`[Seed] Categories seed verified. All ${existingCount} core categories exist.`);
    }
  } catch (error) {
    console.error(`[Seed] Error seeding categories: ${error.message}`);
  }
};

export default seedCategories;

// If this file is run directly (e.g. node src/utils/seedCategories.js), connect to DB and run seed
if (process.argv[1] && process.argv[1].endsWith('seedCategories.js')) {
  import('dotenv/config').then(() => {
    import('../config/db.js').then((db) => {
      db.default().then(async () => {
        await seedCategories();
        process.exit(0);
      });
    });
  });
}
