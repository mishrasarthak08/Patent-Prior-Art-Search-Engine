"use client";

import React from "react";
import { ShieldCheck, Check, Lock, Hash, Scale, FileText, AlertCircle } from "lucide-react";

export function ForensicTrustSchematic() {
  return (
    <div className="rounded-[8px] border border-[#CBD5E1] bg-white shadow-xs overflow-hidden">
      {/* Top Banner */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold text-[#1E40AF] uppercase tracking-wider">
            FORENSIC EVIDENCE LEDGER:
          </span>
          <h3 className="text-base font-semibold text-[#0F172A] mt-0.5">
            Zero-Hallucination Evidence Traceability
          </h3>
        </div>
        <div className="inline-flex items-center gap-1.5 font-mono text-xs text-[#065F46] bg-[#ECFDF5] px-3 py-1 rounded-[4px] border border-[#A7F3D0] font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-[#059669]" />
          <span>CRYPTOGRAPHICALLY CERTIFIED VERBATIM PROOF</span>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        {/* Forensic Blueprint Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Coordinate Indexing */}
          <div className="p-5 rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-[#1E40AF]">01. EXACT COORDINATES</span>
              <span className="text-[#94A3B8]">AST BOUNDS</span>
            </div>
            <h4 className="font-semibold text-sm text-[#0F172A]">Character-Level Spans</h4>
            <p className="text-xs text-[#475569] leading-relaxed">
              Every quotation is mapped to exact zero-indexed start and end character offsets <code className="text-[#1E40AF] font-mono text-[11px]">[1420:1534]</code>, preventing out-of-context citations.
            </p>
            <div className="p-2.5 rounded-[4px] bg-white border border-[#E2E8F0] font-mono text-[11px] text-[#334155]">
              char_start: 1420 | char_end: 1534
            </div>
          </div>

          {/* Pillar 2: Paragraph Bracket Extraction */}
          <div className="p-5 rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-[#1E40AF]">02. LEGAL CITATION</span>
              <span className="text-[#94A3B8]">USPTO / EPO</span>
            </div>
            <h4 className="font-semibold text-sm text-[#0F172A]">Bracketed Paragraphs</h4>
            <p className="text-xs text-[#475569] leading-relaxed">
              Automatically parses standard patent drafting paragraph delimiters <code className="text-[#1E40AF] font-mono text-[11px]">[0042]</code> and statutory claim dependencies for direct citation in office action responses.
            </p>
            <div className="p-2.5 rounded-[4px] bg-white border border-[#E2E8F0] font-mono text-[11px] text-[#334155]">
              section: &quot;Detailed Description [0042]&quot;
            </div>
          </div>

          {/* Pillar 3: Cryptographic Immutability */}
          <div className="p-5 rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] space-y-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-[#1E40AF]">03. IMMUTABLE PROOF</span>
              <span className="text-[#94A3B8]">SHA-256</span>
            </div>
            <h4 className="font-semibold text-sm text-[#0F172A]">Document Fingerprint</h4>
            <p className="text-xs text-[#475569] leading-relaxed">
              Computes and embeds a cryptographic SHA-256 hash of the source document, guaranteeing that the retrieved excerpt cannot drift or be retroactively tampered with.
            </p>
            <div className="p-2.5 rounded-[4px] bg-white border border-[#E2E8F0] font-mono text-[10px] text-[#334155] truncate">
              hash: 7f8b9a2ce014...b1a2
            </div>
          </div>
        </div>

        {/* Live Verbatim Verification Sample */}
        <div className="p-5 rounded-[6px] border border-[#CBD5E1] bg-[#FAFCFF] space-y-3">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-[#0F172A]">AUDITED EVIDENCE LEDGER RECORD #EL-9042</span>
            <span className="badge-verified">
              <Check className="h-3 w-3" /> VERIFIED SUBSTRING MATCH
            </span>
          </div>

          <div className="p-3.5 rounded-[5px] bg-white border border-[#E2E8F0] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#64748B]">
              <span>PATENT: US10892482B2</span>
              <span>PARAGRAPH: [0042]</span>
            </div>
            <div className="source-passage-highlight text-xs">
              &ldquo;...incorporating 15 wt% nano-silicon dispersed within a mesoporous graphite matrix in conjunction with 5 wt% fluoroethylene carbonate...&rdquo;
            </div>
            <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] font-mono text-[#64748B]">
              <span>Verified against USPTO raw grant full-text</span>
              <span className="text-[#059669] font-semibold">Semantic Match Score: 0.941</span>
            </div>
          </div>
        </div>

        {/* Statutory Legal Disclaimer Notice */}
        <div className="p-4 rounded-[6px] bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3 text-xs text-[#92400E]">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#D97706]" />
          <div className="space-y-1">
            <p className="font-semibold text-[#78350F]">
              Statutory Non-Legal-Advice Notice
            </p>
            <p className="leading-relaxed">
              This system provides automated information retrieval and claim comparison tools for registered patent practitioners, patent agents, and research professionals. It does not provide legal advice, legal opinions, or formal freedom-to-operate clearance. All outputs should be independently reviewed by a qualified intellectual property attorney.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

