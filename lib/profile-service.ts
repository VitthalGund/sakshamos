import dbConnect from "@/lib/db";
import User from "@/models/User";
import fs from "fs";
import path from "path";
import Papa from "papaparse";

export interface ProfileData {
    id: string;
    userId?: string; // Explicit custom ID
    name: string;
    email?: string;
    role: string;
    phone?: string;
    bio?: string;
    skills?: string[];
    experience_years?: number;
    hourly_rate?: number;
    location?: string;
    // Stats
    total_earnings?: number;
    jobs_completed?: number;
    rating?: number;
    credibilityScore?: number;
    isBankConnected?: boolean;
    // Client specific
    company_name?: string;
    jobs_posted?: number;
    total_spent?: number;
}

interface FreelancerCSV {
    freelancer_id: string;
    name: string;
    skills: string;
    experience_years: string;
    total_revenue: string;
    past_projects_count: string;
    credibility_score: string;
}

interface ClientCSV {
    client_id: string;
    company_id?: string;
    company_name: string;
    total_jobs_posted: string;
    avg_money_spent_per_project: string;
    total_freelancers_hired: string;
}

export async function getProfileById(id: string): Promise<ProfileData | null> {
    await dbConnect();

    // 1. Check MongoDB
    // We search by userId (custom ID) or _id
    const query: any = { $or: [{ userId: id }] };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
        query.$or.push({ _id: id });
    }

    const dbUser = await User.findOne(query);

    if (dbUser) {
        return {
            id: dbUser._id.toString(),
            userId: dbUser.userId,
            name: dbUser.name,
            email: dbUser.email,
            phone: dbUser.phone,
            role: dbUser.role,
            bio: dbUser.bio,
            location: dbUser.location, // Assuming location exists on User model or add it if missing
            // Default/Empty values for new users
            skills: dbUser.skills || [],
            experience_years: dbUser.experienceYears || 0,
            credibilityScore: dbUser.credibilityScore || 0,
            isBankConnected: dbUser.isBankConnected || false,
            total_earnings: 0,
            jobs_completed: 0,
            rating: 0,
        };
    }

    // 2. Check CSVs (Static Data)
    // We need to read the CSV files from the public/data or bubble-chart/data directory
    // The previous file view showed them in `bubble-chart/data/`

    const csvDir = path.join(process.cwd(), 'bubble-chart', 'data');
    
    if (!fs.existsSync(csvDir)) {
        console.warn(`CSV Directory not found: ${csvDir}`);
    }

    // Check Freelancers
    try {
        const freelancersPath = path.join(csvDir, 'freelancers_profile.csv');
        if (fs.existsSync(freelancersPath)) {
            const freelancersCsv = fs.readFileSync(freelancersPath, 'utf8');
            const { data: freelancers } = Papa.parse<FreelancerCSV>(freelancersCsv, { header: true });
    
            const freelancer = freelancers.find((f) => f.freelancer_id === id);
            if (freelancer) {
                return {
                    id: freelancer.freelancer_id,
                    userId: freelancer.freelancer_id,
                    name: freelancer.name,
                    role: 'freelancer',
                    skills: freelancer.skills ? freelancer.skills.split(',').map((s: string) => s.trim()) : [],
                    experience_years: parseInt(freelancer.experience_years) || 0,
                    total_earnings: parseFloat(freelancer.total_revenue) || 0,
                    jobs_completed: parseInt(freelancer.past_projects_count) || 0,
                    rating: parseFloat(freelancer.credibility_score) || 0,
                    credibilityScore: parseFloat(freelancer.credibility_score) || 0,
                    isBankConnected: false // Default for CSV
                };
            }
        } else {
             console.warn(`Freelancers CSV not found at: ${freelancersPath}`);
        }
    } catch (e) {
        console.error("Error reading freelancers CSV", e);
    }

    // Check Clients
    try {
        const clientsPath = path.join(csvDir, 'clients_profile.csv');
        if (fs.existsSync(clientsPath)) {
            const clientsCsv = fs.readFileSync(clientsPath, 'utf8');
            const { data: clients } = Papa.parse<ClientCSV>(clientsCsv, { header: true });
    
            const client = clients.find((c) => c.client_id === id || c.company_id === id);
            if (client) {
                return {
                    id: client.client_id,
                    userId: client.client_id,
                    name: client.company_name,
                    role: 'client',
                    company_name: client.company_name,
                    jobs_posted: parseInt(client.total_jobs_posted) || 0,
                    total_spent: parseFloat(client.avg_money_spent_per_project) * (parseInt(client.total_freelancers_hired) || 1),
                };
            }
        } else {
            console.warn(`Clients CSV not found at: ${clientsPath}`);
        }
    } catch (e) {
        console.error("Error reading clients CSV", e);
    }

    return null;
}
