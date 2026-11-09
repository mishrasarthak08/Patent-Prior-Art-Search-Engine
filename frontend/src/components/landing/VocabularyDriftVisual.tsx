"use client";

import React, { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Split, Database, FileText } from "lucide-react";

export function VocabularyDriftVisual() {
  const [activeVocab, setActiveVocab] = useState<number>(0);

  const VOCABULARIES = [
    {
      label: "Legalistic Broad Claim",
      author: "USPTO Independent Claim 1 (2022)",
      phrase: "an inorganic lithium-ion conductive medium having sulfur-containing framework anions",
      result: "Misses specific stoichiometric terms like 'Li₆PS₅Cl' or 'argyrodite'",
      blindspot: "Oversimplified lexical matching fails to identify chemical class equivalents.",
      icon: "⚖️"
    },
    {
      label: "Chemical Stoichiometric Formula",
      author: "EPO European Patent Application (2020)",
      phrase: "crystalline argyrodite compound represented by general formula Li₆₋ₓPS₅₋ₓCl₁₊ₓ",
      result: "Misses functional descriptions that omit chemical formulas",
      blindspot: "Keywords looking for 'solid electrolyte' or 'separator' return 0 hits.",
      icon: "🧪"
    },
    {
      label: "Functional Phenomenological",
      author: "WIPO PCT International Publication (2021)",
      phrase: "solid electrochemical separator exhibiting bulk ionic conductivity exceeding 2.0 mS/cm at ambient temperature",
      result: "Contains zero chemical names or composition formulas",
      blindspot: "BM25 keyword search completely misses this critical anticipating art.",
      icon: "⚡"
    },
    {
      label: "German Jurisdictional Prior Art",
      author: "DPMA German Patent Specification (2019)",
      phrase: "lithiumionenleitender Festkörperelektrolyt auf Sulfidbasis mit Argyrodit-Kristallstruktur",
      result: "Foreign language disclosure with equivalent technical priority",
      blindspot: "English-only queries fail without cross-border patent family resolution.",
      icon: "🌐"
    }
  ];

  return (
    <div className="rounded-[8px] border border-[#CBD5E1] bg-white shadow-xs overflow-hidden">
      {/* Top Banner */}
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] font-bold text-[#1E40AF] uppercase tracking-wider">
            ANATOMY OF A SEARCH FAILURE:
          </span>
          <h3 className="text-base font-semibold text-[#0F172A] mt-0.5">
            One Single Invention, Four Incompatible Semantic Vocabularies
          </h3>
        </div>
        <div className="inline-flex items-center gap-2 font-mono text-xs text-[#DC2626] bg-[#FEF2F2] px-3 py-1 rounded-[4px] border border-[#FECACA]">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>ORDINARY KEYWORD SEARCH FAILS ON 3 OUT OF 4</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Left 5 Columns: Vocabulary Selection Tabs */}
        <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-r border-[#E2E8F0] space-y-2 bg-[#F8FAFC]">
          <p className="font-mono text-[11px] text-[#64748B] mb-3">
            SELECT A JURISDICTIONAL DISCLOSURE VARIANT:
          </p>
          {VOCABULARIES.map((v, idx) => (
            <div
              key={idx}
              onClick={() => setActiveVocab(idx)}
              className={`p-3.5 rounded-[6px] border cursor-pointer transition text-left space-y-1.5 ${
                activeVocab === idx
                  ? "bg-white border-[#1E40AF] shadow-xs ring-1 ring-[#1E40AF]"
                  : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1]"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                  <span>{v.icon}</span> {v.label}
                </span>
                <span className="font-mono text-[10px] text-[#64748B]">{v.author.split(" ")[0]}</span>
              </div>
              <p className="font-mono text-[11px] text-[#475569] line-clamp-1 italic">
                &ldquo;{v.phrase}&rdquo;
              </p>
            </div>
          ))}
        </div>

        {/* Right 7 Columns: Semantic Divergence Deep Dive */}
        <div className="lg:col-span-7 p-6 sm:p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <span className="font-mono text-[10px] text-[#1E40AF] font-bold">SOURCE:</span>
                <h4 className="font-semibold text-sm text-[#0F172A]">
                  {VOCABULARIES[activeVocab].author}
                </h4>
              </div>
              <span className="font-mono text-[10px] bg-[#EFF6FF] text-[#1E40AF] px-2.5 py-1 rounded-[4px] border border-[#BFDBFE] font-bold">
                VARIATION #{activeVocab + 1} OF 4
              </span>
            </div>

            {/* Quoted Disclosure */}
            <div className="p-4 rounded-[6px] bg-[#FEF3C7]/40 border-l-4 border-[#D97706] text-xs font-mono text-[#0F172A] leading-relaxed">
              &ldquo;{VOCABULARIES[activeVocab].phrase}&rdquo;
            </div>

            {/* Comparison Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3 rounded-[5px] bg-[#FEF2F2] border border-[#FEE2E2] space-y-1">
                <span className="font-mono text-[10px] font-bold text-[#DC2626] uppercase">
                  Ordinary Keyword Search:
                </span>
                <p className="text-xs text-[#991B1B] leading-relaxed">
                  {VOCABULARIES[activeVocab].blindspot}
                </p>
              </div>

              <div className="p-3 rounded-[5px] bg-[#ECFDF5] border border-[#D1FAE5] space-y-1">
                <span className="font-mono text-[10px] font-bold text-[#059669] uppercase">
                  Our Multi-Strategy Engine:
                </span>
                <p className="text-xs text-[#065F46] leading-relaxed">
                  Synthesizes BM25 + Qdrant Dense embeddings + cross-border family resolution to guarantee 100% recall.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-mono text-[#64748B]">
            <span>Solution: Field-Weighted BM25 + Dense RRF Fusion (k=60)</span>
            <span className="text-[#059669] font-bold">RECOVERED VIA CROSS-ENCODER</span>
          </div>
        </div>
      </div>
    </div>
  );
}

