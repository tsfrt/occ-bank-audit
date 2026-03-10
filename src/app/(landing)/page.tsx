"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../components/ThemeToggle";

// OCC-style colors: dark blue header (#112e51), gold accent, white/gray body
const OCC_STYLES = {
  headerBg: "#112e51",
  headerText: "#ffffff",
  accent: "#fdb81e",
  bodyBg: "#f0f0f0",
  cardBg: "#ffffff",
  text: "#1b1b1b",
  textMuted: "#5c5c5c",
  border: "#adadad",
  inputBorder: "#5c5c5c",
};

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
    // Simulate login: accept any non-empty credentials and "log in" via cookie + redirect
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
    <div className="min-h-screen flex flex-col" style={{ background: OCC_STYLES.bodyBg }}>
      {/* OCC-style banner / header */}
      <header
        className="flex items-center justify-between px-4 py-3 shadow-md"
        style={{ background: OCC_STYLES.headerBg, color: OCC_STYLES.headerText }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {/* OCC flag / seal placeholder - use text or SVG */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2"
              style={{ borderColor: OCC_STYLES.accent, color: OCC_STYLES.accent }}
              aria-hidden
            >
              <span className="text-lg font-bold">OCC</span>
            </div>
            <span className="font-semibold text-lg">OCC</span>
          </div>
          <p className="text-sm opacity-90 hidden sm:inline">
            An official website of the United States government
          </p>
        </div>
        <nav className="flex items-center gap-4 text-sm items-center">
          <ThemeToggle />
          <a
            href="https://www.occ.treas.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline opacity-90"
          >
            OCC.gov
          </a>
        </nav>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-md rounded-lg shadow-lg border p-8"
          style={{
            background: OCC_STYLES.cardBg,
            color: OCC_STYLES.text,
            borderColor: OCC_STYLES.border,
          }}
        >
          <h1 className="text-xl font-bold mb-1" style={{ color: OCC_STYLES.text }}>
            Bank Audit Analyst
          </h1>
          <p className="text-sm mb-6" style={{ color: OCC_STYLES.textMuted }}>
            Office of the Comptroller of the Currency – sign in to manage audit cases and run AI analysis.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: OCC_STYLES.text }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded text-black"
                style={{ borderColor: OCC_STYLES.inputBorder }}
                placeholder="you@example.gov"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: OCC_STYLES.text }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded text-black"
                style={{ borderColor: OCC_STYLES.inputBorder }}
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div
                className="text-sm px-3 py-2 rounded"
                style={{ background: "#f9dede", color: "#b51c1c" }}
                role="alert"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 font-semibold rounded text-white disabled:opacity-70"
              style={{ background: OCC_STYLES.headerBg }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-xs text-center" style={{ color: OCC_STYLES.textMuted }}>
            Use your OCC credentials. This is a demo; any email and password will sign you in for preview.
          </p>
        </div>
      </main>

      {/* OCC-style footer */}
      <footer
        className="px-4 py-6 mt-auto border-t"
        style={{ background: OCC_STYLES.cardBg, borderColor: OCC_STYLES.border, color: OCC_STYLES.textMuted }}
      >
        <div className="max-w-4xl mx-auto text-sm">
          <p className="font-semibold" style={{ color: OCC_STYLES.text }}>
            Promoting a Safe, Sound, and Fair Federal Banking System
          </p>
          <p className="mt-1">
            <a href="https://www.occ.treas.gov/" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
              occ.treas.gov
            </a>
            {" · "}
            <a href="https://www.usa.gov/" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
              USA.gov
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
