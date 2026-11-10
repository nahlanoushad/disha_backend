import Course from '../models/Course.js';
import Category from '../models/Category.js';

const DISHA_COURSES = [
  {
    name: 'BCA',
    categoryName: 'Computer Science & IT',
    description: 'Bachelor of Computer Applications',
    eligibility: '10+2',
    duration: '3 Years',
    entranceExams: ['CUET', 'State CET'],
    careerOpportunities: ['Software Developer', 'System Analyst'],
    status: 'active'
  },
  {
    name: 'B.Tech Computer Science and Engineering',
    categoryName: 'Engineering',
    description: 'Bachelor of Technology in Computer Science and Engineering',
    eligibility: '10+2 with PCM',
    duration: '4 Years',
    entranceExams: ['JEE Main', 'JEE Advanced', 'State Engineering CET'],
    careerOpportunities: ['Software Engineer', 'Data Scientist'],
    status: 'active'
  },
  {
    name: 'B.Sc Computer Science',
    categoryName: 'Computer Science & IT',
    description: 'Bachelor of Science in Computer Science',
    eligibility: '10+2 with Science',
    duration: '3 Years',
    entranceExams: ['CUET'],
    careerOpportunities: ['Programmer', 'IT Consultant'],
    status: 'active'
  },
  {
    name: 'B.Pharm',
    categoryName: 'Pharmacy',
    description: 'Bachelor of Pharmacy',
    eligibility: '10+2 with PCB/PCM',
    duration: '4 Years',
    entranceExams: ['NEET', 'State CET'],
    careerOpportunities: ['Pharmacist', 'Drug Inspector'],
    status: 'active'
  },
  {
    name: 'BBA',
    categoryName: 'Commerce & Management',
    description: 'Bachelor of Business Administration',
    eligibility: '10+2',
    duration: '3 Years',
    entranceExams: ['CUET', 'IPMAT'],
    careerOpportunities: ['Business Analyst', 'HR Manager'],
    status: 'active'
  }
];

/**
 * Automatically seeds the database with some example DISHA courses if they don't exist.
 * Safe to run repeatedly (idempotent).
 */
export const seedCourses = async () => {
  try {
    let createdCount = 0;
    let existingCount = 0;

    for (const courseData of DISHA_COURSES) {
      // Find the corresponding category
      const category = await Category.findOne({
        name: { $regex: new RegExp(`^${courseData.categoryName}$`, 'i') }
      });

      if (!category) {
        console.warn(`[Seed] Warning: Category "${courseData.categoryName}" not found. Skipping course "${courseData.name}".`);
        continue;
      }

      // Check case-insensitively if the course exists
      const existing = await Course.findOne({
        name: { $regex: new RegExp(`^${courseData.name}$`, 'i') }
      });

      if (!existing) {
        const { categoryName, ...rest } = courseData;
        await Course.create({ ...rest, category: category._id });
        createdCount++;
      } else {
        existingCount++;
      }
    }

    if (createdCount > 0) {
      console.log(`[Seed] Added ${createdCount} new courses. ${existingCount} existing courses verified.`);
    } else {
      console.log(`[Seed] Courses seed verified. All ${existingCount} core courses exist.`);
    }
  } catch (error) {
    console.error(`[Seed] Error seeding courses: ${error.message}`);
  }
};

export default seedCourses;

// If this file is run directly (e.g. node src/utils/seedCourses.js), connect to DB and run seed
if (process.argv[1] && process.argv[1].endsWith('seedCourses.js')) {
  import('dotenv/config').then(() => {
    import('../config/db.js').then((db) => {
      db.default().then(async () => {
        await seedCourses();
        process.exit(0);
      });
    });
  });
}
