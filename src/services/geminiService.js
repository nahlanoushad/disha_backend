import { GoogleGenAI } from '@google/genai';

/**
 * Gemini AI Guidance Service
 * Implements structured, privacy-preserving educational analysis using @google/genai.
 * Fails safely with informative fallback when API key is missing or service is unreachable.
 */

export const geminiService = {
  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  },

  /**
   * Generates grounded Career Discovery guidance and natural language explanations for Plus Two students.
   * STRICT PRIVACY: Only anonymized academic stream, enjoyed subjects, selected interest tags, and candidate courses are sent.
   */
  async generateCareerGuidance({
    studentProfile,
    profileSummary,
    candidateCourses,
    candidateColleges
  }) {
    if (!this.isConfigured()) {
      console.log('[Gemini Service] Notice: GEMINI_API_KEY not configured. Falling back to rule-based explanation.');
      return this._generateCareerFallbackGuidance({ studentProfile, profileSummary, candidateCourses });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const modelsToTry = [preferredModel, 'gemini-2.5-flash', 'gemini-1.5-flash'].filter(
        (m, idx, arr) => m && arr.indexOf(m) === idx
      );

      const anonymizedPayload = {
        academicStream: studentProfile?.stream || 'Higher Secondary (Plus Two)',
        enjoyedSubjects: profileSummary?.enjoyedSubjects || studentProfile?.subjects || [],
        topInterestThemes: profileSummary?.topInterests || [],
        strengthsIdentified: profileSummary?.strengths || [],
        workStylePreferences: profileSummary?.workStylePreferences || [],
        candidateCourses: candidateCourses.map((c) => ({
          id: c.courseId?.toString() || c._id?.toString(),
          name: c.courseName || c.name,
          category: c.category || 'General',
          duration: c.duration || '',
          careers: c.careerOpportunities || []
        })),
        candidateColleges: candidateColleges.slice(0, 4).map((col) => ({
          id: col.collegeId?.toString() || col._id?.toString(),
          name: col.collegeName || col.name,
          district: col.district || 'Kerala'
        }))
      };

      const systemPrompt = `You are DISHA AI, an expert, supportive, and objective higher education counselor for students who completed Higher Secondary (Plus Two) in India.
Analyze the student's career discovery assessment responses and provide clear, empathetic, structured educational guidance.
STRICT RULES:
1. Do NOT invent new course names or colleges. Only reference the candidate courses and colleges provided in the payload.
2. Do not use RIASEC psychological jargon. Use warm, clear language suited for a Plus Two student deciding their undergraduate college degree.
3. Explain why the top recommended courses match their subjects, interests, and preferred work environment.
4. Provide actionable preparation tips (e.g. foundational skills to explore before college begins).
5. Output STRICT JSON conforming to this schema:
{
  "studentSummary": "2-3 warm, encouraging sentences summarizing their academic potential and core strengths",
  "whyTheseCourses": "3-4 clear sentences explaining why the top candidate courses are a great fit for their background",
  "learningGuidance": "2-3 practical, actionable next steps or skills they can explore before college starts",
  "growthAreas": "1-2 constructive, encouraging tips for areas to build confidence in during undergraduate studies",
  "recommendedCourseIds": ["id1", "id2"]
}`;

      let parsed = null;
      let activeModel = preferredModel;
      let lastErr = null;

      for (const modelToAttempt of modelsToTry) {
        try {
          console.log(`[Gemini Service] Requesting Career Discovery guidance using model: ${modelToAttempt}...`);
          const response = await ai.models.generateContent({
            model: modelToAttempt,
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nStudent Career Assessment Data:\n${JSON.stringify(anonymizedPayload, null, 2)}` }] }
            ],
            config: {
              responseMimeType: 'application/json'
            }
          });

          const responseText = typeof response.text === 'function' ? response.text() : response.text;
          if (responseText) {
            parsed = JSON.parse(responseText);
            activeModel = modelToAttempt;
            break;
          }
        } catch (attemptErr) {
          console.warn(`[Gemini Service] Model ${modelToAttempt} failed (${attemptErr.message?.slice(0, 80)}). Trying fallback if available...`);
          lastErr = attemptErr;
        }
      }

      if (!parsed) {
        throw lastErr || new Error('Empty response received from Gemini API');
      }

      const validCourseIds = new Set(candidateCourses.map((c) => (c.courseId?.toString() || c._id?.toString())));
      const safeCourseIds = Array.isArray(parsed.recommendedCourseIds)
        ? parsed.recommendedCourseIds.filter((id) => validCourseIds.has(String(id)))
        : [];

      return {
        status: 'available',
        modelUsed: activeModel,
        studentSummary: parsed.studentSummary || '',
        whyTheseCourses: parsed.whyTheseCourses || '',
        learningGuidance: parsed.learningGuidance || '',
        growthAreas: parsed.growthAreas || '',
        validatedCourseIds: safeCourseIds,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('[Gemini Service] Error generating AI career analysis:', error.message);
      return this._generateCareerFallbackGuidance({
        studentProfile,
        profileSummary,
        candidateCourses,
        errorMessage: `AI analysis generation encountered an issue: ${error.message}. Factual course matching remains fully active.`
      });
    }
  },

  /**
   * Safe, deterministic rule-based guidance fallback when Gemini is unavailable
   */
  _generateCareerFallbackGuidance({ studentProfile, profileSummary, candidateCourses, errorMessage }) {
    const topCourse = candidateCourses[0];
    const stream = studentProfile?.stream || 'Higher Secondary';
    const topSubjects = (profileSummary?.enjoyedSubjects || []).join(', ') || 'your core subjects';

    return {
      status: errorMessage ? 'failed' : 'unavailable',
      errorMessage: errorMessage || 'Gemini AI API key is not configured. Rule-based recommendations and verified catalog matching are active.',
      modelUsed: 'DISHA Rule-Based Recommendation Engine',
      studentSummary: `Based on your ${stream} background and enjoyment of ${topSubjects}, your profile displays strong focus and clear orientation towards practical degree programs.`,
      whyTheseCourses: topCourse
        ? `Programs like ${topCourse.courseName || topCourse.name} (${topCourse.category || 'Undergraduate'}) match your academic preferences, providing direct pathways into verified career sectors.`
        : 'The recommended programs offer structured degree paths aligned with your selected Plus Two interests.',
      learningGuidance: 'Explore foundational introductory courses, review core syllabus topics for your chosen degree, and research university admission deadlines.',
      growthAreas: 'Build confidence by participating in group discussions, working on small self-directed projects, and connecting with seniors in your target field.',
      generatedAt: new Date()
    };
  },

  /**
   * Legacy method for RIASEC v1.0 attempts
   */
  async generateGuidance({
    topInterests,
    interestScores,
    abilityScores,
    academicStream,
    subjects,
    candidateCourses,
    candidateColleges
  }) {
    if (!this.isConfigured()) {
      return {
        status: 'unavailable',
        errorMessage: 'Gemini AI API key is not configured.'
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

      const anonymizedPayload = {
        topInterests,
        interestScores,
        abilityScores,
        academicStream,
        subjects,
        candidateCourses: candidateCourses.map((c) => ({
          id: c.courseId?.toString() || c._id?.toString(),
          name: c.courseName || c.name,
          category: c.category || 'General'
        }))
      };

      const response = await ai.models.generateContent({
        model: preferredModel,
        contents: [
          { role: 'user', parts: [{ text: `Provide RIASEC higher education guidance in JSON:\n${JSON.stringify(anonymizedPayload, null, 2)}` }] }
        ],
        config: { responseMimeType: 'application/json' }
      });

      const responseText = typeof response.text === 'function' ? response.text() : response.text;
      const parsed = JSON.parse(responseText || '{}');

      return {
        status: 'available',
        modelUsed: preferredModel,
        interestInterpretation: parsed.interestInterpretation || '',
        strengthsSummary: parsed.strengthsSummary || '',
        growthAreas: parsed.growthAreas || '',
        learningGuidance: parsed.learningGuidance || '',
        personalizedExplanation: parsed.personalizedExplanation || '',
        generatedAt: new Date()
      };
    } catch (err) {
      return {
        status: 'failed',
        errorMessage: err.message
      };
    }
  }
};

export default geminiService;
