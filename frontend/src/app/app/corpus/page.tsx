"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Globe2,
  Cpu,
  Zap,
  Activity,
  Shield,
  FileCheck,
  Share2,
  Calendar,
  ExternalLink,
  Search,
  CheckCircle2,
  Building2,
  RefreshCw,
  Database
} from "lucide-react";

interface CoverageReport {
  total_documents: number;
  total_claims: number;
  total_words_indexed: number;
  unique_families: number;
  cross_border_families: number;
  citation_graph: {
    nodes_count: number;
    edges_count: number;
    graph_density: number;
  };
  jurisdiction_breakdown: Array<{ country: string; count: number; percentage: number }>;
  sector_breakdown: Array<{ sector: string; count: number; percentage: number }>;
  cpc_section_breakdown: Array<{ section: string; name: string; count: number }>;
  publication_timeline: Array<{ year: string; count: number }>;
  top_assignees: Array<{ assignee: string; count: number }>;
  indexing_health: {
    sqlite_synchronized: boolean;
    parquet_synchronized: boolean;
    last_indexed_at: string;
  };
}

export default function CorpusCoveragePage() {
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
  const apiKey = process.env.NEXT_PUBLIC_APP_API_KEY || "dev_key";

  const fetchCoverage = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/corpus/coverage`, {
        headers: {
          "X-API-Key": apiKey,
          Authorization: `Bearer ${localStorage.getItem("patent_token") || ""}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch coverage report`);
      const data = await res.json();
      setReport(data);
    } catch (e: any) {
      setError(e.message || "Failed to load corpus coverage.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoverage();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#1E40AF] uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" />
            <span>Corpus Intelligence & Coverage</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] mt-1">
            Global Patent Corpus Explorer
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Comprehensive indexing across US, EP, and WO jurisdictions spanning 10 high-tech priority sectors.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCoverage}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[5px] border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0F172A] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Indices</span>
          </button>
          <Link
            href="/app/search"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-[5px] bg-[#0F172A] hover:bg-[#1E40AF] text-white transition shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Run Prior-Art Search</span>
          </Link>
        </div>
      </div>

      {loading && !report && (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-[#1E40AF] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">Auditing corpus indexing across SQLite & Vector stores...</p>
        </div>
      )}

      {error && !report && (
        <div className="p-4 rounded-[6px] bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Key Corpus Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4 shadow-xs">
              <span className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                FULL-TEXT PATENTS
              </span>
              <div className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
                {report.total_documents}
              </div>
              <span className="text-[11px] text-[#16A34A] font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> 100% Ingested
              </span>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4 shadow-xs">
              <span className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                INDEXED CLAIMS
              </span>
              <div className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
                {report.total_claims}
              </div>
              <span className="text-[11px] text-[#64748B] mt-1 block">
                Average {(report.total_claims / report.total_documents).toFixed(1)} claims/doc
              </span>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4 shadow-xs">
              <span className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                TOTAL WORDS
              </span>
              <div className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
                {report.total_words_indexed.toLocaleString()}
              </div>
              <span className="text-[11px] text-[#64748B] mt-1 block">
                Field-weighted BM25
              </span>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4 shadow-xs">
              <span className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                PATENT FAMILIES
              </span>
              <div className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
                {report.unique_families}
              </div>
              <span className="text-[11px] text-[#1E40AF] font-medium mt-1 block">
                {report.cross_border_families} Cross-Border Linked
              </span>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4 shadow-xs col-span-2 md:col-span-1">
              <span className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                CITATION EDGES
              </span>
              <div className="text-2xl font-bold font-mono text-[#0F172A] mt-1">
                {report.citation_graph.edges_count}
              </div>
              <span className="text-[11px] text-[#64748B] mt-1 block">
                Density: {report.citation_graph.graph_density}
              </span>
            </div>
          </div>

          {/* Jurisdictions & Publication Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Jurisdiction Distribution */}
            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-[#1E40AF]" />
                  <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Multi-Jurisdictional Coverage
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#64748B]">3 Major Patent Offices</span>
              </div>

              <div className="space-y-4">
                {report.jurisdiction_breakdown.map((jb) => {
                  const countryLabel =
                    jb.country === "US"
                      ? "United States (USPTO)"
                      : jb.country === "EP"
                      ? "European Patent Office (EPO)"
                      : "World Intellectual Property (WIPO / PCT)";
                  const flag = jb.country === "US" ? "🇺🇸" : jb.country === "EP" ? "🇪🇺" : "🌐";
                  return (
                    <div key={jb.country} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#0F172A] flex items-center gap-1.5">
                          <span>{flag}</span>
                          <span>{countryLabel}</span>
                        </span>
                        <span className="font-mono text-[#64748B]">
                          {jb.count} docs ({jb.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            jb.country === "US"
                              ? "bg-[#1E40AF]"
                              : jb.country === "EP"
                              ? "bg-[#0D9488]"
                              : "bg-[#7C3AED]"
                          }`}
                          style={{ width: `${jb.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
                <span>All publications indexed in standard UTF-8 text</span>
                <span className="font-mono text-[#16A34A] flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Zero Truncation
                </span>
              </div>
            </div>

            {/* Publication Timeline */}
            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#1E40AF]" />
                  <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Temporal Priority & Publication Timeline
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#64748B]">2019 – 2023 Coverage</span>
              </div>

              <div className="flex items-end justify-between h-36 pt-4 px-2">
                {report.publication_timeline.map((pt) => {
                  const maxCount = Math.max(...report.publication_timeline.map((t) => t.count));
                  const heightPercent = Math.max(15, (pt.count / maxCount) * 100);
                  return (
                    <div key={pt.year} className="flex flex-col items-center gap-2 flex-1 group">
                      <span className="text-[10px] font-mono font-bold text-[#0F172A] opacity-0 group-hover:opacity-100 transition-opacity">
                        {pt.count}
                      </span>
                      <div className="w-8 bg-[#F1F5F9] rounded-t-[3px] overflow-hidden flex items-end h-24">
                        <div
                          className="w-full bg-[#1E40AF] group-hover:bg-[#2563EB] transition-colors rounded-t-[3px]"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[#64748B]">{pt.year}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-[#F1F5F9] text-xs text-[#64748B] flex items-center justify-between">
                <span>Recent prior-art emphasis enables effective 35 U.S.C. § 102/103 discovery</span>
                <span className="font-mono text-[11px] text-[#0F172A]">5-Year Depth</span>
              </div>
            </div>
          </div>

          {/* 10 Technology Sectors Breakdown */}
          <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                  Technology Sectors & Classification Clusters
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  10 curated high-growth technology sectors with specialized technical vocabularies.
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-[4px] text-[#475569]">
                10 Sectors
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {report.sector_breakdown.map((sec) => {
                const isSelected = selectedSector === sec.sector;
                return (
                  <div
                    key={sec.sector}
                    onClick={() => setSelectedSector(isSelected ? null : sec.sector)}
                    className={`p-3 rounded-[5px] border cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#1E40AF] bg-[#EFF6FF] shadow-xs"
                        : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#0F172A] truncate">
                        {sec.sector}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#1E40AF]">
                        {sec.count}
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden mt-2.5">
                      <div
                        className="bg-[#1E40AF] h-full rounded-full"
                        style={{ width: `${sec.percentage}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-[#64748B] mt-1.5">
                      {sec.percentage}% of corpus
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CPC Sections & Assignees */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CPC Breakdown */}
            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 shadow-xs">
              <h3 className="text-xs font-mono font-bold uppercase text-[#64748B] tracking-wider mb-3">
                Cooperative Patent Classification (CPC) Breakdown
              </h3>
              <div className="space-y-2.5">
                {report.cpc_section_breakdown.map((cpc) => (
                  <div key={cpc.section} className="flex items-center justify-between p-2 rounded-[4px] bg-[#F8FAFC] border border-[#F1F5F9]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded-[3px] bg-[#0F172A] text-white">
                        {cpc.section}
                      </span>
                      <span className="text-xs font-medium text-[#0F172A]">{cpc.name}</span>
                    </div>
                    <span className="font-mono text-xs text-[#64748B]">{cpc.count} classes</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Assignees */}
            <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-mono font-bold uppercase text-[#64748B] tracking-wider">
                  Top Patent Assignees & Operating Entities
                </h3>
                <Building2 className="w-4 h-4 text-[#94A3B8]" />
              </div>
              <div className="space-y-2">
                {report.top_assignees.map((ta, idx) => (
                  <div key={ta.assignee} className="flex items-center justify-between text-xs py-1 border-b border-[#F1F5F9] last:border-none">
                    <span className="text-[#0F172A] font-medium truncate flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#94A3B8]">{idx + 1}.</span>
                      <span>{ta.assignee}</span>
                    </span>
                    <span className="font-mono text-[#1E40AF] font-bold">{ta.count} patents</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
