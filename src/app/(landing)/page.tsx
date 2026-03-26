"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Sign-in failed. Please try again.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Government-style banner */}
      <div className="bg-foreground text-white text-xs py-1.5 px-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 0L0 4v1h12V4L6 0zM1 6v4h2V6H1zm4 0v4h2V6H5zm4 0v4h2V6H9zM0 11v1h12v-1H0z" />
          </svg>
          <span>An official website of the United States government</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-nav-bg text-white px-4 py-4 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/40 flex-shrink-0"
              aria-hidden
            >
              <span className="text-sm font-bold tracking-tight">OCC</span>
            </div>
            <div>
              <span className="font-semibold text-lg">Office of the Comptroller</span>
              <span className="hidden sm:block text-sm text-white/70">U.S. Department of the Treasury</span>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a
              href="https://www.occ.treas.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white hover:underline transition-colors"
            >
              OCC.gov
            </a>
          </nav>
        </div>
      </header>

      {/* Hero section */}
      <div className="bg-primary px-4 py-10 text-white">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold">Bank Audit Analyst</h1>
          <p className="mt-2 text-lg text-white/80 max-w-xl">
            Manage audit cases, run AI analysis, and review outcomes for bank examination.
          </p>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-lg shadow-lg border border-card-border bg-card-bg p-8">
            <h2 className="text-xl font-bold text-foreground mb-1">
              Sign in
            </h2>
            <p className="text-sm text-muted mb-6">
              Access the Bank Audit Analyst system with your OCC credentials.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-card-border rounded-md text-foreground bg-card-bg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                  placeholder="you@example.gov"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-card-border rounded-md text-foreground bg-card-bg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div
                  className="text-sm px-4 py-3 rounded-md bg-red-50 border border-red-200 text-error"
                  role="alert"
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 font-semibold rounded-md text-white bg-primary hover:bg-primary-hover disabled:opacity-70 transition-colors shadow-sm"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-xs text-center text-muted">
              This is a demo environment. Any email and password will sign you in for preview.
            </p>
          </div>

          {/* Quick links */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <a
              href="https://www.occ.treas.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-card-border bg-card-bg p-4 text-center hover:border-accent/40 hover:shadow-sm transition-all"
            >
              <p className="text-sm font-medium text-accent">OCC Website</p>
              <p className="text-xs text-muted mt-1">occ.treas.gov</p>
            </a>
            <a
              href="https://www.usa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-card-border bg-card-bg p-4 text-center hover:border-accent/40 hover:shadow-sm transition-all"
            >
              <p className="text-sm font-medium text-accent">USA.gov</p>
              <p className="text-xs text-muted mt-1">Government services</p>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-nav-bg text-white/80 px-4 py-8 mt-auto">
        <div className="max-w-5xl mx-auto">
          <p className="font-semibold text-white">
            Promoting a Safe, Sound, and Fair Federal Banking System
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <a href="https://www.occ.treas.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-white underline">
              occ.treas.gov
            </a>
            <a href="https://www.treasury.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-white underline">
              treasury.gov
            </a>
            <a href="https://www.usa.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-white underline">
              USA.gov
            </a>
          </div>
          <p className="mt-4 text-xs text-white/50">
            Office of the Comptroller of the Currency · U.S. Department of the Treasury
          </p>
        </div>
      </footer>
    </div>
  );
}
