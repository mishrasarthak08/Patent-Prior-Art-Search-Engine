"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Briefcase, 
  Bookmark, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  GitCompare, 
  FileCheck,
  ExternalLink,
  Shield
} from "lucide-react";
import { getApiBaseUrl, getAuthHeaders } from "@/lib/api";

interface Matter {
  id: string;
  name: string;
  client_matter_number?: string;
  status?: string;
  technical_domain?: string;
  jurisdiction?: string;
  created_at: string;
}

interface SavedDoc {
  id: string;
  patent_id: string;
  title: string;
  assignee?: string;
  created_at: string;
}

interface RecentSearch {
  id: string;
  project_id?: string;
  raw_claim: string;
  preamble?: string;
  candidate_count: number;
  result_count: number;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [quickClaim, setQuickClaim] = useState("");
  const [matters, setMatters] = useState<Matter[]>([]);
  const [savedDocs, setSavedDocs] = useState<SavedDoc[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = () => {
    setLoading(true);
    const headers = getAuthHeaders();
    const baseUrl = getApiBaseUrl();

    Promise.all([
      fetch(`${baseUrl}/api/v1/matters`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${baseUrl}/api/v1/saved-documents`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${baseUrl}/api/v1/searches?limit=3`, { headers }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([mats, docs, searches]) => {
        if (Array.isArray(mats)) setMatters(mats);
        if (Array.isArray(docs)) setSavedDocs(docs);
        if (Array.isArray(searches)) setRecentSearches(searches);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboardData();
    window.addEventListener("patent_workspace_changed", loadDashboardData);
    return () => window.removeEventListener("patent_workspace_changed", loadDashboardData);
  }, []);

  const handleQuickLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClaim.trim()) {
      router.push("/app/search");
      return;
    }
    router.push(`/app/search?claim=${encodeURIComponent(quickClaim.trim())}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-7">
      {/* 1. TOP RESEARCH ENTRY INSTRUMENT */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                INVESTIGATION DESK
              </span>
              <span className="text-[11px] font-mono text-[#CBD5E1]">&bull;</span>
              <span className="text-[11px] font-mono text-[#64748B]">INTELLIGENCE OVERVIEW</span>
            </div>
            <h1 className="text-2xl text-[#0F172A] font-semibold mt-1">
              Resume or Initiate a Prior-Art Investigation
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/explorer"
              className="px-3 py-1.5 text-xs font-semibold rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] transition"
            >
              Corpus Explorer
            </Link>
            <Link
              href="/app/matters"
              className="px-3 py-1.5 text-xs font-semibold rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] transition"
            >
              All Matters
            </Link>
          </div>
        </div>

        <form onSubmit={handleQuickLaunch} className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-[#475569]">
            Paste invention claim language, abstract, or technical limitation draft:
          </label>
          <textarea
            rows={3}
            value={quickClaim}
            onChange={(e) => setQuickClaim(e.target.value)}
            className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1E40AF] focus:bg-white focus:outline-none transition leading-relaxed font-sans"
            placeholder="e.g. A high-capacity lithium-ion secondary battery comprising a cathode comprising lithium nickel cobalt manganese oxide and a silicon-graphite composite anode..."
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[#64748B] font-mono">
              Auto-decomposes preamble, transitional phrase, and discrete limitation clauses
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF] shadow-xs transition"
            >
              Deconstruct Claim & Search <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* 2. RESUME RECENT RESEARCH (Priority Workflow) */}
      {recentSearches.length > 0 && (
        <div className="surface-panel p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[#1E40AF]" />
              <h2 className="text-xs font-mono font-bold text-[#0F172A] uppercase tracking-wider">
                Resume Recent Prior-Art Searches
              </h2>
            </div>
            <Link
              href="/app/search"
              className="text-[11px] font-mono text-[#1E40AF] hover:underline font-semibold"
            >
              New Investigation &rarr;
            </Link>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {recentSearches.map((s) => (
              <div
                key={s.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#F8FAFC] px-2 rounded-[4px] transition"
              >
                <div className="space-y-0.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-semibold text-[#1E40AF] bg-[#EFF6FF] px-1.5 py-0.2 rounded-[3px]">
                      {s.preamble || "General Claim"}
                    </span>
                    <span className="font-mono text-[10px] text-[#94A3B8]">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                    <span className="font-mono text-[10px] text-[#64748B]">
                      {s.candidate_count} candidates evaluated
                    </span>
                  </div>
                  <p className="text-[#334155] font-medium line-clamp-1 text-[11px]">
                    {s.raw_claim}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/app/search?claim=${encodeURIComponent(s.raw_claim)}`}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-[4px] bg-[#0F172A] text-white hover:bg-[#1E40AF] transition"
                  >
                    Resume Search
                  </Link>
                  <Link
                    href={`/app/dossier`}
                    className="px-2 py-1 text-[11px] font-semibold rounded-[4px] border border-[#E2E8F0] bg-white text-[#475569] hover:text-[#0F172A] transition"
                  >
                    Dossier
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TWO-COLUMN WORKSPACE: Active Matters vs Saved Publications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Active Matters */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#1E40AF]" />
              <h2 className="text-sm font-semibold text-[#0F172A]">Active Research Matters</h2>
            </div>
            <Link href="/app/matters" className="text-xs font-mono text-[#1E40AF] hover:underline font-semibold">
              View All ({matters.length}) &rarr;
            </Link>
          </div>

          <div className="surface-panel divide-y divide-[#E2E8F0] overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#94A3B8]">Loading research matters...</div>
            ) : matters.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Briefcase className="h-8 w-8 text-[#94A3B8] mx-auto opacity-50" />
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-[#0F172A]">Workspace Initialized & Ready</h4>
                  <p className="text-[11px] text-[#64748B] max-w-sm mx-auto leading-relaxed">
                    This research environment is private to your account. Launch an investigation or create a legal matter to track prior-art candidates.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <Link
                    href="/app/search"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#0F172A] hover:bg-[#1E40AF] rounded-[4px] transition"
                  >
                    Start Investigation &rarr;
                  </Link>
                  <Link
                    href="/app/matters"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] rounded-[4px] transition"
                  >
                    Create Matter
                  </Link>
                </div>
              </div>
            ) : (
              matters.slice(0, 4).map((m) => (
                <div key={m.id} className="p-4 hover:bg-[#F8FAFC] transition flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] px-1.5 py-0.5 rounded-[4px]">
                        {m.client_matter_number || `MATTER-${m.id.slice(0, 6).toUpperCase()}`}
                      </span>
                      <span className="font-mono text-[10px] text-[#059669] bg-[#ECFDF5] px-1.5 py-0.5 rounded-[4px] font-semibold uppercase">
                        {m.status || "ACTIVE"}
                      </span>
                    </div>
                    <Link
                      href={`/app/matters`}
                      className="text-xs font-semibold text-[#0F172A] hover:text-[#1E40AF] transition block leading-snug"
                    >
                      {m.name}
                    </Link>
                    <div className="text-[11px] text-[#64748B] flex items-center gap-3 pt-0.5">
                      <span>Jurisdiction: <strong className="text-[#0F172A]">{m.jurisdiction || "US / Global"}</strong></span>
                      <span>Domain: <strong className="text-[#0F172A]">{m.technical_domain || "Multi-Disciplinary"}</strong></span>
                    </div>
                  </div>
                  <Link
                    href={`/app/search`}
                    className="shrink-0 px-2.5 py-1 text-[11px] font-semibold border border-[#E2E8F0] rounded-[4px] bg-white hover:bg-[#F8FAFC] text-[#0F172A] transition"
                  >
                    Investigate
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Saved Publications & Review Items */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-[#1E40AF]" />
              <h2 className="text-sm font-semibold text-[#0F172A]">Saved Prior-Art Citations</h2>
            </div>
            <Link href="/app/saved" className="text-xs font-mono text-[#1E40AF] hover:underline font-semibold">
              Library ({savedDocs.length}) &rarr;
            </Link>
          </div>

          <div className="surface-panel divide-y divide-[#E2E8F0] overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#94A3B8]">Loading saved publications...</div>
            ) : savedDocs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8] space-y-2">
                <Bookmark className="h-8 w-8 text-[#94A3B8] mx-auto opacity-40" />
                <p>No saved citations bookmarked yet.</p>
                <Link href="/app/explorer" className="inline-block text-[#1E40AF] hover:underline font-semibold">
                  Browse Corpus Explorer &rarr;
                </Link>
              </div>
            ) : (
              savedDocs.slice(0, 4).map((d) => (
                <div key={d.id} className="p-3.5 hover:bg-[#F8FAFC] transition space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#1E40AF]">
                      {d.patent_id}
                    </span>
                    <span className="text-[10px] font-mono text-[#94A3B8]">
                      {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-medium text-[#0F172A] line-clamp-1 leading-snug">
                    {d.title}
                  </h4>
                  {d.assignee && (
                    <div className="text-[10px] text-[#64748B]">
                      Assignee: <span className="text-[#0F172A] font-medium">{d.assignee}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Quick Technical Reference Box */}
          <div className="surface-panel p-4 text-xs space-y-2">
            <span className="font-mono text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block">
              RESEARCH WORKFLOW SHORTCUTS
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Link href="/app/claim-charts" className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] hover:border-[#1E40AF] text-[#0F172A] font-medium transition block">
                Evidence Claim Charts &rarr;
              </Link>
              <Link href="/app/compare" className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] hover:border-[#1E40AF] text-[#0F172A] font-medium transition block">
                Side-by-Side Compare &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUBSYSTEM HEALTH & INTEGRITY BANNER */}
      <div className="surface-panel p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-[#64748B]">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#059669]" />
          <span className="font-mono font-semibold text-[#0F172A]">RETRIEVAL PIPELINE ACTIVE</span>
          <span className="text-[#CBD5E1]">&bull;</span>
          <span>Field-Weighted BM25 + Qdrant Dense Vector Store + Cohere Rerank v3</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span>SYSTEM: <strong className="text-[#059669]">OPERATIONAL</strong></span>
          <Link href="/app/audit" className="text-[#1E40AF] hover:underline font-semibold">
            Compliance Audit Log &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
