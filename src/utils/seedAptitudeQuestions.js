import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AptitudeQuestion from '../models/AptitudeQuestion.js';
import connectDB from '../config/db.js';

dotenv.config({ path: './backend/.env' });

const LIKERT_OPTIONS = [
  { text: 'Strongly Dislike', value: 1 },
  { text: 'Dislike', value: 2 },
  { text: 'Neutral', value: 3 },
  { text: 'Like', value: 4 },
  { text: 'Strongly Like', value: 5 }
];

const questionsData = [
  // ==========================================
  // SECTION 1: RIASEC CAREER INTERESTS (24 Qs)
  // ==========================================

  // --- REALISTIC (R) ---
  {
    questionText: 'Assembling mechanical components or troubleshooting hardware devices.',
    section: 'interest',
    type: 'likert',
    category: 'Realistic',
    options: LIKERT_OPTIONS,
    order: 1
  },
  {
    questionText: 'Working with physical tools, instruments, or laboratory equipment.',
    section: 'interest',
    type: 'likert',
    category: 'Realistic',
    options: LIKERT_OPTIONS,
    order: 2
  },
  {
    questionText: 'Building architectural models, electronics projects, or physical prototypes.',
    section: 'interest',
    type: 'likert',
    category: 'Realistic',
    options: LIKERT_OPTIONS,
    order: 3
  },
  {
    questionText: 'Surveying outdoor environments, construction sites, or agricultural installations.',
    section: 'interest',
    type: 'likert',
    category: 'Realistic',
    options: LIKERT_OPTIONS,
    order: 4
  },

  // --- INVESTIGATIVE (I) ---
  {
    questionText: 'Investigating scientific phenomena, conducting experiments, or analyzing lab samples.',
    section: 'interest',
    type: 'likert',
    category: 'Investigative',
    options: LIKERT_OPTIONS,
    order: 5
  },
  {
    questionText: 'Writing computer programs or algorithms to solve computational challenges.',
    section: 'interest',
    type: 'likert',
    category: 'Investigative',
    options: LIKERT_OPTIONS,
    order: 6
  },
  {
    questionText: 'Researching biological mechanisms, pharmacology, or how medicines treat disease.',
    section: 'interest',
    type: 'likert',
    category: 'Investigative',
    options: LIKERT_OPTIONS,
    order: 7
  },
  {
    questionText: 'Reading academic research papers and formulating theories to explain complex problems.',
    section: 'interest',
    type: 'likert',
    category: 'Investigative',
    options: LIKERT_OPTIONS,
    order: 8
  },

  // --- ARTISTIC (A) ---
  {
    questionText: 'Designing visual graphics, digital artwork, user interfaces, or multimedia animations.',
    section: 'interest',
    type: 'likert',
    category: 'Artistic',
    options: LIKERT_OPTIONS,
    order: 9
  },
  {
    questionText: 'Writing essays, stories, poems, or scripts to express imaginative perspectives.',
    section: 'interest',
    type: 'likert',
    category: 'Artistic',
    options: LIKERT_OPTIONS,
    order: 10
  },
  {
    questionText: 'Conceptualizing interior spaces, architectural aesthetics, or product styling.',
    section: 'interest',
    type: 'likert',
    category: 'Artistic',
    options: LIKERT_OPTIONS,
    order: 11
  },
  {
    questionText: 'Composing music, creating audio effects, or performing in theatrical and cultural productions.',
    section: 'interest',
    type: 'likert',
    category: 'Artistic',
    options: LIKERT_OPTIONS,
    order: 12
  },

  // --- SOCIAL (S) ---
  {
    questionText: 'Explaining difficult concepts to peers, tutoring, or mentoring younger students.',
    section: 'interest',
    type: 'likert',
    category: 'Social',
    options: LIKERT_OPTIONS,
    order: 13
  },
  {
    questionText: 'Counseling friends or peers to help them navigate emotional stress or academic decisions.',
    section: 'interest',
    type: 'likert',
    category: 'Social',
    options: LIKERT_OPTIONS,
    order: 14
  },
  {
    questionText: 'Volunteering in community development, public health awareness, or disaster relief initiatives.',
    section: 'interest',
    type: 'likert',
    category: 'Social',
    options: LIKERT_OPTIONS,
    order: 15
  },
  {
    questionText: 'Collaborating in team projects where maintaining empathy and group harmony is essential.',
    section: 'interest',
    type: 'likert',
    category: 'Social',
    options: LIKERT_OPTIONS,
    order: 16
  },

  // --- ENTERPRISING (E) ---
  {
    questionText: 'Pitching an innovative business idea, product concept, or startup vision to an audience.',
    section: 'interest',
    type: 'likert',
    category: 'Enterprising',
    options: LIKERT_OPTIONS,
    order: 17
  },
  {
    questionText: 'Leading a student committee, school club, or organizing large-scale institutional events.',
    section: 'interest',
    type: 'likert',
    category: 'Enterprising',
    options: LIKERT_OPTIONS,
    order: 18
  },
  {
    questionText: 'Negotiating agreements, convincing others to support an initiative, or public speaking.',
    section: 'interest',
    type: 'likert',
    category: 'Enterprising',
    options: LIKERT_OPTIONS,
    order: 19
  },
  {
    questionText: 'Analyzing commercial markets, stock movements, consumer trends, and economic opportunities.',
    section: 'interest',
    type: 'likert',
    category: 'Enterprising',
    options: LIKERT_OPTIONS,
    order: 20
  },

  // --- CONVENTIONAL (C) ---
  {
    questionText: 'Organizing financial records, tracking budgets, or balancing accounts systematically.',
    section: 'interest',
    type: 'likert',
    category: 'Conventional',
    options: LIKERT_OPTIONS,
    order: 21
  },
  {
    questionText: 'Structuring large datasets into orderly spreadsheets, tables, or documented records.',
    section: 'interest',
    type: 'likert',
    category: 'Conventional',
    options: LIKERT_OPTIONS,
    order: 22
  },
  {
    questionText: 'Verifying regulatory compliance, proofreading documents for exact accuracy, and adhering to strict guidelines.',
    section: 'interest',
    type: 'likert',
    category: 'Conventional',
    options: LIKERT_OPTIONS,
    order: 23
  },
  {
    questionText: 'Developing organized filing systems, schedules, and step-by-step operating checklists.',
    section: 'interest',
    type: 'likert',
    category: 'Conventional',
    options: LIKERT_OPTIONS,
    order: 24
  },

  // ==========================================
  // SECTION 2: OBJECTIVE ABILITY (12 Qs)
  // ==========================================

  // --- LOGICAL REASONING (3 Qs) ---
  {
    questionText: 'Look at this sequence: 4, 9, 19, 39, 79, ___. What number should come next?',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Logical Reasoning',
    options: [
      { text: '119', value: '119' },
      { text: '139', value: '139' },
      { text: '159', value: '159' },
      { text: '169', value: '169' }
    ],
    correctAnswer: '159',
    explanation: 'Each term is obtained by multiplying the preceding term by 2 and adding 1: 4*2+1 = 9, 9*2+1 = 19, 19*2+1 = 39, 39*2+1 = 79, 79*2+1 = 159.',
    difficulty: 'medium',
    marks: 1,
    order: 25
  },
  {
    questionText: 'Statements:\n1. All engineers are problem solvers.\n2. Some problem solvers are inventors.\nConclusion I: Some engineers are inventors.\nConclusion II: All inventors are problem solvers.\nWhich conclusion logically follows?',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Logical Reasoning',
    options: [
      { text: 'Only Conclusion I follows', value: 'Only Conclusion I follows' },
      { text: 'Only Conclusion II follows', value: 'Only Conclusion II follows' },
      { text: 'Either Conclusion I or II follows', value: 'Either Conclusion I or II follows' },
      { text: 'Neither Conclusion I nor II follows', value: 'Neither Conclusion I nor II follows' }
    ],
    correctAnswer: 'Neither Conclusion I nor II follows',
    explanation: 'From the given premises, "engineers" and "inventors" have no definite intersection, so Conclusion I does not necessarily follow. Conclusion II claims "all inventors are problem solvers", but premise 2 only states "some problem solvers are inventors". Hence neither follows.',
    difficulty: 'medium',
    marks: 1,
    order: 26
  },
  {
    questionText: 'In a code language, if "ORBIT" is written as "PQCKV", how is "SOLAR" written in the same code?',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Logical Reasoning',
    options: [
      { text: 'TPMBS', value: 'TPMBS' },
      { text: 'UQNCV', value: 'UQNCV' },
      { text: 'TQMBR', value: 'TQMBR' },
      { text: 'UQMCT', value: 'UQMCT' }
    ],
    correctAnswer: 'UQMCT',
    explanation: 'Each letter is shifted by +1 and +2 alternately: S(+2)=U, O(+2)=Q, L(+1)=M, A(+2)=C, R(+2)=T. Specifically O->P(+1), R->Q(-1) pattern gives: S+2=U, O+2=Q, L+1=M, A+2=C, R+2=T => UQMCT.',
    difficulty: 'hard',
    marks: 1,
    order: 27
  },

  // --- NUMERICAL REASONING (3 Qs) ---
  {
    questionText: 'A college library has 1,200 science and arts books. If 40% are science books and the rest are arts books, how many arts books are in the library?',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Numerical Reasoning',
    options: [
      { text: '480', value: '480' },
      { text: '600', value: '600' },
      { text: '720', value: '720' },
      { text: '840', value: '840' }
    ],
    correctAnswer: '720',
    explanation: 'Arts books constitute 100% - 40% = 60% of the total collection. 60% of 1,200 = 0.60 * 1,200 = 720.',
    difficulty: 'easy',
    marks: 1,
    order: 28
  },
  {
    questionText: 'A train travels 240 kilometers in 3 hours. If it increases its speed by 20 km/h, how long will it take to travel the same distance?',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Numerical Reasoning',
    options: [
      { text: '2 hours 12 minutes', value: '2 hours 12 minutes' },
      { text: '2 hours 24 minutes', value: '2 hours 24 minutes' },
      { text: '2 hours 30 minutes', value: '2 hours 30 minutes' },
      { text: '2 hours 40 minutes', value: '2 hours 40 minutes' }
    ],
    correctAnswer: '2 hours 24 minutes',
    explanation: 'Initial speed = 240 km / 3 h = 80 km/h. New speed = 80 + 20 = 100 km/h. New time = 240 / 100 = 2.4 hours = 2 hours and (0.4 * 60) = 2 hours 24 minutes.',
    difficulty: 'medium',
    marks: 1,
    order: 29
  },
  {
    questionText: 'The ratio of students in Course A to Course B is 3 : 5. If 20 more students enroll in Course A, the ratio becomes 1 : 1. How many students were originally in Course B?',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Numerical Reasoning',
    options: [
      { text: '30', value: '30' },
      { text: '40', value: '40' },
      { text: '50', value: '50' },
      { text: '60', value: '60' }
    ],
    correctAnswer: '50',
    explanation: 'Let Course A = 3x and Course B = 5x. When 20 join Course A: (3x + 20) / 5x = 1/1 => 3x + 20 = 5x => 2x = 20 => x = 10. Originally Course B had 5x = 5 * 10 = 50 students.',
    difficulty: 'medium',
    marks: 1,
    order: 30
  },

  // --- VERBAL REASONING (3 Qs) ---
  {
    questionText: 'Select the pair that expresses a relationship similar to: ARCHITECT : BLUEPRINT',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Verbal Reasoning',
    options: [
      { text: 'Scientist : Laboratory', value: 'Scientist : Laboratory' },
      { text: 'Composer : Symphony', value: 'Composer : Symphony' },
      { text: 'Teacher : Classroom', value: 'Teacher : Classroom' },
      { text: 'Physician : Hospital', value: 'Physician : Hospital' }
    ],
    correctAnswer: 'Composer : Symphony',
    explanation: 'An architect conceives and designs a blueprint (a creative structural plan); likewise, a composer conceives and writes a symphony score.',
    difficulty: 'easy',
    marks: 1,
    order: 31
  },
  {
    questionText: 'Choose the word most nearly OPPOSITE in meaning to "PRAGMATIC":',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Verbal Reasoning',
    options: [
      { text: 'Realistic', value: 'Realistic' },
      { text: 'Idealistic', value: 'Idealistic' },
      { text: 'Methodical', value: 'Methodical' },
      { text: 'Systematic', value: 'Systematic' }
    ],
    correctAnswer: 'Idealistic',
    explanation: '"Pragmatic" means dealing with things sensibly and realistically based on practical conditions. Its antonym is "Idealistic", pursuing visionary ideals rather than practical realities.',
    difficulty: 'medium',
    marks: 1,
    order: 32
  },
  {
    questionText: '"Despite the scarcity of empirical data, the committee reached a ___ consensus regarding the university safety protocol." Select the most fitting word:',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Verbal Reasoning',
    options: [
      { text: 'tentative', value: 'tentative' },
      { text: 'dogmatic', value: 'dogmatic' },
      { text: 'superfluous', value: 'superfluous' },
      { text: 'belligerent', value: 'belligerent' }
    ],
    correctAnswer: 'tentative',
    explanation: '"Tentative" means provisional or unconfirmed, which logically fits reaching an initial consensus despite a lack of empirical data.',
    difficulty: 'medium',
    marks: 1,
    order: 33
  },

  // --- ANALYTICAL THINKING (3 Qs) ---
  {
    questionText: 'Five students (P, Q, R, S, T) sit in a row. R sits to the immediate right of Q. P sits between T and Q. Who sits in the middle position?',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Analytical Thinking',
    options: [
      { text: 'P', value: 'P' },
      { text: 'Q', value: 'Q' },
      { text: 'R', value: 'R' },
      { text: 'T', value: 'T' }
    ],
    correctAnswer: 'P',
    explanation: 'If P is between T and Q, the arrangement is T - P - Q. R is immediate right of Q, yielding T - P - Q - R. With S on the left end (S - T - P - Q - R), P occupies the central 3rd position.',
    difficulty: 'medium',
    marks: 1,
    order: 34
  },
  {
    questionText: 'A medical college requires candidates to meet 3 conditions:\n1. Age >= 17 years.\n2. PCB aggregate >= 50%.\n3. Qualified NEET.\nRahul is 18 years old, scored 58% in PCB, but did not sit for NEET. What is his admission status?',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Analytical Thinking',
    options: [
      { text: 'Admitted on provisional merit', value: 'Admitted on provisional merit' },
      { text: 'Ineligible due to missing NEET qualification', value: 'Ineligible due to missing NEET qualification' },
      { text: 'Eligible based on PCB aggregate', value: 'Eligible based on PCB aggregate' },
      { text: 'Referred to institutional discretionary quota', value: 'Referred to institutional discretionary quota' }
    ],
    correctAnswer: 'Ineligible due to missing NEET qualification',
    explanation: 'All three conditions are required. Failing condition 3 (NEET qualification) renders the candidate ineligible regardless of age and PCB scores.',
    difficulty: 'easy',
    marks: 1,
    order: 35
  },
  {
    questionText: 'If "No research papers are plagiarized" and "Some publications are research papers", which of the following is guaranteed to be TRUE?',
    section: 'ability',
    type: 'multiple_choice',
    category: 'Analytical Thinking',
    options: [
      { text: 'Some publications are not plagiarized', value: 'Some publications are not plagiarized' },
      { text: 'All publications are research papers', value: 'All publications are research papers' },
      { text: 'All plagiarized works are publications', value: 'All plagiarized works are publications' },
      { text: 'No publications are research papers', value: 'No publications are research papers' }
    ],
    correctAnswer: 'Some publications are not plagiarized',
    explanation: 'The publications that are research papers cannot be plagiarized (since no research papers are plagiarized). Therefore, at least those publications are not plagiarized.',
    difficulty: 'hard',
    marks: 1,
    order: 36
  }
];

async function seed() {
  try {
    await connectDB();
    console.log('Connected to MongoDB. Seeding Aptitude Questions...');

    await AptitudeQuestion.deleteMany({});
    console.log('Cleared existing aptitude questions.');

    const created = await AptitudeQuestion.insertMany(questionsData);
    console.log(`Successfully seeded ${created.length} official DISHA aptitude questions.`);
    console.log(`- Interest Questions: ${created.filter((q) => q.section === 'interest').length}`);
    console.log(`- Ability Questions: ${created.filter((q) => q.section === 'ability').length}`);

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();

