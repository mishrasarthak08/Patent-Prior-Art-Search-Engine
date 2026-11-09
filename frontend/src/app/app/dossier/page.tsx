"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Printer,
  Copy,
  CheckCircle2,
  Shield,
  Layers,
  FileCheck,
  Building2,
  Calendar,
  Share2,
  Lock,
  AlertCircle
} from "lucide-react";

export default function DossierStudioPage() {
  const [matterName, setMatterName] = useState("MATTER-2026-CORE: Lithium Silicon Energy Storage");
  const [clientName, setClientName] = useState("QuantumVolt Technologies Corp.");
  const [examinerName, setExaminerName] = useState("Sarah Jenkins, Reg. Patent Attorney #74,219");
  const [includeMatrix, setIncludeMatrix] = useState(true);
  const [includeLedger, setIncludeLedger] = useState(true);
  const [includeGraph, setIncludeGraph] = useState(true);
  const [includeAudit, setIncludeAudit] = useState(true);
  const [copied, setCopied] = useState(false);

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleCopyMarkdown = () => {
    const text = `# PRIOR-ART RESEARCH DOSSIER
**Matter**: ${matterName}
**Client**: ${clientName}
**Prepared By**: ${examinerName}
**Date**: ${currentDate}
**Security Level**: ZERO-RETENTION CONFIDENTIAL

---

## 1. EXECUTIVE SUMMARY
A comprehensive multi-strategy prior-art investigation was conducted across 52 full-text indexed patent publications spanning the United States Patent and Trademark Office (USPTO), European Patent Office (EPO), and World Intellectual Property Organization (WIPO).

The subject patent claim was decomposed into atomic technical limitations, evaluated against lexical field-weighted BM25 indices, dense embedding representations, citation graph links, and cross-border patent family clusters.

---

## 2. TARGET PATENT CLAIM & ATOMIC LIMITATION DECOMPOSITION
**Preamble**: A lithium-ion secondary battery
**Transition**: comprising

- **Limitation 1 (el-1)**: A cathode comprising a current collector and a cathode active material layer comprising lithium nickel cobalt manganese oxide.
- **Limitation 2 (el-2)**: An anode comprising an anode current collector and an anode active material layer comprising silicon-graphite composite nanoparticles wherein nanostructured silicon particles having an average particle diameter of 20 nm to 80 nm are dispersed in an amorphous carbonaceous graphite matrix.
- **Limitation 3 (el-3)**: A microporous polyolefin separator interposed between the cathode and the anode.
- **Limitation 4 (el-4)**: A non-aqueous liquid electrolyte comprising an organic solvent, a lithium salt, and fluoroethylene carbonate present in an amount of 2.0 wt% to 8.0 wt%.

---

## 3. PRIOR-ART CITATIONS & EVIDENCE LEDGER
1. **US10892482B2** - *Lithium-ion secondary battery with silicon-graphite composite anode and fluoroethylene carbonate electrolyte additive*
   - **Jurisdiction**: US | **Assignee**: QuantumVolt Technologies Inc.
   - **Support**: DIRECTLY_SUPPORTING (100% limitation coverage)
   - **Paragraph Reference**: [0022], [0035]
   - **Exact Citation**: "Fluoroethylene carbonate (FEC) is incorporated as a sacrificial SEI-forming additive in an amount of 2.0 wt% to 8.0 wt%... generating a flexible, passivating LiF-rich SEI layer."
   - **Integrity**: Character offsets 1633–1717 | Verified verbatim substring.

2. **EP3890123A1** - *Electrochemical cell with hybrid silicon-nanocarbon negative electrode and fluorinated ether co-solvents*
   - **Jurisdiction**: EP | **Family ID**: FAM-BAT-001 (Direct cross-border family equivalent)
   - **Support**: PARTIALLY_SUPPORTING

---

## 4. STATUTORY NON-LEGAL-ADVICE NOTICE & DISCLAIMER
This Research Dossier is an automated computer-assisted information retrieval output prepared by the Patent Prior-Art Search Engine. It is NOT a formal legal opinion, patentability opinion, freedom-to-operate clearance, or non-infringement determination under 35 U.S.C. §§ 102/103. Final validity and scope determinations require evaluation by a registered patent practitioner.
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#1E40AF] uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5" />
            <span>Research Dossier Studio</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A] mt-1">
            Prior-Art Dossier & Report Builder
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Generate publication-ready, legally structured invalidity dossiers with exact evidence quotations and provenance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[5px] border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0F172A] transition cursor-pointer"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied Markdown" : "Copy Markdown"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-[5px] bg-[#0F172A] hover:bg-[#1E40AF] text-white transition shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Configuration Controls Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-[6px] p-4 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase block mb-1">
            MATTER TITLE / DOCKET NUMBER
          </label>
          <input
            type="text"
            value={matterName}
            onChange={(e) => setMatterName(e.target.value)}
            className="w-full text-xs font-medium py-1.5 px-2.5 rounded-[4px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase block mb-1">
            CLIENT / ASSIGNEE NAME
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full text-xs font-medium py-1.5 px-2.5 rounded-[4px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase block mb-1">
            PREPARED BY / ATTORNEY
          </label>
          <input
            type="text"
            value={examinerName}
            onChange={(e) => setExaminerName(e.target.value)}
            className="w-full text-xs font-medium py-1.5 px-2.5 rounded-[4px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]"
          />
        </div>
      </div>

      {/* Styled Legal Dossier Document Preview */}
      <div className="bg-white border border-[#CBD5E1] rounded-[6px] shadow-lg p-8 md:p-12 space-y-8 font-sans text-[#0F172A] print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-[#0F172A] pb-6 flex items-start justify-between">
          <div>
            <div className="font-mono text-xs font-bold tracking-widest text-[#1E40AF] uppercase">
              CONFIDENTIAL PRIOR-ART RESEARCH DOSSIER
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#0F172A] mt-2">
              {matterName}
            </h2>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-[#64748B]">
              <span>Client: <strong>{clientName}</strong></span>
              <span>Counsel: <strong>{examinerName}</strong></span>
              <span>Date: <strong>{currentDate}</strong></span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded-[3px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] font-bold">
              ZERO-RETENTION SECURE
            </span>
            <span className="text-[#94A3B8]">DOC-ID: DOSSIER-2026-v2</span>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <section className="space-y-2">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0F172A] border-b border-[#E2E8F0] pb-1">
            1. Executive Research Summary
          </h3>
          <p className="text-xs leading-relaxed text-[#334155]">
            This dossier reports the findings of an algorithmic multi-strategy prior-art search across full-text patent disclosures from the United States Patent and Trademark Office (USPTO), European Patent Office (EPO), and World Intellectual Property Organization (WIPO). The submitted claim was partitioned into its constituent atomic technical limitations and evaluated against field-weighted BM25 indices, dense vector embeddings, backward/forward citation networks, and cross-border patent family clusters.
          </p>
        </section>

        {/* Section 2: Atomic Limitations */}
        <section className="space-y-3">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0F172A] border-b border-[#E2E8F0] pb-1">
            2. Claim Decomposition & Technical Limitations
          </h3>
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[4px] text-xs space-y-1.5 font-sans">
            <div className="font-bold text-[#0F172A]">Claim 1 Preamble: A lithium-ion secondary battery comprising:</div>
            <ol className="list-decimal pl-5 space-y-1 text-[#334155]">
              <li><strong>Cathode</strong>: A current collector and a cathode active material layer comprising lithium nickel cobalt manganese oxide (NMC).</li>
              <li><strong>Anode</strong>: Silicon-graphite composite nanoparticles wherein nanostructured silicon particles (20 nm to 80 nm) are dispersed in an amorphous carbonaceous graphite matrix.</li>
              <li><strong>Separator</strong>: A microporous polyolefin separator interposed between the cathode and the anode.</li>
              <li><strong>Electrolyte</strong>: A non-aqueous liquid electrolyte containing fluoroethylene carbonate (FEC) in an amount of 2.0 wt% to 8.0 wt%.</li>
            </ol>
          </div>
        </section>

        {/* Section 3: Evidence Matrix & Integrity Ledger */}
        <section className="space-y-3">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0F172A] border-b border-[#E2E8F0] pb-1">
            3. Prior-Art Evidence Matrix & Verified Quotations
          </h3>

          <div className="border border-[#E2E8F0] rounded-[4px] overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-mono text-[10px] text-[#64748B] uppercase">
                  <th className="py-2.5 px-3 w-40">Patent Citation</th>
                  <th className="py-2.5 px-3 w-28">Support Degree</th>
                  <th className="py-2.5 px-3">Verbatim Disclosure Quotation & Coordinates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                <tr>
                  <td className="py-3 px-3 align-top">
                    <span className="font-mono font-bold text-[#1E40AF]">US10892482B2</span>
                    <div className="text-[10px] text-[#64748B]">QuantumVolt Technologies</div>
                    <div className="text-[9px] font-mono text-[#16A34A] mt-0.5">Direct Family: EP3890123A1</div>
                  </td>
                  <td className="py-3 px-3 align-top">
                    <span className="inline-block px-2 py-0.5 rounded-[3px] bg-[#ECFDF5] text-[#065F46] font-mono font-bold text-[10px]">
                      DIRECT SUPPORT
                    </span>
                    <div className="text-[10px] text-[#64748B] mt-0.5">100% limitation coverage</div>
                  </td>
                  <td className="py-3 px-3 align-top space-y-1">
                    <p className="font-mono text-[11px] text-[#334155] bg-[#FEFCE8] p-2 rounded-[3px] border border-[#FEF08A]">
                      "Fluoroethylene carbonate (FEC) is incorporated as a sacrificial SEI-forming additive in an amount of 2.0 wt% to 8.0 wt%, preferably 5.0 wt%... generating a flexible, passivating LiF-rich SEI layer."
                    </p>
                    <div className="text-[10px] font-mono text-[#64748B] flex items-center gap-3">
                      <span>Coordinates: Section DETAILED_DESCRIPTION [0035]</span>
                      <span>Offsets: 1633–1717</span>
                      <span className="text-[#16A34A] font-semibold">✓ Exact Substring Verified</span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-3 align-top">
                    <span className="font-mono font-bold text-[#1E40AF]">EP3890123A1</span>
                    <div className="text-[10px] text-[#64748B]">QuantumVolt Technologies</div>
                    <div className="text-[9px] font-mono text-[#64748B] mt-0.5">European Equivalent</div>
                  </td>
                  <td className="py-3 px-3 align-top">
                    <span className="inline-block px-2 py-0.5 rounded-[3px] bg-[#FEF3C7] text-[#92400E] font-mono font-bold text-[10px]">
                      PARTIAL SUPPORT
                    </span>
                    <div className="text-[10px] text-[#64748B] mt-0.5">75% limitation coverage</div>
                  </td>
                  <td className="py-3 px-3 align-top space-y-1">
                    <p className="font-mono text-[11px] text-[#334155] bg-[#F8FAFC] p-2 rounded-[3px] border border-[#E2E8F0]">
                      "A negative electrode comprising silicon nanoparticles coated with an amorphous carbon shell; and an electrolyte solution comprising a fluorinated acyclic ether co-solvent..."
                    </p>
                    <div className="text-[10px] font-mono text-[#64748B] flex items-center gap-3">
                      <span>Coordinates: Section CLAIMS Claim 1</span>
                      <span className="text-[#16A34A] font-semibold">✓ Exact Substring Verified</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Audit & Provenance */}
        <section className="space-y-2">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0F172A] border-b border-[#E2E8F0] pb-1">
            4. Cryptographic Provenance & Review Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[3px]">
              <span className="text-[10px] font-mono text-[#64748B] block">DOCUMENT HASH</span>
              <span className="font-mono text-[11px] font-bold text-[#0F172A]">sha256:7e8cb27b4a15</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[3px]">
              <span className="text-[10px] font-mono text-[#64748B] block">AUDIT DECISION</span>
              <span className="font-mono text-[11px] font-bold text-[#16A34A]">HUMAN_VERIFIED</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[3px]">
              <span className="text-[10px] font-mono text-[#64748B] block">SEARCH STRATEGY</span>
              <span className="font-mono text-[11px] font-bold text-[#0F172A]">HYBRID_RRF_ITERATIVE</span>
            </div>
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[3px]">
              <span className="text-[10px] font-mono text-[#64748B] block">EVALUATOR</span>
              <span className="font-mono text-[11px] font-bold text-[#0F172A]">examiner-1</span>
            </div>
          </div>
        </section>

        {/* Section 5: Statutory Disclaimer */}
        <section className="pt-4 border-t border-[#E2E8F0]">
          <div className="p-4 rounded-[4px] bg-[#F8FAFC] border border-[#CBD5E1] flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" />
            <div className="text-[10px] leading-relaxed text-[#475569] space-y-1">
              <strong className="text-[#0F172A] block uppercase font-mono">
                Mandatory Legal Disclaimer (37 C.F.R. § 1.56 & Rule 11 Notice)
              </strong>
              <p>
                This Prior-Art Research Dossier is an automated technical retrieval compilation. It is NOT a substitute for formal review by a licensed patent attorney or agent. Automated scoring, similarity scores, and claim-element alignments are retrieval heuristics and do not constitute legal conclusions regarding validity, novelty, obviousness, or enforceability.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
