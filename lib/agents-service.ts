import { getFinancialStats } from "@/lib/data-service";
import * as Hunter from "./agents/hunter";
import * as Collections from "./agents/collections";
import * as CFO from "./agents/cfo";
import * as Productivity from "./agents/productivity";
import * as Tax from "./agents/tax";
import dbConnect from "@/lib/db";
import Job from "@/models/Job";
import Invoice from "@/models/Invoice";
import Event from "@/models/Event";
import Task from "@/models/Task";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

// Main orchestrator function
export async function runAgents(userId: string) {
    await dbConnect();
    const actions: any[] = [];
    const logs: string[] = [];

    // 1. Hunter Agent (Job Matching)
    // Fetch top 5 open jobs, sorted by newest first
    const openJobs = await Job.find({ job_status: "Open" })
        .sort({ postedAt: -1 })
        .limit(5);

    // Fetch freelancer profile (Mock for now, or fetch from User model)
    const freelancerUser = await User.findOne({ userId: userId });
    const freelancerProfile = {
        user_id: userId,
        name: freelancerUser?.name || "Abhishek Pandey",
        skills: freelancerUser?.skills || ["React", "Next.js", "Node.js", "TypeScript", "Solidity"],
        experience_years: 5,
        availability_hours_per_week: 40,
        hourly_rate: 50,
        assigned_projects: [],
        credibility_score: 85
    };

    let hunterActionsCount = 0;
    for (const job of openJobs) {
        // Map job to Hunter type
        const hunterJob: Hunter.JobPost = {
            job_id: job.job_id,
            title: job.title,
            job_category: job.job_category,
            job_description: job.job_description,
            budget_min: job.budgetMin,
            budget_max: job.budgetMax,
            skills: JSON.stringify(job.skills),
            experience_level: job.experienceLevel
        };

        if (Hunter.shouldActOnJob(hunterJob, freelancerProfile)) {
            logs.push(`Hunter acting on job: ${job.title}`);
            const action = await Hunter.onJobNotification(hunterJob, freelancerProfile);
            if (action) {
                actions.push({ agent: "Hunter", ...action });
                hunterActionsCount++;
                // Rate Limit: Only process 1 job per run to avoid 429 errors
                if (hunterActionsCount >= 1) break;
            }
        }
    }

    // 2. Collections Agent (Invoice Reminders)
    // Fetch overdue invoices for this user (assuming user is sender/freelancer)
    // In mock data, client_id is the payer. We need to filter by who created it? 
    // For now, fetch all overdue invoices as per original logic
    const myInvoices = await Invoice.find({ status: "Overdue" });

    let collectionsActionsCount = 0;
    for (const inv of myInvoices) {
        const invoiceRow: Collections.InvoiceRow = {
            invoice_id: inv.invoice_id,
            amount_due: Number(inv.amount),
            currency: inv.currency || "INR",
            status: inv.status,
            days_overdue: inv.days_overdue || 30, // Default if missing
            client_id: inv.client_id || "unknown"
        };

        if (Collections.shouldActOnInvoice(invoiceRow)) {
            logs.push(`Collections acting on invoice: ${inv.invoice_id}`);
            const action = await Collections.onInvoiceAging(invoiceRow);
            if (action) {
                actions.push({ agent: "Collections", ...action });
                collectionsActionsCount++;
                // Rate Limit: Only process 1 invoice per run
                if (collectionsActionsCount >= 1) break;
            }
        }
    }

    // 3. CFO Agent (Smart Split & Alerts)
    // Fetch recent transaction
    const mockTxnDoc = await Transaction.findOne({ user_id: userId }).sort({ date: -1 });

    if (mockTxnDoc) {
        const mockTxn: CFO.TransactionType = {
            transaction_id: mockTxnDoc.txnId,
            user_id: mockTxnDoc.user_id,
            amount: Number(mockTxnDoc.amount),
            type: mockTxnDoc.type,
            narration: mockTxnDoc.narration,
            date: mockTxnDoc.date,
            balance_after_transaction: 150000 // Mock
        };

        if (CFO.shouldActOnTransaction(mockTxn)) {
            logs.push(`CFO acting on transaction: ${mockTxn.transaction_id}`);
            const action = await CFO.onTransaction(mockTxn, { user_id: userId });
            if (action) {
                actions.push({ agent: "CFO", ...action });
            }
        }
    }

    // 4. Productivity Agent (Schedule)
    // Fetch tasks and events
    const tasks = await Task.find({ userId: "user_100" }); // Using default user for now
    const events = await Event.find({ userId: "user_100" });

    const schedule: Productivity.UserSchedule = {
        user_id: userId,
        tasks: tasks.map((t: any) => ({ id: t.id, dueDate: t.dueDate, est_hours: t.estHours || 2, done: t.done })),
        calendarEvents: events.map((e: any) => ({ id: e.event_id, start: e.start_time, end: e.end_time, title: e.title })),
        capacity: { billableDaysPerYear: 240, billableHoursPerDay: 6 }
    };

    if (Productivity.shouldEvaluateSchedule("calendar_updated", schedule)) {
        logs.push(`Productivity evaluating schedule`);
        const result = await Productivity.evaluateSchedule(schedule);
        if (result.actions.length > 0) {
            result.actions.forEach(a => actions.push({ agent: "Productivity", ...a }));
        }
    }

    // 5. Tax Agent (Categorization)
    // Use the same txn logic
    if (mockTxnDoc) {
        const taxTxn: Tax.Txn = {
            transaction_id: mockTxnDoc.txnId,
            user_id: userId,
            amount: Number(mockTxnDoc.amount),
            narration: mockTxnDoc.narration,
            date: mockTxnDoc.date
        };

        if (Tax.shouldTaxAgentAct(taxTxn)) {
            logs.push(`Tax acting on transaction: ${taxTxn.transaction_id}`);
            const result = await Tax.categorizeTransaction(taxTxn);
            if (result) {
                actions.push({
                    agent: "Tax",
                    type: "categorize_expense",
                    payload: result
                });
            }
        }
    }

    return { actions, logs };
}
