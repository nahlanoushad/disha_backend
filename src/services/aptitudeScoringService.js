import AptitudeQuestion from '../models/AptitudeQuestion.js';
import Course from '../models/Course.js';
import College from '../models/College.js';

export const aptitudeScoringService = {
  /**
   * Deterministically calculate RIASEC Interest and Ability scores from submitted answers
   */
  async calculateScores(answers) {
    // 1. Load all questions with correctAnswer and explanation for ability scoring
    const questionIds = answers.map((a) => a.questionId);
    const questions = await AptitudeQuestion.find({ _id: { $in: questionIds } })
      .select('+correctAnswer +explanation')
      .lean();

    const questionMap = new Map();
    questions.forEach((q) => questionMap.set(q._id.toString(), q));

    // RIASEC tracking
    const interestTotals = {
      Realistic: { score: 0, count: 0 },
      Investigative: { score: 0, count: 0 },
      Artistic: { score: 0, count: 0 },
      Social: { score: 0, count: 0 },
      Enterprising: { score: 0, count: 0 },
      Conventional: { score: 0, count: 0 }
    };

    // Ability tracking
    const abilityTotals = {
      logicalReasoning: { score: 0, maxScore: 0 },
      numericalReasoning: { score: 0, maxScore: 0 },
      verbalReasoning: { score: 0, maxScore: 0 },
      analyticalThinking: { score: 0, maxScore: 0 }
    };

    const gradedAnswers = [];

    for (const ans of answers) {
      const q = questionMap.get(ans.questionId.toString());
      if (!q) continue;

      if (q.section === 'interest') {
        const val = Number(ans.selectedOption) || 3;
        if (interestTotals[q.category]) {
          interestTotals[q.category].score += val;
          interestTotals[q.category].count += 1;
        }
        gradedAnswers.push({
          questionId: q._id,
          section: 'interest',
          category: q.category,
          selectedOption: val,
          isCorrect: null,
          marksAwarded: 0
        });
      } else if (q.section === 'ability') {
        const isCorrect = String(ans.selectedOption).trim() === String(q.correctAnswer).trim();
        const marks = isCorrect ? (q.marks || 1) : 0;
        const maxMarks = q.marks || 1;

        let catKey = 'logicalReasoning';
        const cat = (q.category || '').toLowerCase();
        if (cat.includes('numerical')) catKey = 'numericalReasoning';
        else if (cat.includes('verbal')) catKey = 'verbalReasoning';
        else if (cat.includes('analytical')) catKey = 'analyticalThinking';

        abilityTotals[catKey].score += marks;
        abilityTotals[catKey].maxScore += maxMarks;

        gradedAnswers.push({
          questionId: q._id,
          section: 'ability',
          category: q.category,
          selectedOption: ans.selectedOption,
          isCorrect,
          marksAwarded: marks,
          explanation: q.explanation // included in post-completion results
        });
      }
    }

    // 2. Finalize RIASEC Interest Scores
    const interestScores = {};
    for (const [cat, data] of Object.entries(interestTotals)) {
      const maxScore = data.count > 0 ? data.count * 5 : 20;
      const percentage = maxScore > 0 ? Math.round((data.score / maxScore) * 100) : 0;
      interestScores[cat] = {
        score: data.score,
        maxScore,
        percentage
      };
    }

    // Rank top 3 RIASEC interests
    const sortedInterests = Object.entries(interestScores)
      .sort((a, b) => b[1].percentage - a[1].percentage)
      .map(([cat]) => cat);

    const topInterests = sortedInterests.slice(0, 3);
    const riasecCode = topInterests.map((t) => t[0]).join(''); // e.g. "IRE"

    // 3. Finalize Ability Scores
    let totalScore = 0;
    let totalMaxScore = 0;
    const abilityScores = {};

    for (const [key, data] of Object.entries(abilityTotals)) {
      totalScore += data.score;
      totalMaxScore += data.maxScore;
      const percentage = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0;
      abilityScores[key] = {
        score: data.score,
        maxScore: data.maxScore,
        percentage
      };
    }

    const overallPercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    abilityScores.totalScore = totalScore;
    abilityScores.totalMaxScore = totalMaxScore;
    abilityScores.overallPercentage = overallPercentage;

    return {
      gradedAnswers,
      interestScores,
      topInterests,
      riasecCode,
      abilityScores
    };
  },

  /**
   * Transparent Rule-Based Educational Matching using actual MongoDB Courses & Colleges
   */
  async generateRuleBasedRecommendations({ student, topInterests, abilityScores }) {
    const courses = await Course.find({ status: 'active' }).populate('category').lean();
    const colleges = await College.find({ status: 'active' }).lean();

    const academicStream = (student?.academicProfile?.stream || '').toLowerCase();
    const studentSubjects = (student?.academicProfile?.subjects || []).map((s) => s.toLowerCase());

    const recommendedCourses = [];
    const recommendedColleges = [];
    const strengths = [];
    const improvementAreas = [];
    const careerFamilies = [];

    // Derive strengths from ability percentages
    if (abilityScores.logicalReasoning.percentage >= 65) {
      strengths.push('Strong deductive reasoning and sequential problem solving.');
    }
    if (abilityScores.numericalReasoning.percentage >= 65) {
      strengths.push('Aptitude for quantitative computation, statistical ratios, and numerical analysis.');
    }
    if (abilityScores.verbalReasoning.percentage >= 65) {
      strengths.push('Clear linguistic comprehension, vocabulary precision, and conceptual reasoning.');
    }
    if (abilityScores.analyticalThinking.percentage >= 65) {
      strengths.push('Strong critical analysis under multi-condition constraints.');
    }
    if (strengths.length === 0) {
      strengths.push('Balanced multidimensional cognitive foundation with potential across diverse academic domains.');
    }

    // Derive constructive improvement areas
    if (abilityScores.logicalReasoning.percentage < 50) {
      improvementAreas.push('Practice multi-step pattern deductions and formal logical syllogisms.');
    }
    if (abilityScores.numericalReasoning.percentage < 50) {
      improvementAreas.push('Reinforce rapid mental percentages, proportions, and word-problem translations.');
    }
    if (abilityScores.verbalReasoning.percentage < 50) {
      improvementAreas.push('Expand vocabulary through regular editorial reading and semantic analogy puzzles.');
    }
    if (abilityScores.analyticalThinking.percentage < 50) {
      improvementAreas.push('Strengthen conditional rule analysis and structural constraint management.');
    }
    if (improvementAreas.length === 0) {
      improvementAreas.push('Maintain speed and accuracy with advanced competitive-level practice problems.');
    }

    // Match real Courses from MongoDB
    for (const course of courses) {
      let indicativeScore = 60;
      const matchReasons = [];
      const courseName = course.name.toLowerCase();
      const courseCat = (course.category?.name || '').toLowerCase();

      // RIASEC Interest Alignment
      if (topInterests.includes('Investigative')) {
        if (/computer|science|bca|b.tech|engineering|data|pharm/i.test(courseName + ' ' + courseCat)) {
          indicativeScore += 18;
          matchReasons.push('Strong alignment with your high Investigative (analytical and research) interest.');
        }
      }
      if (topInterests.includes('Realistic')) {
        if (/engineering|technology|hardware|architecture|b.tech/i.test(courseName + ' ' + courseCat)) {
          indicativeScore += 12;
          matchReasons.push('Reflects your Realistic interest in physical systems and hands-on technology.');
        }
      }
      if (topInterests.includes('Social')) {
        if (/nursing|medicine|pharmacy|mbbs|therapy|psychology/i.test(courseName + ' ' + courseCat)) {
          indicativeScore += 15;
          matchReasons.push('Connects with your Social dimension preference for service and healthcare impact.');
        }
      }
      if (topInterests.includes('Enterprising')) {
        if (/bba|commerce|management|business|finance|economics/i.test(courseName + ' ' + courseCat)) {
          indicativeScore += 15;
          matchReasons.push('Directly matches your Enterprising profile in leadership and organizational strategy.');
        }
      }
      if (topInterests.includes('Conventional')) {
        if (/accounting|b.com|finance|statistics|data/i.test(courseName + ' ' + courseCat)) {
          indicativeScore += 12;
          matchReasons.push('Suited to your Conventional interest in structured data and methodical systems.');
        }
      }
      if (topInterests.includes('Artistic')) {
        if (/architecture|design|media|arts|literature|b.arch/i.test(courseName + ' ' + courseCat)) {
          indicativeScore += 15;
          matchReasons.push('Matches your Artistic interest in creative expression and aesthetic design.');
        }
      }

      // Academic Stream Alignment
      if (academicStream) {
        if (academicStream.includes('science') && /engineering|technology|bca|b.tech|b.sc|pharm/i.test(courseName + ' ' + courseCat)) {
          indicativeScore += 10;
          matchReasons.push('Compatible with your Higher Secondary Science academic background.');
        } else if (academicStream.includes('commerce') && /bba|b.com|management|finance/i.test(courseName + ' ' + courseCat)) {
          indicativeScore += 10;
          matchReasons.push('Direct academic continuity with your Commerce stream foundation.');
        }
      }

      // Cap indicative score between 65% and 96%
      const finalScore = Math.min(Math.max(indicativeScore, 65), 96);

      if (matchReasons.length > 0) {
        recommendedCourses.push({
          courseId: course._id,
          courseName: course.name,
          category: course.category?.name || 'General',
          duration: course.duration || '3-4 Years',
          indicativeScore: finalScore,
          matchReasons
        });
      }
    }

    // Sort recommended courses by score
    recommendedCourses.sort((a, b) => b.indicativeScore - a.indicativeScore);
    const topRecommendedCourses = recommendedCourses.slice(0, 4);

    // Match real Colleges from MongoDB offering those recommended courses
    const targetCourseNames = topRecommendedCourses.map((c) => c.courseName);

    for (const college of colleges) {
      const offered = Array.isArray(college.coursesOffered)
        ? college.coursesOffered.map((o) => (typeof o === 'object' ? o.name : o))
        : [];

      // Check if college offers any top recommended course
      for (const targetCourse of targetCourseNames) {
        const matches = offered.some((o) => new RegExp(targetCourse.replace(/([()])/g, '\\$1'), 'i').test(o));
        if (matches) {
          const matchReasons = [`Offers verified program in ${targetCourse}.`];
          if (college.naacGrade) matchReasons.push(`Accredited with NAAC ${college.naacGrade} rating.`);
          if (college.district) matchReasons.push(`Located in ${college.district}, ${college.state || 'Kerala'}.`);

          recommendedColleges.push({
            collegeId: college._id,
            collegeName: college.name,
            matchedCourse: targetCourse,
            district: college.district || '',
            state: college.state || '',
            type: college.type || 'Government / Aided',
            matchReasons
          });
          break; // Avoid duplicate college entry
        }
      }
    }

    // Map Career Families based on top interests
    if (topInterests.includes('Investigative') || topInterests.includes('Realistic')) {
      careerFamilies.push({
        title: 'Technology & Software Engineering',
        description: 'Design, development, and architecture of intelligent computing systems, cloud software, and computational algorithms.',
        suitableRoles: ['Software Engineer', 'Full-Stack Developer', 'Systems Architect', 'Data Scientist']
      });
    }
    if (topInterests.includes('Social') || topInterests.includes('Investigative')) {
      careerFamilies.push({
        title: 'Healthcare & Pharmaceutical Sciences',
        description: 'Patient diagnostics, pharmaceutical formulation, clinical healthcare, and biomedical investigation.',
        suitableRoles: ['Clinical Pharmacist', 'Medical Practitioner', 'Healthcare Analyst', 'Biomedical Researcher']
      });
    }
    if (topInterests.includes('Enterprising') || topInterests.includes('Conventional')) {
      careerFamilies.push({
        title: 'Business Analytics & Corporate Management',
        description: 'Strategic leadership, organizational growth, financial technology, and structured corporate operations.',
        suitableRoles: ['Business Analyst', 'Financial Manager', 'Operations Director', 'Product Manager']
      });
    }

    return {
      recommendedCourses: topRecommendedCourses,
      recommendedColleges: recommendedColleges.slice(0, 4),
      strengths,
      improvementAreas,
      careerFamilies
    };
  }
};

export default aptitudeScoringService;

