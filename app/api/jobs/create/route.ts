import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Job from "@/models/Job";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
    try {
        await dbConnect();
        const session:any = await getServerSession(authOptions as any) as Session | null;

        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // Create Job in MongoDB
        const job: any = await Job.create({
            ...body,
            clientId: session.user.userId || session.user.id,
            clientName: session.user.name,
        });

        // Job Matching Logic
        const matchingFreelancers = await User.find({
            role: 'freelancer',
        });

        // Create Notifications in MongoDB
        const notifications = matchingFreelancers.map(freelancer => ({
            recipientId: freelancer.userId || freelancer._id.toString(),
            type: "job_match",
            message: `New Job Match: ${job.title} (${job.job_category})`,
            relatedJobId: job._id,
            read: false
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        // --- SYNC WITH JSON FILES FOR AGENTS ---
        try {
            const jobsFilePath = path.join(process.cwd(), 'public', 'data', 'dummy_job_feed_v3.json');
            const notifsFilePath = path.join(process.cwd(), 'public', 'data', 'notifications.json');

            // 1. Append to dummy_job_feed_v3.json
            if (fs.existsSync(jobsFilePath)) {
                const jobsData = JSON.parse(fs.readFileSync(jobsFilePath, 'utf-8'));
                const newJobJson = {
                    job_id: job._id.toString(),
                    client_id: session.user.userId || session.user.id,
                    company_id: "COMP_NEW", // Mock
                    title: job.title,
                    job_category: job.job_category,
                    budget_min: job.budgetMin,
                    budget_max: job.budgetMax,
                    currency: job.currency,
                    urgency_level: "Medium",
                    experience_level: job.experienceLevel,
                    job_description: job.description,
                    skills: job.skills,
                    required_hours_estimate: 20, // Mock
                    job_status: "Open",
                    match_score: 95, // Mock
                    platform: "Saksham",
                    posted_at: new Date().toISOString() // Crucial for sorting
                };
                jobsData.push(newJobJson);
                fs.writeFileSync(jobsFilePath, JSON.stringify(jobsData, null, 2));
            }

            // 2. Append to notifications.json
            if (fs.existsSync(notifsFilePath)) {
                const notifsData = JSON.parse(fs.readFileSync(notifsFilePath, 'utf-8'));
                const newNotifsJson = notifications.map(n => ({
                    notification_id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    recipient_id: n.recipientId,
                    type: n.type,
                    message: n.message,
                    related_job_id: n.relatedJobId.toString(),
                    is_read: false,
                    created_at: new Date().toISOString()
                }));
                notifsData.push(...newNotifsJson);
                fs.writeFileSync(notifsFilePath, JSON.stringify(notifsData, null, 2));
            }

        } catch (fileError) {
            console.error("Error syncing with JSON files:", fileError);
            // Don't fail the request if file sync fails, just log it
        }
        // ---------------------------------------

        return NextResponse.json({ message: "Job posted successfully", jobId: job._id, matches: notifications.length }, { status: 201 });

    } catch (error: any) {
        console.error("Job creation error:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
