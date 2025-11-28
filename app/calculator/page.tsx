"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Calculator, Save, Copy, Info, ChevronDown, ChevronUp, Briefcase, Clock, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Mock Benchmarks Data
const RATE_BENCHMARKS = [
  {
    name: "Web Development",
    rates: [
      { label: "Junior", range: "₹500 - ₹1,200 /hr" },
      { label: "Mid-Level", range: "₹1,500 - ₹3,500 /hr" },
      { label: "Senior", range: "₹4,000+ /hr" },
    ]
  },
  {
    name: "UI/UX Design",
    rates: [
      { label: "Junior", range: "₹400 - ₹1,000 /hr" },
      { label: "Mid-Level", range: "₹1,200 - ₹3,000 /hr" },
      { label: "Senior", range: "₹3,500+ /hr" },
    ]
  },
  {
    name: "Content Writing",
    rates: [
      { label: "Junior", range: "₹1 - ₹3 /word" },
      { label: "Mid-Level", range: "₹4 - ₹8 /word" },
      { label: "Senior", range: "₹10+ /word" },
    ]
  }
];

export default function RateCalculatorPage() {
  const [activeTab, setActiveTab] = useState<'hourly' | 'project'>('hourly');
  
  // Hourly State
  const [hourlyInputs, setHourlyInputs] = useState({
    desiredIncome: 1200000,
    expenses: 300000,
    workingDays: 240,
    hoursPerDay: 6,
    profitMargin: 20,
  });

  // Project State
  const [projectInputs, setProjectInputs] = useState({
    baseRate: 0,
    hours: 40,
    complexity: 1, // 1, 1.25, 1.5
    expenses: 0,
  });

  const [showFormula, setShowFormula] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calculate Hourly (Derived State)
  const hourlyResult = (() => {
    const { desiredIncome, expenses, workingDays, hoursPerDay, profitMargin } = hourlyInputs;
    const need = Number(desiredIncome) + Number(expenses);
    const grossNeeded = need / (1 - (Number(profitMargin) / 100));
    const totalHours = Number(workingDays) * Number(hoursPerDay);
    const rate = totalHours > 0 ? grossNeeded / totalHours : 0;

    return {
      rate: Math.round(rate),
      gross: Math.round(grossNeeded),
      hours: totalHours,
    };
  })();

  // Calculate Project (Derived State)
  const projectResult = (() => {
    // Auto-fill base rate if 0
    const baseRate = projectInputs.baseRate === 0 && hourlyResult.rate > 0 ? hourlyResult.rate : projectInputs.baseRate;
    
    const { hours, complexity, expenses } = projectInputs;
    const total = (Number(baseRate) * Number(hours) * Number(complexity)) + Number(expenses);
    return { total: Math.round(total) };
  })();

  const handleHourlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setHourlyInputs(prev => ({ ...prev, [name]: Number(value) }));
    setSaved(false);
    setCopied(false);
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProjectInputs(prev => ({ ...prev, [name]: Number(value) }));
    setSaved(false);
    setCopied(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCopyProposal = () => {
    let text = "";
    if (activeTab === 'hourly') {
      text = `Based on the project requirements and complexity, my proposed rate is ₹${hourlyResult.rate}/hour. This ensures sustainable delivery while covering all professional overheads.`;
    } else {
      text = `For this project, I estimate ${projectInputs.hours} hours of work. Considering the complexity and requirements, the total project fee is ₹${projectResult.total}. This includes all development and necessary resources.`;
    }
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />

      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Rate Calculator</h1>
          <p className="text-muted-foreground">Calculate your ideal rates for hourly work or fixed-price projects.</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab('hourly')}
            className={`pb-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'hourly' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Hourly Rate
            {activeTab === 'hourly' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button
            onClick={() => setActiveTab('project')}
            className={`pb-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'project' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Project Rate
            {activeTab === 'project' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Inputs Column */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'hourly' ? (
                <motion.div 
                  key="hourly-inputs"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Goals</CardTitle>
                      <CardDescription>Annual targets to determine your baseline.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Desired Annual Take-home (₹)</Label>
                        <Input type="number" name="desiredIncome" value={hourlyInputs.desiredIncome} onChange={handleHourlyChange} />
                      </div>
                      <div className="space-y-2">
                        <Label>Annual Business Expenses (₹)</Label>
                        <Input type="number" name="expenses" value={hourlyInputs.expenses} onChange={handleHourlyChange} />
                      </div>
                      <div className="space-y-2">
                        <Label>Profit Margin (%)</Label>
                        <Input type="number" name="profitMargin" value={hourlyInputs.profitMargin} onChange={handleHourlyChange} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Capacity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Billable Days / Year</Label>
                        <Input type="number" name="workingDays" value={hourlyInputs.workingDays} onChange={handleHourlyChange} />
                      </div>
                      <div className="space-y-2">
                        <Label>Billable Hours / Day</Label>
                        <Input type="number" name="hoursPerDay" value={hourlyInputs.hoursPerDay} onChange={handleHourlyChange} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div 
                  key="project-inputs"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Details</CardTitle>
                      <CardDescription>Estimate based on time and complexity.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Base Hourly Rate (₹)</Label>
                        <Input type="number" name="baseRate" value={projectInputs.baseRate} onChange={handleProjectChange} />
                      </div>
                      <div className="space-y-2">
                        <Label>Estimated Hours</Label>
                        <Input type="number" name="hours" value={projectInputs.hours} onChange={handleProjectChange} />
                      </div>
                      <div className="space-y-2">
                        <Label>Complexity Multiplier</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { val: 1, label: "Standard (1x)" },
                            { val: 1.25, label: "Complex (1.25x)" },
                            { val: 1.5, label: "High (1.5x)" }
                          ].map(opt => (
                            <button
                              key={opt.val}
                              onClick={() => setProjectInputs(prev => ({ ...prev, complexity: opt.val }))}
                              className={`p-2 text-sm rounded-md border transition-colors ${
                                projectInputs.complexity === opt.val 
                                  ? 'bg-primary/10 border-primary text-primary font-medium' 
                                  : 'bg-background border-input hover:bg-accent'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Additional Expenses (₹)</Label>
                        <Input type="number" name="expenses" value={projectInputs.expenses} onChange={handleProjectChange} />
                        <p className="text-xs text-muted-foreground">Software, assets, or subcontractor fees.</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results Column */}
          <div className="space-y-6">
            <motion.div layout>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary" />
                    <CardTitle>Recommended {activeTab === 'hourly' ? 'Hourly Rate' : 'Project Fee'}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-center py-8">
                  <motion.div 
                    key={activeTab === 'hourly' ? hourlyResult.rate : projectResult.total}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-5xl font-bold text-primary mb-2"
                  >
                    ₹{activeTab === 'hourly' ? hourlyResult.rate : projectResult.total}
                    {activeTab === 'hourly' && <span className="text-xl text-muted-foreground font-normal">/hr</span>}
                  </motion.div>
                  
                  <p className="text-sm text-muted-foreground mt-4">
                    {activeTab === 'hourly' 
                      ? `To earn ₹${(hourlyResult.gross / 100000).toFixed(1)}L gross revenue working ${hourlyResult.hours} hours/year.`
                      : `Based on ${projectInputs.hours} hours at ₹${projectInputs.baseRate}/hr × ${projectInputs.complexity}x complexity + expenses.`
                    }
                  </p>

                  <div className="flex gap-3 justify-center mt-8">
                    <Button onClick={handleSave} variant="outline" className="gap-2">
                      <Save className="w-4 h-4" />
                      {saved ? "Saved!" : "Save to Profile"}
                    </Button>
                    <Button onClick={handleCopyProposal} className="gap-2">
                      <Copy className="w-4 h-4" />
                      {copied ? "Copied!" : "Suggest to Client"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Formula Explanation */}
            <Card>
              <button 
                onClick={() => setShowFormula(!showFormula)}
                className="w-full flex items-center justify-between p-6 hover:bg-accent/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  How we calculate this?
                </div>
                {showFormula ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <AnimatePresence>
                {showFormula && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <CardContent className="pt-0 pb-6 text-sm text-muted-foreground space-y-3 border-t border-border/50 mt-2">
                      {activeTab === 'hourly' ? (
                        <>
                          <p><strong>Saksham Hourly Formula</strong></p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Desired annual take-home + Annual business expenses = <b>Need</b>.</li>
                            <li>Account for profit margin (P%): <b>GrossNeeded = Need / (1 − P/100)</b>.</li>
                            <li>Working hours/year = (Working days/year − Vacation days) × Hours/day.</li>
                            <li><b>Recommended hourly rate = GrossNeeded / Working hours/year.</b></li>
                          </ol>
                        </>
                      ) : (
                        <>
                          <p><strong>Saksham Project Formula</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li><b>Fee = (Base Rate × Hours × Complexity) + Expenses</b></li>
                            <li>Complexity Multipliers: Standard (1x), Complex (1.25x), High (1.5x).</li>
                          </ul>
                        </>
                      )}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            {/* Benchmarks */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <CardTitle>Market Benchmarks</CardTitle>
                </div>
                <CardDescription>Average rates in your network.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {RATE_BENCHMARKS.map((field, i) => (
                    <div key={i} className="space-y-2">
                      <h4 className="font-medium text-sm">{field.name}</h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {field.rates.map((r, j) => (
                          <div key={j} className="bg-accent/5 p-2 rounded border border-border/50 text-center">
                            <div className="text-muted-foreground mb-1">{r.label}</div>
                            <div className="font-semibold">{r.range}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}
