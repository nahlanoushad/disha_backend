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
   * Generates structured career guidance and personalized educational explanation.
   * STRICT PRIVACY: Only anonymized academic metrics, RIASEC percentages, and ability scores are sent.
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
      console.log('[Gemini Service] Notice: GEMINI_API_KEY not configured. Falling back to rule-based analysis.');
      return {
        status: 'unavailable',
        errorMessage: 'Gemini AI API key is not configured in the backend environment. Standard factual analysis and recommendations remain fully operational.'
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
      const modelsToTry = [preferredModel, 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'].filter(
        (m, idx, arr) => m && arr.indexOf(m) === idx
      );

      // Prepare anonymized educational payload
      const anonymizedPayload = {
        topInterests,
        interestScores,
        abilityScores: {
          logicalReasoning: abilityScores.logicalReasoning.percentage + '%',
          numericalReasoning: abilityScores.numericalReasoning.percentage + '%',
          verbalReasoning: abilityScores.verbalReasoning.percentage + '%',
          analyticalThinking: abilityScores.analyticalThinking.percentage + '%',
          overallPercentage: abilityScores.overallPercentage + '%'
        },
        academicStream: academicStream || 'Higher Secondary (Plus Two)',
        subjects: subjects || [],
        availableCoursesInCatalog: candidateCourses.map((c) => ({
          id: c.courseId?.toString() || c._id?.toString(),
          name: c.courseName || c.name,
          category: c.category || 'General'
        })),
        availableCollegesInCatalog: candidateColleges.map((col) => ({
          id: col.collegeId?.toString() || col._id?.toString(),
          name: col.collegeName || col.name,
          district: col.district || 'Kerala'
        }))
      };

      const systemPrompt = `You are DISHA AI, an expert, encouraging, and objective higher education counselor for students who completed Higher Secondary (Plus Two) in India.
Analyze the student's multidimensional aptitude results (RIASEC interests and cognitive ability scores) and academic stream.
You MUST follow these strict guidelines:
1. Do NOT invent new course names or colleges. Only reference the candidate courses and colleges provided in the payload.
2. Provide constructive, inspiring, and realistic guidance. Never promise admission or diagnose psychological traits.
3. Keep explanations concise, professional, structured, and easy for students to understand.
4. Output STRICT JSON conforming to this schema:
{
  "interestInterpretation": "2-3 sentences explaining their dominant RIASEC interest themes",
  "strengthsSummary": "2-3 sentences highlighting their verified reasoning strengths",
  "growthAreas": "1-2 constructive, encouraging tips for areas with improvement potential",
  "learningGuidance": "Actionable next steps, recommended skills, and academic pathways",
  "personalizedExplanation": "Clear synthesis of why the selected courses match their profile",
  "recommendedCourseIds": ["id1", "id2"],
  "recommendedCollegeIds": ["id1", "id2"]
}`;

      let parsed = null;
      let activeModel = preferredModel;
      let lastErr = null;

      for (const modelToAttempt of modelsToTry) {
        try {
          console.log(`[Gemini Service] Requesting AI guidance using model: ${modelToAttempt}...`);
          const response = await ai.models.generateContent({
            model: modelToAttempt,
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nStudent Assessment Data:\n${JSON.stringify(anonymizedPayload, null, 2)}` }] }
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

      // Validate that recommended IDs actually exist in candidate lists (anti-hallucination filter)
      const validCourseIds = new Set(candidateCourses.map((c) => (c.courseId?.toString() || c._id?.toString())));
      const validCollegeIds = new Set(candidateColleges.map((col) => (col.collegeId?.toString() || col._id?.toString())));

      const safeCourseIds = Array.isArray(parsed.recommendedCourseIds)
        ? parsed.recommendedCourseIds.filter((id) => validCourseIds.has(String(id)))
        : [];
      const safeCollegeIds = Array.isArray(parsed.recommendedCollegeIds)
        ? parsed.recommendedCollegeIds.filter((id) => validCollegeIds.has(String(id)))
        : [];

      return {
        status: 'available',
        modelUsed: activeModel,
        interestInterpretation: parsed.interestInterpretation || '',
        strengthsSummary: parsed.strengthsSummary || '',
        growthAreas: parsed.growthAreas || '',
        learningGuidance: parsed.learningGuidance || '',
        personalizedExplanation: parsed.personalizedExplanation || '',
        validatedCourseIds: safeCourseIds,
        validatedCollegeIds: safeCollegeIds,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('[Gemini Service] Error generating AI analysis:', error.message);
      return {
        status: 'failed',
        errorMessage: `AI analysis generation encountered an issue: ${error.message}. Factual rule-based recommendations remain active.`
      };
    }
  }
};

export default geminiService;

