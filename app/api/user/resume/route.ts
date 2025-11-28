import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { extractTextFromBuffer, analyzeResumeWithGemini } from "@/lib/resume-analyzer";

export async function POST(req: NextRequest) {
    try {
        const session: any = await getServerSession(authOptions as any);
        if (!session) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).userId || (session.user as any).id;
        
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const mimeType = file.type;

        // 1. Parse Resume
        const text = await extractTextFromBuffer(buffer, mimeType);
        if (!text) {
            return NextResponse.json({ message: "Could not extract text from file" }, { status: 400 });
        }

        // 2. Analyze with Gemini
        const analysis = await analyzeResumeWithGemini(text);
        const { skills, experienceYears, credibilityScore } = analysis;

        await dbConnect();

        // 3. Calculate Final Score (Hybrid: AI Score + Financial Trust)
        // We use the AI's credibility score as a base, but we can still boost it with financial data if we want.
        // Or we can just use the AI score directly. Let's blend them.
        // Let's use the scoring service to add the "Financial Trust" bonus on top of the AI score.
        // But the scoring service calculates everything from scratch.
        // Let's modify the logic: AI gives the "Resume Quality" score. We add "Financial Trust".
        
        // Fetch user to check bank connection
        const user = await User.findOne({ userId });
        let finalScore = credibilityScore;
        
        if (user && user.isBankConnected) {
            finalScore = Math.min(finalScore + 20, 100); // Bonus for bank connection
        }

        // 4. Update User
        const updatedUser = await User.findOneAndUpdate(
            { userId },
            {
                $set: {
                    skills: skills,
                    experienceYears: experienceYears,
                    credibilityScore: finalScore,
                    resumeUploadedAt: new Date()
                }
            },
            { new: true }
        );

        return NextResponse.json({
            success: true,
            score: finalScore,
            skills: skills,
            experienceYears: experienceYears,
            message: "Resume processed and profile updated successfully"
        });

    } catch (error: any) {
        console.error("Resume upload error:", error);
        return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
