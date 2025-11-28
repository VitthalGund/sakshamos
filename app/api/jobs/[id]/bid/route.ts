import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import fs from "fs";
import path from "path";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import Job from "@/models/Job";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session: any = await getServerSession(authOptions as any);
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const jobId = params.id;
        const body = await req.json();
        const { amount, bidAmount, proposal, coverLetter, estimatedDays } = body;
        const finalAmount = Number(amount || bidAmount);
        const finalProposal = proposal || coverLetter;

        await dbConnect();

        // 1. Find Job in DB
        let job = await Job.findById(jobId);
        let clientId = "";
        let jobTitle = "";

        if (job) {
            // Add bid to Job document
            job.bids.push({
                freelancerId: session.user.userId || session.user.id,
                freelancerName: session.user.name,
                amount: finalAmount,
                proposal: finalProposal,
                estimatedDays: Number(estimatedDays),
                createdAt: new Date()
            });
            await job.save();

            clientId = job.clientId;
            jobTitle = job.title;
        } else {
            // Fallback: Check if it's a seeded job (for notification purposes only)
            const jobsFilePath = path.join(process.cwd(), 'public', 'data', 'dummy_job_feed_v3.json');
            if (fs.existsSync(jobsFilePath)) {
                const jobs = JSON.parse(fs.readFileSync(jobsFilePath, 'utf-8'));
                const jsonJob = jobs.find((j: any) => j.job_id === jobId);
                if (jsonJob) {
                    clientId = jsonJob.client_id;
                    jobTitle = jsonJob.title;
                    // Note: We can't save the bid to the JSON file as per requirements, 
                    // but we can still notify the client if they exist in our system.
                }
            }
        }

        // 2. Create Notification for Client
        if (clientId) {
            await Notification.create({
                recipientId: clientId,
                type: "proposal_received",
                message: `New Bid: ${session.user.name} applied for ${jobTitle}.`,
                relatedJobId: jobId,
                read: false,
                createdAt: new Date()
            });
        }

        return NextResponse.json({ success: true, message: "Bid submitted successfully" });

    } catch (error: any) {
        console.error("Bid submission error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
