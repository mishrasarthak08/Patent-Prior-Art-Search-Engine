"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark, Search, Trash2, ExternalLink, Tag, FileText, ArrowRight } from "lucide-react";
import { getApiBaseUrl, getAuthHeaders } from "@/lib/api";

interface SavedDoc {
  id: string;
  patent_id: string;
  title: string;
  notes?: string;
  tags?: string;
  created_at: string;
}

export default function SavedPublicationsPage() {
  const [savedDocs, setSavedDocs] = useState<SavedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [activeTag, setActiveTag] = useState<string>("ALL");

  useEffect(() => {
    fetchSavedDocs();
    window.addEventListener("patent_workspace_changed", fetchSavedDocs);
    return () => window.removeEventListener("patent_workspace_changed", fetchSavedDocs);
  }, []);

  const fetchSavedDocs = async () => {
    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/v1/saved-documents`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSavedDocs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load saved docs", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();
      const res = await fetch(`${baseUrl}/api/v1/saved-documents/${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setSavedDocs((prev) => prev.filter((doc) => doc.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete saved doc", e);
    }
  };

  const allTags = Array.from(
    new Set(
      savedDocs
        .flatMap((d) => (d.tags ? d.tags.split(",").map((t) => t.trim()) : []))
        .filter(Boolean)
    )
  );

  const filteredDocs = savedDocs.filter((d) => {
    const query = (searchFilter || "").toLowerCase().trim();
    const pid = (d.patent_id || "").toLowerCase();
    const title = (d.title || "").toLowerCase();
    const notes = (d.notes || "").toLowerCase();
    const matchesSearch = !query || pid.includes(query) || title.includes(query) || notes.includes(query);
    const matchesTag = activeTag === "ALL" || (d.tags && d.tags.split(",").map((t) => t.trim()).includes(activeTag));
    return matchesSearch && matchesTag;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. HEADER & CONTROL INSTRUMENT */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                RESEARCH LIBRARY
              </span>
              <span className="text-[11px] font-mono text-[#CBD5E1]">&bull;</span>
              <span className="text-[11px] font-mono text-[#64748B]">CURATED PRIOR ART</span>
            </div>
            <h1 className="text-2xl text-[#0F172A] font-semibold mt-1">
              Saved Publications & Reference Citations
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/app/explorer"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] transition"
            >
              Browse Corpus Explorer
            </Link>
            <Link
              href="/app/search"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-[5px] bg-[#0F172A] text-white hover:bg-[#1E40AF] shadow-xs transition"
            >
              New Prior-Art Search
            </Link>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by publication number, title, or attorney notes..."
              className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
            />
          </div>

          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[#94A3B8] font-mono text-[11px] mr-1">Tag:</span>
              <button
                onClick={() => setActiveTag("ALL")}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-[4px] transition ${
                  activeTag === "ALL"
                    ? "bg-[#0F172A] text-white font-semibold"
                    : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                ALL ({savedDocs.length})
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-[4px] transition ${
                    activeTag === tag
                      ? "bg-[#0F172A] text-white font-semibold"
                      : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. SAVED PUBLICATIONS LIST */}
      <div className="surface-panel overflow-hidden">
        <div className="p-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-[#0F172A]">
            {filteredDocs.length} CURATED PRIOR-ART PUBLICATIONS
          </span>
          <span className="text-[#94A3B8]">ORGANIZED CITATION VAULT</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#94A3B8]">Loading curated citations...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#94A3B8] space-y-2">
            <Bookmark className="h-8 w-8 text-[#94A3B8] mx-auto opacity-40" />
            <p>No saved patent citations found matching active filters.</p>
            <Link href="/app/search" className="text-[#1E40AF] hover:underline font-semibold">
              Search prior art & bookmark relevant publications &rarr;
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="p-5 hover:bg-[#F8FAFC] transition space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-[#0F172A]">{doc.patent_id}</span>
                    <span className="badge-tech">USPTO</span>
                    {doc.tags && (
                      <div className="flex gap-1">
                        {doc.tags.split(",").map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-mono bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] px-2 py-0.5 rounded-[4px]"
                          >
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/explorer?q=${encodeURIComponent(doc.patent_id)}`}
                      className="px-2.5 py-1 text-xs font-mono font-semibold rounded-[4px] border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#0F172A] flex items-center gap-1 transition"
                    >
                      <ExternalLink className="h-3 w-3 text-[#1E40AF]" /> Document Reader
                    </Link>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1 text-[#94A3B8] hover:text-red-600 rounded transition"
                      title="Remove from Saved"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-[#0F172A] leading-snug">{doc.title}</h3>

                {doc.notes && (
                  <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] text-xs text-[#475569] leading-relaxed">
                    <strong className="text-[#0F172A] font-medium">Attorney Annotation:</strong> {doc.notes}
                  </div>
                )}

                <div className="text-[11px] font-mono text-[#94A3B8]">
                  Saved on {new Date(doc.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
