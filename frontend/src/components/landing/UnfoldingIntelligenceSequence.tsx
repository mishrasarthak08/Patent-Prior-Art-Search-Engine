"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Layers, 
  Cpu, 
  Search, 
  Scale, 
  CheckCircle2, 
  GitBranch, 
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

interface PipelineStage {
  step: string;
  title: string;
  category: string;
  executionTech: string;
  inputArtifact: string;
  outputArtifact: string;
  detailedLogic: string;
  mathematicalBasis: string;
}

const STAGES: PipelineStage[] = [
  {
    step: "01",
    title: "Claim Decomposition & AST Tokenization",
    category: "LINGUISTIC ANALYSIS",
    executionTech: "Grammar Parser & Character Span Annotator",
    inputArtifact: "Raw Independent Claim 1 (Patent Application / Issued)",
    outputArtifact: "AST Limitation Tree with exact start/end character offsets",
    detailedLogic: "Isolates statutory preamble, transitional scope ('comprising' vs 'consisting of'), and segments dependent limitations into atomic verifiable clauses.",
    mathematicalBasis: "Character Spans: [char_start, char_end] ∀ element ∈ Claim"
  },
  {
    step: "02",
    title: "Dual-Channel Hybrid Retrieval",
    category: "SEARCH CORE",
    executionTech: "BM25Okapi + Dense Qdrant Vector Space",
    inputArtifact: "Atomic Limitation Text + Domain Taxonomies (CPC/IPC)",
    outputArtifact: "Dual Score Matrices across 52+ multi-jurisdiction corpora",
    detailedLogic: "Dispatches field-weighted BM25 against Title (x3.0), Abstract (x2.0), and Claims (x2.0), synchronized with dense cosine vectors.",
    mathematicalBasis: "Score(D, Q) = ∑ IDF(q_i) · (f(q_i, D) · (k_1 + 1)) / (f(q_i, D) + k_1 · (1 - b + b · |D|/avgdl))"
  },
  {
    step: "03",
    title: "Automated Limitation Gap Detection",
    category: "RESEARCH INTELLIGENCE",
    executionTech: "Iterative Search & Lexicon Expansion Engine",
    inputArtifact: "Preliminary Top-K Candidates from Dual Channels",
    outputArtifact: "Identified Limitation Gaps & Targeted Follow-Up Queries",
    detailedLogic: "Audits top candidates against every limitation. When a limitation shows low evidence density, the engine automatically synthesizes targeted synonym-expanded queries.",
    mathematicalBasis: "Gap_k = 1 if max_{d ∈ TopK}(EvidenceScore(d, L_k)) < τ, else 0"
  },
  {
    step: "04",
    title: "Citation & Patent Family Traversals",
    category: "RELATIONAL DISCOVERY",
    executionTech: "Forward/Backward Graph Traverser & Family Resolver",
    inputArtifact: "Top Identified Candidates + Family Identifiers",
    outputArtifact: "Expanded Graph Candidates from Equivalent Disclosures",
    detailedLogic: "Follows prior-art citations backwards and cross-border families (US ↔ EP ↔ WO equivalents) to surface publications written under different legal norms.",
    mathematicalBasis: "Neighborhood(D) = InCitations(D) ∪ OutCitations(D) ∪ FamilyMembers(D)"
  },
  {
    step: "05",
    title: "Reciprocal Rank Fusion & Deep Reranking",
    category: "SCORE CALIBRATION",
    executionTech: "RRF (k=60) + Cohere v3 Cross-Encoder",
    inputArtifact: "Merged Multi-Strategy Candidate Pool",
    outputArtifact: "Calibrated Re-Ranked Prior-Art Master Leaderboard",
    detailedLogic: "Aggregates rank distributions to eliminate score magnitude variance, then applies deep cross-encoder evaluation with 1,500-character context windows.",
    mathematicalBasis: "RRF_Score(d) = ∑_{m ∈ Methods} 1 / (60 + Rank_m(d))"
  },
  {
    step: "06",
    title: "Forensic Evidence Ledger & Certification",
    category: "VERIFIABLE PROOF",
    executionTech: "Verbatim Substring Locator & SHA-256 Hasher",
    inputArtifact: "Top Prior-Art Documents + High-Confidence Passages",
    outputArtifact: "Audited Evidence Matrix with Bracket Paragraph Coordinates",
    detailedLogic: "Certifies that every cited sentence exists verbatim in the official publication, extracts bracketed paragraph numbers like [0035], and binds an immutable SHA-256 hash.",
    mathematicalBasis: "Verification = (Quote ∈ Doc_Text) ∧ Hash(Doc_Text) == H_expected"
  }
];

export function UnfoldingIntelligenceSequence() {
  const [activeStage, setActiveStage] = useState<number>(0);
  const current = STAGES[activeStage];

  return (
    <div className="rounded-[8px] border border-[#CBD5E1] bg-white shadow-xs overflow-hidden">
      {/* Top Section Header */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold text-[#1E40AF] uppercase tracking-wider">
            INSPECTABLE EXECUTION SEQUENCE:
          </span>
          <h3 className="text-base font-semibold text-[#0F172A] mt-0.5">
            The 6-Stage Research Pipeline
          </h3>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-[#475569]">
          <span>STAGE {current.step} OF 06</span>
          <span className="text-[#CBD5E1]">&bull;</span>
          <span className="font-semibold text-[#1E40AF]">{current.category}</span>
        </div>
      </div>

      {/* Interactive Step Navigator Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-b border-[#E2E8F0] bg-[#FAFCFF] divide-x divide-y lg:divide-y-0 divide-[#E2E8F0]">
        {STAGES.map((s, idx) => (
          <button
            key={s.step}
            onClick={() => setActiveStage(idx)}
            className={`p-3.5 text-left transition relative flex flex-col justify-between ${
              activeStage === idx
                ? "bg-white text-[#1E40AF]"
                : "hover:bg-white text-[#64748B]"
            }`}
          >
            {activeStage === idx && (
              <span className="absolute top-0 left-0 right-0 h-1 bg-[#1E40AF]" />
            )}
            <div className="flex items-center justify-between mb-1 font-mono text-[11px]">
              <span className="font-bold">STAGE {s.step}</span>
              {activeStage === idx && <span className="h-1.5 w-1.5 rounded-full bg-[#1E40AF]" />}
            </div>
            <p className="text-xs font-semibold text-[#0F172A] line-clamp-1 leading-snug">
              {s.title.split("&")[0]}
            </p>
          </button>
        ))}
      </div>

      {/* Deep-Dive Stage Detail View */}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Stage Logic & Narrative */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-[#1E40AF] font-bold uppercase tracking-wider">
                ENGINE ARCHITECTURE: {current.executionTech}
              </span>
              <h4 className="text-xl sm:text-2xl font-serif text-[#0F172A]">
                {current.title}
              </h4>
            </div>

            <p className="text-sm text-[#334155] leading-relaxed">
              {current.detailedLogic}
            </p>

            {/* Mathematical Basis Formula Box */}
            <div className="p-3.5 rounded-[5px] bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#0F172A] space-y-1">
              <span className="text-[10px] font-bold text-[#64748B] uppercase">Formulation Basis:</span>
              <div className="text-[12px] font-semibold text-[#1E40AF] overflow-x-auto py-1">
                {current.mathematicalBasis}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Input / Output Verification Box */}
          <div className="lg:col-span-5 p-5 rounded-[6px] border border-[#CBD5E1] bg-[#FAFCFF] space-y-4">
            <span className="font-mono text-[10px] font-bold text-[#0F172A] uppercase tracking-wider block border-b border-[#E2E8F0] pb-2">
              AUDITABLE STAGE TRANSFORMATION:
            </span>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#64748B]">
                <span className="font-bold text-[#475569]">INPUT ARTIFACT:</span>
              </div>
              <div className="p-2.5 rounded-[4px] bg-white border border-[#E2E8F0] text-xs font-mono text-[#334155] leading-relaxed">
                {current.inputArtifact}
              </div>
            </div>

            <div className="flex justify-center my-1 text-[#94A3B8]">
              <ArrowRight className="h-4 w-4 rotate-90 lg:rotate-0" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#059669]">
                <CheckCircle2 className="h-3 w-3" />
                <span className="font-bold">VERIFIED OUTPUT ARTIFACT:</span>
              </div>
              <div className="p-2.5 rounded-[4px] bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-mono text-[#065F46] leading-relaxed">
                {current.outputArtifact}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

