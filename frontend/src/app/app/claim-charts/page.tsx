"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  Search, 
  Scale, 
  ExternalLink,
  Check, 
  X,
  FileCheck,
  ChevronRight,
  Filter
} from "lucide-react";
import { getApiBaseUrl, getAuthHeaders } from "@/lib/api";

interface EvidenceRow {
  id: string;
  search_id: string;
  doc_id?: string;
  patent_id?: string;
  publication_number?: string;
  patent_title?: string;
  claim_element_id?: string;
  element_id?: string;
  limitation_text?: string;
  support_level: string;
  passage_text?: string;
  exact_quote?: string;
  passage_location?: string;
  section?: string;
  paragraph_number?: string;
  char_start?: number;
  char_end?: number;
  verified?: boolean;
  is_verified?: boolean;
  confidence_score?: number;
  document_hash?: string;
  reviewer_decision?: string;
  explanation?: string;
  attorney_review_status?: string;
  attorney_notes?: string;
}

export default function ClaimChartsPage() {
  const [charts, setCharts] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [supportFilter, setSupportFilter] = useState("ALL");
  const [searchFilter, setSearchFilter] = useState("");
  const [viewMode, setViewMode] = useState<"matrix" | "heatmap">("matrix");
  
  const [activeEvidence, setActiveEvidence] = useState<EvidenceRow | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("ACCEPTED");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchCharts = () => {
    setLoading(true);
    const apiBase = getApiBaseUrl();
    let url = `${apiBase}/api/v1/evidence-ledger?limit=100`;
    if (supportFilter !== "ALL") url += `&support_level=${supportFilter}`;

    const headers = getAuthHeaders();

    fetch(url, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setCharts(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCharts();
    window.addEventListener("patent_workspace_changed", fetchCharts);
    return () => window.removeEventListener("patent_workspace_changed", fetchCharts);
  }, [supportFilter]);

  const handleOpenReview = (row: EvidenceRow) => {
    setActiveEvidence(row);
    setEditNotes(row.attorney_notes || "");
    setEditStatus(row.reviewer_decision && row.reviewer_decision !== "UNREVIEWED" ? row.reviewer_decision : "HUMAN_VERIFIED");
  };

  const handleUpdateReview = async () => {
    if (!activeEvidence) return;
    setIsUpdating(true);

    try {
      const headers = getAuthHeaders();
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/v1/evidence-ledger/${activeEvidence.id}/review`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          decision: editStatus,
          notes: editNotes,
        }),
      });

      if (res.ok) {
        setActiveEvidence(null);
        fetchCharts();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCharts = charts.filter((c) => {
    const query = (searchFilter || "").toLowerCase().trim();
    if (!query) return true;
    const patentId = (c.patent_id || "").toLowerCase();
    const limText = (c.limitation_text || "").toLowerCase();
    const passText = (c.passage_text || "").toLowerCase();
    const notes = (c.attorney_notes || "").toLowerCase();
    return (
      patentId.includes(query) ||
      limText.includes(query) ||
      passText.includes(query) ||
      notes.includes(query)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. HEADER & CONTROL INSTRUMENT */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                ANALYTICAL INSTRUMENT
              </span>
              <span className="text-[11px] font-mono text-[#CBD5E1]">&bull;</span>
              <span className="text-[11px] font-mono text-[#64748B]">EVIDENCE MATRIX</span>
            </div>
            <h1 className="text-2xl text-[#0F172A] font-semibold mt-1">
              Claim Limitation Evidence Charts
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#F1F5F9] p-0.5 rounded-[5px] border border-[#E2E8F0]">
              <button
                onClick={() => setViewMode("matrix")}
                className={`px-3 py-1 text-xs font-semibold rounded-[4px] transition ${
                  viewMode === "matrix" ? "bg-white text-[#0F172A] shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Matrix Table
              </button>
              <button
                onClick={() => setViewMode("heatmap")}
                className={`px-3 py-1 text-xs font-semibold rounded-[4px] transition ${
                  viewMode === "heatmap" ? "bg-white text-[#0F172A] shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Coverage Heatmap
              </button>
            </div>
            <Link
              href="/app/search"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-[5px] bg-[#0F172A] text-white hover:bg-[#1E40AF] shadow-xs transition"
            >
              New Claim Search
            </Link>
          </div>
        </div>

        {/* Statutory Legal Guidance Banner */}
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] text-xs text-[#475569] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Scale className="h-4 w-4 text-[#1E40AF] shrink-0" />
            <span>
              <strong>Research Assistance Notice:</strong> Limitation mappings identify textual correspondence in indexed specifications. They do not constitute a formal legal conclusion of anticipation (35 U.S.C. § 102) or obviousness (35 U.S.C. § 103). Professional attorney evaluation is required.
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by publication number, limitation clause, or passage text..."
              className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[#94A3B8] font-mono text-[11px] mr-1">Support:</span>
            {["ALL", "DIRECTLY_SUPPORTED", "PARTIALLY_SUPPORTED", "RELATED", "NOT_FOUND"].map((status) => (
              <button
                key={status}
                onClick={() => setSupportFilter(status)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-[4px] transition ${
                  supportFilter === status
                    ? "bg-[#0F172A] text-white font-semibold"
                    : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. EVIDENCE TABLE MATRIX */}
      <div className="surface-panel overflow-hidden">
        <div className="p-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-[#0F172A]">
            {filteredCharts.length} CERTIFIED LIMITATION CITATIONS
          </span>
          <span className="text-[#94A3B8]">
            CLICK ROW TO INSPECT SOURCE PASSAGE & SIGN OFF
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#94A3B8]">
            Loading certified claim chart matrix...
          </div>
        ) : filteredCharts.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#94A3B8] space-y-2">
            <CheckCircle2 className="h-8 w-8 text-[#94A3B8] mx-auto opacity-40" />
            <p>No limitation evidence found matching the selected filters.</p>
            <Link href="/app/search" className="text-[#1E40AF] hover:underline font-semibold">
              Execute a claim investigation &rarr;
            </Link>
          </div>
        ) : viewMode === "heatmap" ? (
          /* HEATMAP COVERAGE VIEW */
          <div className="p-5 overflow-x-auto">
            <div className="mb-4 text-xs text-[#64748B]">
              Limitation-by-publication coverage grid. Click any cell to inspect the supporting passage and verify text.
            </div>
            <table className="w-full text-left text-xs border border-[#E2E8F0]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-mono text-[10px] uppercase">
                  <th className="p-3 border-r border-[#E2E8F0] min-w-[280px]">Claim Limitation Clause</th>
                  {Array.from(new Set(filteredCharts.map((c) => c.publication_number || c.doc_id || c.patent_id || "Doc"))).slice(0, 6).map((docId) => (
                    <th key={docId} className="p-3 border-r border-[#E2E8F0] text-center min-w-[130px]">
                      <span className="font-bold text-[#0F172A] block">{docId}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {Array.from(
                  new Map(
                    filteredCharts.map((c) => [
                      c.element_id || c.claim_element_id || "el",
                      {
                        id: c.element_id || c.claim_element_id || "el",
                        text: c.limitation_text || "Limitation text",
                      },
                    ])
                  ).values()
                ).map((elem) => {
                  const docs = Array.from(new Set(filteredCharts.map((c) => c.publication_number || c.doc_id || c.patent_id || "Doc"))).slice(0, 6);
                  return (
                    <tr key={elem.id} className="hover:bg-[#F8FAFC]">
                      <td className="p-3 border-r border-[#E2E8F0] bg-white">
                        <span className="font-mono text-[11px] font-bold text-[#1E40AF] block">
                          [{elem.id}]
                        </span>
                        <p className="text-[11px] text-[#0F172A] line-clamp-2 mt-0.5">
                          {elem.text}
                        </p>
                      </td>
                      {docs.map((docId) => {
                        const match = filteredCharts.find(
                          (c) =>
                            (c.element_id === elem.id || c.claim_element_id === elem.id) &&
                            (c.publication_number === docId || c.doc_id === docId || c.patent_id === docId)
                        );
                        if (!match) {
                          return (
                            <td key={docId} className="p-3 border-r border-[#E2E8F0] text-center bg-[#F8FAFC]">
                              <span className="text-[10px] font-mono text-[#94A3B8]">—</span>
                            </td>
                          );
                        }
                        const isFull = match.support_level === "DIRECTLY_SUPPORTED" || match.support_level === "DIRECTLY_SUPPORTING";
                        const isPartial = match.support_level === "PARTIALLY_SUPPORTED" || match.support_level === "PARTIALLY_SUPPORTING";
                        return (
                          <td
                            key={docId}
                            onClick={() => handleOpenReview(match)}
                            className="p-3 border-r border-[#E2E8F0] text-center cursor-pointer hover:opacity-90 transition"
                          >
                            <span
                              className={`inline-block font-mono text-[10px] font-semibold px-2 py-1 rounded-[4px] border ${
                                isFull
                                  ? "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]"
                                  : isPartial
                                  ? "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]"
                                  : "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]"
                              }`}
                            >
                              {match.paragraph_number || "[0001]"}
                            </span>
                            <span className="block text-[9px] text-[#64748B] font-mono mt-0.5">
                              {match.verified ? "Verified" : "Unverified"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* MATRIX TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-mono text-[10px] uppercase tracking-wider">
                  <th className="p-3.5">Limitation Element</th>
                  <th className="p-3.5">Prior-Art Publication</th>
                  <th className="p-3.5">Supporting Passage Excerpt</th>
                  <th className="p-3.5">Support Level</th>
                  <th className="p-3.5">Verification</th>
                  <th className="p-3.5 text-right">Review Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredCharts.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleOpenReview(row)}
                    className="hover:bg-[#F8FAFC] transition cursor-pointer"
                  >
                    <td className="p-3.5 max-w-xs">
                      <span className="font-mono font-bold text-[#1E40AF] block text-[11px]">
                        [{row.element_id || row.claim_element_id || "el-1"}]
                      </span>
                      <p className="text-[12px] text-[#0F172A] line-clamp-2 leading-relaxed">
                        {row.limitation_text || "Limitation text constraint"}
                      </p>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-[#0F172A] block">
                        {row.publication_number || row.doc_id || row.patent_id}
                      </span>
                      <span className="text-[10px] text-[#1E40AF] font-mono font-semibold">
                        {row.paragraph_number || row.passage_location || "[0001]"}
                      </span>
                      {row.char_start !== undefined && row.char_end !== undefined && row.char_end > 0 && (
                        <span className="text-[9px] text-[#64748B] font-mono block">
                          Offsets: {row.char_start}–{row.char_end}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 max-w-md">
                      <div className="source-passage-highlight text-[11px] text-[#0F172A] line-clamp-2 leading-relaxed">
                        &ldquo;{row.exact_quote || row.passage_text || ""}&rdquo;
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-[4px] ${
                          row.support_level === "DIRECTLY_SUPPORTED" || row.support_level === "DIRECTLY_SUPPORTING"
                            ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                            : row.support_level === "PARTIALLY_SUPPORTED" || row.support_level === "PARTIALLY_SUPPORTING"
                            ? "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]"
                            : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
                        }`}
                      >
                        {row.support_level}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {row.verified || row.is_verified ? (
                        <span className="badge-verified">
                          <Check className="h-3 w-3" /> VERIFIED
                        </span>
                      ) : (
                        <span className="badge-tech">UNVERIFIED</span>
                      )}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <span
                        className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-[4px] uppercase ${
                          row.reviewer_decision === "HUMAN_VERIFIED" || row.attorney_review_status === "ACCEPTED"
                            ? "bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]"
                            : row.reviewer_decision === "HUMAN_REJECTED" || row.attorney_review_status === "REJECTED"
                            ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                            : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]"
                        }`}
                      >
                        {row.reviewer_decision || row.attorney_review_status || "PENDING"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. EVIDENCE INSPECTION & ATTORNEY SIGN-OFF MODAL */}
      {activeEvidence && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="rounded-[6px] border border-[#E2E8F0] bg-white max-w-xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#1E40AF]">
                  {activeEvidence.patent_id}
                </span>
                <span className="text-[11px] text-[#CBD5E1]">&bull;</span>
                <span className="font-mono text-xs text-[#0F172A]">
                  Limitation [{activeEvidence.claim_element_id}]
                </span>
              </div>
              <button
                onClick={() => setActiveEvidence(null)}
                className="text-[#94A3B8] hover:text-[#0F172A] text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Limitation & Full Passage Context */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase block mb-1">
                  Claim Limitation Clause:
                </span>
                <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] text-[#0F172A] font-medium leading-relaxed">
                  {activeEvidence.limitation_text || "Limitation text"}
                </div>
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase block mb-1">
                  Full Authoritative Disclosure Passage ({activeEvidence.passage_location || "Detailed Description"}):
                </span>
                <div className="source-passage-highlight">
                  &ldquo;{activeEvidence.passage_text}&rdquo;
                </div>
              </div>

              {activeEvidence.explanation && (
                <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] text-[#475569]">
                  <strong className="text-[#0F172A]">Relevance Rationale:</strong> {activeEvidence.explanation}
                </div>
              )}
            </div>

            {/* Review Status & Notes */}
            <div className="pt-2 border-t border-[#E2E8F0] space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Attorney Review Sign-Off:
                </label>
                <div className="flex gap-2">
                  {["ACCEPTED", "REJECTED", "MODIFIED"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setEditStatus(status)}
                      className={`px-3 py-1 text-xs font-mono rounded-[4px] transition ${
                        editStatus === status
                          ? "bg-[#1E40AF] text-white font-semibold shadow-xs"
                          : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Practitioner Notes & Invalidity Justification:
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record defense strategy, 102/103 rationale, or limitation qualification..."
                  className="w-full p-2.5 border border-[#E2E8F0] bg-[#F8FAFC] rounded-[5px] text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link
                  href={`/app/explorer?q=${encodeURIComponent(activeEvidence.patent_id || activeEvidence.doc_id || "")}`}
                  target="_blank"
                  className="text-xs font-mono text-[#1E40AF] hover:underline flex items-center gap-1 font-semibold"
                >
                  Open in Document Reader <ExternalLink className="h-3 w-3" />
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveEvidence(null)}
                    className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-[5px] bg-[#F8FAFC] text-[#0F172A]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdateReview}
                    disabled={isUpdating}
                    className="px-4 py-1.5 text-xs font-semibold rounded-[5px] bg-[#1E40AF] text-white hover:bg-[#1D4ED8] shadow-xs disabled:opacity-50"
                  >
                    {isUpdating ? "Saving..." : "Save Review"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. STATUTORY RESEARCH NOTICE */}
      <div className="surface-panel p-3.5 text-[11px] text-[#64748B] flex items-center gap-2">
        <Scale className="h-4 w-4 text-[#1E40AF] shrink-0" />
        <span>
          <strong>Statutory Research Notice:</strong> Limitation mappings and substring verification scores are decision-support aids for patent counsel. They do not constitute a conclusive legal opinion on 35 U.S.C. §§ 102 anticipation or § 103 obviousness.
        </span>
      </div>
    </div>
  );
}
