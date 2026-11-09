"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GitCompare, ArrowRight, CheckCircle2, AlertCircle, Scale, Layers } from "lucide-react";
import { getApiBaseUrl, getAuthHeaders } from "@/lib/api";

export default function PatentComparePage() {
  const [docId1, setDocId1] = useState("US10892482B2");
  const [docId2, setDocId2] = useState("US10454101B2");
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();

      const res = await fetch(`${baseUrl}/api/v1/patents/compare`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          doc_ids: [docId1.trim(), docId2.trim()],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Comparison failed");
      }

      const data = await res.json();
      data.documents = data.documents || data.patents || [];
      setComparison(data);
    } catch (err: any) {
      setError(err.message || "Failed to compare patents");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. HEADER & COMPARISON FORM */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                COMPARATIVE ANALYSIS
              </span>
              <span className="text-[11px] font-mono text-[#CBD5E1]">&bull;</span>
              <span className="text-[11px] font-mono text-[#64748B]">SIDE-BY-SIDE MATRIX</span>
            </div>
            <h1 className="text-2xl text-[#0F172A] font-semibold mt-1">
              Side-by-Side Patent Comparison
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDocId1("US10892482B2");
                setDocId2("US10454101B2");
              }}
              className="px-2.5 py-1 text-[11px] font-mono rounded-[4px] border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] transition"
            >
              Battery Pair (H01M)
            </button>
            <button
              type="button"
              onClick={() => {
                setDocId1("US11288564B2");
                setDocId2("US11288564B2");
              }}
              className="px-2.5 py-1 text-[11px] font-mono rounded-[4px] border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] transition"
            >
              AI Pair (G06N)
            </button>
          </div>
        </div>

        <form onSubmit={handleCompare} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Patent Publication #1 (e.g. US10892482B2)
              </label>
              <input
                required
                type="text"
                value={docId1}
                onChange={(e) => setDocId1(e.target.value)}
                placeholder="Publication ID #1"
                className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs text-[#0F172A] font-mono focus:border-[#1E40AF] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Patent Publication #2 (e.g. US10454101B2)
              </label>
              <input
                required
                type="text"
                value={docId2}
                onChange={(e) => setDocId2(e.target.value)}
                placeholder="Publication ID #2"
                className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs text-[#0F172A] font-mono focus:border-[#1E40AF] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#0F172A] text-white rounded-[5px] text-xs font-semibold hover:bg-[#1E40AF] transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Comparing Publications...</span>
                </>
              ) : (
                <>
                  <GitCompare className="h-3.5 w-3.5" />
                  <span>Execute Side-by-Side Comparison</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="surface-panel p-4 text-xs text-red-700 bg-red-50 border-red-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. COMPARISON RESULT MATRIX */}
      {comparison && comparison.documents && (
        <div className="surface-panel overflow-hidden">
          <div className="p-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[#0F172A]">
              SYNCHRONIZED COMPARISON MATRIX ({comparison.documents.length} DOCUMENTS)
            </span>
            <span className="text-[#94A3B8]">METADATA, ABSTRACT & CLAIMS ALIGNMENT</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
            {comparison.documents.map((doc: any, idx: number) => (
              <div key={doc.id || idx} className="p-6 space-y-5 bg-white">
                <div className="border-b border-[#E2E8F0] pb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="badge-tech font-bold text-[#1E40AF]">
                      {doc.publication_number || doc.id}
                    </span>
                    <span className="font-mono text-[10px] text-[#94A3B8]">
                      {doc.publication_date}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#0F172A] leading-snug">
                    {doc.title}
                  </h3>
                  <div className="text-[11px] text-[#64748B]">
                    Assignee: <strong className="text-[#0F172A]">{doc.assignee || "Standard Record"}</strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-mono text-[10px] font-bold text-[#94A3B8] uppercase block">
                    Authoritative Abstract:
                  </span>
                  <p className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] text-xs text-[#0F172A] leading-relaxed">
                    {doc.abstract}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="font-mono text-[10px] font-bold text-[#94A3B8] uppercase block">
                    Exemplary Claim Scope:
                  </span>
                  {doc.claims_list && doc.claims_list.length > 0 ? (
                    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] text-xs text-[#0F172A] leading-relaxed max-h-56 overflow-y-auto space-y-2 font-mono text-[11px]">
                      {doc.claims_list.slice(0, 3).map((c: string, ci: number) => (
                        <div key={ci} className="border-b border-[#E2E8F0] pb-2 last:border-0 last:pb-0">
                          <strong className="text-[#1E40AF] block">Claim {ci + 1}:</strong> {c}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px] text-xs text-[#94A3B8]">
                      No claims extracted for this publication.
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/app/explorer?q=${encodeURIComponent(doc.publication_number || doc.id)}`}
                    className="text-xs font-mono text-[#1E40AF] hover:underline font-semibold"
                  >
                    Open in Document Reader &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
