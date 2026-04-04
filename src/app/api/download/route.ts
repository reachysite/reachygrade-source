import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const projectDir = "/home/z/my-project";
    const zipPath = join(projectDir, "reachygrade-source.zip");

    // Clean up any previous zip
    try { unlinkSync(zipPath); } catch { /* ignore */ }

    // Create a ZIP of the source code
    // Includes: src/, prisma/, config files, env template
    // Excludes: node_modules, .next, .git, db/*.db, ZIP files
    const files = [
      "src/",
      "prisma/",
      "public/",
      "package.json",
      "next.config.ts",
      "tsconfig.json",
      "postcss.config.mjs",
      "components.json",
      ".env.local",
      ".env",
    ];

    execSync(
      `cd ${projectDir} && zip -r reachygrade-source.zip ${files.join(" ")} -x "*.db" "*.db-journal" "*.zip" "node_modules/*" ".next/*" ".git/*" -q`,
      { timeout: 30000 }
    );

    const fileBuffer = readFileSync(zipPath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="reachygrade-source.zip"',
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error creating download:", error);
    return NextResponse.json(
      { error: "Failed to create download" },
      { status: 500 }
    );
  }
}
