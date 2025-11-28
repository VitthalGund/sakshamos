import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Job from "@/models/Job";

export async function GET() {
    try {
        const session:any = await getServerSession(authOptions as any) as Session | null;
        if (!session || !session.user || session.user.role !== "freelancer") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const jobs = await Job.find({
            assignedFreelancerId: session.user.id,
            status: "InProgress"
        }).select("title clientName _id");

        return NextResponse.json(jobs);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
