import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Transaction from "@/models/Transaction";
import BankAccount from "@/models/BankAccount";

export async function GET() {
    try {
        const session: any = await getServerSession(authOptions as any);
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const transactions = await Transaction.find({ user_id: session.user.id }).sort({ date: -1 });
        return NextResponse.json(transactions);

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
        const { type, amount, description, category } = body;

        await dbConnect();
        const account = await BankAccount.findOne({ userId: session.user.id });

        if (!account) {
            return NextResponse.json({ message: "No bank account linked" }, { status: 400 });
        }

        let newBalance = account.balance;
        if (type === 'CREDIT') {
            newBalance += Number(amount);
        } else {
            newBalance -= Number(amount);
        }

        // Update Account Balance
        account.balance = newBalance;
        await account.save();

        // Create Transaction Record
        const newTxn = await Transaction.create({
            transaction_id: `txn_${Date.now()}`,
            user_id: session.user.id,
            transaction_type: type,
            amount: Number(amount),
            description: description,
            transaction_category: category || "General",
            date: new Date(),
            balance_after_transaction: newBalance,
            payment_method: "Online",
            geo_location: "Remote"
        });

        return NextResponse.json({ success: true, transaction: newTxn, newBalance });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
