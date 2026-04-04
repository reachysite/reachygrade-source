import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import mammoth from "mammoth";

// v2 - using pdfjs-dist for ESM-compatible PDF extraction

// ESM-compatible PDF text extraction using pdfjs-dist
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  
  // Set worker path
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default || "";

  // Load the PDF document from buffer
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });
  
  const pdf = await loadingTask.promise;
  const textParts: string[] = [];

  // Extract text from each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    textParts.push(pageText);
  }

  return textParts.join("\n").trim();
}

export async function POST(request: NextRequest) {
  const db = new PrismaClient();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can submit files" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assignmentId = formData.get("assignmentId") as string | null;

    if (!file || !assignmentId) {
      return NextResponse.json(
        { error: "File and assignment ID are required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: "Only PDF, DOCX, and TXT files are allowed" },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    // Extract text based on file type
    if (fileExt === ".txt") {
      extractedText = buffer.toString("utf-8");
    } else if (fileExt === ".docx") {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (fileExt === ".pdf") {
      extractedText = await extractTextFromPDF(buffer);
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        {
          error:
            "Could not extract any text from the file. Please ensure the file contains readable text.",
        },
        { status: 400 }
      );
    }

    // Check for existing submission
    const userId = (session.user as { id: string }).id;
    const existingSubmission = await db.submission.findFirst({
      where: {
        assignmentId,
        studentId: userId,
      },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: "You have already submitted this assignment" },
        { status: 409 }
      );
    }

    // Create submission
    const submission = await db.submission.create({
      data: {
        content: extractedText,
        fileName: file.name,
        fileType: fileExt.replace(".", ""),
        assignmentId,
        studentId: userId,
      },
      include: {
        student: { select: { name: true, email: true } },
        assignment: { select: { id: true, title: true, totalMarks: true } },
      },
    });

    return NextResponse.json(
      {
        message: "File uploaded and processed successfully",
        submission,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error processing file upload:", error);
    return NextResponse.json(
      { error: "Failed to process file upload. Please try again." },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
  }
}
