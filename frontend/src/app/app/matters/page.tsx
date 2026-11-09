"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Briefcase, 
  Plus, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Scale
} from "lucide-react";
import { getApiBaseUrl, getAuthHeaders } from "@/lib/api";

interface Matter {
  id: string;
  name: string;
  matter_number?: string;
  client_name?: string;
  technical_domain?: string;
  jurisdiction?: string;
  status?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export default function MattersPage() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [matterNumber, setMatterNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [domain, setDomain] = useState("Energy & Solid-State Systems");
  const [jurisdiction, setJurisdiction] = useState("US");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMatters = () => {
    setLoading(true);
    const baseUrl = getApiBaseUrl();
    let url = `${baseUrl}/api/v1/matters`;
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append("search", searchQuery.trim());
    if (statusFilter !== "ALL") params.append("status_filter", statusFilter);
    if (params.toString()) url += `?${params.toString()}`;

    const headers = getAuthHeaders();

    fetch(url, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setMatters(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMatters();
    window.addEventListener("patent_workspace_changed", fetchMatters);
    return () => window.removeEventListener("patent_workspace_changed", fetchMatters);
  }, [statusFilter]);

  const handleCreateMatter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();

      const res = await fetch(`${baseUrl}/api/v1/matters`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          matter_number: matterNumber || `MATTER-${Date.now().toString().slice(-6)}`,
          client_name: clientName || "General Counsel",
          technical_domain: domain,
          jurisdiction,
          description,
        }),
      });

      if (res.ok) {
        setName("");
        setMatterNumber("");
        setClientName("");
        setDescription("");
        setCreateModalOpen(false);
        fetchMatters();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. HEADER & CONTROL INSTRUMENT */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                ORGANIZATIONAL WORKSPACE
              </span>
              <span className="text-[11px] font-mono text-[#CBD5E1]">&bull;</span>
              <span className="text-[11px] font-mono text-[#64748B]">DOCKET MANAGEMENT</span>
            </div>
            <h1 className="text-2xl text-[#0F172A] font-semibold mt-1">
              Legal Matters & Prior-Art Dockets
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-1.5 text-xs font-semibold rounded-[5px] bg-[#0F172A] text-white hover:bg-[#1E40AF] flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Create New Matter
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchMatters()}
              placeholder="Search by matter name, client, docket number, or technical domain..."
              className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#94A3B8] font-mono text-[11px] mr-1">Status:</span>
            {["ALL", "ACTIVE", "IN_REVIEW", "COMPLETED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-[4px] transition ${
                  statusFilter === status
                    ? "bg-[#0F172A] text-white font-semibold"
                    : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MATTERS TABLE */}
      <div className="surface-panel overflow-hidden">
        <div className="p-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-[#0F172A]">
            {matters.length} REGISTERED RESEARCH MATTERS
          </span>
          <span className="text-[#94A3B8]">CONFIDENTIAL SCOPED PERSISTENCE</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#94A3B8]">Loading matters directory...</div>
        ) : matters.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#94A3B8] space-y-2">
            <Briefcase className="h-8 w-8 text-[#94A3B8] mx-auto opacity-40" />
            <p>No legal matters found matching criteria.</p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="text-[#1E40AF] hover:underline font-semibold"
            >
              Create your first matter &rarr;
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-mono text-[10px] uppercase tracking-wider">
                  <th className="p-3.5">Matter Reference</th>
                  <th className="p-3.5">Investigation Title</th>
                  <th className="p-3.5">Client Account</th>
                  <th className="p-3.5">Technical Domain</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {matters.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="p-3.5 font-mono text-xs font-bold text-[#0F172A] whitespace-nowrap">
                      {m.matter_number || `MATTER-${m.id.slice(0, 6).toUpperCase()}`}
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-xs text-[#0F172A] leading-snug">{m.name}</div>
                      {m.description && (
                        <p className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">{m.description}</p>
                      )}
                    </td>

                    <td className="p-3.5 text-[#475569] whitespace-nowrap">
                      {m.client_name || "General Counsel"}
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                      {m.technical_domain || "Multi-Disciplinary"}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="badge-verified font-bold uppercase text-[10px]">
                        {m.status || "ACTIVE"}
                      </span>
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <Link
                        href={`/app/search`}
                        className="px-3 py-1 bg-[#0F172A] text-white rounded-[4px] text-xs font-semibold hover:bg-[#1E40AF] transition shadow-xs inline-flex items-center gap-1"
                      >
                        Search Prior Art <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. CREATE MATTER MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="rounded-[6px] border border-[#E2E8F0] bg-white max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#0F172A] font-mono uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#1E40AF]" /> Register Legal Research Matter
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMatter} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Investigation / Invention Name *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Solid-State Electrolyte Battery Invalidation Study"
                  className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Matter Reference Number
                  </label>
                  <input
                    type="text"
                    value={matterNumber}
                    onChange={(e) => setMatterNumber(e.target.value)}
                    placeholder="e.g. MAT-2026-009"
                    className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#0F172A] font-mono focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Client or Entity
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Apex Energy Corp"
                    className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Technical Domain
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Primary Jurisdiction
                  </label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#0F172A] font-mono focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Scope & Investigation Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Record defense strategy, 102/103 prior-art objectives, or targeted claim limitations..."
                  className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-[5px] bg-[#F8FAFC] text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold rounded-[5px] bg-[#0F172A] text-white hover:bg-[#1E40AF] transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Register Matter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
