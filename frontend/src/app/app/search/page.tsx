"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  SlidersHorizontal, 
  Layers, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Check, 
  Eye, 
  Scale, 
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  Share2,
  Sparkles,
  Activity
} from "lucide-react";
import { getApiBaseUrl, getAuthHeaders } from "@/lib/api";

const SAMPLE_CLAIMS = {
  battery: {
    title: "Solid-State Battery Anode (H01M)",
    cpc: "H01M",
    text: "A high-capacity lithium-ion secondary battery comprising: a cathode comprising lithium nickel cobalt manganese oxide; an anode comprising a silicon-graphite composite with 10% to 25% by weight nano-silicon particles; and a non-aqueous liquid electrolyte comprising fluoroethylene carbonate in an amount between 2% and 8% by weight."
  },
  ai: {
    title: "Neuromorphic Attention Crossbar (G06N)",
    cpc: "G06N",
    text: "A neuromorphic hardware accelerator for transformer attention processing, comprising: an analog memristive crossbar array configured to perform matrix-vector multiplication; a digital systolic array coupled to receive analog outputs via analog-to-digital converters; and a hardware softmax unit executing scaled dot-product attention in volatile local memory."
  },
  biopharma: {
    title: "Lipid Nanoparticle Delivery (A61K)",
    cpc: "A61K",
    text: "A pharmaceutical lipid nanoparticle formulation for targeted mRNA delivery, comprising: an ionizable amino-lipid having a tertiary amine headgroup with an apparent pKa between 6.2 and 6.8; a helper neutral phospholipid; cholesterol in a molar ratio of 35% to 45%; and a PEG-conjugated lipid in a molar ratio of 1.0% to 2.5% encapsulating therapeutic mRNA."
  }
};

export default function PriorArtSearchPage() {
  const [claimText, setClaimText] = useState(SAMPLE_CLAIMS.battery.text);
  const [selectedMatter, setSelectedMatter] = useState("default-workspace");
  const [showFilters, setShowFilters] = useState(false);
  const [cpcFilter, setCpcFilter] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [dedupFamily, setDedupFamily] = useState(true);
  const [iterativeMode, setIterativeMode] = useState(true);

  const [loading, setLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [annotationNotes, setAnnotationNotes] = useState("");
  const [annotationStatus, setAnnotationStatus] = useState("RELEVANT");
  const [annotating, setAnnotating] = useState(false);
  const [annotationSuccess, setAnnotationSuccess] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"markdown" | "html" | "csv" | "json">("markdown");
  const [exportContent, setExportContent] = useState<string | null>(null);

  // Check URL params for initial query
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const claimParam = urlParams.get("claim");
      if (claimParam) {
        setClaimText(claimParam);
      }
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!claimText.trim()) return;

    setLoading(true);
    setError(null);
    setSearchResponse(null);

    try {
      const payload: any = {
        raw_claim: claimText.trim(),
        project_id: selectedMatter,
        filters: {
          deduplicate_families: dedupFamily,
        },
      };

      if (cpcFilter.trim()) {
        payload.filters.cpc_codes = [cpcFilter.trim()];
      }
      if (jurisdiction.trim()) {
        payload.filters.jurisdiction = jurisdiction.trim();
      }

      const headers = getAuthHeaders();
      const apiBase = getApiBaseUrl();
      const endpoint = iterativeMode
        ? `${apiBase}/api/v1/search/iterative`
        : `${apiBase}/api/v1/search`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Search execution failed (${res.status})`);
      }

      const data = await res.json();
      if (iterativeMode) {
        data.candidates = data.results || [];
        data.query_claim = data.decomposed_claim;
      }
      setSearchResponse(data);
      if (data.candidates && data.candidates.length > 0) {
        setSelectedDocId(data.candidates[0].doc_id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute prior-art retrieval");
    } finally {
      setLoading(false);
    }
  };

  const handleAnnotate = async () => {
    if (!searchResponse || !selectedDocId) return;
    setAnnotating(true);
    setAnnotationSuccess(false);

    try {
      const headers = getAuthHeaders();
      const apiBase = getApiBaseUrl();

      const res = await fetch(`${apiBase}/api/v1/searches/${searchResponse.search_id}/annotate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          doc_id: selectedDocId,
          notes: annotationNotes,
          status: annotationStatus,
        }),
      });

      if (res.ok) {
        setAnnotationSuccess(true);
        setTimeout(() => setAnnotationSuccess(false), 2500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnnotating(false);
    }
  };

  const handleExport = async (format: "markdown" | "html" | "csv" | "json") => {
    if (!searchResponse) return;
    setExportFormat(format);
    setExportModalOpen(true);
    setExportContent(null);

    try {
      const headers = getAuthHeaders();
      const apiBase = getApiBaseUrl();

      const res = await fetch(
        `${apiBase}/api/v1/searches/${searchResponse.search_id}/export?format=${format}`,
        { headers }
      );

      if (res.ok) {
        if (format === "html") {
          const htmlText = await res.text();
          setExportContent(htmlText);
        } else if (format === "csv") {
          const csvText = await res.text();
          setExportContent(csvText);
        } else {
          const data = await res.json();
          setExportContent(typeof data.report === "string" ? data.report : JSON.stringify(data, null, 2));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedCandidate = searchResponse?.candidates?.find(
    (c: any) => c.doc_id === selectedDocId
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. HEADER & FORMULATION INSTRUMENT */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                INVESTIGATION WORKBENCH
              </span>
              <span className="text-[11px] font-mono text-[#CBD5E1]">&bull;</span>
              <span className="text-[11px] font-mono text-[#64748B]">MULTI-STAGE RETRIEVAL</span>
            </div>
            <h1 className="text-2xl text-[#0F172A] font-semibold mt-1">
              Prior-Art Claim Investigation
            </h1>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-[#94A3B8] mr-1">Load Preset Claim:</span>
            {Object.entries(SAMPLE_CLAIMS).map(([key, sample]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setClaimText(sample.text);
                  setCpcFilter(sample.cpc);
                }}
                className="px-2.5 py-1 text-[11px] font-mono rounded-[4px] border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] transition"
              >
                {sample.title.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Confidentiality & Legal Notice Banner */}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] text-[11px] text-[#475569]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[3px] border border-[#BFDBFE]">
              <CheckCircle2 className="w-3 h-3 text-[#1E40AF]" /> ZERO-EGRESS CONFIDENTIAL
            </span>
            <span>All claim queries are tenant-isolated in PostgreSQL via RLS and never used for model training.</span>
          </div>
          <span className="hidden md:inline-block font-mono text-[10px] text-[#94A3B8]">
            Automated research assistance &bull; Not legal advice under 35 U.S.C. §§ 102/103
          </span>
        </div>

        <form onSubmit={handleSearch} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Independent Patent Claim or Technical Disclosure:
            </label>
            <textarea
              required
              rows={4}
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1E40AF] focus:bg-white focus:outline-none transition leading-relaxed font-sans"
              placeholder="Paste independent patent claim comprising preamble, transitional phrase, and technical limitations..."
            />
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#1E40AF]" />
                <span>Retrieval Parameters & CPC Filters</span>
                {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              <label className="flex items-center gap-2 text-xs font-medium text-[#0F172A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={iterativeMode}
                  onChange={(e) => setIterativeMode(e.target.checked)}
                  className="rounded-[3px] border-[#CBD5E1] text-[#1E40AF] focus:ring-0"
                />
                <span className="flex items-center gap-1">
                  <span>Coordinated Iterative Search</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] rounded-[2px] font-bold">
                    Gap Analysis Active
                  </span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-[5px] bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1E40AF] transition disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Executing Decomp & Retrieval...</span>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  <span>Execute Prior-Art Search</span>
                </>
              )}
            </button>
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#0F172A] mb-1">
                  CPC Classification Prefix
                </label>
                <input
                  type="text"
                  value={cpcFilter}
                  onChange={(e) => setCpcFilter(e.target.value)}
                  placeholder="e.g. H01M, G06N, A61K"
                  className="w-full rounded-[4px] border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#0F172A] font-mono focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#0F172A] mb-1">
                  Target Jurisdiction
                </label>
                <input
                  type="text"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder="e.g. US, EP, WO"
                  className="w-full rounded-[4px] border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#0F172A] font-mono focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="dedup"
                  checked={dedupFamily}
                  onChange={(e) => setDedupFamily(e.target.checked)}
                  className="h-4 w-4 rounded border-[#CBD5E1] text-[#1E40AF] focus:ring-0"
                />
                <label htmlFor="dedup" className="text-xs text-[#0F172A] font-medium cursor-pointer">
                  Collapse Patent Family Equivalents
                </label>
              </div>
            </div>
          )}
        </form>
      </div>

      {error && (
        <div className="rounded-[5px] border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. SEARCH RESULTS WORKBENCH */}
      {searchResponse && (
        <div className="space-y-6">
          {/* Multi-Strategy Discovery Provenance & Limitation Gap Bar */}
          {searchResponse.strategy_provenance && (
            <div className="bg-white border border-[#CBD5E1] rounded-[6px] p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1E40AF]" />
                  <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    Iterative Multi-Strategy Search Execution
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#64748B]">Evaluated: {searchResponse.total_candidates_evaluated || 0} candidates</span>
                  <span className="px-2 py-0.5 rounded-[3px] bg-[#EFF6FF] text-[#1E40AF] font-bold">
                    {searchResponse.execution_time_ms || 0}ms
                  </span>
                </div>
              </div>

              {/* Provenance Steps Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono font-semibold text-[#64748B]">VECTORS DISPATCHED:</span>
                {searchResponse.strategy_provenance.map((sp: any, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] font-mono text-[#334155]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1E40AF]" />
                    <span className="font-bold">{sp.strategy}</span>
                    <span className="text-[#94A3B8]">({sp.candidate_count || sp.subqueries_count || sp.gaps_addressed})</span>
                  </span>
                ))}
              </div>

              {/* Gap Summary Callout */}
              {searchResponse.gap_summary && (
                <div className="pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between text-xs text-[#334155]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0F172A]">Limitation Coverage Analysis:</span>
                    <span className="font-mono px-2 py-0.5 rounded-[3px] bg-[#ECFDF5] text-[#065F46] font-bold">
                      {searchResponse.gap_summary.total_limitations} Limitations Tracked
                    </span>
                    {searchResponse.gap_summary.gaps_detected > 0 ? (
                      <span className="font-mono px-2 py-0.5 rounded-[3px] bg-[#FEF3C7] text-[#92400E] font-bold">
                        {searchResponse.gap_summary.gaps_detected} Gaps Detected ({searchResponse.gap_summary.gaps_resolved} Resolved via Follow-up)
                      </span>
                    ) : (
                      <span className="font-mono px-2 py-0.5 rounded-[3px] bg-[#ECFDF5] text-[#065F46] font-bold">
                        100% Core Limitations Supported
                      </span>
                    )}
                  </div>

                  <Link
                    href="/app/claim-map"
                    className="font-mono text-[11px] text-[#1E40AF] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>View Limitation Matrix</span>
                    <FileCheck className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Limitation Decomposition Tree */}
          <div className="surface-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#1E40AF]" />
                <h3 className="text-xs font-mono font-bold text-[#0F172A] uppercase tracking-wider">
                  Extracted Limitation Tree Breakdown
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge-tech">
                  {searchResponse.query_claim?.elements?.length || 0} LIMITATIONS PARSED
                </span>
                <button
                  onClick={() => handleExport("html")}
                  className="px-2.5 py-1 text-xs font-semibold rounded-[4px] bg-[#0F172A] text-white hover:bg-[#1E40AF] flex items-center gap-1 transition shadow-xs"
                >
                  <Download className="h-3 w-3" /> Export Dossier
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] text-xs">
                <span className="text-[10px] uppercase font-mono text-[#94A3B8] block mb-0.5">Claim Preamble</span>
                <span className="font-semibold text-[#0F172A]">{searchResponse.query_claim?.preamble || "General Invention"}</span>
              </div>
              <div className="p-3 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] text-xs">
                <span className="text-[10px] uppercase font-mono text-[#94A3B8] block mb-0.5">Transitional Scope</span>
                <span className="font-semibold text-[#059669] font-mono">{searchResponse.query_claim?.transition || "comprising"} (Open-Ended)</span>
              </div>
              <div className="p-3 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] text-xs">
                <span className="text-[10px] uppercase font-mono text-[#94A3B8] block mb-0.5">Audit Execution ID</span>
                <span className="font-mono text-[11px] text-[#64748B] truncate block">{searchResponse.search_id}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {searchResponse.query_claim?.elements?.map((el: any) => (
                <div
                  key={el.element_id}
                  className="rounded-[5px] border border-[#E2E8F0] bg-white p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#1E40AF] bg-[#EFF6FF] px-1.5 py-0.5 rounded-[4px] text-[11px]">
                        Limitation [{el.element_id}]
                      </span>
                      <span className="font-mono text-[10px] text-[#94A3B8] uppercase">
                        {el.element_type || "structural"}
                      </span>
                      {el.start_char !== undefined && el.end_char !== undefined && (
                        <span className="font-mono text-[10px] text-[#94A3B8]">
                          Offsets: [{el.start_char}:{el.end_char}]
                        </span>
                      )}
                    </div>
                    <p className="text-[#0F172A] font-medium leading-relaxed">{el.text}</p>
                  </div>

                  <div className="flex flex-wrap gap-1 shrink-0">
                    {el.technical_terms?.map((term: string, idx: number) => (
                      <span key={idx} className="badge-tech text-[10px]">
                        #{term}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2-PANE RESULTS WORKBENCH (Left: Candidate List; Right: Sticky Context Inspector) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (7 cols): Ranked Prior-Art Candidates Feed */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  RANKED PRIOR-ART PUBLICATIONS ({searchResponse.candidates?.length || 0})
                </span>
                <span className="text-[11px] font-mono text-[#64748B]">
                  RRF k=60 &bull; Cohere v3 Rerank
                </span>
              </div>

              <div className="space-y-3">
                {searchResponse.candidates?.map((doc: any, idx: number) => {
                  const isSelected = doc.doc_id === selectedDocId;
                  return (
                    <div
                      key={doc.doc_id}
                      onClick={() => setSelectedDocId(doc.doc_id)}
                      className={`p-4 rounded-[6px] border cursor-pointer transition shadow-xs ${
                        isSelected
                          ? "border-[#1E40AF] bg-white ring-1 ring-[#1E40AF]"
                          : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0F172A] bg-[#F8FAFC] px-2 py-0.5 border border-[#E2E8F0] rounded-[4px]">
                            #{idx + 1} &bull; {doc.doc_id}
                          </span>
                          <span className="font-mono text-[10px] text-[#94A3B8]">
                            {doc.publication_date || "Prior Art"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-[#1E40AF] font-bold">RRF: {doc.fused_score}</span>
                          {doc.rerank_score && (
                            <span className="text-[#059669] font-bold">| Rerank: {doc.rerank_score}</span>
                          )}
                        </div>
                      </div>

                      <h4 className="text-xs font-semibold text-[#0F172A] leading-snug line-clamp-2">
                        {doc.title}
                      </h4>

                      {doc.abstract && (
                        <p className="text-[11px] text-[#64748B] mt-1.5 line-clamp-2 leading-relaxed">
                          {doc.abstract}
                        </p>
                      )}

                      <div className="mt-3 pt-2 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between text-[11px] gap-2">
                        <div className="text-[#64748B] truncate max-w-xs">
                          Assignee: <strong className="text-[#0F172A]">{doc.assignee || "Assignee Record"}</strong>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <span className="text-[#059669] font-semibold">
                            {doc.claim_chart?.filter((c: any) => c.support_level === "DIRECTLY_SUPPORTED").length || 0} Direct Matches
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column (5 cols): Context Inspector & Evidence Claim Chart */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-16">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-[#1E40AF]" /> CONTEXT INSPECTOR
                </span>
                {selectedCandidate && (
                  <Link
                    href={`/app/explorer?q=${encodeURIComponent(selectedCandidate.doc_id)}`}
                    className="text-[11px] font-mono text-[#1E40AF] hover:underline flex items-center gap-1 font-semibold"
                  >
                    Open Document Reader <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>

              {selectedCandidate ? (
                <div className="surface-panel p-5 space-y-4">
                  <div className="border-b border-[#E2E8F0] pb-3 space-y-1">
                    <span className="font-mono text-xs font-bold text-[#1E40AF] block">
                      {selectedCandidate.doc_id}
                    </span>
                    <h3 className="text-xs font-semibold text-[#0F172A] leading-snug">
                      {selectedCandidate.title}
                    </h3>
                    <div className="text-[11px] text-[#64748B] pt-0.5">
                      Assignee: <span className="text-[#0F172A] font-medium">{selectedCandidate.assignee || "Standard Record"}</span>
                    </div>
                  </div>

                  {/* Evidence Matrix per Limitation */}
                  <div className="space-y-3">
                    <div className="font-mono text-[10px] font-bold text-[#64748B] uppercase">
                      Limitation Evidence Mapping:
                    </div>
                    {selectedCandidate.claim_chart?.map((chart: any, i: number) => (
                      <div key={i} className="p-3 border border-[#E2E8F0] bg-[#F8FAFC] rounded-[5px] space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-[#1E40AF]">
                            Limitation [{chart.element_id}]
                          </span>
                          <span
                            className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] ${
                              chart.support_level === "DIRECTLY_SUPPORTED"
                                ? "bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]"
                                : "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]"
                            }`}
                          >
                            {chart.support_level}
                          </span>
                        </div>

                        {chart.exact_quote && (
                          <div className="source-passage-highlight">
                            &ldquo;{chart.exact_quote}&rdquo;
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8] pt-0.5">
                          <span>Passage: {chart.passage_location || "Detailed Description"}</span>
                          {chart.verified && (
                            <span className="text-[#059669] font-semibold flex items-center gap-1">
                              <Check className="h-3 w-3" /> Exact Substring Verified
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Practitioner Annotations */}
                  <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                    <span className="font-mono text-[10px] font-bold text-[#0F172A] uppercase">
                      Attorney Review & Notes:
                    </span>
                    <div className="flex gap-2">
                      {["RELEVANT", "POTENTIAL_102", "SECONDARY_103", "DISMISSED"].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setAnnotationStatus(status)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded-[4px] transition ${
                            annotationStatus === status
                              ? "bg-[#0F172A] text-white font-semibold"
                              : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:text-[#0F172A]"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={annotationNotes}
                      onChange={(e) => setAnnotationNotes(e.target.value)}
                      placeholder="Add practitioner clearance note, invalidity argument, or office action reply point..."
                      className="w-full p-2 border border-[#E2E8F0] bg-[#F8FAFC] rounded-[5px] text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                    />
                    <div className="flex items-center justify-between">
                      {annotationSuccess ? (
                        <span className="text-[11px] text-[#059669] font-medium flex items-center gap-1">
                          <Check className="h-3 w-3" /> Annotation Saved
                        </span>
                      ) : <span />}
                      <button
                        type="button"
                        onClick={handleAnnotate}
                        disabled={annotating}
                        className="px-3 py-1 text-xs font-semibold rounded-[5px] bg-[#0F172A] text-white hover:bg-[#1E40AF] transition shadow-xs disabled:opacity-50"
                      >
                        {annotating ? "Saving..." : "Save Annotation"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="surface-panel p-8 text-center text-xs text-[#94A3B8]">
                  Select a prior-art candidate from the list to inspect limitation evidence and quotations.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EXPORT DOSSIER MODAL */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="rounded-[6px] border border-[#E2E8F0] bg-white max-w-2xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#0F172A] font-mono uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-[#1E40AF]" /> Export Prior-Art Research Dossier
              </h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 border-b border-[#E2E8F0] pb-3">
              {(["markdown", "html", "csv", "json"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className={`px-3 py-1 text-xs font-mono uppercase rounded-[4px] transition ${
                    exportFormat === fmt
                      ? "bg-[#1E40AF] text-white font-semibold"
                      : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            <div className="h-64 overflow-y-auto border border-[#E2E8F0] bg-[#F8FAFC] p-3 rounded-[5px] font-mono text-[11px] text-[#0F172A] whitespace-pre-wrap">
              {exportContent || "Generating research dossier..."}
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-[#94A3B8] font-mono text-[11px]">Includes statutory legal non-advice disclaimer</span>
              <button
                onClick={() => {
                  if (!exportContent) return;
                  const blob = new Blob([exportContent], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Prior_Art_Dossier_${searchResponse?.search_id || "search"}.${exportFormat === "markdown" ? "md" : exportFormat}`;
                  a.click();
                }}
                className="px-4 py-1.5 bg-[#1E40AF] text-white rounded-[5px] text-xs font-semibold hover:bg-[#1D4ED8] transition shadow-xs"
              >
                Download File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
