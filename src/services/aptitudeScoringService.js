import AptitudeQuestion from '../models/AptitudeQuestion.js';
import Course from '../models/Course.js';
import Category from '../models/Category.js';
import College from '../models/College.js';

export const aptitudeScoringService = {
  /**
   * Evaluates Career Discovery responses and generates direct undergraduate course recommendations
   */
  async scoreCareerDiscovery({ answers, student }) {
    const questionIds = answers.map((a) => a.questionId);
    const questions = await AptitudeQuestion.find({ _id: { $in: questionIds } }).lean();

    const questionMap = new Map();
    questions.forEach((q) => questionMap.set(q._id.toString(), q));

    // Tag frequency accumulator
    const tagWeights = {};
    const addTag = (tag, weight = 1) => {
      if (!tag) return;
      const t = String(tag).trim().toLowerCase();
      tagWeights[t] = (tagWeights[t] || 0) + weight;
    };

    const gradedAnswers = [];
    const collectedInterests = [];
    const collectedSubjects = [];
    const collectedStrengths = [];
    const collectedWorkStyles = [];

    // Also include student's saved profile stream & subjects if available
    const studentStream = (student?.academicProfile?.stream || '').toLowerCase();
    if (studentStream.includes('pcm')) {
      addTag('science', 2);
      addTag('pcm', 3);
      addTag('maths', 2);
    } else if (studentStream.includes('pcb')) {
      addTag('science', 2);
      addTag('pcb', 3);
      addTag('biology', 2);
    } else if (studentStream.includes('commerce')) {
      addTag('commerce', 3);
      addTag('business', 2);
      addTag('management', 2);
    }

    for (const ans of answers) {
      const q = questionMap.get(String(ans.questionId));
      if (!q) continue;

      const selectedVals = Array.isArray(ans.selectedOptions) && ans.selectedOptions.length > 0
        ? ans.selectedOptions
        : ans.selectedOption !== undefined && ans.selectedOption !== null
          ? [ans.selectedOption]
          : [];

      const matchedTags = [];
      const optionTexts = [];

      for (const val of selectedVals) {
        const opt = (q.options || []).find((o) => String(o.value) === String(val) || o.text === val);
        if (opt) {
          optionTexts.push(opt.text);
          if (Array.isArray(opt.tags)) {
            opt.tags.forEach((t) => {
              addTag(t, 2);
              matchedTags.push(t);
            });
          }

          // Category-based summaries
          if (q.section === 'academic_background' || q.category === 'Academic Stream') {
            collectedInterests.push(opt.text);
          } else if (q.section === 'subject_interests' || q.category === 'Subject Affinity') {
            collectedSubjects.push(opt.text);
          } else if (q.section === 'strengths' || q.category === 'Core Strengths' || q.category === 'Quantitative Confidence') {
            collectedStrengths.push(opt.text);
          } else if (q.section === 'work_preferences' || q.category === 'Work Environment' || q.category === 'Learning Style') {
            collectedWorkStyles.push(opt.text);
          } else if (q.section === 'career_interests') {
            collectedInterests.push(opt.text);
          }
        }
      }

      gradedAnswers.push({
        questionId: q._id,
        questionText: q.questionText,
        section: q.section,
        category: q.category,
        selectedOption: ans.selectedOption || (selectedVals[0] || null),
        selectedOptions: selectedVals,
        tags: matchedTags
      });
    }

    // Load real active courses from MongoDB
    const courses = await Course.find({ status: 'active' }).populate('category').lean();
    const colleges = await College.find({ status: 'active' }).lean();

    const scoredCourses = [];

    for (const course of courses) {
      let score = 55;
      const matchReasons = [];
      const courseName = (course.name || '').toLowerCase();
      const courseCategory = (course.category?.name || '').toLowerCase();
      const eligibility = (course.eligibility || '').toLowerCase();

      // Check Course Specific Match Logic
      if (courseName.includes('computer science and engineering') || courseName.includes('b.tech')) {
        // B.Tech CSE
        const techTags = (tagWeights['btech'] || 0) * 1.5 + (tagWeights['engineering'] || 0) * 1.5 + (tagWeights['computer_science'] || 0) + (tagWeights['coding'] || 0) + (tagWeights['software'] || 0) + (tagWeights['technology'] || 0);
        score += techTags * 3.5;

        if (tagWeights['pcm'] || tagWeights['maths_high']) {
          score += 15;
          matchReasons.push('Strongly matches your Plus Two Science with Mathematics (PCM) foundation.');
        }
        if (tagWeights['coding'] || tagWeights['software']) {
          matchReasons.push('Directly aligns with your passion for software architecture, coding, and computational systems.');
        }
        if (tagWeights['duration_4_years']) {
          score += 12;
          matchReasons.push('Aligns with your preference for a comprehensive 4-year professional engineering degree.');
        }
        if (course.careerOpportunities && course.careerOpportunities.length > 0) {
          matchReasons.push(`Leads to high-demand technical careers including ${course.careerOpportunities.slice(0, 2).join(' and ')}.`);
        }
      } else if (courseName === 'bca' || courseName.includes('bachelor of computer applications')) {
        // BCA
        const bcaTags = (tagWeights['bca'] || 0) * 1.5 + (tagWeights['computer_science'] || 0) + (tagWeights['coding'] || 0) + (tagWeights['software'] || 0) + (tagWeights['technology'] || 0);
        score += bcaTags * 3.2;

        if (tagWeights['coding'] || tagWeights['software'] || tagWeights['technology']) {
          matchReasons.push('Ideal for your interest in practical software programming, web development, and digital applications.');
        }
        if (tagWeights['duration_3_years']) {
          score += 12;
          matchReasons.push('Matches your preference for an intensive 3-year fast-track technology degree.');
        }
        if (tagWeights['maths_moderate'] || tagWeights['commerce_maths']) {
          score += 6;
          matchReasons.push('Great fit for students wanting software careers with practical applied mathematics.');
        }
        if (course.careerOpportunities && course.careerOpportunities.length > 0) {
          matchReasons.push(`Prepares you for immediate industry entry as ${course.careerOpportunities.slice(0, 2).join(' or ')}.`);
        }
      } else if (courseName.includes('b.sc') && courseName.includes('computer')) {
        // B.Sc Computer Science
        const bscTags = (tagWeights['bsc'] || 0) + (tagWeights['computer_science'] || 0) + (tagWeights['science'] || 0) + (tagWeights['theory'] || 0);
        score += bscTags * 3;

        if (tagWeights['science']) {
          score += 8;
          matchReasons.push('Compatible with your Science stream academic foundation.');
        }
        if (tagWeights['computer_science'] || tagWeights['coding']) {
          matchReasons.push('Provides a balanced combination of computational theory, algorithm design, and programming.');
        }
        if (tagWeights['duration_3_years']) {
          score += 6;
          matchReasons.push('3-year degree curriculum suited for quick progression to MCA or IT positions.');
        }
        if (course.careerOpportunities && course.careerOpportunities.length > 0) {
          matchReasons.push(`Direct avenues into roles such as ${course.careerOpportunities.slice(0, 2).join(' and ')}.`);
        }
      } else if (courseName.includes('pharm') || courseName.includes('pharmacy')) {
        // B.Pharm
        const pharmaTags = (tagWeights['bpharm'] || 0) + (tagWeights['pharmacy'] || 0) + (tagWeights['healthcare'] || 0) + (tagWeights['medicine'] || 0) + (tagWeights['chemistry'] || 0) + (tagWeights['biology'] || 0);
        score += pharmaTags * 4;

        if (tagWeights['pcb'] || tagWeights['biology'] || tagWeights['chemistry']) {
          score += 14;
          matchReasons.push('Directly matches your Plus Two Science background with Chemistry and Biology.');
        }
        if (tagWeights['healthcare'] || tagWeights['pharmacy'] || tagWeights['laboratory']) {
          matchReasons.push('Connects with your interest in healthcare formulation, laboratory research, and patient well-being.');
        }
        if (tagWeights['duration_4_years']) {
          score += 6;
          matchReasons.push('4-year professional pharmacy program registered under the Pharmacy Council of India.');
        }
        if (course.careerOpportunities && course.careerOpportunities.length > 0) {
          matchReasons.push(`Accredited qualification for high-responsibility roles like ${course.careerOpportunities.slice(0, 2).join(' and ')}.`);
        }
      } else if (courseName === 'bba' || courseName.includes('business administration')) {
        // BBA
        const bbaTags = (tagWeights['bba'] || 0) + (tagWeights['management'] || 0) + (tagWeights['business'] || 0) + (tagWeights['leadership'] || 0) + (tagWeights['corporate'] || 0) + (tagWeights['entrepreneurship'] || 0);
        score += bbaTags * 4;

        if (tagWeights['commerce'] || tagWeights['business'] || tagWeights['accounting']) {
          score += 12;
          matchReasons.push('Natural academic progression from your Plus Two Commerce / Business Studies background.');
        }
        if (tagWeights['leadership'] || tagWeights['communication'] || tagWeights['entrepreneurship']) {
          matchReasons.push('Strongly resonates with your interest in organizational leadership, marketing strategy, and management.');
        }
        if (tagWeights['duration_3_years']) {
          score += 6;
          matchReasons.push('3-year professional management curriculum providing rapid corporate launchpad.');
        }
        if (course.careerOpportunities && course.careerOpportunities.length > 0) {
          matchReasons.push(`Prepares you for executive career tracks including ${course.careerOpportunities.slice(0, 2).join(' and ')}.`);
        }
      } else {
        // Generic fallback for any other course in MongoDB
        score += 15;
        matchReasons.push(`A recognized undergraduate degree in ${course.category?.name || 'Higher Education'}.`);
      }

      // Bound score between 62 and 96
      const finalScore = Math.min(Math.max(Math.round(score), 62), 96);

      // Determine match level
      let matchLevel = 'Good Match';
      if (finalScore >= 88) matchLevel = 'Top Recommendation';
      else if (finalScore >= 78) matchLevel = 'Strong Match';
      else if (finalScore >= 68) matchLevel = 'Good Match';
      else matchLevel = 'Worth Exploring';

      if (matchReasons.length === 0) {
        matchReasons.push(`Verified program under DISHA catalog for ${course.category?.name || 'Undergraduate'} studies.`);
      }

      scoredCourses.push({
        courseId: course._id,
        courseName: course.name,
        category: course.category?.name || 'General',
        duration: course.duration || '3-4 Years',
        eligibility: course.eligibility || '10+2',
        feeStructure: course.feeStructure || '',
        expectedSalaryRange: course.expectedSalaryRange || '',
        rawScore: score,
        indicativeScore: Math.min(Math.max(Math.round(score), 62), 96),
        matchLevel,
        matchReasons,
        careerOpportunities: course.careerOpportunities || [],
        entranceExams: course.entranceExams || []
      });
    }

    // Sort descending by raw score for deterministic ranking
    scoredCourses.sort((a, b) => b.rawScore - a.rawScore);

    // Normalize and calibrate indicative scores and match levels based on rank
    scoredCourses.forEach((c, idx) => {
      if (idx === 0) {
        c.indicativeScore = Math.min(Math.max(c.indicativeScore, 92), 96);
        c.matchLevel = 'Top Recommendation';
      } else if (idx === 1) {
        c.indicativeScore = Math.min(c.indicativeScore, 89);
        c.matchLevel = c.indicativeScore >= 80 ? 'Strong Match' : 'Good Match';
      } else if (idx === 2) {
        c.indicativeScore = Math.min(c.indicativeScore, 82);
        c.matchLevel = c.indicativeScore >= 75 ? 'Strong Match' : 'Good Match';
      } else {
        c.indicativeScore = Math.min(c.indicativeScore, 72);
        c.matchLevel = 'Worth Exploring';
      }
      delete c.rawScore;
    });

    // Match real Colleges from MongoDB offering the top courses
    const targetCourseNames = scoredCourses.slice(0, 3).map((c) => c.courseName);
    const matchedColleges = [];

    for (const college of colleges) {
      const offered = Array.isArray(college.coursesOffered)
        ? college.coursesOffered.map((o) => (typeof o === 'object' ? o.name : o))
        : [];

      for (const targetCourse of targetCourseNames) {
        const matches = offered.some((o) => new RegExp(targetCourse.replace(/([()])/g, '\\$1'), 'i').test(o));
        if (matches) {
          const reasons = [`Offers verified program in ${targetCourse}.`];
          if (college.naacGrade) reasons.push(`NAAC ${college.naacGrade} accredited institution.`);
          if (college.district) reasons.push(`Located in ${college.district}, ${college.state || 'Kerala'}.`);

          matchedColleges.push({
            collegeId: college._id,
            collegeName: college.name,
            matchedCourse: targetCourse,
            district: college.district || '',
            state: college.state || '',
            type: college.type || 'Government / Aided',
            matchReasons: reasons
          });
          break;
        }
      }
    }

    const profileSummary = {
      topInterests: [...new Set(collectedInterests)].slice(0, 4),
      enjoyedSubjects: [...new Set(collectedSubjects)].slice(0, 4),
      workStylePreferences: [...new Set(collectedWorkStyles)].slice(0, 3),
      strengths: [...new Set(collectedStrengths)].slice(0, 3)
    };

    return {
      courseRecommendations: scoredCourses,
      collegeRecommendations: matchedColleges.slice(0, 4),
      profileSummary,
      gradedAnswers
    };
  },

  /**
   * Deterministically calculate RIASEC Interest and Ability scores from submitted answers (Legacy v1.0)
   */
  async calculateScores(answers) {
    const questionIds = answers.map((a) => a.questionId);
    const questions = await AptitudeQuestion.find({ _id: { $in: questionIds } })
      .select('+correctAnswer +explanation')
      .lean();

    const questionMap = new Map();
    questions.forEach((q) => questionMap.set(q._id.toString(), q));

    const interestTotals = {
      Realistic: { score: 0, count: 0 },
      Investigative: { score: 0, count: 0 },
      Artistic: { score: 0, count: 0 },
      Social: { score: 0, count: 0 },
      Enterprising: { score: 0, count: 0 },
      Conventional: { score: 0, count: 0 }
    };

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
          explanation: q.explanation
        });
      }
    }

    const interestScores = {};
    for (const [cat, data] of Object.entries(interestTotals)) {
      const maxScore = data.count > 0 ? data.count * 5 : 20;
      const percentage = maxScore > 0 ? Math.round((data.score / maxScore) * 100) : 0;
      interestScores[cat] = { score: data.score, maxScore, percentage };
    }

    const sortedInterests = Object.entries(interestScores)
      .sort((a, b) => b[1].percentage - a[1].percentage)
      .map(([cat]) => cat);

    const topInterests = sortedInterests.slice(0, 3);
    const riasecCode = topInterests.map((t) => t[0]).join('');

    let totalScore = 0;
    let totalMaxScore = 0;
    const abilityScores = {};

    for (const [key, data] of Object.entries(abilityTotals)) {
      totalScore += data.score;
      totalMaxScore += data.maxScore;
      const percentage = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0;
      abilityScores[key] = { score: data.score, maxScore: data.maxScore, percentage };
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
   * Transparent Rule-Based Educational Matching for legacy RIASEC v1.0
   */
  async generateRuleBasedRecommendations({ student, topInterests, abilityScores }) {
    const courses = await Course.find({ status: 'active' }).populate('category').lean();
    const colleges = await College.find({ status: 'active' }).lean();

    const academicStream = (student?.academicProfile?.stream || '').toLowerCase();
    const recommendedCourses = [];
    const recommendedColleges = [];

    for (const course of courses) {
      let indicativeScore = 60;
      const matchReasons = [];
      const courseName = course.name.toLowerCase();
      const courseCat = (course.category?.name || '').toLowerCase();

      if (topInterests.includes('Investigative')) {
        if (/computer|science|bca|b.tech|engineering|data|pharm/i.test(courseName + ' ' + courseCat)) {
          indicativeScore += 18;
          matchReasons.push('Strong alignment with your high Investigative interest.');
        }
      }
      if (topInterests.includes('Enterprising')) {
        if (/bba|commerce|management|business|finance/i.test(courseName + ' ' + courseCat)) {
          indicativeScore += 15;
          matchReasons.push('Directly matches your Enterprising profile in leadership.');
        }
      }

      if (academicStream) {
        if (academicStream.includes('science') && /engineering|technology|bca|b.tech|b.sc|pharm/i.test(courseName + ' ' + courseCat)) {
          indicativeScore += 10;
          matchReasons.push('Compatible with your Higher Secondary Science academic background.');
        }
      }

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

    recommendedCourses.sort((a, b) => b.indicativeScore - a.indicativeScore);

    return {
      recommendedCourses: recommendedCourses.slice(0, 4),
      recommendedColleges: recommendedColleges.slice(0, 4),
      strengths: ['Clear logical problem-solving and structured deductive reasoning.'],
      improvementAreas: ['Continue strengthening advanced application-level problem solving.'],
      careerFamilies: []
    };
  }
};

export default aptitudeScoringService;
