"use client";

import { FormEvent, useEffect, useState } from "react";

/**
 * Access-code gate. Session is a long-lived HttpOnly cookie —
 * idle / backgrounding the phone does not require re-entry.
 */
export default function PinGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "open">("checking");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setStatus(data && data.ok ? "open" : "locked");
      })
      .catch(() => {
        if (!cancelled) setStatus("locked");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("open");
        setPin("");
        setPassword("");
      } else if (res.status === 429) {
        setError(data.error || "Too many attempts. Try again later.");
      } else {
        setError("Invalid access code or password.");
        setPin("");
        setPassword("");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="flex flex-col min-h-screen max-w-2xl mx-auto w-full bg-[#f7f6f3]">
        <div className="h-1 bg-gradient-to-r from-brand-800 via-brand-700 to-brand-500" />
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-sm bg-white rounded-2xl shadow-[0_1px_3px_rgba(15,28,44,0.08)] border border-gray-100 px-5 py-6"
          >
            <h1 className="text-xl font-extrabold tracking-tight text-brand-800">
              Duty Reporter
            </h1>
            <div className="flex items-center gap-2 mt-1 mb-5">
              <span className="inline-block w-6 h-0.5 bg-gold rounded-full" />
              <p className="text-xs text-gray-500">Enter access code and password</p>
            </div>

            <label htmlFor="access-code" className="sr-only">
              Access code
            </label>
            <input
              id="access-code"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Access code"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base tracking-widest
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />

            <label htmlFor="access-password" className="sr-only">
              Password
            </label>
            <input
              id="access-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="mt-3 w-full px-4 py-3 rounded-xl border border-gray-200 text-base
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />

            {error ? (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={busy || pin.length < 4 || password.length < 1}
              className="mt-4 w-full py-3 rounded-xl text-sm font-semibold text-white
                         bg-brand-700 hover:bg-brand-800 active:scale-[0.98] transition-all
                         disabled:opacity-50 disabled:active:scale-100
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {busy ? "Checking…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
