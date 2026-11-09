"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Check, 
  Search, 
  Layers, 
  ExternalLink, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight,
  Filter
} from "lucide-react";

interface Limitation {
  id: string;
  type: string;
  text: string;
}

interface PriorArtDoc {
  docId: string;
  jurisdiction: string;
  title: string;
  score: number;
  date: string;
  assignee: string;
  matchedEvidence: Record<string, {
    paragraph: string;
    quote: string;
    support: "DIRECTLY_SUPPORTED" | "PARTIALLY_SUPPORTED";
    charStart: number;
    charEnd: number;
  }>;
}

interface DemoMatter {
  id: string;
  label: string;
  domain: string;
  cpc: string;
  claimNumber: string;
  claimText: string;
  limitations: Limitation[];
  candidates: PriorArtDoc[];
}

const DEMO_MATTERS: Record<string, DemoMatter> = {
  battery: {
    id: "battery",
    label: "Solid-State Battery Anode",
    domain: "Energy Storage Systems",
    cpc: "H01M 4/134, H01M 10/0525",
    claimNumber: "Claim 1 (Independent)",
    claimText:
      "A high-capacity lithium-ion secondary battery comprising: a cathode comprising lithium nickel cobalt manganese oxide; an anode comprising a silicon-graphite composite with 10% to 25% by weight nano-silicon particles; and a non-aqueous liquid electrolyte comprising fluoroethylene carbonate in an amount between 2% and 8% by weight.",
    limitations: [
      { id: "1.0", type: "Preamble", text: "A high-capacity lithium-ion secondary battery comprising" },
      { id: "1.1", type: "Cathode", text: "a cathode comprising lithium nickel cobalt manganese oxide active material" },
      { id: "1.2", type: "Anode", text: "an anode comprising a silicon-graphite composite with 10% to 25% by weight nano-silicon particles" },
      { id: "1.3", type: "Electrolyte", text: "a non-aqueous liquid electrolyte comprising fluoroethylene carbonate in an amount between 2% and 8% by weight" },
    ],
    candidates: [
      {
        docId: "US10892482B2",
        jurisdiction: "US",
        title: "Lithium-ion secondary battery with silicon-graphite composite anode and fluoroethylene carbonate additive",
        score: 0.941,
        date: "2021-01-12",
        assignee: "SolidEnergy Materials Corp.",
        matchedEvidence: {
          "1.2": {
            paragraph: "Detailed Description [0042]",
            quote: "incorporating 15 wt% nano-silicon dispersed within a mesoporous graphite matrix in conjunction with 5 wt% fluoroethylene carbonate",
            support: "DIRECTLY_SUPPORTED",
            charStart: 1420,
            charEnd: 1534,
          },
          "1.3": {
            paragraph: "Detailed Description [0054]",
            quote: "fluoroethylene carbonate additive is present in an optimal concentration of 4.5% by weight of total electrolyte solvent",
            support: "DIRECTLY_SUPPORTED",
            charStart: 1880,
            charEnd: 1995,
          },
        },
      },
      {
        docId: "EP3890123A1",
        jurisdiction: "EP",
        title: "Solid-state electrochemical cell with argyrodite solid electrolyte and silicon-based composite",
        score: 0.895,
        date: "2021-10-06",
        assignee: "QuantumVolt Technologies GmbH",
        matchedEvidence: {
          "1.1": {
            paragraph: "Claims [Claim 3]",
            quote: "the positive electrode active material contains LiNi0.8Co0.1Mn0.1O2 coated with lithium niobium oxide",
            support: "DIRECTLY_SUPPORTED",
            charStart: 890,
            charEnd: 994,
          },
          "1.2": {
            paragraph: "Detailed Description [0028]",
            quote: "anode composition comprising 20% by weight silicon nanoparticles combined with exfoliated graphite flakes",
            support: "DIRECTLY_SUPPORTED",
            charStart: 1120,
            charEnd: 1228,
          },
        },
      },
      {
        docId: "WO2022045123A1",
        jurisdiction: "WO",
        title: "Electrochemical energy storage device with fluorinated cyclic carbonate additive and method",
        score: 0.862,
        date: "2022-03-03",
        assignee: "Aether Materials WIPO Corp.",
        matchedEvidence: {
          "1.3": {
            paragraph: "Summary of Invention [0015]",
            quote: "fluorinated cyclic carbonate additive comprising fluoroethylene carbonate at 3.0 wt% to 6.0 wt%",
            support: "DIRECTLY_SUPPORTED",
            charStart: 540,
            charEnd: 642,
          },
        },
      },
    ],
  },
  ai: {
    id: "ai",
    label: "Attention Transformer Crossbar",
    domain: "Neuromorphic AI & Compute",
    cpc: "G06N 3/063, G06F 17/16",
    claimNumber: "Claim 1 (Independent)",
    claimText:
      "A neuromorphic hardware accelerator for transformer attention processing, comprising: an analog memristive crossbar array configured to perform matrix-vector multiplication; a digital systolic array coupled to receive analog outputs via analog-to-digital converters; and a hardware softmax unit executing scaled dot-product attention in volatile local memory.",
    limitations: [
      { id: "1.0", type: "Preamble", text: "A neuromorphic hardware accelerator for transformer attention processing" },
      { id: "1.1", type: "Memristor", text: "an analog memristive crossbar array configured to perform matrix-vector multiplication" },
      { id: "1.2", type: "Systolic", text: "a digital systolic array coupled to receive analog outputs via analog-to-digital converters" },
      { id: "1.3", type: "Softmax", text: "a hardware softmax unit executing scaled dot-product attention in volatile local memory" },
    ],
    candidates: [
      {
        docId: "US11288564B2",
        jurisdiction: "US",
        title: "Neuromorphic attention computing engine with analog memristive crossbar array and pipelined ADC",
        score: 0.924,
        date: "2022-03-29",
        assignee: "Synapse Cognitive Systems LLC",
        matchedEvidence: {
          "1.1": {
            paragraph: "Detailed Description [0088]",
            quote: "a 64x64 memristive crossbar array executing analog vector-matrix multiplication connected to flash ADCs",
            support: "DIRECTLY_SUPPORTED",
            charStart: 2100,
            charEnd: 2210,
          },
          "1.2": {
            paragraph: "Detailed Description [0094]",
            quote: "the digital outputs of the ADC array feed directly into the edge inputs of a 2D systolic array processor",
            support: "DIRECTLY_SUPPORTED",
            charStart: 2450,
            charEnd: 2562,
          },
        },
      },
      {
        docId: "EP3940567A1",
        jurisdiction: "EP",
        title: "Optical and analog matrix-vector multiplier for deep transformer networks",
        score: 0.880,
        date: "2022-01-19",
        assignee: "Photonics Neural Core Corp.",
        matchedEvidence: {
          "1.3": {
            paragraph: "Claims [Claim 4]",
            quote: "hardware softmax accelerator computing row-wise exponential normalization in local SRAM buffer",
            support: "DIRECTLY_SUPPORTED",
            charStart: 1300,
            charEnd: 1402,
          },
        },
      },
    ],
  },
  therapeutics: {
    id: "therapeutics",
    label: "Lipid Nanoparticle Delivery",
    domain: "Nanomedicine & Biopharma",
    cpc: "A61K 9/5123, A61K 48/00",
    claimNumber: "Claim 1 (Independent)",
    claimText:
      "A pharmaceutical lipid nanoparticle formulation for targeted mRNA delivery, comprising: an ionizable amino-lipid having a tertiary amine headgroup with an apparent pKa between 6.2 and 6.8; a helper neutral phospholipid; cholesterol in a molar ratio of 35% to 45%; and a PEG-conjugated lipid in a molar ratio of 1.0% to 2.5% encapsulating therapeutic mRNA.",
    limitations: [
      { id: "1.0", type: "Preamble", text: "A pharmaceutical lipid nanoparticle formulation for targeted mRNA delivery" },
      { id: "1.1", type: "Amino-Lipid", text: "an ionizable amino-lipid having a tertiary amine headgroup with an apparent pKa between 6.2 and 6.8" },
      { id: "1.2", type: "Phospholipid", text: "a helper neutral phospholipid and cholesterol in a molar ratio of 35% to 45%" },
      { id: "1.3", type: "PEG-Lipid", text: "a PEG-conjugated lipid in a molar ratio of 1.0% to 2.5% encapsulating therapeutic mRNA" },
    ],
    candidates: [
      {
        docId: "US11040003B2",
        jurisdiction: "US",
        title: "Lipid nanoparticle compositions for targeted mRNA delivery and cellular uptake",
        score: 0.938,
        date: "2021-06-22",
        assignee: "SyntheGene Therapeutics Inc.",
        matchedEvidence: {
          "1.1": {
            paragraph: "Detailed Description [0064]",
            quote: "ionizable amino-lipids featuring tertiary amine headgroups exhibiting an apparent pKa ranging from 6.3 to 6.7",
            support: "DIRECTLY_SUPPORTED",
            charStart: 1640,
            charEnd: 1754,
          },
          "1.2": {
            paragraph: "Detailed Description [0070]",
            quote: "lipid nanoparticles comprising 50 mol% ionizable lipid, 10 mol% DSPC, 38.5 mol% cholesterol, and 1.5 mol% PEG-lipid",
            support: "DIRECTLY_SUPPORTED",
            charStart: 1920,
            charEnd: 2040,
          },
        },
      },
    ],
  },
};

export function InteractiveWorkbenchDemo() {
  const [activeMatterKey, setActiveMatterKey] = useState<string>("battery");
  const [activeLimitationId, setActiveLimitationId] = useState<string>("1.2");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("US10892482B2");
  const [reviewStatus, setReviewStatus] = useState<Record<string, string>>({
    "1.2-US10892482B2": "ACCEPTED",
    "1.3-US10892482B2": "ACCEPTED",
  });

  const matter = DEMO_MATTERS[activeMatterKey];
  const activeCandidate = matter.candidates.find((c) => c.docId === selectedCandidateId) || matter.candidates[0];
  const activeEvidence = activeCandidate.matchedEvidence[activeLimitationId];

  const handleDecision = (decision: string) => {
    const key = `${activeLimitationId}-${activeCandidate.docId}`;
    setReviewStatus((prev) => ({ ...prev, [key]: decision }));
  };

  const currentDecision = reviewStatus[`${activeLimitationId}-${activeCandidate.docId}`] || "UNREVIEWED";

  return (
    <div className="rounded-[8px] border border-[#CBD5E1] bg-white shadow-xs overflow-hidden">
      {/* Top Banner with Explicit Demo Label */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2.5 py-1 rounded-[4px] border border-[#BFDBFE]">
            INTERACTIVE WORKBENCH DEMONSTRATION
          </span>
          <span className="text-xs font-mono text-[#64748B]">
            EXPLICIT LABELED SAMPLE BENCHMARK
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-[#64748B]">SELECT DOMAIN:</span>
          <div className="flex gap-1">
            {(["battery", "ai", "therapeutics"] as const).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setActiveMatterKey(key);
                  const m = DEMO_MATTERS[key];
                  setActiveLimitationId(m.limitations[1].id);
                  setSelectedCandidateId(m.candidates[0].docId);
                }}
                className={`px-2.5 py-1 rounded-[4px] font-mono text-[11px] font-semibold transition ${
                  activeMatterKey === key
                    ? "bg-[#0F172A] text-white"
                    : "bg-white text-[#475569] border border-[#CBD5E1] hover:text-[#0F172A]"
                }`}
              >
                {DEMO_MATTERS[key].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
        {/* Left 4 Columns: Claim Limitations Tree */}
        <div className="lg:col-span-4 p-5 bg-[#FAFCFF] border-b lg:border-b-0 lg:border-r border-[#E2E8F0] space-y-4">
          <div className="flex items-center justify-between font-mono text-[11px] text-[#64748B]">
            <span className="font-bold text-[#0F172A]">CLAIM 1 LIMITATION TREE</span>
            <span>{matter.limitations.length} ELEMENTS</span>
          </div>

          <div className="space-y-2">
            {matter.limitations.map((elem) => {
              const isSelected = activeLimitationId === elem.id;
              const hasMatch = Boolean(activeCandidate.matchedEvidence[elem.id]);

              return (
                <div
                  key={elem.id}
                  onClick={() => setActiveLimitationId(elem.id)}
                  className={`p-3 rounded-[6px] border cursor-pointer transition space-y-1.5 ${
                    isSelected
                      ? "bg-white border-[#1E40AF] shadow-xs ring-1 ring-[#1E40AF]"
                      : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold text-[#1E40AF]">[{elem.id}] {elem.type}</span>
                    {hasMatch ? (
                      <span className="text-[#059669] font-bold flex items-center gap-1">
                        <Check className="h-3 w-3" /> MATCHED
                      </span>
                    ) : (
                      <span className="text-[#94A3B8]">NOT CITED</span>
                    )}
                  </div>
                  <p className="text-xs text-[#334155] leading-relaxed line-clamp-2">
                    {elem.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-[11px] font-mono text-[#64748B] flex items-center justify-between">
            <span>CPC: {matter.cpc.split(",")[0]}</span>
            <span className="text-[#1E40AF] font-semibold">{matter.domain}</span>
          </div>
        </div>

        {/* Middle 4 Columns: Prior-Art Candidates List */}
        <div className="lg:col-span-4 p-5 border-b lg:border-b-0 lg:border-r border-[#E2E8F0] space-y-4 bg-white">
          <div className="flex items-center justify-between font-mono text-[11px] text-[#64748B]">
            <span className="font-bold text-[#0F172A]">RETRIEVED CANDIDATES</span>
            <span>{matter.candidates.length} RESULTS</span>
          </div>

          <div className="space-y-2">
            {matter.candidates.map((cand) => {
              const isSelected = selectedCandidateId === cand.docId;
              return (
                <div
                  key={cand.docId}
                  onClick={() => setSelectedCandidateId(cand.docId)}
                  className={`p-3.5 rounded-[6px] border cursor-pointer transition space-y-2 ${
                    isSelected
                      ? "bg-[#FAFCFF] border-[#1E40AF] shadow-xs ring-1 ring-[#1E40AF]"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#0F172A]">{cand.docId}</span>
                    <span className="font-mono text-[10px] text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px] font-bold">
                      SCORE: {(cand.score * 100).toFixed(1)}%
                    </span>
                  </div>

                  <h5 className="text-xs font-semibold text-[#0F172A] leading-snug line-clamp-2">
                    {cand.title}
                  </h5>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                    <span>{cand.assignee}</span>
                    <span>{cand.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Columns: Certified Evidence & Human Review Decision */}
        <div className="lg:col-span-4 p-5 bg-[#FAFCFF] flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="font-bold text-[#0F172A]">EVIDENCE MAPPING</span>
              <span className="badge-verified">
                <Check className="h-3 w-3" /> VERIFIED SUBSTRING
              </span>
            </div>

            {activeEvidence ? (
              <div className="space-y-3">
                <div className="p-3 rounded-[5px] bg-white border border-[#E2E8F0] space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#64748B]">
                    <span className="font-bold text-[#1E40AF]">{activeEvidence.paragraph}</span>
                    <span>chars {activeEvidence.charStart}–{activeEvidence.charEnd}</span>
                  </div>
                  <div className="source-passage-highlight text-xs mt-1">
                    &ldquo;{activeEvidence.quote}&rdquo;
                  </div>
                </div>

                {/* Review Decision Controls */}
                <div className="p-3 rounded-[5px] bg-white border border-[#CBD5E1] space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold text-[#0F172A]">ATTORNEY REVIEW STATUS:</span>
                    <span className={`font-bold ${
                      currentDecision === "ACCEPTED" ? "text-[#059669]" :
                      currentDecision === "FLAGGED" ? "text-[#D97706]" : "text-[#64748B]"
                    }`}>
                      {currentDecision}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleDecision("ACCEPTED")}
                      className={`px-2.5 py-1.5 rounded-[4px] font-mono text-[11px] font-semibold transition ${
                        currentDecision === "ACCEPTED"
                          ? "bg-[#059669] text-white"
                          : "bg-[#F8FAFC] text-[#065F46] border border-[#A7F3D0] hover:bg-[#ECFDF5]"
                      }`}
                    >
                      ✓ ACCEPT
                    </button>
                    <button
                      onClick={() => handleDecision("FLAGGED")}
                      className={`px-2.5 py-1.5 rounded-[4px] font-mono text-[11px] font-semibold transition ${
                        currentDecision === "FLAGGED"
                          ? "bg-[#D97706] text-white"
                          : "bg-[#F8FAFC] text-[#B45309] border border-[#FDE68A] hover:bg-[#FFFBEB]"
                      }`}
                    >
                      ⚑ FLAG
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-[5px] bg-white border border-dashed border-[#CBD5E1] text-center space-y-2 my-auto">
                <AlertCircle className="h-6 w-6 text-[#94A3B8] mx-auto" />
                <p className="text-xs text-[#64748B]">
                  No direct evidence passage mapped for limitation [{activeLimitationId}] in {activeCandidate.docId}.
                </p>
                <span className="font-mono text-[10px] text-[#1E40AF]">
                  Select another limitation or candidate to inspect.
                </span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-[#64748B]">Audit Ledger Sync Active</span>
            <Link href="/app" className="font-semibold text-[#1E40AF] hover:underline flex items-center gap-1">
              Open Full Workbench &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

