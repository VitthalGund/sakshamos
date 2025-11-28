import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import BankAccount from "@/models/BankAccount";

export async function GET() {
    try {
        const session: any = await getServerSession(authOptions as any);
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const account = await BankAccount.findOne({ userId: session.user.id });

        if (!account) {
            return NextResponse.json({ linked: false });
        }

        return NextResponse.json({ linked: true, balance: account.balance, bankName: account.bankName });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
