"use client";

import { useEffect, useMemo, useState } from "react";

type Phase = "idle" | "loading" | "results";

const STEP_MESSAGES = [
  "Analyzing your founder profile",
  "Understanding your startup story",
  "Scanning industry focus",
  "Matching to investor theses",
  "Scoring fit and traction",
  "Selecting top investors",
];

const STEP_ICONS = [
  "person",
  "description",
  "sell",
  "track_changes",
  "insights",
  "grade",
] as const;

const INDUSTRIES = [
  "SaaS",
  "Fintech",
  "Healthcare",
  "Climate",
  "AI",
  "Consumer",
  "Deep Tech",
];

export default function Home() {
  const [aboutYou, setAboutYou] = useState("");
  const [aboutStartup, setAboutStartup] = useState("");
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIndex, setStepIndex] = useState(0);

  const investors = useMemo(() => {
    // Dummy investor names; lightly varied by industry for demo polish
    const base = [
      "Apex Ridge Capital",
      "Northlake Ventures",
      "Zenith Partners",
      "Blue Mesa Angels",
      "Orbit Bridge Capital",
      "Kitepoint Ventures",
      "Harbor Street Partners",
      "Lumen Peak Capital",
    ];
    const tag = industry.slice(0, 2).toUpperCase();
    return base.map((n, i) => `${n} • ${tag}${(i + 1).toString().padStart(2, "0")}`);
  }, [industry]);

  useEffect(() => {
    if (phase !== "loading") return;

    setStepIndex(0);
    const interval = setInterval(() => {
      setStepIndex((i) => {
        if (i < STEP_MESSAGES.length - 1) return i + 1;
        return i;
      });
    }, 900);

    const done = setTimeout(() => setPhase("results"), 900 * (STEP_MESSAGES.length + 1));

    return () => {
      clearInterval(interval);
      clearTimeout(done);
    };
  }, [phase]);

  const onSearch = () => {
    // Simple validation for demo polish
    if (!aboutYou.trim() || !aboutStartup.trim()) {
      alert("Please fill in both text areas to start the search.");
      return;
    }
    setPhase("loading");
  };

  const reset = () => {
    setPhase("idle");
    setStepIndex(0);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 sm:p-10">
      <main className="w-full max-w-4xl">
        <section className="rounded-2xl bg-[color:var(--surface)] backdrop-blur px-6 sm:px-8 py-7 shadow-[0_1px_0_rgba(0,0,0,0.35),0_20px_60px_-24px_rgba(0,0,0,0.5)] ring-1 ring-[color:var(--border)]">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Investor Match Demo</h1>
            <p className="text-sm text-[color:var(--muted, #b8c2bc)] mt-1">
              Minimal, material‑inspired UI. Uses dummy data; no external calls.
            </p>
          </header>

          {phase === "idle" && (
            <form
              className="grid grid-cols-1 gap-5 sm:gap-6"
              onSubmit={(e) => {
                e.preventDefault();
                onSearch();
              }}
            >
              <div>
                <label htmlFor="aboutYou" className="block text-sm font-medium mb-2">
                  About you
                </label>
                <textarea
                  id="aboutYou"
                  value={aboutYou}
                  onChange={(e) => setAboutYou(e.target.value)}
                  placeholder="Founder background, strengths, previous roles…"
                  rows={3}
                  className="w-full resize-y rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-strong)]"
                />
              </div>

              <div>
                <label htmlFor="aboutStartup" className="block text-sm font-medium mb-2">
                  About your startup
                </label>
                <textarea
                  id="aboutStartup"
                  value={aboutStartup}
                  onChange={(e) => setAboutStartup(e.target.value)}
                  placeholder="What you do, traction, go‑to‑market, stage…"
                  rows={4}
                  className="w-full resize-y rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-strong)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label htmlFor="industry" className="block text-sm font-medium mb-2">
                    Industry focus
                  </label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-strong)]"
                  >
                    {INDUSTRIES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[color:var(--accent-strong)] text-[color:var(--foreground)] px-5 py-3 font-medium shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-strong)] transition"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAboutYou("");
                      setAboutStartup("");
                    }}
                    className="rounded-xl px-4 py-3 font-medium border border-[color:var(--border)] hover:bg-[color:var(--surface-2)] transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </form>
          )}

          {phase === "loading" && (
            <div className="grid gap-6">
              <div className="rounded-2xl bg-[color:var(--surface)] ring-1 ring-[color:var(--border)] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="spinner" aria-hidden />
                    <div>
                      <p className="text-base font-medium">Finding relevant investors…</p>
                      <p className="text-xs text-[color:var(--muted, #b8c2bc)] mt-1">
                        Our matching algorithm is analyzing your details and industry focus.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-3xl leading-none select-none">
                    <span className="dot dot-lg">•</span>
                    <span className="dot dot-lg">•</span>
                    <span className="dot dot-lg">•</span>
                  </div>
                </div>

                <div className="mt-6" aria-live="polite">
                  <div className="h-[10px] w-full rounded-full bg-[color:var(--surface-2)] overflow-hidden">
                    <div
                      className="h-full bg-[color:var(--accent-strong)] progress-fill"
                      style={{ width: `${((stepIndex + 1) / STEP_MESSAGES.length) * 100}%` }}
                    />
                  </div>
                  <div className="mt-5 grid gap-3">
                    {STEP_MESSAGES.map((msg, i) => {
                      const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "upcoming";
                      return (
                        <div key={msg} className="flex items-center gap-3 text-sm">
                          <span
                            className={
                              state === "done"
                                ? "inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--accent-strong)] text-[color:var(--foreground)] shadow-sm"
                              : state === "active"
                                ? "inline-flex h-11 w-11 items-center justify-center rounded-full ring-2 ring-[color:var(--accent-strong)] bg-[color:var(--surface-2)] pulse-soft"
                                : "inline-flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-[color:var(--border)]"
                            }
                          >
                            <span className="msr text-[22px]">
                              {state === "done" ? "check_circle" : STEP_ICONS[i]}
                            </span>
                          </span>
                          <span className={i <= stepIndex ? "text-base" : "text-base text-[color:var(--muted, #b8c2bc)]"}>{msg}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={reset}
                  className="text-sm text-black/60 dark:text-white/60 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {phase === "results" && (
            <div className="grid gap-6">
              <div>
                <h2 className="text-lg font-medium">Top investor matches</h2>
                <p className="text-sm text-[color:var(--muted, #b8c2bc)] mt-1">
                  Based on your details and industry focus: {industry}
                </p>
              </div>
              <ul className="grid sm:grid-cols-2 gap-3">
                {investors.map((name) => (
                  <li
                    key={name}
                    className="rounded-xl ring-1 ring-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{name}</p>
                        <p className="text-xs text-[color:var(--muted, #b8c2bc)] truncate">Stage-agnostic • Lead/Follow</p>
                      </div>
                      <span className="text-xs rounded-full px-2 py-1 ring-1 ring-[color:var(--border)] text-[color:var(--muted, #b8c2bc)]">Investor</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between">
                <button
                  onClick={reset}
                  className="rounded-xl px-4 py-2 font-medium border border-[color:var(--border)] hover:bg-[color:var(--surface-2)] transition"
                >
                  Refine search
                </button>
                <button
                  onClick={() => setPhase("loading")}
                  className="rounded-xl bg-[color:var(--accent-strong)] text-[color:var(--foreground)] px-4 py-2 font-medium shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-strong)] transition"
                >
                  Run again
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
