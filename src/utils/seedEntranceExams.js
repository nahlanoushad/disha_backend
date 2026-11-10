import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EntranceExam from '../models/EntranceExam.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

const seedEntranceExams = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to MongoDB for seeding...');

    const exams = [
      {
        name: 'NEET',
        conductingAuthority: 'National Testing Agency (NTA)',
        eligibilityCriteria: '10+2 with Physics, Chemistry, Biology/Biotechnology and English as core subjects.',
        applicationProcess: 'Online application through the official NTA website.',
        registrationStartDate: new Date('2026-02-09'),
        registrationEndDate: new Date('2026-03-09'),
        examDate: new Date('2026-05-05'),
        admitCardRelease: new Date('2026-04-25'),
        counsellingSchedule: 'July 2026 - September 2026 (Multiple Rounds)',
        officialWebsite: 'https://neet.nta.nic.in/',
        importantInstructions: 'Candidates must carry a printed copy of the admit card along with a valid ID proof.',
        status: 'active'
      },
      {
        name: 'JEE Main',
        conductingAuthority: 'National Testing Agency (NTA)',
        eligibilityCriteria: '10+2 with Physics, Mathematics, and one of Chemistry/Biotechnology/Biology/Technical Vocational subject.',
        applicationProcess: 'Online submission through the official NTA website.',
        registrationStartDate: new Date('2025-11-01'),
        registrationEndDate: new Date('2025-11-30'),
        examDate: new Date('2026-01-24'),
        admitCardRelease: new Date('2026-01-20'),
        counsellingSchedule: 'June 2026 - August 2026 (JoSAA)',
        officialWebsite: 'https://jeemain.nta.nic.in/',
        importantInstructions: 'Calculators and electronic devices are strictly prohibited.',
        status: 'active'
      },
      {
        name: 'KEAM',
        conductingAuthority: 'Commissioner for Entrance Examinations (CEE), Kerala',
        eligibilityCriteria: 'Higher Secondary Examination or equivalent with 50% marks in Mathematics separately, and 50% marks in Mathematics, Physics and Chemistry put together.',
        applicationProcess: 'Online through CEE Kerala website.',
        registrationStartDate: new Date('2026-03-01'),
        registrationEndDate: new Date('2026-04-10'),
        examDate: new Date('2026-05-17'),
        admitCardRelease: new Date('2026-05-01'),
        counsellingSchedule: 'July 2026 - August 2026',
        officialWebsite: 'https://cee.kerala.gov.in/',
        importantInstructions: 'Aadhaar card is mandatory for registration.',
        status: 'active'
      },
      {
        name: 'CUET',
        conductingAuthority: 'National Testing Agency (NTA)',
        eligibilityCriteria: 'Passed Class 12 or appearing in the current year.',
        applicationProcess: 'Apply online via the CUET Samarth portal.',
        registrationStartDate: new Date('2026-02-10'),
        registrationEndDate: new Date('2026-03-12'),
        examDate: new Date('2026-05-21'),
        admitCardRelease: new Date('2026-05-10'),
        counsellingSchedule: 'Post result declaration, individual universities will release their schedules.',
        officialWebsite: 'https://cuet.samarth.ac.in/',
        importantInstructions: 'Candidates can choose the languages/subjects as per the university requirements.',
        status: 'active'
      },
      {
        name: 'CLAT',
        conductingAuthority: 'Consortium of National Law Universities',
        eligibilityCriteria: '10+2 or equivalent examination with a minimum of 45% marks (40% for SC/ST).',
        applicationProcess: 'Online application through the Consortium website.',
        registrationStartDate: new Date('2025-08-08'),
        registrationEndDate: new Date('2025-11-03'),
        examDate: new Date('2025-12-03'),
        admitCardRelease: new Date('2025-11-20'),
        counsellingSchedule: 'December 2025 - January 2026',
        officialWebsite: 'https://consortiumofnlus.ac.in/',
        importantInstructions: 'Exam is conducted in offline mode (pen-and-paper).',
        status: 'active'
      }
    ];

    console.log(`Preparing to seed ${exams.length} entrance exams...`);
    let addedCount = 0;
    let skippedCount = 0;

    // We use a loop instead of insertMany to handle existing records gracefully (idempotency)
    for (const examData of exams) {
      const existingExam = await EntranceExam.findOne({ name: examData.name });
      
      if (!existingExam) {
        await EntranceExam.create(examData);
        addedCount++;
        console.log(`+ Added: ${examData.name}`);
      } else {
        skippedCount++;
        console.log(`- Skipped: ${examData.name} (Already exists)`);
      }
    }

    console.log('\n=============================================');
    console.log('Seeding completed successfully!');
    console.log(`Total Added: ${addedCount}`);
    console.log(`Total Skipped: ${skippedCount}`);
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error.message);
    process.exit(1);
  }
};

seedEntranceExams();
