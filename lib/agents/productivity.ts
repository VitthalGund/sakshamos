// lib/agents/productivity.ts
import { callGemini } from "./ai-client";

import Event from "@/models/Event";

export type UserSchedule = {
    user_id: string;
    tasks: { id: string; dueDate?: string; est_hours?: number; priority?: string; done?: boolean }[];
    calendarEvents: { id: string; start: string; end: string; title?: string }[];
    capacity: { billableDaysPerYear?: number; billableHoursPerDay?: number };
};

export type ProductivityAction =
    | { type: "block_new_jobs"; reason: string }
    | { type: "create_deep_work_block"; start: string; end: string; title: string }
    | { type: "reschedule_task"; taskId: string; newDate: string }
    | { type: "suggest_reprioritize"; suggestions: { taskId: string; suggestedPriority: string }[]; message?: string };

const UTILIZATION_THRESHOLD = 0.75; // 75%

/**
 * Trigger helper: when to evaluate schedule?
 * - New task created
 * - Task deadline approaching (<48h)
 * - Calendar changed
 * - User attempts to accept a job
 * The caller can decide which event occurred; this helper provides a quick boolean
 */
export function shouldEvaluateSchedule(eventType: "task_created" | "deadline_approaching" | "calendar_updated" | "job_accept_attempt", schedule?: UserSchedule) {
    if (!schedule) return true;
    if (eventType === "job_accept_attempt") return true;
    if (eventType === "deadline_approaching") return true;
    if (eventType === "task_created" || eventType === "calendar_updated") return true;
    return false;
}

/**
 * Main: evaluateSchedule returns utilization + actions to perform (UI shows them).
 */
/**
 * Main: evaluateSchedule returns utilization + actions to perform (UI shows them).
 */
export async function evaluateSchedule(schedule: UserSchedule) {
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);

    const upcomingTasks = schedule.tasks.filter(t => {
        if (t.done) return false;
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= now && d <= next7Days;
    }).map(t => ({
        id: t.id,
        dueDate: t.dueDate,
        est_hours: t.est_hours || 1,
        priority: t.priority,
        done: t.done
    }));

    const next7DaysHours = upcomingTasks.reduce((acc: number, t: any) => acc + (t.est_hours || 1), 0);
    
    // Default capacity: 5 days * 6 hours = 30 hours/week
    const weeklyCapacity = 30; 

    const utilization = next7DaysHours / Math.max(1, weeklyCapacity);
    const actions: ProductivityAction[] = [];

    if (utilization >= UTILIZATION_THRESHOLD) {
        actions.push({ type: "block_new_jobs", reason: `High utilization ${Math.round(utilization * 100)}%` });
    }

    // Deep-work block: attempt to create a 2-hour block tomorrow at 09:00 unless conflict
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultStart = new Date(tomorrow.setHours(9, 0, 0, 0)).toISOString();
    const defaultEnd = new Date(new Date(defaultStart).getTime() + 2 * 3600 * 1000).toISOString();

    const overlapping = schedule.calendarEvents.some(e => {
        const s = new Date(e.start), en = new Date(e.end);
        return new Date(defaultStart) < en && new Date(defaultEnd) > s;
    });

    if (!overlapping) {
        actions.push({ type: "create_deep_work_block", start: defaultStart, end: defaultEnd, title: "Deep Work - Focus Block" });
    }

    // Use Gemini to propose reprioritization (structured JSON)
    if (upcomingTasks.length > 0) {
        const prompt = `You are a productivity assistant. Given tasks (id, est_hours, dueDate), propose three tasks to mark HIGH priority to avoid missed deadlines. Return JSON array: [{"taskId":"..","suggestedPriority":"High"}] .
    Tasks: ${JSON.stringify(upcomingTasks.slice(0, 20))}`;

        const gm = await callGemini(prompt, 200);
        let suggestions: { taskId: string; suggestedPriority: string }[] = [];
        try {
            const parsed = JSON.parse(gm.text || "[]");
            if (Array.isArray(parsed)) suggestions = parsed.slice(0, 10);
        } catch (e) {
            // fallback: pick earliest due dates
            suggestions = upcomingTasks
                .sort((a: any, b: any) => (new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()))
                .slice(0, 3)
                .map((t: any) => ({ taskId: t.id, suggestedPriority: "High" }));
        }

        if (suggestions.length > 0) {
             actions.push({ type: "suggest_reprioritize", suggestions, message: "Auto-prioritized by Productivity Agent." });
        }
    }

    return { utilization, actions };
}

/**
 * Execute a productivity action (e.g., create a deep work block).
 */
export async function executeAction(userId: string, action: ProductivityAction) {
    if (action.type === "create_deep_work_block") {
        try {
            const crypto = await import("crypto");
            
            await Event.create({
                event_id: crypto.randomUUID(),
                title: action.title,
                start_time: action.start,
                end_time: action.end,
                priority: "High",
                event_type: "deep_work",
                description: "Focused work block created by Productivity Agent",
                userId: userId
            });
            return { success: true, message: "Deep work block created." };
        } catch (e) {
            console.error("Failed to create deep work block:", e);
            return { success: false, message: "Failed to create event." };
        }
    }
    return { success: false, message: "Action not supported for auto-execution." };
}
