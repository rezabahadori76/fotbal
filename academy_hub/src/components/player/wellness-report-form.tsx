"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitWellnessReport } from "@/lib/actions/academy-performance";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scoreLabel, todayInputValue } from "@/lib/performance";

type MetricKey = "mood" | "energy" | "sleep" | "stress" | "soreness";

const metrics: { key: MetricKey; title: string; hint: string; defaultValue: number; colorClass: string }[] = [
  { key: "energy", title: "Energy", hint: "Alert and awake", defaultValue: 7, colorClass: "bg-warning" },
  { key: "sleep", title: "Sleep", hint: "Well rested. 7-8 hours of sleep", defaultValue: 9, colorClass: "bg-accent" },
  { key: "stress", title: "Stress", hint: "Moderate amount of stress.", defaultValue: 4, colorClass: "bg-warning" },
  { key: "soreness", title: "Soreness", hint: "Muscle soreness or pain", defaultValue: 2, colorClass: "bg-accent" },
];

export function WellnessReportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [values, setValues] = useState<Record<MetricKey, number>>({
    mood: 8,
    energy: 7,
    sleep: 9,
    stress: 4,
    soreness: 2,
  });

  const handleAdjust = (key: MetricKey, delta: number) => {
    setValues((prev) => ({
      ...prev,
      [key]: Math.max(1, Math.min(10, prev[key] + delta)),
    }));
  };

  return (
    <div className="space-y-6 max-w-md mx-auto sm:max-w-full">
      <form
        action={(formData) => {
          setMessage(null);
          // Add metric values to formData
          Object.entries(values).forEach(([k, v]) => formData.set(k, String(v)));
          startTransition(() => {
            void submitWellnessReport(formData).then((result) => {
              if (result?.error) {
                setMessage(result.error);
                return;
              }
              router.push("/player/status");
              router.refresh();
            });
          });
        }}
        className="space-y-4"
      >
        <input type="hidden" name="reportDate" value={todayInputValue()} />

        {/* Mood Section */}
        <div className="rounded-2xl border border-card-border bg-background/50 p-4">
          <p className="font-display font-semibold text-lg">Mood</p>
          <p className="text-sm text-muted">How do you feel?</p>
          
          <div className="mt-6 flex flex-col items-center">
            <div className="flex items-center justify-between w-full max-w-[240px]">
              <button type="button" onClick={() => handleAdjust("mood", -1)} className="flex items-center justify-center w-8 h-8 rounded-full bg-card border border-card-border text-foreground hover:bg-card/80">
                -
              </button>
              <div className="flex items-center gap-2">
                <span className="text-2xl opacity-50 grayscale">😩</span>
                <span className="text-5xl">😃</span>
                <span className="text-2xl opacity-50 grayscale">😊</span>
                <span className="text-xl opacity-30 grayscale">😐</span>
              </div>
              <button type="button" onClick={() => handleAdjust("mood", 1)} className="flex items-center justify-center w-8 h-8 rounded-full bg-card border border-card-border text-foreground hover:bg-card/80">
                +
              </button>
            </div>
            <p className="mt-4 font-semibold text-foreground">Happy</p>
          </div>
        </div>

        {/* Other Metrics */}
        {metrics.map((metric) => {
          const value = values[metric.key];
          return (
            <div key={metric.key} className="rounded-2xl border border-card-border bg-background/50 p-4">
              <p className="font-display font-semibold text-lg">{metric.title}</p>
              <p className="text-sm text-muted">{metric.hint}</p>
              
              <div className="mt-6 flex items-center gap-4">
                <button type="button" onClick={() => handleAdjust(metric.key, -1)} className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-card border border-card-border text-foreground hover:bg-card/80">
                  -
                </button>
                
                <div className="flex-1 relative flex flex-col items-center">
                  <div className="w-full flex justify-between text-xs text-muted mb-2 px-1">
                    <span>1</span>
                    <span className="font-bold text-foreground text-lg -mt-1">{value}</span>
                    <span>10</span>
                  </div>
                  
                  {/* Custom Slider Track */}
                  <div className="w-full h-1.5 bg-card border border-card-border rounded-full overflow-hidden relative">
                    <div 
                      className={cn("absolute top-0 left-0 h-full transition-all", metric.colorClass)} 
                      style={{ width: `${(value / 10) * 100}%` }} 
                    />
                  </div>
                  
                  {/* Pill */}
                  <div className={cn("mt-4 px-3 py-1 rounded-sm text-[11px] font-bold uppercase tracking-wider", metric.colorClass.replace("bg-", "text-"), metric.colorClass.replace("bg-", "bg-").concat("/20"))}>
                    {scoreLabel(metric.title, value)}
                  </div>
                </div>

                <button type="button" onClick={() => handleAdjust(metric.key, 1)} className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-card border border-card-border text-foreground hover:bg-card/80">
                  +
                </button>
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-center my-4">
          <span className="text-xs text-muted font-medium tracking-widest uppercase">Optional</span>
        </div>

        <div className="rounded-2xl border border-card-border bg-background/50 p-4 space-y-4">
          <div>
            <label className="flex items-center gap-2 mb-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted fill-none stroke-current stroke-2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span className="font-semibold">Resting HR</span>
            </label>
            <div className="flex items-end gap-2">
              <input name="restingHeartRate" type="number" min="30" max="240" defaultValue="180" className="bg-transparent border-none text-3xl font-display font-semibold w-20 focus:ring-0 p-0" />
              <span className="text-muted mb-1 font-semibold">bpm</span>
            </div>
            <hr className="border-card-border mt-2 mb-3" />
            <p className="text-xs text-muted">Enter your current resting heart rate.</p>
          </div>

          <div className="pt-4">
            <label className="flex items-center gap-2 mb-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-muted fill-none stroke-current stroke-2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <span className="font-semibold">Comment</span>
            </label>
            <input name="comment" defaultValue="I've had excessive soreness but I'm fine." className="w-full bg-transparent border-none text-foreground focus:ring-0 p-0" />
            <hr className="border-card-border mt-2 mb-3" />
            <p className="text-xs text-muted">Add a comment to give context to your ratings.</p>
          </div>
        </div>

        <Button type="submit" className="w-full bg-[#E5E5E5] text-black font-semibold rounded-full py-6 text-base hover:bg-white transition-colors" disabled={pending}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2 fill-current">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
          {pending ? "Submitting..." : "Submit Report"}
        </Button>
        <p className="text-center text-xs text-muted mt-4">
          By tapping Submit, I am giving my consent for the coaching staff on my team to view this information.
        </p>
        {message && <p className="text-center text-sm text-muted">{message}</p>}
      </form>
    </div>
  );
}
