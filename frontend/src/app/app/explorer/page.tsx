"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Bookmark, 
  ExternalLink, 
  Check, 
  BookOpen, 
  FileText, 
  ChevronRight,
  Shield,
  Copy,
  Layers
} from "lucide-react";
import { getApiBaseUrl, getAuthHeaders } from "@/lib/api";

interface PatentItem {
  id: string;
  publication_number: string;
  title: string;
  abstract: string;
  cpc_codes: string[];
  publication_date: string;
  assignee?: string;
  inventors?: string[];
  claims_list?: string[];
  description?: string;
  family_id?: string;
}

export default function PatentExplorerPage() {
  const [patents, setPatents] = useState<PatentItem[]>([]);
  const [query, setQuery] = useState("");
  const [cpc, setCpc] = useState("");
  const [assignee, setAssignee] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedDocs, setSavedDocs] = useState<Record<string, boolean>>({});

  const [selectedPatentId, setSelectedPatentId] = useState<string | null>(null);
  const [fullDoc, setFullDoc] = useState<any | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [activeSection, setActiveSection] = useState<"abstract" | "claims" | "description">("abstract");
  const [inDocSearch, setInDocSearch] = useState("");

  const handleExplore = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.append("q", query.trim());
    if (cpc.trim()) params.append("cpc", cpc.trim());
    if (assignee.trim()) params.append("assignee", assignee.trim());

    const baseUrl = getApiBaseUrl();
    const headers = getAuthHeaders();

    fetch(`${baseUrl}/api/v1/patents/explore?${params.toString()}`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setPatents(data);
          if (data.length > 0 && !selectedPatentId) {
            loadDocument(data[0].id || data[0].publication_number);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadDocument = async (docId: string) => {
    setSelectedPatentId(docId);
    setLoadingDoc(true);

    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();

      const res = await fetch(`${baseUrl}/api/v1/documents/${docId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setFullDoc(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDoc(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const qParam = urlParams.get("q");
      if (qParam) {
        setQuery(qParam);
      }
    }
    handleExplore();
  }, []);

  const handleSaveToRepository = async (docId: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();

      const res = await fetch(`${baseUrl}/api/v1/saved-documents`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          doc_id: docId,
          tags: "CorpusExplorer,PriorArt",
          notes: "Saved from Patent Corpus Explorer",
        }),
      });

      if (res.ok) {
        setSavedDocs((prev) => ({ ...prev, [docId]: true }));
      }
    } catch (e) {}
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. HEADER & SEARCH INSTRUMENT */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                CORPUS DISCOVERY
              </span>
              <span className="text-[11px] font-mono text-[#CBD5E1]">&bull;</span>
              <span className="text-[11px] font-mono text-[#64748B]">TECHNICAL DOCUMENT READER</span>
            </div>
            <h1 className="text-2xl text-[#0F172A] font-semibold mt-1">
              Patent Corpus Discovery & Document Reader
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/app/compare"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] transition"
            >
              Side-by-Side Compare
            </Link>
          </div>
        </div>

        {/* Discovery Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2 relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleExplore()}
              placeholder="Search by publication ID (e.g. US10892482B2), technical keywords, or title..."
              className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <input
              type="text"
              value={cpc}
              onChange={(e) => setCpc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleExplore()}
              placeholder="CPC Code (e.g. H01M, G06N)"
              className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs text-[#0F172A] font-mono focus:border-[#1E40AF] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleExplore()}
              placeholder="Assignee / Company"
              className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
            />
            <button
              onClick={handleExplore}
              className="px-4 py-1.5 bg-[#0F172A] text-white rounded-[5px] font-semibold hover:bg-[#1E40AF] transition shrink-0 shadow-xs"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* 2. SPLIT-PANE WORKBENCH: Left Index vs Right Document Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): High-Density Publication Index */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-[#64748B]">
            <span>CORPUS PUBLICATIONS ({patents.length})</span>
            <span className="text-[11px]">CLICK TO READ</span>
          </div>

          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#94A3B8] surface-panel">
                Querying patent repository...
              </div>
            ) : patents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8] surface-panel">
                No publications found matching criteria.
              </div>
            ) : (
              patents.map((p) => {
                const isSelected = p.id === selectedPatentId || p.publication_number === selectedPatentId;
                return (
                  <div
                    key={p.id || p.publication_number}
                    onClick={() => loadDocument(p.id || p.publication_number)}
                    className={`p-3.5 rounded-[6px] border cursor-pointer transition shadow-xs ${
                      isSelected
                        ? "border-[#1E40AF] bg-white ring-1 ring-[#1E40AF]"
                        : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-[#1E40AF]">
                        {p.publication_number || p.id}
                      </span>
                      <span className="font-mono text-[10px] text-[#94A3B8]">
                        {p.publication_date}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-[#0F172A] leading-snug line-clamp-2">
                      {p.title}
                    </h4>
                    {p.assignee && (
                      <div className="text-[10px] text-[#64748B] mt-1">
                        Assignee: <strong className="text-[#0F172A]">{p.assignee}</strong>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[#94A3B8] truncate max-w-[200px]">
                        CPC: {p.cpc_codes?.join(", ") || "General"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveToRepository(p.id || p.publication_number);
                        }}
                        className="text-[#1E40AF] hover:underline font-semibold flex items-center gap-1"
                      >
                        {savedDocs[p.id || p.publication_number] ? (
                          <span className="text-[#059669] flex items-center gap-1"><Check className="h-3 w-3" /> Bookmarked</span>
                        ) : (
                          <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" /> Bookmark</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Document Reader */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between font-mono text-xs text-[#64748B]">
            <span>DOCUMENT READER & CITATION INSPECTOR</span>
            {fullDoc && (
              <span className="text-[11px] font-mono text-[#1E40AF]">
                FAMILY ID: {fullDoc.family_id || "INDIVIDUAL"}
              </span>
            )}
          </div>

          {loadingDoc ? (
            <div className="p-16 text-center text-xs text-[#94A3B8] surface-panel">
              Loading patent text and claims...
            </div>
          ) : fullDoc ? (
            <div className="surface-panel p-6 space-y-5">
              {/* Bibliographic Header Box */}
              <div className="border-b border-[#E2E8F0] pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="badge-tech font-bold text-[#1E40AF]">
                    {fullDoc.country || "US"} &bull; {fullDoc.publication_number || fullDoc.id}
                  </span>
                  <span className="font-mono text-[11px] text-[#94A3B8]">
                    Published: {fullDoc.publication_date} | Priority: {fullDoc.priority_date || "N/A"}
                  </span>
                </div>
                <h2 className="text-lg text-[#0F172A] font-semibold leading-snug">
                  {fullDoc.title}
                </h2>
                <div className="text-xs text-[#64748B] flex flex-wrap gap-4 pt-1">
                  <span>Assignee: <strong className="text-[#0F172A]">{fullDoc.assignee || "Standard Record"}</strong></span>
                  {fullDoc.cpc_codes && (
                    <span>CPC: <strong className="font-mono text-[#0F172A]">{fullDoc.cpc_codes.join(", ")}</strong></span>
                  )}
                </div>
              </div>

              {/* Section Tabs & In-Document Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3 text-xs">
                <div className="flex gap-2 font-mono">
                  {(["abstract", "claims", "description"] as const).map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setActiveSection(sec)}
                      className={`px-3 py-1 rounded-[4px] uppercase transition ${
                        activeSection === sec
                          ? "bg-[#0F172A] text-white font-semibold"
                          : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {sec}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="h-3 w-3 absolute left-2.5 top-2 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={inDocSearch}
                    onChange={(e) => setInDocSearch(e.target.value)}
                    placeholder="Search in text..."
                    className="w-44 rounded-[4px] border border-[#E2E8F0] bg-[#F8FAFC] pl-7 pr-2 py-1 text-[11px] text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Section Content Display */}
              <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 text-xs leading-relaxed">
                {activeSection === "abstract" && (
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] font-bold text-[#94A3B8] uppercase block">
                      Authoritative Abstract:
                    </span>
                    <p className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] text-[#0F172A] leading-relaxed text-sm">
                      {fullDoc.abstract}
                    </p>
                  </div>
                )}

                {activeSection === "claims" && (
                  <div className="space-y-3">
                    <span className="font-mono text-[10px] font-bold text-[#94A3B8] uppercase block">
                      Patent Claims ({fullDoc.claims_list?.length || 1}):
                    </span>
                    {fullDoc.claims_list && fullDoc.claims_list.length > 0 ? (
                      fullDoc.claims_list.map((c: string, idx: number) => (
                        <div key={idx} className="p-3.5 border border-[#E2E8F0] rounded-[5px] bg-[#F8FAFC] space-y-1">
                          <span className="font-mono font-bold text-[#1E40AF] text-[11px]">Claim {idx + 1}.</span>
                          <p className="text-[#0F172A] leading-relaxed text-xs">{c}</p>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] text-[#64748B]">
                        No standalone claims extracted for this publication.
                      </p>
                    )}
                  </div>
                )}

                {activeSection === "description" && (
                  <div className="space-y-2">
                    <span className="font-mono text-[10px] font-bold text-[#94A3B8] uppercase block">
                      Detailed Technical Description:
                    </span>
                    <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] text-[#0F172A] leading-relaxed text-xs whitespace-pre-wrap font-sans">
                      {fullDoc.description || "Detailed specification text loaded from official patent record."}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <Link
                  href={`/app/search?claim=${encodeURIComponent(fullDoc.title || "")}`}
                  className="text-[#1E40AF] hover:underline font-semibold font-mono text-[11px]"
                >
                  Investigate Prior Art for this Patent &rarr;
                </Link>
                <button
                  type="button"
                  onClick={() => handleSaveToRepository(fullDoc.publication_number || fullDoc.id)}
                  className="px-3 py-1.5 bg-[#0F172A] text-white rounded-[5px] text-xs font-semibold hover:bg-[#1E40AF] transition shadow-xs"
                >
                  {savedDocs[fullDoc.publication_number || fullDoc.id] ? "Bookmarked to Library" : "Bookmark Publication"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-xs text-[#94A3B8] surface-panel">
              Select a patent publication from the list to read full abstract, claims, and detailed description.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
