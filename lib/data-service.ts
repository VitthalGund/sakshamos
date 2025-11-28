

export interface Transaction {
    user_id: string;
    txnId: string;
    amount: string;
    type: 'CREDIT' | 'DEBIT';
    narration: string;
    date: string;
    category: string;
}

export interface FinancialStats {
    revenue: number;
    taxSaved: number;
}

export interface Job {
    job_id: string;
    client_id: string;
    company_id: string;
    title: string;
    job_category: string;
    budget_min: number;
    budget_max: number;
    currency: string;
    urgency_level: string;
    experience_level: string;
    job_description: string;
    skills: string[];
    required_hours_estimate: number;
    job_status: string;
    match_score?: number; // Optional as it's not in the JSON but used in UI
    platform?: string; // Optional, might need to derive or mock
    _id?: string;
    hasDraft?: boolean;
}

export interface Invoice {
    invoice_id: string;
    client_name: string;
    amount: string;
    due_date: string;
    status: string;
}

export interface CalendarEvent {
    event_id: string;
    title: string;
    start: string;
    end: string;
    priority: string;
    event_type: string;
}


export const fetchAPI = async <T>(endpoint: string): Promise<T[]> => {
    try {
        const response = await fetch(`/api/${endpoint}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
        }
        const data = await response.json();
        return data as T[];
    } catch (error) {
        console.error(`Error fetching API ${endpoint}:`, error);
        return [];
    }
};

export const getFinancialStats = async (): Promise<FinancialStats> => {
    try {
        const response = await fetch('/api/finance/stats');
        if (!response.ok) throw new Error("Failed to fetch stats");
        return await response.json();
    } catch (error) {
        console.error("Failed to calculate financial stats:", error);
        return { revenue: 0, taxSaved: 0 };
    }
};

export const getJobs = async (): Promise<Job[]> => {
    return fetchAPI<Job>('jobs');
};

export const getInvoices = async (): Promise<Invoice[]> => {
    return fetchAPI<Invoice>('invoices');
};

export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
    return fetchAPI<CalendarEvent>('events');
};

