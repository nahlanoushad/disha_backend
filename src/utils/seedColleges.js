import mongoose from 'mongoose';
import dotenv from 'dotenv';
import College from '../models/College.js';
import connectDB from '../config/db.js';

dotenv.config();

const VERIFIED_COLLEGES = [
  {
    name: 'College of Engineering Trivandrum (CET)',
    type: 'Government',
    naacGrade: 'A+',
    ranking: '#1 State Engineering',
    state: 'Kerala',
    district: 'Thiruvananthapuram',
    city: 'Thiruvananthapuram',
    location: {
      address: 'Engineering College P.O, Sreekaryam, Thiruvananthapuram, Kerala 695016',
      latitude: 8.5456,
      longitude: 76.9056
    },
    description: 'Premier engineering institution established in 1939. Known for exceptional faculty, research centers, and top-tier placements.',
    coursesOffered: ['B.Tech Computer Science and Engineering', 'B.Tech Electrical & Electronics', 'B.Tech Mechanical', 'B.Tech Civil', 'BCA', 'MCA'],
    feeRange: '₹8,500 - ₹35,000 / year (Govt. subsidized)',
    eligibility: '10+2 with Physics, Chemistry & Math. Valid KEAM rank required.',
    admissionProcess: 'Centralized Allotment Process (CAP) conducted by CEE Kerala via KEAM.',
    facilities: ['Central Computing Facility', 'High-Speed Wi-Fi', 'Hostels (Boys & Girls)', 'FabLab', 'Library & Innovation Center'],
    website: 'https://www.cet.ac.in',
    contactEmail: 'principal@cet.ac.in',
    contactPhone: '+91 471 2515502',
    affiliation: 'APJ Abdul Kalam Technological University',
    establishedYear: 1939,
    verificationStatus: 'Verified'
  },
  {
    name: 'National Institute of Technology Calicut (NIT Calicut)',
    type: 'Institute of National Importance',
    naacGrade: 'A++',
    ranking: '#23 NIRF Engineering',
    state: 'Kerala',
    district: 'Kozhikode',
    city: 'Kathamangalam / Chathamangalam',
    location: {
      address: 'NIT Campus P.O, Chathamangalam, Kozhikode, Kerala 673601',
      latitude: 11.3216,
      longitude: 75.9336
    },
    description: 'Autonomous institute under Ministry of Education, Government of India. One of India’s foremost technical universities.',
    coursesOffered: ['B.Tech Computer Science and Engineering', 'B.Tech Electronics & Communication', 'B.Tech Biotechnology', 'B.Arch', 'B.Sc Computer Science'],
    feeRange: '₹62,500 - ₹1,25,000 / semester',
    eligibility: '10+2 with PCM (minimum 75% marks) + qualified JEE Main.',
    admissionProcess: 'Joint Seat Allocation Authority (JoSAA) / CSAB counselling based on JEE Main CRL.',
    facilities: ['Supercomputing Lab', 'Mega Sports Complex', 'Incubation Center (TBI)', 'Digital Central Library', 'Residential Campus'],
    website: 'https://www.nitc.ac.in',
    contactEmail: 'director@nitc.ac.in',
    contactPhone: '+91 495 2286100',
    affiliation: 'Ministry of Education, Govt. of India',
    establishedYear: 1961,
    verificationStatus: 'Verified'
  },
  {
    name: 'Government Medical College (GMC Kozhikode)',
    type: 'Government',
    naacGrade: 'A+',
    ranking: '#2 State Medical',
    state: 'Kerala',
    district: 'Kozhikode',
    city: 'Kozhikode',
    location: {
      address: 'Medical College Junction, Kozhikode, Kerala 673008',
      latitude: 11.2721,
      longitude: 75.8369
    },
    description: 'Established in 1957, one of the largest and most prestigious medical colleges in South India with a 3000-bed hospital network.',
    coursesOffered: ['MBBS', 'B.Sc Nursing', 'B.Pharm', 'B.Sc Medical Laboratory Technology'],
    feeRange: '₹22,000 / year (Govt. fees)',
    eligibility: '10+2 with Physics, Chemistry, Biology and English. Valid NEET-UG rank required.',
    admissionProcess: 'CEE Kerala Medical Allotment & MCC All India Quota based on NEET UG.',
    facilities: ['Advanced Clinical Labs', 'Multi-Specialty Teaching Hospital', 'Blood Bank', 'Hostels', 'Medical Research Library'],
    website: 'https://govtmedicalcollegekozhikode.ac.in',
    contactEmail: 'principal@gmc.ac.in',
    contactPhone: '+91 495 2350216',
    affiliation: 'Kerala University of Health Sciences (KUHS)',
    establishedYear: 1957,
    verificationStatus: 'Verified'
  },
  {
    name: 'Govt. Model Engineering College (MEC)',
    type: 'Govt. Controlled Self-Financing',
    naacGrade: 'A',
    ranking: '#4 State Engineering',
    state: 'Kerala',
    district: 'Ernakulam',
    city: 'Kochi',
    location: {
      address: 'Thrikkakara, Kochi, Kerala 682021',
      latitude: 10.0284,
      longitude: 76.3289
    },
    description: 'Renowned for exceptional campus placements in software and electronics sectors with an active developer community.',
    coursesOffered: ['B.Tech Computer Science and Engineering', 'B.Tech Electronics & Communication', 'B.Tech Biomedical Engineering', 'B.Tech Mechanical'],
    feeRange: '₹40,000 - ₹65,000 / year',
    eligibility: '10+2 with PCM (50% minimum) + KEAM rank.',
    admissionProcess: 'CEE Kerala KEAM merit counseling.',
    facilities: ['Hardware & Robotics Lab', 'Software Development Cell', 'Library', 'Auditorium', 'Startup Incubator'],
    website: 'https://www.mec.ac.in',
    contactEmail: 'principal@mec.ac.in',
    contactPhone: '+91 484 2575370',
    affiliation: 'APJ Abdul Kalam Technological University (IHRD)',
    establishedYear: 1989,
    verificationStatus: 'Verified'
  },
  {
    name: 'St. Teresa\'s College (Autonomous)',
    type: 'Aided / Autonomous',
    naacGrade: 'A++',
    ranking: '#41 NIRF All India',
    state: 'Kerala',
    district: 'Ernakulam',
    city: 'Kochi',
    location: {
      address: 'Park Avenue, Marine Drive, Ernakulam, Kerala 682011',
      latitude: 9.9723,
      longitude: 76.2813
    },
    description: 'Leading autonomous women\'s higher education institution with Grade A++ NAAC accreditation, offering wide arts, science, and commerce degrees.',
    coursesOffered: ['BCA', 'B.Sc Computer Science', 'B.Com', 'BBA', 'B.A. English Literature', 'B.Sc Psychology'],
    feeRange: '₹5,000 - ₹25,000 / semester',
    eligibility: '10+2 from recognized board in corresponding stream with minimum 50% marks.',
    admissionProcess: 'Autonomous Online Merit Application via college portal.',
    facilities: ['Language Lab', 'Design Studio', 'Auditorium', 'Hostel', 'Sports Complex', 'Career Placement Cell'],
    website: 'https://teresas.ac.in',
    contactEmail: 'principal@teresas.ac.in',
    contactPhone: '+91 484 2351870',
    affiliation: 'Mahatma Gandhi University, Kottayam',
    establishedYear: 1925,
    verificationStatus: 'Verified'
  },
  {
    name: 'Cochin University of Science and Technology (CUSAT)',
    type: 'State University',
    naacGrade: 'A+',
    ranking: '#34 NIRF University',
    state: 'Kerala',
    district: 'Ernakulam',
    city: 'Kalamassery, Kochi',
    location: {
      address: 'South Kalamassery, Kalamassery, Kochi, Kerala 682022',
      latitude: 10.0435,
      longitude: 76.3245
    },
    description: 'Renowned autonomous government-owned science & technology university known for marine engineering, computer sciences and legal studies.',
    coursesOffered: ['B.Tech Computer Science and Engineering', 'B.Tech Information Technology', 'B.Tech Safety & Fire Engineering', 'BCA', 'B.Sc Computer Science'],
    feeRange: '₹45,000 - ₹85,000 / year',
    eligibility: '10+2 with minimum 50% in PCM. Must qualify CUSAT Common Admission Test (CAT).',
    admissionProcess: 'CUSAT CAT entrance examination and centralized online counselling.',
    facilities: ['International Relations Office', 'Sophisticated Analytical Instrumentation Facility', 'Hostels', 'Sports Arena'],
    website: 'https://www.cusat.ac.in',
    contactEmail: 'admissions@cusat.ac.in',
    contactPhone: '+91 484 2577159',
    affiliation: 'State University (UGC / AICTE)',
    establishedYear: 1971,
    verificationStatus: 'Verified'
  }
];

export const seedColleges = async () => {
  try {
    for (const data of VERIFIED_COLLEGES) {
      // Find by name case-insensitively
      const existing = await College.findOne({
        name: { $regex: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') }
      });

      if (existing) {
        // Update extended fields
        existing.state = data.state;
        existing.district = data.district;
        existing.city = data.city;
        existing.description = data.description;
        existing.coursesOffered = data.coursesOffered;
        existing.feeRange = data.feeRange;
        existing.eligibility = data.eligibility;
        existing.admissionProcess = data.admissionProcess;
        existing.facilities = data.facilities;
        existing.website = data.website;
        existing.contactEmail = data.contactEmail;
        existing.contactPhone = data.contactPhone;
        existing.affiliation = data.affiliation;
        existing.establishedYear = data.establishedYear;
        existing.verificationStatus = data.verificationStatus;
        if (typeof existing.location === 'string') {
          existing.location = data.location;
        }
        await existing.save();
      } else {
        await College.create(data);
      }
    }
    console.log(`Seeded / updated verified colleges successfully.`);
  } catch (error) {
    console.error('Error seeding colleges:', error.message);
  }
};

// Allow standalone CLI execution
if (process.argv[1]?.endsWith('seedColleges.js')) {
  (async () => {
    await connectDB();
    await seedColleges();
    process.exit(0);
  })();
}

export default seedColleges;

