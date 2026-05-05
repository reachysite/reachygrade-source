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
      return NextResponse.json(
        { error: "Submission ID is required" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.autoGrade !== null && body.force !== true) {
      return NextResponse.json(
        { error: "This submission has already been graded" },
        { status: 400 }
      );
    }

    console.log(`[GRADE] Starting grading for submission ${submissionId}, assignment: ${submission.assignment.title}`);

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
  "feedback": "<detailed feedback explaining the grade, what was done well, what could be improved, and any missing key points>",
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

    // Method 1: Try z-ai-web-dev-sdk (works in sandbox)
    try {
      console.log("[GRADE] Trying Z.AI SDK...");
      const ZAI = await import("z-ai-web-dev-sdk");
      const zai = await ZAI.default.create();
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "You are an expert academic grader. Always respond with valid JSON only, no markdown formatting.",
          },
          {
            role: "user",
            content: gradingPrompt,
          },
        ],
        thinking: { type: "disabled" },
      });
      responseText = completion.choices[0]?.message?.content || "";
      if (responseText) {
        console.log("[GRADE] Z.AI SDK succeeded, got response");
      } else {
        console.log("[GRADE] Z.AI SDK returned empty response");
      }
    } catch (err) {
      console.error("[GRADE] Z.AI SDK failed:", err);
    }

    // Method 2: Try Google Gemini (works locally with API key)
    if (!responseText) {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (geminiKey) {
        try {
          console.log("[GRADE] Trying Gemini...");
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: gradingPrompt }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 1024,
                },
              }),
            }
          );
          const data = await res.json();
          responseText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (responseText) {
            console.log("[GRADE] Gemini succeeded");
          } else {
            console.log("[GRADE] Gemini returned empty response");
          }
        } catch (err) {
          console.error("[GRADE] Gemini failed:", err);
        }
      } else {
        console.log("[GRADE] No GEMINI_API_KEY configured");
      }
    }

    // Method 3: Try Groq (free tier)
    if (!responseText) {
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          console.log("[GRADE] Trying Groq...");
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                {
                  role: "system",
                  content: "You are an expert academic grader. Always respond with valid JSON only.",
                },
                {
                  role: "user",
                  content: gradingPrompt,
                },
              ],
              temperature: 0.3,
              max_tokens: 1024,
            }),
          });
          const data = await res.json();
          responseText = data?.choices?.[0]?.message?.content || "";
          if (responseText) {
            console.log("[GRADE] Groq succeeded");
          } else {
            console.log("[GRADE] Groq returned empty response");
          }
        } catch (err) {
          console.error("[GRADE] Groq failed:", err);
        }
      } else {
        console.log("[GRADE] No GROQ_API_KEY configured");
      }
    }

    if (!responseText) {
      console.error("[GRADE] All AI methods failed for submission", submissionId);
      return NextResponse.json(
        { error: "AI grading service is currently unavailable. Your submission is saved and will be graded when the service is back." },
        { status: 503 }
      );
    }

    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let gradingResult;
    try {
      gradingResult = JSON.parse(responseText);
    } catch {
      console.log("[GRADE] JSON parse failed, attempting regex extraction");
      const scoreMatch = responseText.match(/"score"\s*:\s*(\d+)/);
      const score = scoreMatch
        ? Math.min(
            parseInt(scoreMatch[1]),
            submission.assignment.totalMarks
          )
        : Math.round(submission.assignment.totalMarks * 0.5);
      gradingResult = {
        score,
        feedback: responseText,
        strengths: "Could not parse detailed grading",
        weaknesses: "Could not parse detailed grading",
        keyPointsCovered: "50%",
      };
    }

    const finalScore = Math.max(
      0,
      Math.min(
        gradingResult.score || 0,
        submission.assignment.totalMarks
      )
    );

    console.log(`[GRADE] Final score: ${finalScore}/${submission.assignment.totalMarks}`);

    const updatedSubmission = await db.submission.update({
      where: { id: submissionId },
      data: {
        autoGrade: finalScore,
        autoFeedback: gradingResult.feedback || "Graded successfully.",
      },
      include: {
        student: { select: { name: true } },
        assignment: {
          select: { id: true, title: true, totalMarks: true },
        },
      },
    });

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
    console.error("[GRADE] Error grading submission:", error);
    return NextResponse.json(
      { error: "Failed to grade submission. Please try again." },
      { status: 500 }
    );
  }
}