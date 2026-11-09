"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, AlertCircle, Shield } from "lucide-react";

import { getApiBaseUrl, setAuthSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@patentsearchengine.com");
  const [password, setPassword] = useState("patent2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Authentication failed");
      }

      const data = await res.json();
      setAuthSession(data.access_token, data.user);
      router.push("/app");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-[#0F172A] text-white shadow-xs">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <span className="font-mono text-sm font-bold text-[#0F172A] tracking-tight uppercase">
            Patent Prior-Art Search Engine
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-semibold text-[#0F172A]">
          Sign In to Investigation Platform
        </h2>
        <p className="mt-1 text-xs text-[#64748B]">
          Or{" "}
          <Link href="/register" className="font-semibold text-[#1E40AF] hover:underline">
            create a new research account
          </Link>
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="surface-panel p-7 shadow-xs">
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-[5px] border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Practitioner Email
              </label>
              <div className="relative">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 pl-9 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1E40AF] focus:bg-white focus:outline-none transition"
                  placeholder="counsel@patentfirm.com"
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#0F172A]">Password</label>
                <span className="text-[11px] text-[#94A3B8] cursor-not-allowed">Reset</span>
              </div>
              <div className="relative">
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 pl-9 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1E40AF] focus:bg-white focus:outline-none transition"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-[5px] bg-[#0F172A] py-2.5 px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#1E40AF] transition disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Access Investigation Workspace"} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-[#E2E8F0] pt-4 text-center">
            <span className="text-[11px] text-[#94A3B8] font-mono">
              Demo Credentials: admin@patentsearchengine.com / patent2026
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
