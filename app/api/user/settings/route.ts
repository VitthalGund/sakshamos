import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function PUT(req: Request) {
    try {
        const session: any = await getServerSession(authOptions as any);
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, bio, emailNotifications, publicProfile } = body;
        const userId = session.user.id; // This is actually the _id or custom userId depending on authOptions

        await dbConnect();

        // Find user by the ID stored in session (usually _id or userId)
        // Assuming session.user.id maps to the User model's _id or userId
        // Let's try finding by _id first, if not then userId
        let user = await User.findById(userId);
        if (!user) {
            user = await User.findOne({ userId: userId });
        }

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Update fields
        if (name) user.name = name;
        if (bio) user.bio = bio; // Ensure User model has bio, if not we might need to add it or use mixed

        // Update preferences (assuming they are stored in user model or a separate settings model)
        // For now, let's assume we store them in a 'settings' field or top level if schema allows
        // The User schema I saw earlier didn't have 'bio' or 'settings'. 
        // I will add them to the User model in a separate step if needed, or just save what I can.
        // Let's check User model again or just use strict: false for now? 
        // No, better to update the model. I'll update User model to include bio and preferences.

        user.bio = bio;
        user.preferences = {
            emailNotifications: emailNotifications ?? user.preferences?.emailNotifications,
            publicProfile: publicProfile ?? user.preferences?.publicProfile
        };

        await user.save();

        return NextResponse.json({ success: true, user: { name: user.name, email: user.email, bio: user.bio, preferences: user.preferences } });

    } catch (error: any) {
        console.error("Update Settings Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const session: any = await getServerSession(authOptions as any);
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = session.user.id;
        let user = await User.findById(userId);
        if (!user) user = await User.findOne({ userId: userId });

        if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

        return NextResponse.json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                phone: user.phone,
                bio: user.bio || "",
                preferences: user.preferences || { emailNotifications: true, publicProfile: false }
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
