import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";

export async function GET(req: Request) {
    try {
        const session: any = await getServerSession(authOptions as any);
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const events = await Event.find({ userId: session.user.id });
        return NextResponse.json(events);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session: any = await getServerSession(authOptions as any);
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        await dbConnect();

        const newEvent = await Event.create({
            event_id: `evt_${Date.now()}`,
            userId: session.user.id,
            title: body.title,
            start_time: body.date, // Simplified for demo
            end_time: body.date,
            event_type: body.type,
            description: ""
        });

        return NextResponse.json(newEvent);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session: any = await getServerSession(authOptions as any);
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        await dbConnect();
        await Event.findOneAndDelete({ event_id: id, userId: session.user.id });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
