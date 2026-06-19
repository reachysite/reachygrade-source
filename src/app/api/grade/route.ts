import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json({ error: "Submission ID is required" }, { status: 400 });
    }

    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          select: {
            title: true,
            description: true,
            modelAnswer: true,
            totalMarks: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.autoGrade !== null) {
      return NextResponse.json({ error: "Already graded" }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    if (
      submission.studentId !== userId &&
      (session.user as { role: string }).role !== "TEACHER" &&
      (session.user as { role: string }).role !== "ADMIN"
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const gradingPrompt = `You are an expert academic grader. Grade the following student submission against the model answer.

ASSIGNMENT: ${submission.assignment.title}
DESCRIPTION: ${submission.assignment.description}

MODEL ANSWER (Expected Answer):
 ${submission.assignment.modelAnswer}

STUDENT SUBMISSION:
 ${submission.content}

TOTAL MARKS: ${submission.assignment.totalMarks}

Please grade this submission and respond with ONLY a JSON object in this exact format (no markdown, no code blocks, just raw JSON):
{
  "score": <number out of ${submission.assignment.totalMarks}>,
  "feedback": "<detailed feedback explaining the grade>",
  "strengths": "<list of strengths>",
  "weaknesses": "<list of areas for improvement>",
  "keyPointsCovered": "<percentage estimate of key points covered>"
}

Be fair, encouraging but honest. Consider:
1. Accuracy of the content compared to the model answer
2. Completeness - did the student cover all key points?
3. Understanding - does the student demonstrate comprehension?
4. Presentation and clarity of the answer`;

    let responseText = "";
    let usedMethod = "";

    // Primary: z-ai-web-dev-sdk (works in sandbox only)
    try {
      console.log("[AI Grade] Attempting z-ai-web-dev-sdk...");
      const ZAI = await import("z-ai-web-dev-sdk");
      const zai = await ZAI.default.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: "You are an expert academic grader. Always respond with valid JSON only, no markdown formatting." },
          { role: "user", content: gradingPrompt },
        ],
        thinking: { type: "disabled" },
      });
      responseText = completion.choices[0]?.message?.content || "";
      usedMethod = "z-ai-web-dev-sdk";
      console.log("[AI Grade] z-ai-web-dev-sdk success, response length:", responseText.length);
    } catch (err) {
      console.error("[AI Grade] z-ai-web-dev-sdk failed:", err);
    }

    // Fallback 1: Groq API (free, fast — get key from console.groq.com/keys)
    if (!responseText) {
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          console.log("[AI Grade] Attempting Groq API fallback...");
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [
                { role: "system", content: "You are an expert academic grader. Always respond with valid JSON only, no markdown." },
                { role: "user", content: gradingPrompt },
              ],
              temperature: 0.3,
              max_tokens: 1024,
            }),
          });
          const data = await res.json();
          responseText = data?.choices?.[0]?.message?.content || "";
          usedMethod = "groq";
          console.log("[AI Grade] Groq success, response length:", responseText.length);
        } catch (err) {
          console.error("[AI Grade] Groq failed:", err);
        }
      }
    }

    // Fallback 2: Google Gemini API (if API key is available)
    if (!responseText) {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          console.log("[AI Grade] Attempting Gemini API fallback...");
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: gradingPrompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
              }),
            }
          );
          const data = await res.json();
          responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          usedMethod = "gemini";
          console.log("[AI Grade] Gemini success, response length:", responseText.length);
        } catch (err) {
          console.error("[AI Grade] Gemini failed:", err);
        }
      }
    }

    // If all AI methods failed
    if (!responseText) {
      console.error("[AI Grade] All AI methods failed");
      return NextResponse.json(
        { error: "AI grading service unavailable. Add a GROQ_API_KEY (from console.groq.com/keys) or GEMINI_API_KEY to your .env file." },
        { status: 503 }
      );
    }

    // Clean up response - remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let gradingResult;
    try {
      gradingResult = JSON.parse(responseText);
    } catch {
      // If JSON parsing fails, try to extract score from text
      const scoreMatch = responseText.match(/"score"\s*:\s*(\d+)/);
      const score = scoreMatch
        ? Math.min(parseInt(scoreMatch[1]), submission.assignment.totalMarks)
        : Math.round(submission.assignment.totalMarks * 0.5);
      gradingResult = { score, feedback: responseText, strengths: "N/A", weaknesses: "N/A", keyPointsCovered: "50%" };
    }

    // Ensure score is within bounds
    const finalScore = Math.max(0, Math.min(gradingResult.score || 0, submission.assignment.totalMarks));

    // Update submission with auto-grade
    const updatedSubmission = await db.submission.update({
      where: { id: submissionId },
      data: {
        autoGrade: finalScore,
        autoFeedback: gradingResult.feedback || "Graded successfully.",
      },
      include: {
        student: { select: { name: true } },
        assignment: { select: { id: true, title: true, totalMarks: true } },
      },
    });

    console.log("[AI Grade] Success! Score:", finalScore, "/", submission.assignment.totalMarks, "Method:", usedMethod);

    return NextResponse.json({
      message: "Assignment graded successfully",
      submission: updatedSubmission,
      gradingDetails: {
        score: finalScore,
        feedback: gradingResult.feedback,
        strengths: gradingResult.strengths,
        weaknesses: gradingResult.weaknesses,
        keyPointsCovered: gradingResult.keyPointsCovered,
      },
    });
  } catch (error) {
    console.error("[AI Grade] Error grading submission:", error);
    return NextResponse.json({ error: "Failed to grade submission. Please try again." }, { status: 500 });
  }
}