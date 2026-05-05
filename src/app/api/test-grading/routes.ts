import { NextResponse } from "next/server";

export async function GET() {
  const results: { step: string; status: string; detail: string }[] = [];

  // Step 1: Check if Gemini API key exists
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    results.push({ step: "1. GEMINI_API_KEY", status: "Found", detail: `Key starts with: ${geminiKey.substring(0, 6)}...` });
  } else {
    results.push({ step: "1. GEMINI_API_KEY", status: "Missing", detail: "Add GEMINI_API_KEY=your_key to your .env file" });
    return NextResponse.json({ results, error: "Gemini key not found. Fix this first." });
  }

  // Step 2: Test Gemini API call
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Reply with just the word HELLO" }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 10 },
        }),
      }
    );
    const data = await res.json();

    if (data.error) {
      results.push({ step: "2. Gemini API Call", status: "Failed", detail: data.error.message || JSON.stringify(data.error) });
    } else if (data.candidates && data.candidates[0]) {
      const text = data.candidates[0].content?.parts?.[0]?.text || "No response";
      results.push({ step: "2. Gemini API Call", status: "Working", detail: `Response: "${text}"` });
    } else {
      results.push({ step: "2. Gemini API Call", status: "Unexpected", detail: JSON.stringify(data).substring(0, 200) });
    }
  } catch (err) {
    results.push({ step: "2. Gemini API Call", status: "Network Error", detail: String(err) });
  }

  return NextResponse.json({ results });
}