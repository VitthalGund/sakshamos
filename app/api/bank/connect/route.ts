import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import BankAccount from "@/models/BankAccount";

export async function POST(req: Request) {
    try {
        const session: any = await getServerSession(authOptions as any);
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { accountNumber, ifsc, bankName } = body;

        await dbConnect();

        // Check if already linked
        const existing = await BankAccount.findOne({ userId: session.user.id });
        if (existing) {
            return NextResponse.json({ message: "Account already linked" }, { status: 400 });
        }

        const newAccount = await BankAccount.create({
            userId: session.user.id,
            accountNumber,
            ifsc,
            bankName,
            balance: 150000, // Initial Mock Balance for demo
            isLinked: true
        });

        return NextResponse.json({ success: true, account: newAccount });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
