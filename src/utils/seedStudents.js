import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import connectDB from '../config/db.js';

dotenv.config();

const seedStudents = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB for seeding students...');

    const students = [
      {
        name: 'Aarav Nair',
        email: 'aarav@example.com',
        phone: '9876543210',
        password: 'password123',
        isActive: true
      },
      {
        name: 'Fathima Rafeeq',
        email: 'fathima@example.com',
        phone: '9876543211',
        password: 'password123',
        isActive: true
      },
      {
        name: 'Rohan Kurien',
        email: 'rohan@example.com',
        phone: '9876543212',
        password: 'password123',
        isActive: false
      },
      {
        name: 'Ananya Menon',
        email: 'ananya@example.com',
        phone: '9876543213',
        password: 'password123',
        isActive: true
      },
      {
        name: 'Devadath S.',
        email: 'devadath@example.com',
        phone: '9876543214',
        password: 'password123',
        isActive: true
      }
    ];

    console.log(`Preparing to seed ${students.length} students...`);
    let addedCount = 0;
    let skippedCount = 0;

    for (const studentData of students) {
      const existingStudent = await Student.findOne({ email: studentData.email });
      
      if (!existingStudent) {
        await Student.create(studentData);
        addedCount++;
        console.log(`+ Added: ${studentData.name} (${studentData.email})`);
      } else {
        skippedCount++;
        console.log(`- Skipped: ${studentData.email} (Already exists)`);
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

seedStudents();
