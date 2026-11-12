import AptitudeQuestion from '../models/AptitudeQuestion.js';

export const INITIAL_CAREER_QUESTIONS = [
  {
    questionText: 'What stream did you study in Plus Two (Higher Secondary)?',
    section: 'academic_background',
    assessmentType: 'career_discovery',
    answerType: 'single_choice',
    category: 'Academic Stream',
    order: 1,
    status: 'published',
    options: [
      {
        text: 'Science with Mathematics (Physics, Chemistry, Maths / PCMB)',
        value: 'science_pcm',
        tags: ['science', 'pcm', 'maths', 'engineering', 'technology', 'computer_science', 'btech', 'bca', 'bsc']
      },
      {
        text: 'Science with Biology (Physics, Chemistry, Biology / PCB)',
        value: 'science_pcb',
        tags: ['science', 'pcb', 'biology', 'healthcare', 'pharmacy', 'medicine', 'bpharm']
      },
      {
        text: 'Commerce with Mathematics / Informatics',
        value: 'commerce_maths',
        tags: ['commerce', 'maths', 'finance', 'management', 'business', 'analytics', 'bba', 'bca']
      },
      {
        text: 'Commerce (Accountancy, Business Studies, Economics)',
        value: 'commerce_general',
        tags: ['commerce', 'management', 'business', 'accounting', 'corporate', 'bba']
      },
      {
        text: 'Humanities / Arts (Sociology, History, Political Science, Psychology)',
        value: 'humanities',
        tags: ['humanities', 'arts', 'social_science', 'literature', 'management', 'bba']
      },
      {
        text: 'Vocational / Technical Stream',
        value: 'vocational',
        tags: ['vocational', 'technical', 'applied', 'bca', 'bba']
      }
    ]
  },
  {
    questionText: 'Which subjects did you find most engaging and enjoyable during your Plus Two studies?',
    section: 'subject_interests',
    assessmentType: 'career_discovery',
    answerType: 'multiple_choice',
    category: 'Subject Affinity',
    order: 2,
    status: 'published',
    options: [
      {
        text: 'Computer Science & Informatics Practices',
        value: 'subj_cs',
        tags: ['computer_science', 'coding', 'software', 'technology', 'bca', 'btech', 'bsc']
      },
      {
        text: 'Mathematics & Quantitative Problem Solving',
        value: 'subj_maths',
        tags: ['maths', 'analytical', 'engineering', 'computer_science', 'finance', 'btech', 'bca']
      },
      {
        text: 'Physics & Principles of Mechanics',
        value: 'subj_physics',
        tags: ['physics', 'engineering', 'technology', 'analytical', 'btech']
      },
      {
        text: 'Chemistry, Compounds & Chemical Reactions',
        value: 'subj_chem',
        tags: ['chemistry', 'pharmacy', 'bpharm', 'healthcare', 'science']
      },
      {
        text: 'Biology, Human Physiology & Life Sciences',
        value: 'subj_bio',
        tags: ['biology', 'healthcare', 'pharmacy', 'bpharm', 'medicine']
      },
      {
        text: 'Business Studies & Organizational Management',
        value: 'subj_business',
        tags: ['business', 'management', 'leadership', 'bba', 'entrepreneurship']
      },
      {
        text: 'Accountancy, Financial Records & Ledger Balancing',
        value: 'subj_accountancy',
        tags: ['accounting', 'finance', 'commerce', 'management', 'bba']
      },
      {
        text: 'Economics, Market Trends & Statistical Analysis',
        value: 'subj_economics',
        tags: ['economics', 'finance', 'analytics', 'management', 'bba']
      }
    ]
  },
  {
    questionText: 'What kind of hands-on activities or projects spark your curiosity most?',
    section: 'career_interests',
    assessmentType: 'career_discovery',
    answerType: 'multiple_choice',
    category: 'Practical Interests',
    order: 3,
    status: 'published',
    options: [
      {
        text: 'Writing code, building websites, apps, or solving algorithmic puzzles',
        value: 'act_coding',
        tags: ['coding', 'software', 'computer_science', 'technology', 'bca', 'btech', 'bsc']
      },
      {
        text: 'Understanding pharmaceutical medicines, clinical treatments, and laboratory experiments',
        value: 'act_pharma',
        tags: ['pharmacy', 'bpharm', 'healthcare', 'medicine', 'science']
      },
      {
        text: 'Brainstorming startup ideas, managing business plans, and coordinating team events',
        value: 'act_business',
        tags: ['management', 'business', 'bba', 'leadership', 'entrepreneurship']
      },
      {
        text: 'Analyzing data charts, financial figures, and consumer trends',
        value: 'act_analytics',
        tags: ['analytics', 'finance', 'accounting', 'management', 'business', 'bba']
      },
      {
        text: 'Designing digital interfaces, user experiences, and visual presentations',
        value: 'act_design',
        tags: ['design', 'creative', 'media', 'technology', 'bca']
      }
    ]
  },
  {
    questionText: 'When tackling a complex assignment, what do you consider your strongest ability?',
    section: 'strengths',
    assessmentType: 'career_discovery',
    answerType: 'single_choice',
    category: 'Core Strengths',
    order: 4,
    status: 'published',
    options: [
      {
        text: 'Logical reasoning, breaking down complex puzzles into step-by-step algorithms',
        value: 'str_logic',
        tags: ['analytical', 'maths', 'technology', 'computer_science', 'engineering', 'btech', 'bca']
      },
      {
        text: 'Interpersonal communication, convincing people, and driving team collaboration',
        value: 'str_comm',
        tags: ['communication', 'leadership', 'management', 'business', 'bba']
      },
      {
        text: 'Scientific curiosity, precision observation, and meticulous research',
        value: 'str_research',
        tags: ['science', 'research', 'pharmacy', 'healthcare', 'bpharm', 'bsc']
      },
      {
        text: 'Systematic organization, structured timelines, and keeping things orderly',
        value: 'str_org',
        tags: ['structured', 'management', 'accounting', 'corporate', 'bba']
      }
    ]
  },
  {
    questionText: 'What type of everyday working environment feels most appealing to you?',
    section: 'work_preferences',
    assessmentType: 'career_discovery',
    answerType: 'single_choice',
    category: 'Work Environment',
    order: 5,
    status: 'published',
    options: [
      {
        text: 'A technology hub working with modern computers, software development, and cloud tools',
        value: 'env_tech',
        tags: ['technology', 'software', 'computer_science', 'bca', 'btech', 'bsc']
      },
      {
        text: 'A corporate office engaging with clients, team leaders, and business strategy',
        value: 'env_corp',
        tags: ['corporate', 'management', 'business', 'bba', 'leadership']
      },
      {
        text: 'A pharmaceutical laboratory, clinical facility, or quality-control testing lab',
        value: 'env_lab',
        tags: ['laboratory', 'pharmacy', 'bpharm', 'healthcare', 'science']
      },
      {
        text: 'A dynamic and hybrid setting balancing creative problem solving with team operations',
        value: 'env_hybrid',
        tags: ['flexible', 'management', 'business', 'creative', 'bba']
      }
    ]
  },
  {
    questionText: 'What is your preferred duration for your undergraduate studies?',
    section: 'study_preferences',
    assessmentType: 'career_discovery',
    answerType: 'single_choice',
    category: 'Program Duration',
    order: 6,
    status: 'published',
    options: [
      {
        text: "3 Years (Fast-track Bachelor's degrees like BCA, BBA, B.Sc)",
        value: 'dur_3',
        tags: ['duration_3_years', 'bca', 'bba', 'bsc']
      },
      {
        text: '4 Years (Professional degrees like B.Tech / B.Pharm)',
        value: 'dur_4',
        tags: ['duration_4_years', 'btech', 'bpharm']
      },
      {
        text: 'Flexible (I am open to either 3 or 4 years depending on the career potential)',
        value: 'dur_flex',
        tags: ['flexible_duration', 'bca', 'btech', 'bpharm', 'bba', 'bsc']
      }
    ]
  },
  {
    questionText: 'What is your primary career aspiration immediately after completing your degree?',
    section: 'career_interests',
    assessmentType: 'career_discovery',
    answerType: 'single_choice',
    category: 'Career Aspirations',
    order: 7,
    status: 'published',
    options: [
      {
        text: 'Enter the IT industry as a software engineer, web developer, or technology specialist',
        value: 'goal_it',
        tags: ['software', 'technology', 'computer_science', 'bca', 'btech', 'bsc']
      },
      {
        text: 'Step into corporate roles in business management, marketing, HR, or start an enterprise',
        value: 'goal_corp',
        tags: ['management', 'business', 'bba', 'entrepreneurship']
      },
      {
        text: 'Become a registered pharmacist, drug inspector, or clinical researcher in pharmaceuticals',
        value: 'goal_pharma',
        tags: ['pharmacy', 'bpharm', 'healthcare', 'medicine']
      },
      {
        text: 'Pursue higher specialized education (MCA, MBA, M.Tech, M.Pharm) or research',
        value: 'goal_higher',
        tags: ['higher_studies', 'research', 'academics', 'bsc', 'bca', 'btech', 'bba', 'bpharm']
      }
    ]
  },
  {
    questionText: 'How do you prefer to absorb and master new educational concepts?',
    section: 'work_preferences',
    assessmentType: 'career_discovery',
    answerType: 'single_choice',
    category: 'Learning Style',
    order: 8,
    status: 'published',
    options: [
      {
        text: 'Practical hands-on coding and live application building on computers',
        value: 'learn_coding',
        tags: ['practical', 'coding', 'computer_science', 'technology', 'bca', 'btech']
      },
      {
        text: 'Interactive group discussions, real business case studies, and presentations',
        value: 'learn_business',
        tags: ['interactive', 'management', 'business', 'bba']
      },
      {
        text: 'Experimental labs, formula demonstrations, and scientific trial-and-error',
        value: 'learn_lab',
        tags: ['laboratory', 'science', 'pharmacy', 'chemistry', 'bpharm']
      },
      {
        text: 'Structured theoretical reading, detailed documentation, and conceptual synthesis',
        value: 'learn_theory',
        tags: ['theory', 'structured', 'research', 'bsc']
      }
    ]
  },
  {
    questionText: 'How confident do you feel with Mathematics and quantitative formulas?',
    section: 'strengths',
    assessmentType: 'career_discovery',
    answerType: 'single_choice',
    category: 'Quantitative Confidence',
    order: 9,
    status: 'published',
    options: [
      {
        text: 'Highly confident: I enjoy advanced calculus, trigonometry, algebra, and numerical logic',
        value: 'math_high',
        tags: ['maths_high', 'engineering', 'btech', 'computer_science', 'bca']
      },
      {
        text: 'Moderately comfortable: I handle practical math, statistics, and business calculations well',
        value: 'math_mod',
        tags: ['maths_moderate', 'bca', 'bba', 'bsc']
      },
      {
        text: 'I prefer descriptive or life-science subjects with less complex calculus',
        value: 'math_low',
        tags: ['maths_low', 'bpharm', 'healthcare', 'bba', 'management']
      }
    ]
  },
  {
    questionText: 'Which type of meaningful impact would bring you the greatest sense of accomplishment?',
    section: 'career_interests',
    assessmentType: 'career_discovery',
    answerType: 'single_choice',
    category: 'Personal Impact',
    order: 10,
    status: 'published',
    options: [
      {
        text: 'Developing innovative digital systems, mobile apps, or artificial intelligence solutions',
        value: 'imp_tech',
        tags: ['technology', 'software', 'computer_science', 'bca', 'btech', 'bsc']
      },
      {
        text: 'Ensuring patient safety, formulating essential healthcare products, and saving lives',
        value: 'imp_pharma',
        tags: ['healthcare', 'pharmacy', 'bpharm', 'medicine']
      },
      {
        text: 'Leading organizations to financial success, creating employment, and driving market growth',
        value: 'imp_business',
        tags: ['business', 'management', 'bba', 'leadership']
      },
      {
        text: 'Solving critical scientific challenges and advancing societal knowledge',
        value: 'imp_science',
        tags: ['science', 'research', 'analytical', 'bsc']
      }
    ]
  }
];

export async function seedCareerDiscoveryQuestions() {
  try {
    const count = await AptitudeQuestion.countDocuments({
      assessmentType: 'career_discovery'
    });

    if (count === 0) {
      console.log('[Career Assessment] No Career Discovery questions found. Seeding 10 published questions...');
      await AptitudeQuestion.insertMany(INITIAL_CAREER_QUESTIONS);
      console.log('[Career Assessment] Successfully seeded 10 published Career Discovery questions.');
    }
  } catch (error) {
    console.error('[Career Assessment] Failed to seed questions:', error.message);
  }
}

