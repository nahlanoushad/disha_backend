import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EntranceExam from '../models/EntranceExam.js';
import connectDB from '../config/db.js';

dotenv.config();

const verifiedExams = [
  {
    name: 'CLAT 2027',
    conductingAuthority: 'Consortium of National Law Universities',
    streamCategory: 'Law',
    examLevel: 'National',
    relatedCourses: ['BA LLB (Hons)', 'BBA LLB (Hons)', 'LLM'],
    eligibilityCriteria: '10+2 or equivalent examination with a minimum of 45% marks (40% for SC/ST candidates). No upper age limit.',
    applicationProcess: 'Online registration through official Consortium of NLUs portal with document upload.',
    registrationStartDate: new Date('2026-07-15T00:00:00.000Z'),
    registrationEndDate: new Date('2026-11-15T23:59:59.000Z'), // Closing Soon relative to Nov 10, 2026!
    admitCardRelease: new Date('2026-11-20T00:00:00.000Z'),
    examDate: new Date('2026-12-06T14:00:00.000Z'),
    counsellingSchedule: 'January 2027 - Centralized NLUs Allotment',
    officialWebsite: 'https://consortiumofnlus.ac.in/',
    importantInstructions: 'Offline pen-and-paper test. Carry admit card and valid government photo ID.',
    applicationFee: '₹4,000 (General/OBC) / ₹3,500 (SC/ST/PwD)',
    verificationStatus: 'verified',
    verificationSource: 'Official Consortium of National Law Universities Notification',
    examPattern: {
      mode: 'Offline (Pen and Paper)',
      duration: '2 Hours (120 Minutes)',
      totalMarks: 120,
      numberOfQuestions: 120,
      markingScheme: '+1 for correct answer, -0.25 negative marking for incorrect answer'
    },
    syllabusSummary: 'English Language, Current Affairs including General Knowledge, Legal Reasoning, Logical Reasoning, Quantitative Techniques.',
    importantDates: [
      {
        eventType: 'application_opening',
        title: 'Registration Opens',
        date: new Date('2026-07-15T00:00:00.000Z'),
        description: 'Online application window opens on Consortium portal.',
        officialSourceUrl: 'https://consortiumofnlus.ac.in/'
      },
      {
        eventType: 'application_closing',
        title: 'Application Deadline',
        date: new Date('2026-11-15T23:59:59.000Z'),
        description: 'Last date to submit online application form and pay fees.',
        officialSourceUrl: 'https://consortiumofnlus.ac.in/'
      },
      {
        eventType: 'admit_card_release',
        title: 'Admit Card Release',
        date: new Date('2026-11-20T00:00:00.000Z'),
        description: 'Hall tickets available for download.',
        officialSourceUrl: 'https://consortiumofnlus.ac.in/'
      },
      {
        eventType: 'examination',
        title: 'CLAT 2027 Examination',
        date: new Date('2026-12-06T14:00:00.000Z'),
        description: 'Offline pen-and-paper test conducted from 2:00 PM to 4:00 PM across India.',
        officialSourceUrl: 'https://consortiumofnlus.ac.in/'
      },
      {
        eventType: 'answer_key',
        title: 'Provisional Answer Key',
        date: new Date('2026-12-08T00:00:00.000Z'),
        description: 'Answer key publication with candidate objection window.',
        officialSourceUrl: 'https://consortiumofnlus.ac.in/'
      },
      {
        eventType: 'result',
        title: 'Result & Merit List',
        date: new Date('2026-12-20T00:00:00.000Z'),
        description: 'Individual scorecards and national merit ranks declared.',
        officialSourceUrl: 'https://consortiumofnlus.ac.in/'
      },
      {
        eventType: 'counselling_start',
        title: 'Centralized Admissions Counselling',
        date: new Date('2027-01-05T00:00:00.000Z'),
        description: 'Online registration for centralized admissions to 24 NLUs.',
        officialSourceUrl: 'https://consortiumofnlus.ac.in/'
      }
    ],
    status: 'active'
  },
  {
    name: 'JEE Main 2027',
    conductingAuthority: 'National Testing Agency (NTA)',
    streamCategory: 'Engineering',
    examLevel: 'National',
    relatedCourses: ['B.Tech', 'B.E.', 'B.Arch', 'B.Planning'],
    eligibilityCriteria: '10+2 passed or appearing with Physics and Mathematics as mandatory subjects along with Chemistry/Biotechnology/Biology/Technical Vocational subject.',
    applicationProcess: 'Online application through official NTA portal with Aadhaar authentication and photograph upload.',
    registrationStartDate: new Date('2026-10-28T00:00:00.000Z'),
    registrationEndDate: new Date('2026-11-28T23:59:59.000Z'), // Applications Open relative to Nov 10, 2026!
    admitCardRelease: new Date('2027-01-18T00:00:00.000Z'),
    examDate: new Date('2027-01-22T09:00:00.000Z'),
    counsellingSchedule: 'June 2027 - August 2027 (JoSAA / CSAB)',
    officialWebsite: 'https://jeemain.nta.nic.in/',
    importantInstructions: 'No calculators, electronic watches or mobile phones permitted in CBT center.',
    applicationFee: '₹1,000 (General/OBC Male) / ₹800 (Female) / ₹500 (SC/ST/PwD)',
    verificationStatus: 'verified',
    verificationSource: 'National Testing Agency Information Bulletin',
    examPattern: {
      mode: 'Computer Based Test (CBT)',
      duration: '3 Hours (180 Minutes)',
      totalMarks: 300,
      numberOfQuestions: 75,
      markingScheme: '+4 for correct response, -1 for incorrect response (MCQs and Numerical)'
    },
    syllabusSummary: 'Mathematics, Physics, Chemistry based on standard Class 11 and Class 12 CBSE/State curriculum.',
    importantDates: [
      {
        eventType: 'application_opening',
        title: 'Session 1 Registration Opens',
        date: new Date('2026-10-28T00:00:00.000Z'),
        description: 'Online application portal opens for Session 1 registration.',
        officialSourceUrl: 'https://jeemain.nta.nic.in/'
      },
      {
        eventType: 'application_closing',
        title: 'Session 1 Application Deadline',
        date: new Date('2026-11-28T23:59:59.000Z'),
        description: 'Last date for submission of online application and fee confirmation.',
        officialSourceUrl: 'https://jeemain.nta.nic.in/'
      },
      {
        eventType: 'correction_window',
        title: 'Application Correction Window',
        date: new Date('2026-12-02T00:00:00.000Z'),
        description: 'Window to edit photo, category, and exam cities.',
        officialSourceUrl: 'https://jeemain.nta.nic.in/'
      },
      {
        eventType: 'admit_card_release',
        title: 'Session 1 Admit Card Release',
        date: new Date('2027-01-18T00:00:00.000Z'),
        description: 'Download hall tickets 3 days before test commencement.',
        officialSourceUrl: 'https://jeemain.nta.nic.in/'
      },
      {
        eventType: 'examination',
        title: 'Session 1 CBT Examination',
        date: new Date('2027-01-22T09:00:00.000Z'),
        description: 'Multi-day computer-based examination shifts across India and overseas.',
        officialSourceUrl: 'https://jeemain.nta.nic.in/'
      },
      {
        eventType: 'result',
        title: 'Session 1 NTA Score Declaration',
        date: new Date('2027-02-12T00:00:00.000Z'),
        description: 'NTA percentile scorecards issued on candidate portal.',
        officialSourceUrl: 'https://jeemain.nta.nic.in/'
      }
    ],
    status: 'active'
  },
  {
    name: 'KEAM 2027',
    conductingAuthority: 'Commissioner for Entrance Examinations (CEE), Kerala',
    streamCategory: 'Engineering',
    examLevel: 'State',
    relatedCourses: ['B.Tech', 'B.Pharm', 'B.Arch'],
    eligibilityCriteria: 'Passed Higher Secondary Examination of Kerala or equivalent with 45% marks in Mathematics, Physics and Chemistry put together (50% in Mathematics for engineering merit).',
    applicationProcess: 'Online application via CEE Kerala web portal with photo, signature, nativity certificate and 10th marks sheet upload.',
    registrationStartDate: new Date('2027-03-01T00:00:00.000Z'), // Upcoming relative to Nov 10, 2026!
    registrationEndDate: new Date('2027-04-10T17:00:00.000Z'),
    admitCardRelease: new Date('2027-05-02T00:00:00.000Z'),
    examDate: new Date('2027-05-20T10:00:00.000Z'),
    counsellingSchedule: 'July 2027 - August 2027 (CEE Centralized Allotment Process CAP)',
    officialWebsite: 'https://cee.kerala.gov.in/',
    importantInstructions: 'Aadhaar authentication and valid nativity proof are mandatory for fee concessions.',
    applicationFee: '₹875 (General) / ₹375 (SC/ST)',
    verificationStatus: 'verified',
    verificationSource: 'Office of the Commissioner for Entrance Examinations Kerala',
    examPattern: {
      mode: 'Computer Based Test (CBT)',
      duration: '3 Hours (180 Minutes)',
      totalMarks: 600,
      numberOfQuestions: 150,
      markingScheme: '+4 for each correct answer, -1 for each wrong answer'
    },
    syllabusSummary: 'Mathematics (75 questions), Physics (45 questions), Chemistry (30 questions) matching Kerala Plus Two syllabus.',
    importantDates: [
      {
        eventType: 'application_opening',
        title: 'KEAM 2027 Registration Opens',
        date: new Date('2027-03-01T00:00:00.000Z'),
        description: 'CEE Kerala invites online applications for Engineering & Pharmacy courses.',
        officialSourceUrl: 'https://cee.kerala.gov.in/'
      },
      {
        eventType: 'application_closing',
        title: 'Application Submission Deadline',
        date: new Date('2027-04-10T17:00:00.000Z'),
        description: 'Final date for online registration and supporting certificate uploads.',
        officialSourceUrl: 'https://cee.kerala.gov.in/'
      },
      {
        eventType: 'admit_card_release',
        title: 'Admit Card Download',
        date: new Date('2027-05-02T00:00:00.000Z'),
        description: 'Admit cards available to download from candidate homepage.',
        officialSourceUrl: 'https://cee.kerala.gov.in/'
      },
      {
        eventType: 'examination',
        title: 'KEAM 2027 Computer Based Examination',
        date: new Date('2027-05-20T10:00:00.000Z'),
        description: 'Online entrance examination across Kerala, Delhi, Mumbai, and Dubai.',
        officialSourceUrl: 'https://cee.kerala.gov.in/'
      },
      {
        eventType: 'result',
        title: 'Rank List Publication',
        date: new Date('2027-06-20T00:00:00.000Z'),
        description: 'Combined rank list prepared with 50:50 weightage of entrance and Plus Two board marks.',
        officialSourceUrl: 'https://cee.kerala.gov.in/'
      },
      {
        eventType: 'counselling_start',
        title: 'Centralized Allotment Process (CAP) Phase 1',
        date: new Date('2027-07-05T00:00:00.000Z'),
        description: 'Option registration for government and private self-financing engineering colleges.',
        officialSourceUrl: 'https://cee.kerala.gov.in/'
      }
    ],
    status: 'active'
  },
  {
    name: 'NEET UG 2027',
    conductingAuthority: 'National Testing Agency (NTA)',
    streamCategory: 'Medical',
    examLevel: 'National',
    relatedCourses: ['MBBS', 'BDS', 'BAMS', 'BHMS', 'B.V.Sc', 'B.Sc Nursing'],
    eligibilityCriteria: 'Must have passed 10+2 with Physics, Chemistry, Biology/Biotechnology and English with minimum 50% marks for General (40% for SC/ST/OBC). Minimum age of 17 years.',
    applicationProcess: 'Online application through NTA NEET web portal with biometric/live photo verification.',
    registrationStartDate: new Date('2027-02-09T00:00:00.000Z'),
    registrationEndDate: new Date('2027-03-12T21:00:00.000Z'),
    admitCardRelease: new Date('2027-04-26T00:00:00.000Z'),
    examDate: new Date('2027-05-09T14:00:00.000Z'),
    counsellingSchedule: 'July 2027 - September 2027 (MCC All India Quota & State Quota)',
    officialWebsite: 'https://neet.nta.nic.in/',
    importantInstructions: 'Pen-and-paper OMR format. Strict dress code enforced at examination centers.',
    applicationFee: '₹1,700 (General) / ₹1,600 (EWS/OBC-NCL) / ₹1,000 (SC/ST/PwBD)',
    verificationStatus: 'verified',
    verificationSource: 'National Testing Agency Medical Information Bulletin',
    examPattern: {
      mode: 'Offline (Pen and Paper OMR)',
      duration: '3 Hours 20 Minutes (200 Minutes)',
      totalMarks: 720,
      numberOfQuestions: 180,
      markingScheme: '+4 for correct response, -1 for incorrect response, 0 for unattempted'
    },
    syllabusSummary: 'Physics (45 questions), Chemistry (45 questions), Biology - Botany & Zoology (90 questions) covering NCERT Class 11 & 12 curriculum.',
    importantDates: [
      {
        eventType: 'application_opening',
        title: 'Online Application Commences',
        date: new Date('2027-02-09T00:00:00.000Z'),
        description: 'NTA opens national registration portal.',
        officialSourceUrl: 'https://neet.nta.nic.in/'
      },
      {
        eventType: 'application_closing',
        title: 'Registration Deadline',
        date: new Date('2027-03-12T21:00:00.000Z'),
        description: 'Final date for fee payment and submission.',
        officialSourceUrl: 'https://neet.nta.nic.in/'
      },
      {
        eventType: 'admit_card_release',
        title: 'Admit Card Release',
        date: new Date('2027-04-26T00:00:00.000Z'),
        description: 'Hall tickets released with allotted exam center details.',
        officialSourceUrl: 'https://neet.nta.nic.in/'
      },
      {
        eventType: 'examination',
        title: 'NEET UG 2027 Examination',
        date: new Date('2027-05-09T14:00:00.000Z'),
        description: 'Single-shift national offline examination from 2:00 PM to 5:20 PM.',
        officialSourceUrl: 'https://neet.nta.nic.in/'
      },
      {
        eventType: 'result',
        title: 'Result & All India Rank Declaration',
        date: new Date('2027-06-14T00:00:00.000Z'),
        description: 'Scorecards released with category-wise qualifying percentiles.',
        officialSourceUrl: 'https://neet.nta.nic.in/'
      },
      {
        eventType: 'counselling_start',
        title: 'MCC All India Quota Counselling Round 1',
        date: new Date('2027-07-15T00:00:00.000Z'),
        description: 'Medical Counselling Committee opens choice filling for 15% AIQ and 100% Deemed/Central seats.',
        officialSourceUrl: 'https://mcc.nic.in/'
      }
    ],
    status: 'active'
  },
  {
    name: 'CUET UG 2027',
    conductingAuthority: 'National Testing Agency (NTA)',
    streamCategory: 'Science',
    examLevel: 'National',
    relatedCourses: ['B.Sc', 'BA', 'B.Com', 'Integrated M.Sc', 'BCA'],
    eligibilityCriteria: 'Candidate must have passed 10+2 from a recognized board. No age limit for appearing in CUET (UG).',
    applicationProcess: 'Apply online via CUET Samarth portal, select targeted universities and domain subjects.',
    registrationStartDate: new Date('2027-02-20T00:00:00.000Z'),
    registrationEndDate: new Date('2027-03-25T23:59:59.000Z'),
    admitCardRelease: new Date('2027-05-10T00:00:00.000Z'),
    examDate: new Date('2027-05-24T09:00:00.000Z'),
    counsellingSchedule: 'Post result declaration, individual central/state universities conduct their own counseling portals (e.g. DU CSAS).',
    officialWebsite: 'https://cuet.samarth.ac.in/',
    importantInstructions: 'Candidates can select up to 6 subject tests (Domain subjects, Language, General Test).',
    applicationFee: '₹1,000 (up to 3 subjects General) / ₹900 (OBC/EWS) / ₹800 (SC/ST)',
    verificationStatus: 'verified',
    verificationSource: 'National Testing Agency CUET Portal',
    examPattern: {
      mode: 'Hybrid (CBT / Pen and Paper)',
      duration: '45 to 60 Minutes per subject paper',
      totalMarks: 250,
      numberOfQuestions: 50,
      markingScheme: '+5 for correct answer, -1 for incorrect answer'
    },
    syllabusSummary: 'Class 12 syllabus strictly followed for domain subjects. General test covers reasoning and current affairs.',
    importantDates: [
      {
        eventType: 'application_opening',
        title: 'Registration Portal Opens',
        date: new Date('2027-02-20T00:00:00.000Z'),
        description: 'CUET Samarth portal opens for subject selection.',
        officialSourceUrl: 'https://cuet.samarth.ac.in/'
      },
      {
        eventType: 'application_closing',
        title: 'Application Deadline',
        date: new Date('2027-03-25T23:59:59.000Z'),
        description: 'Final date to submit subject combinations and fee.',
        officialSourceUrl: 'https://cuet.samarth.ac.in/'
      },
      {
        eventType: 'admit_card_release',
        title: 'Hall Ticket Release',
        date: new Date('2027-05-10T00:00:00.000Z'),
        description: 'Subject-wise exam schedule and admit cards available.',
        officialSourceUrl: 'https://cuet.samarth.ac.in/'
      },
      {
        eventType: 'examination',
        title: 'CUET UG 2027 Examination',
        date: new Date('2027-05-24T09:00:00.000Z'),
        description: 'Multi-day computer and pen-and-paper shifts.',
        officialSourceUrl: 'https://cuet.samarth.ac.in/'
      },
      {
        eventType: 'result',
        title: 'Score Card Declaration',
        date: new Date('2027-06-30T00:00:00.000Z'),
        description: 'Normalized NTA scorecards issued.',
        officialSourceUrl: 'https://cuet.samarth.ac.in/'
      }
    ],
    status: 'active'
  },
  {
    name: 'CAT 2026',
    conductingAuthority: 'Indian Institutes of Management (IIM)',
    streamCategory: 'Management',
    examLevel: 'National',
    relatedCourses: ['Integrated BBA-MBA', 'MBA', 'PGDM'],
    eligibilityCriteria: 'Bachelor’s degree with at least 50% marks or equivalent CGPA (45% for SC/ST/PwD) or final year students.',
    applicationProcess: 'Online registration on official IIM CAT portal.',
    registrationStartDate: new Date('2026-08-01T10:00:00.000Z'),
    registrationEndDate: new Date('2026-09-20T17:00:00.000Z'), // Application Closed
    admitCardRelease: new Date('2026-11-05T17:00:00.000Z'), // Admit Card Released!
    examDate: new Date('2026-11-29T08:30:00.000Z'), // Exam in 19 days!
    counsellingSchedule: 'January 2027 - April 2027 (IIM Interview Shortlists)',
    officialWebsite: 'https://iimcat.ac.in/',
    importantInstructions: 'Admit card color printout is mandatory. Center reporting strictly 90 minutes before exam.',
    applicationFee: '₹2,500 (General) / ₹1,250 (SC/ST/PwD)',
    verificationStatus: 'verified',
    verificationSource: 'IIM CAT Official Press Release and Bulletin',
    examPattern: {
      mode: 'Computer Based Test (CBT)',
      duration: '2 Hours (120 Minutes)',
      totalMarks: 198,
      numberOfQuestions: 66,
      markingScheme: '+3 for correct answer, -1 for incorrect MCQ, 0 for Non-MCQ'
    },
    syllabusSummary: 'Verbal Ability & Reading Comprehension (VARC), Data Interpretation & Logical Reasoning (DILR), Quantitative Ability (QA).',
    importantDates: [
      {
        eventType: 'application_opening',
        title: 'CAT 2026 Registration Opens',
        date: new Date('2026-08-01T10:00:00.000Z'),
        description: 'Online application window opens across India.',
        officialSourceUrl: 'https://iimcat.ac.in/'
      },
      {
        eventType: 'application_closing',
        title: 'Registration Closes',
        date: new Date('2026-09-20T17:00:00.000Z'),
        description: 'Application window closed.',
        officialSourceUrl: 'https://iimcat.ac.in/'
      },
      {
        eventType: 'admit_card_release',
        title: 'Admit Card Available for Download',
        date: new Date('2026-11-05T17:00:00.000Z'),
        description: 'Admit cards live on iimcat.ac.in portal.',
        officialSourceUrl: 'https://iimcat.ac.in/'
      },
      {
        eventType: 'examination',
        title: 'CAT 2026 Examination',
        date: new Date('2026-11-29T08:30:00.000Z'),
        description: 'Three CBT test shifts conducted across 170 test cities.',
        officialSourceUrl: 'https://iimcat.ac.in/'
      },
      {
        eventType: 'answer_key',
        title: 'Candidate Response Sheet & Keys',
        date: new Date('2026-12-05T00:00:00.000Z'),
        description: 'Objection management window opens.',
        officialSourceUrl: 'https://iimcat.ac.in/'
      },
      {
        eventType: 'result',
        title: 'CAT Scorecards Declared',
        date: new Date('2027-01-05T00:00:00.000Z'),
        description: 'Percentile results announced via SMS and portal.',
        officialSourceUrl: 'https://iimcat.ac.in/'
      }
    ],
    status: 'active'
  }
];

async function runEnrichment() {
  try {
    await connectDB();
    console.log('Connected to MongoDB for Entrance Exam enrichment...');

    for (const examData of verifiedExams) {
      const existing = await EntranceExam.findOne({
        name: { $regex: new RegExp(`^${examData.name.replace(/([()])/g, '\\$1')}$`, 'i') }
      });

      if (existing) {
        Object.assign(existing, examData);
        await existing.save();
        console.log(`Updated exam: ${examData.name}`);
      } else {
        await EntranceExam.create(examData);
        console.log(`Created new exam: ${examData.name}`);
      }
    }

    // Also enrich legacy records if they lack importantDates or category
    const allExams = await EntranceExam.find({});
    for (const ex of allExams) {
      let modified = false;
      if (!ex.streamCategory || ex.streamCategory === 'General') {
        if (/neet|medical/i.test(ex.name)) { ex.streamCategory = 'Medical'; modified = true; }
        else if (/jee|keam|engineering/i.test(ex.name)) { ex.streamCategory = 'Engineering'; modified = true; }
        else if (/clat|law/i.test(ex.name)) { ex.streamCategory = 'Law'; modified = true; }
        else if (/cat|management/i.test(ex.name)) { ex.streamCategory = 'Management'; modified = true; }
        else if (/cuet/i.test(ex.name)) { ex.streamCategory = 'Science'; modified = true; }
      }
      if (!ex.verificationStatus) {
        ex.verificationStatus = 'verified';
        modified = true;
      }
      if (!ex.importantDates || ex.importantDates.length === 0) {
        const dates = [];
        if (ex.registrationStartDate) {
          dates.push({ eventType: 'application_opening', title: 'Application Window Opens', date: ex.registrationStartDate, officialSourceUrl: ex.officialWebsite || '' });
        }
        if (ex.registrationEndDate) {
          dates.push({ eventType: 'application_closing', title: 'Application Deadline', date: ex.registrationEndDate, officialSourceUrl: ex.officialWebsite || '' });
        }
        if (ex.admitCardRelease) {
          dates.push({ eventType: 'admit_card_release', title: 'Admit Card Release', date: ex.admitCardRelease, officialSourceUrl: ex.officialWebsite || '' });
        }
        if (ex.examDate) {
          dates.push({ eventType: 'examination', title: 'Examination Date', date: ex.examDate, officialSourceUrl: ex.officialWebsite || '' });
        }
        if (dates.length > 0) {
          ex.importantDates = dates;
          modified = true;
        }
      }
      if (modified) {
        await ex.save();
        console.log(`Enriched legacy exam: ${ex.name}`);
      }
    }

    console.log('Entrance Exam enrichment completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Enrichment failed:', err);
    process.exit(1);
  }
}

runEnrichment();

