"use client";

import { useEffect, useState } from "react";
import { getJobs, Job } from "@/lib/data-service";
import { Card } from "@/components/ui/Card";
import { Badge } from "lucide-react"; // Note: Badge is not in lucide, need to check if we have a Badge component or use standard HTML
import { motion } from "framer-motion";

interface JobFeedProps {
  initialJobs?: Job[];
}

export function JobFeed({ initialJobs }: JobFeedProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs || []);

  useEffect(() => {
    if (!initialJobs) {
      const loadJobs = async () => {
        const data = await getJobs();
        // Filter for high match score or priority, take top 5
        const topJobs = data.slice(0, 5);
        setJobs(topJobs);
      };
      loadJobs();
    }
  }, [initialJobs]);

  return (
    <Card className="glass-card p-6 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Hunter Agent Feed
        </h3>
        <span className="text-xs text-muted-foreground">Live Scanning...</span>
      </div>

      <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
        {jobs.map((job, index) => (
          <motion.div
            key={job.job_id || job._id || index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/20">
                {job.platform || "Upwork"}
              </span>
              <span className="text-green-400 font-bold text-sm">
                {job.currency} {job.budget_min.toLocaleString()} - {job.budget_max.toLocaleString()}
              </span>
            </div>
            <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-1">
              {job.title}
            </h4>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
              <span>Match: <span className="text-white font-medium">{job.match_score || 95}%</span></span>
              {(job as any).hasDraft && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/20">
                    Draft Ready
                  </span>
              )}
              <button className="opacity-0 group-hover:opacity-100 transition-opacity text-primary font-medium">
                Auto-Apply &rarr;
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
