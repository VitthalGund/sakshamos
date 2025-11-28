import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Job from "@/models/Job";
import User from "@/models/User"; // Assuming we might need to fetch freelancer details if not fully in Job

export async function GET() {
    try {
        const session:any = await getServerSession(authOptions as any) as Session | null;
        if (!session || !session.user || session.user.role !== "client") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        // Fetch jobs that are InProgress or Completed for this client
        const jobs = await Job.find({
            clientId: session.user.id,
            status: { $in: ["InProgress", "Completed"] }
        }).sort({ createdAt: -1 });

        // We might want to enrich this with freelancer details if they aren't fully stored on the job
        // For now, Job model has assignedFreelancerId. We can fetch names if needed, 
        // but the Job model update in previous steps didn't explicitly add freelancerName to the root, 
        // only to the bids. 
        // However, the `accept` route sets `assignedFreelancerId`.
        // Let's fetch the freelancer name for each job.

        const jobsWithFreelancers = await Promise.all(jobs.map(async (job: any) => {
            let freelancerName = "Unknown Freelancer";
            let freelancerEmail = "";

            if (job.assignedFreelancerId) {
                const freelancer = await User.findOne({ userId: job.assignedFreelancerId });
                if (freelancer) {
                    freelancerName = freelancer.name;
                    freelancerEmail = freelancer.email;
                }
            }

            return {
                ...job.toObject(),
                freelancerName,
                freelancerEmail
            };
        }));

        return NextResponse.json(jobsWithFreelancers);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal Error" }, { status: 500 });
    }
}
