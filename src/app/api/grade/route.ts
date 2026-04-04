import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

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

    // Fetch submission with assignment and model answer
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

    if (submission.autoGrade !== null) {
      return NextResponse.json(
        { error: "This submission has already been graded" },
        { status: 400 }
      );
    }

    // Use LLM to grade the submission
    const zai = await ZAI.create();

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

    let responseText = completion.choices[0]?.message?.content || "";

    // Clean up response - remove markdown code blocks if present
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let gradingResult;
    try {
      gradingResult = JSON.parse(responseText);
    } catch {
      // If JSON parsing fails, try to extract score from text
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

    // Ensure score is within bounds
    const finalScore = Math.max(
      0,
      Math.min(
        gradingResult.score || 0,
        submission.assignment.totalMarks
      )
    );

    // Update submission with auto-grade
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
    console.error("Error grading submission:", error);
    return NextResponse.json(
      { error: "Failed to grade submission. Please try again." },
      { status: 500 }
    );
  }
}
