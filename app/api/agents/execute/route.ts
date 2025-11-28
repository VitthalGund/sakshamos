import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Bid from "@/models/Bid";
import Event from "@/models/Event";
import Task from "@/models/Task";
import Transaction from "@/models/Transaction";
import BankAccount from "@/models/BankAccount";

export async function POST(req: Request) {
    try {
        const session:any = await getServerSession(authOptions as any);
        if (!session || !session.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { agent, type, payload } = body;
        const userId = session.user.id;

        await dbConnect();

        let result;

        // 1. Hunter Agent: Create Bid
        if (agent === "Hunter" && type === "create_bid") {
            const newBid = await Bid.create({
                bid_id: `bid_${Date.now()}`,
                job_id: payload.job_id,
                freelancer_id: userId,
                bid_amount: payload.bid_amount,
                proposal_text: payload.proposal_draft,
                status: "Pending",
                submitted_at: new Date()
            });
            result = { message: "Bid submitted successfully", data: newBid };
        }

        // 2. Productivity Agent: Create Deep Work Block or Update Task
        else if (agent === "Productivity") {
            if (type === "create_deep_work_block") {
                const newEvent = await Event.create({
                    event_id: `evt_${Date.now()}`,
                    userId: userId,
                    title: "Deep Work Block",
                    start_time: payload.start,
                    end_time: payload.end,
                    type: "focus",
                    description: "Scheduled by Productivity Agent"
                });
                result = { message: "Deep work block scheduled", data: newEvent };
            } else if (type === "suggest_reprioritize") {
                // Update multiple tasks
                const updates = payload.suggestions.map(async (s: any) => {
                    return Task.findOneAndUpdate(
                        { id: s.taskId, userId: userId },
                        { priority: s.suggestedPriority }
                    );
                });
                await Promise.all(updates);
                result = { message: "Tasks reprioritized", count: updates.length };
            }
        }

        // 3. Tax Agent: Categorize Expense
        else if (agent === "Tax" && type === "categorize_expense") {
            const txn = await Transaction.findOne({ transaction_id: payload.transaction_id });
            if (txn) {
                txn.transaction_category = payload.category;
                // We could add a 'deductible' field to Transaction schema if needed, 
                // for now just updating category is enough for the demo
                await txn.save();
                result = { message: "Transaction categorized", data: txn };
            } else {
                throw new Error("Transaction not found");
            }
        }

        // 4. CFO Agent: Smart Split (Simulated Transfer)
        else if (agent === "CFO" && type === "smart_split") {
            // Just update balance for demo
            // In real world, this would move money between accounts
            const account = await BankAccount.findOne({ userId: userId });
            if (account) {
                // For demo, we assume the money is already in the account, 
                // we just acknowledge the split action
                result = { message: "Funds allocated successfully" };
            } else {
                throw new Error("Bank account not found");
            }
        }

        else {
            return NextResponse.json({ message: "Unknown action type" }, { status: 400 });
        }

        return NextResponse.json({ success: true, ...result });

    } catch (error: any) {
        console.error("Execute Action Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
