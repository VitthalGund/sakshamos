import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
    try {
        await dbConnect();
        const session: any = await getServerSession(authOptions as any);

        // For now, fetch all 'job_post' notifications (broadcast) 
        // AND any notifications specific to the logged-in user.

        let query: any = { type: "job_post" };

        if (session && session.user) {
            const userId = session.user.userId || session.user.id;
            query = {
                $or: [
                    { type: "job_post" },
                    { recipientId: userId }
                ]
            };
        }

        const notifications = await Notification.find(query).sort({ createdAt: -1 });

        return NextResponse.json(notifications);

    } catch (error: any) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
