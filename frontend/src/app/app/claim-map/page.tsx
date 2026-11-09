"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  Building2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X
} from "lucide-react";

interface ClaimElement {
  element_id: string;
  text: string;
  element_type: string;
}

interface ColumnDoc {
  doc_id: string;
  publication_number: string;
  title: string;
  assignee?: string;
  family_id?: string;
  country?: string;
}

interface MatrixCell {
  element_id: string;
  doc_id: string;
  support_level: string;
  confidence_score: number;
  exact_quote?: string;
  paragraph_number?: string;
  section?: string;
  verified: boolean;
  rationale?: string;
}

interface ClaimMapResponse {
  claim_preamble?: string;
  elements: ClaimElement[];
  columns: ColumnDoc[];
  matrix: MatrixCell[][];
}

const PRESET_CLAIMS = [
  {
    title: "Lithium-Ion Battery with Si-Graphite Anode & FEC Additive",
    claim:
      "A lithium-ion secondary battery comprising: a cathode comprising lithium nickel cobalt manganese oxide; an anode comprising silicon-graphite composite nanoparticles; and an electrolyte comprising fluoroethylene carbonate additive.",
    defaultDocs: ["US10892482B2", "EP3890123A1", "US10454101B2", "US11569480B2"],
  },
  {
    title: "Neuromorphic ReRAM Crossbar Processor",
    claim:
      "A neuromorphic computing device comprising: a crossbar array comprising a plurality of analog resistive random-access memory (ReRAM) cells; a digital-to-analog converter array; and current-sensing analog-to-digital converters measuring column summation currents.",
    defaultDocs: ["US11205128B2", "EP3748520A1", "US11720810B2", "US11854201B2"],
  },
  {
    title: "Gate-All-Around (GAA) Nanosheet Transistor",
    claim:
      "A semiconductor device comprising: a vertical stack of horizontal silicon nanosheet channels; a high-k metal gate electrode wrapping around each nanosheet channel; source/drain epitaxial regions; and low-k inner dielectric spacers disposed between the gate electrode and source/drain regions.",
    defaultDocs: ["US10651289B2", "EP3654380A1", "US11495670B2", "EP3998634A1"],
  },
  {
    title: "Lipid Nanoparticles for mRNA Therapeutic Delivery",
    claim:
      "A pharmaceutical composition comprising lipid nanoparticles encapsulating messenger RNA, wherein each nanoparticle comprises: an ionizable amino lipid having biodegradable ester linkages; a neutral helper phospholipid DSPC; cholesterol; and a PEGylated lipid conjugate.",
    defaultDocs: ["US10925910B2", "EP3818985A1", "WO2021076890A1", "US11304901B2"],
  },
];

export default function ClaimMapPage() {
  const [claimText, setClaimText] = useState(PRESET_CLAIMS[0].claim);
  const [selectedDocs, setSelectedDocs] = useState<string[]>(PRESET_CLAIMS[0].defaultDocs);
  const [matrixData, setMatrixData] = useState<ClaimMapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ cell: MatrixCell; col: ColumnDoc; elementText: string } | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
  const apiKey = process.env.NEXT_PUBLIC_APP_API_KEY || "dev_key";

  const executeMapping = async (claimToRun: string, docsToRun: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/patents/multi-claim-map`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
          Authorization: `Bearer ${localStorage.getItem("patent_token") || ""}`,
        },
        body: JSON.stringify({
          raw_claim: claimToRun,
          doc_ids: docsToRun,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to generate claim map`);
      const data = await res.json();
      setMatrixData(data);
    } catch (e: any) {
      setError(e.message || "Failed to generate multi-document claim map.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeMapping(PRESET_CLAIMS[0].claim, PRESET_CLAIMS[0].defaultDocs);
  }, []);

  const getSupportBadge = (support: string, verified: boolean) => {
    if (support === "DIRECTLY_SUPPORTED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] font-mono text-[11px] font-semibold">
          <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
          <span>DIRECT</span>
        </span>
      );
    }
    if (support === "PARTIALLY_SUPPORTED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] font-mono text-[11px] font-semibold">
          <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
          <span>PARTIAL</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] font-mono text-[11px] font-semibold">
        <XCircle className="w-3 h-3 text-[#EF4444]" />
        <span>GAP</span>
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#1E40AF] uppercase tracking-wider">
            <FileCheck className="w-3.5 h-3.5" />
            <span>Comparative Multi-Document Claim Mapping</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] mt-1">
            Claim Limitation Comparison Matrix
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Map atomic claim limitations against 3–5 prior-art patents simultaneously to establish invalidity or freedom-to-operate.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/claim-charts"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[5px] border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0F172A] transition"
          >
            <span>Evidence Ledger</span>
          </Link>
          <Link
            href="/app/dossier"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[5px] bg-[#0F172A] hover:bg-[#1E40AF] text-white transition shadow-xs"
          >
            <span>Export to Dossier</span>
          </Link>
        </div>
      </div>

      {/* Preset Claim Selector & Input */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-5 shadow-xs space-y-4">
        <div>
          <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-2">
            SELECT PRESET PATENT CLAIM INVESTIGATION
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_CLAIMS.map((pc, idx) => (
              <button
                key={pc.title}
                onClick={() => {
                  setClaimText(pc.claim);
                  setSelectedDocs(pc.defaultDocs);
                  executeMapping(pc.claim, pc.defaultDocs);
                }}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-medium border transition-colors cursor-pointer ${
                  claimText === pc.claim
                    ? "bg-[#1E40AF] text-white border-[#1E40AF]"
                    : "bg-[#F8FAFC] text-[#334155] border-[#E2E8F0] hover:bg-[#F1F5F9]"
                }`}
              >
                {pc.title}
              </button>
            ))}
          </div>
        </div>

        {/* Claim Text Box */}
        <div>
          <label className="font-mono text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
            CLAIM TEXT (ENTERPRISE CONFIDENTIAL - ZERO-RETENTION MODE ACTIVE)
          </label>
          <textarea
            rows={3}
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            className="w-full text-xs font-mono p-3 rounded-[4px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] focus:outline-hidden focus:border-[#1E40AF] focus:bg-white"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-[#64748B] font-mono">
            Comparing against: {selectedDocs.join(", ")}
          </span>
          <button
            onClick={() => executeMapping(claimText, selectedDocs)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-[5px] transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Re-Compute Limitation Matrix</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-[6px] bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Limitation Comparison Matrix Table */}
      {matrixData && (
        <div className="bg-white border border-[#E2E8F0] rounded-[6px] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
            <div>
              <span className="text-xs font-bold text-[#0F172A]">
                CLAIM PREAMBLE: {matrixData.claim_preamble || "A device or method"}
              </span>
              <span className="text-[11px] text-[#64748B] ml-2 font-mono">
                ({matrixData.elements.length} Atomic Technical Limitations)
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase font-semibold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[3px] border border-[#BFDBFE]">
              Click cell to inspect evidence quotation
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-white">
                  <th className="py-3 px-4 font-mono font-bold text-[11px] text-[#475569] uppercase tracking-wider w-72 shrink-0 border-r border-[#E2E8F0]">
                    Atomic Limitation
                  </th>
                  {matrixData.columns.map((col) => (
                    <th key={col.doc_id} className="py-3 px-4 border-r border-[#E2E8F0] last:border-none min-w-[220px]">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/app/explorer?id=${col.doc_id}`}
                          className="font-mono font-bold text-[#1E40AF] hover:underline flex items-center gap-1"
                        >
                          <span>{col.publication_number}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <span className="font-mono text-[10px] px-1 py-0.2 rounded-[2px] bg-[#F1F5F9] text-[#64748B]">
                          {col.country}
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-[#0F172A] truncate mt-0.5" title={col.title}>
                        {col.title}
                      </div>
                      <div className="text-[10px] text-[#64748B] truncate mt-0.5">
                        {col.assignee || "Assignee not specified"}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {matrixData.elements.map((elem, rowIdx) => (
                  <tr key={elem.element_id} className="hover:bg-[#F8FAFC] transition-colors">
                    {/* Element limitation column */}
                    <td className="py-3.5 px-4 border-r border-[#E2E8F0] bg-[#FAFAFA] align-top">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-[3px] bg-[#0F172A] text-white">
                          {elem.element_id}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-[#64748B]">
                          {elem.element_type}
                        </span>
                      </div>
                      <p className="text-xs text-[#0F172A] leading-relaxed font-sans font-medium">
                        {elem.text}
                      </p>
                    </td>

                    {/* Patent comparison columns */}
                    {matrixData.columns.map((col, colIdx) => {
                      const cell = matrixData.matrix[rowIdx]?.[colIdx];
                      if (!cell) {
                        return (
                          <td key={col.doc_id} className="py-3 px-4 border-r border-[#E2E8F0] last:border-none text-center text-[#94A3B8]">
                            —
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.doc_id}
                          onClick={() => setSelectedCell({ cell, col, elementText: elem.text })}
                          className="py-3 px-4 border-r border-[#E2E8F0] last:border-none align-top cursor-pointer hover:bg-[#EFF6FF]/60 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            {getSupportBadge(cell.support_level, cell.verified)}
                            <span className="font-mono text-[10px] text-[#64748B]">
                              {Math.round(cell.confidence_score * 100)}% conf
                            </span>
                          </div>

                          <div className="text-[11px] text-[#334155] line-clamp-2 italic mb-1.5">
                            "{cell.exact_quote || "No explicit disclosure found."}"
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] pt-1 border-t border-[#F1F5F9]">
                            <span>{cell.paragraph_number || "Paragraph N/A"}</span>
                            {cell.verified && (
                              <span className="text-[#16A34A] flex items-center gap-0.5">
                                <ShieldCheck className="w-3 h-3" /> Exact
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evidence Inspection Drawer */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-2xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full border-l border-[#E2E8F0] shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#1E40AF]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Evidence Mapping Inspection
                </h3>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Patent */}
            <div className="p-3.5 rounded-[5px] bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#1E40AF]">
                  {selectedCell.col.publication_number}
                </span>
                <span className="font-mono text-[10px] bg-white border border-[#CBD5E1] px-1.5 py-0.2 rounded-[2px] text-[#475569]">
                  {selectedCell.col.country}
                </span>
              </div>
              <div className="text-xs font-semibold text-[#0F172A]">
                {selectedCell.col.title}
              </div>
              <div className="text-[11px] text-[#64748B]">
                Assignee: {selectedCell.col.assignee || "Unknown"}
              </div>
            </div>

            {/* Claim Limitation */}
            <div>
              <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                CLAIM LIMITATION:
              </span>
              <p className="text-xs text-[#0F172A] p-3 rounded-[4px] bg-[#F1F5F9] border border-[#E2E8F0] font-sans">
                {selectedCell.elementText}
              </p>
            </div>

            {/* Support Degree & Verification */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-[4px] border border-[#E2E8F0] bg-white">
                <span className="font-mono text-[10px] text-[#64748B] uppercase block">SUPPORT LEVEL</span>
                <div className="mt-1">
                  {getSupportBadge(selectedCell.cell.support_level, selectedCell.cell.verified)}
                </div>
              </div>
              <div className="p-3 rounded-[4px] border border-[#E2E8F0] bg-white">
                <span className="font-mono text-[10px] text-[#64748B] uppercase block">CONFIDENCE</span>
                <span className="font-mono text-sm font-bold text-[#0F172A] mt-1 block">
                  {Math.round(selectedCell.cell.confidence_score * 100)}%
                </span>
              </div>
            </div>

            {/* Exact Verbatim Quotation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  VERBATIM DISCLOSURE QUOTATION
                </span>
                <span className="font-mono text-[10px] text-[#1E40AF] bg-[#EFF6FF] px-1.5 py-0.2 rounded-[2px]">
                  {selectedCell.cell.paragraph_number} ({selectedCell.cell.section})
                </span>
              </div>
              <blockquote className="p-3.5 rounded-[4px] bg-[#FEFCE8] border-l-4 border-[#EAB308] text-xs text-[#713F12] font-mono leading-relaxed">
                "{selectedCell.cell.exact_quote || "No quote extracted."}"
              </blockquote>
            </div>

            {/* Rationale */}
            <div>
              <span className="font-mono text-[10px] font-bold text-[#64748B] uppercase tracking-wider block mb-1">
                LEGAL MAPPING RATIONALE
              </span>
              <p className="text-xs text-[#334155] leading-relaxed p-3 rounded-[4px] bg-white border border-[#E2E8F0]">
                {selectedCell.cell.rationale || "Automated element alignment."}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <Link
                href={`/app/explorer?id=${selectedCell.col.doc_id}`}
                className="text-xs text-[#1E40AF] hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Read Full Patent Text</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setSelectedCell(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-[5px] bg-[#0F172A] text-white hover:bg-[#1E40AF] transition"
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
