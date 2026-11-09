"use client";

import React from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Search, 
  FileText, 
  Layers, 
  Scale, 
  Sliders,
  Check, 
  ChevronRight,
  Sparkles,
  ExternalLink,
  Cpu,
  Lock,
  Database,
  Building,
  UserCheck,
  Compass,
  FileCheck,
  Briefcase
} from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { AnatomyOfInventionHero } from "@/components/landing/AnatomyOfInventionHero";
import { VocabularyDriftVisual } from "@/components/landing/VocabularyDriftVisual";
import { UnfoldingIntelligenceSequence } from "@/components/landing/UnfoldingIntelligenceSequence";
import { InteractiveWorkbenchDemo } from "@/components/landing/InteractiveWorkbenchDemo";
import { DiscoveryLandscapeGraph } from "@/components/landing/DiscoveryLandscapeGraph";
import { ForensicTrustSchematic } from "@/components/landing/ForensicTrustSchematic";

export default function PatentLandingPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans selection:bg-[#1E40AF]/15">
      <MarketingHeader />

      <main className="flex-1">
        {/* HERO: THE ANATOMY OF AN INVENTION */}
        <AnatomyOfInventionHero />

        {/* SECTION A: THE PROBLEM OF DISCOVERY */}
        <section className="py-20 md:py-28 border-b border-[#E2E8F0] bg-[#F8F9FA]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-3">
              <span className="font-mono text-xs font-bold text-[#1E40AF] uppercase tracking-wider">
                SECTION A &bull; THE PROBLEM OF DISCOVERY
              </span>
              <h2 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
                Why standard keyword search misses critical prior art.
              </h2>
              <p className="text-base text-[#475569] leading-relaxed">
                Patent disclosures employ idiosyncratic legalistic phrasing, complex dependent limitation scopes, chemical formulas, and hundred-page specifications. A single technical disclosure can be written under four completely different vocabularies.
              </p>
            </div>

            {/* Interactive Multi-Vocabulary Component */}
            <VocabularyDriftVisual />
          </div>
        </section>

        {/* SECTION B: THE INTELLIGENCE PROCESS */}
        <section className="py-20 md:py-28 border-b border-[#E2E8F0] bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-3">
              <span className="font-mono text-xs font-bold text-[#1E40AF] uppercase tracking-wider">
                SECTION B &bull; THE INTELLIGENCE PROCESS
              </span>
              <h2 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
                An inspectable, multi-stage research flow.
              </h2>
              <p className="text-base text-[#475569] leading-relaxed">
                Rather than treating independent claims as monolithic strings or relying on unpredictable generative AI prompts, every query executes through a disciplined, six-stage pipeline engineered to withstand examination and litigation scrutiny.
              </p>
            </div>

            {/* Unfolding Intelligence Pipeline */}
            <UnfoldingIntelligenceSequence />
          </div>
        </section>

        {/* SECTION C: INTERACTIVE CLAIM-TO-EVIDENCE DEMONSTRATION */}
        <section className="py-20 md:py-28 border-b border-[#E2E8F0] bg-[#F8F9FA]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-3">
              <span className="font-mono text-xs font-bold text-[#1E40AF] uppercase tracking-wider">
                SECTION C &bull; INTERACTIVE CLAIM-TO-EVIDENCE BENCHMARK
              </span>
              <h2 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
                Test the workbench on real patent claims.
              </h2>
              <p className="text-base text-[#475569] leading-relaxed">
                Select a high-tech sector below to observe atomic limitation extraction, dual-channel retrieval across real publications, verbatim quotation verification, and attorney review decisions.
              </p>
            </div>

            {/* Genuine Interactive Demonstration Workbench */}
            <InteractiveWorkbenchDemo />
          </div>
        </section>

        {/* SECTION D: THE DISCOVERY LANDSCAPE */}
        <section className="py-20 md:py-28 border-b border-[#E2E8F0] bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-3">
              <span className="font-mono text-xs font-bold text-[#1E40AF] uppercase tracking-wider">
                SECTION D &bull; THE DISCOVERY LANDSCAPE
              </span>
              <h2 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
                Uncover multi-dimensional patent relationships.
              </h2>
              <p className="text-base text-[#475569] leading-relaxed">
                Prior art does not exist in isolation. Our relational engine maps target claims directly to citations, cross-border patent families across US, EP, and WIPO, and official CPC classifications.
              </p>
            </div>

            {/* Knowledge Topology Network Graph */}
            <DiscoveryLandscapeGraph />
          </div>
        </section>

        {/* SECTION E: PRODUCT CAPABILITIES */}
        <section className="py-20 md:py-28 border-b border-[#E2E8F0] bg-[#F8F9FA]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
            <div className="max-w-3xl space-y-3">
              <span className="font-mono text-xs font-bold text-[#1E40AF] uppercase tracking-wider">
                SECTION E &bull; PROFESSIONAL PRODUCT CAPABILITIES
              </span>
              <h2 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
                Engineered for serious intellectual property work.
              </h2>
              <p className="text-base text-[#475569] leading-relaxed">
                Every screen in the authenticated platform is built as a precision research instrument for registered patent attorneys, examiners, and corporate IP counsel.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Comparative Claim Matrix",
                  category: "CLAIM ANALYSIS",
                  desc: "Map every independent and dependent claim element side-by-side across multiple cited references with support-level scoring.",
                  href: "/app/claim-map",
                  badge: "/app/claim-map"
                },
                {
                  title: "Patent Citation Graph",
                  category: "GRAPH EXPLORER",
                  desc: "Traverse forward and backward citation networks and global patent family equivalents across US, EP, and WO jurisdictions.",
                  href: "/app/graph",
                  badge: "/app/graph"
                },
                {
                  title: "Forensic Evidence Ledger",
                  category: "VERIFIABLE AUDIT",
                  desc: "Inspect certified quotations with exact character offsets, bracketed paragraphs, and cryptographic SHA-256 document hashing.",
                  href: "/app/claim-charts",
                  badge: "/app/claim-charts"
                },
                {
                  title: "Research Dossier Studio",
                  category: "LEGAL EXPORTS",
                  desc: "Generate comprehensive prior-art dossiers with statutory disclaimer notices, print-to-PDF formatting, and Markdown exports.",
                  href: "/app/dossier",
                  badge: "/app/dossier"
                }
              ].map((cap, idx) => (
                <div key={idx} className="p-6 rounded-[6px] border border-[#CBD5E1] bg-white space-y-4 hover:border-[#1E40AF] transition shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#1E40AF] uppercase">
                        {cap.category}
                      </span>
                      <span className="font-mono text-[10px] text-[#94A3B8]">{cap.badge}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#0F172A] leading-snug">
                      {cap.title}
                    </h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E2E8F0]">
                    <Link
                      href={cap.href}
                      className="text-xs font-semibold text-[#1E40AF] hover:underline inline-flex items-center gap-1 font-mono"
                    >
                      Open Capability &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION F: WHO BENEFITS */}
        <section className="py-20 md:py-28 border-b border-[#E2E8F0] bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-3">
              <span className="font-mono text-xs font-bold text-[#1E40AF] uppercase tracking-wider">
                SECTION F &bull; WHO BENEFITS
              </span>
              <h2 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
                Designed for the highest standards of patent practice.
              </h2>
              <p className="text-base text-[#475569] leading-relaxed">
                Whether formulating Section 102 novelty rejections, preparing freedom-to-operate clearances, or vetting inventions prior to filing:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  role: "Patent Prosecution Attorneys",
                  focus: "Pre-Filing & Office Action Defense",
                  desc: "Deconstruct provisional drafts and client disclosures to anticipate 35 U.S.C. § 102/103 rejections before filing, preserving patent term and drafting bulletproof claim scopes.",
                  icon: Scale
                },
                {
                  role: "Corporate IP & R&D Counsel",
                  focus: "Freedom to Operate & M&A Diligence",
                  desc: "Conduct systematic multi-jurisdiction invalidity studies, identify whitespace across competitor patent portfolios, and organize matters into confidential workspace repositories.",
                  icon: Building
                },
                {
                  role: "Patent Examiners & Searchers",
                  focus: "Prior-Art Clearance & Citation",
                  desc: "Eliminate hallucinated patent numbers and false positive matches with field-weighted BM25, dense vector search, and automated paragraph-level quotation verification.",
                  icon: UserCheck
                }
              ].map((persona, idx) => {
                const Icon = persona.icon;
                return (
                  <div key={idx} className="p-6 rounded-[6px] border border-[#CBD5E1] bg-[#FAFCFF] space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-[5px] bg-[#1E40AF] text-white flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[#0F172A]">{persona.role}</h3>
                        <p className="font-mono text-[10px] text-[#64748B]">{persona.focus}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {persona.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION G: TRUST & EVIDENCE INTEGRITY */}
        <section className="py-20 md:py-28 border-b border-[#E2E8F0] bg-[#F8F9FA]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-3xl space-y-3">
              <span className="font-mono text-xs font-bold text-[#1E40AF] uppercase tracking-wider">
                SECTION G &bull; EVIDENCE INTEGRITY & TRUST
              </span>
              <h2 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
                Forensic evidence integrity, zero retention.
              </h2>
              <p className="text-base text-[#475569] leading-relaxed">
                In patent law, hallucinated citations or approximate quotes are fatal. Our platform guarantees verbatim substring proof, exact character coordinates, cryptographic document hashes, and true in-memory Zero Data Retention.
              </p>
            </div>

            {/* Forensic Trust Architecture Schematic */}
            <ForensicTrustSchematic />
          </div>
        </section>

        {/* SECTION H: CLOSING EXPERIENCE */}
        <section className="py-24 md:py-32 bg-white relative overflow-hidden">
          <div className="absolute inset-0 drafting-grid opacity-40 pointer-events-none" />
          
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-[4px] border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-1 font-mono text-[11px] font-semibold text-[#1E40AF]">
              <span>SYSTEM RELEASE 3.2</span>
              <span className="text-[#CBD5E1]">&bull;</span>
              <span>PATENT RESEARCH INTELLIGENCE</span>
            </div>

            <h2 className="text-4xl sm:text-6xl text-[#0F172A] font-serif font-normal leading-tight">
              Execute your next prior-art investigation with complete certainty.
            </h2>

            <p className="text-base sm:text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed">
              Experience atomic claim limitation parsing, iterative multi-strategy retrieval, and certified evidence claim charts across real patent publications.
            </p>

            <div className="pt-4 flex flex-wrap justify-center gap-3.5">
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-[5px] bg-[#0F172A] px-7 py-3 text-xs font-semibold text-white hover:bg-[#1E40AF] transition shadow-xs"
              >
                Launch Search Engine <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-[5px] border border-[#CBD5E1] bg-white px-6 py-3 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition shadow-xs"
              >
                View Plans & Seats
              </Link>
            </div>

            <div className="pt-8 flex flex-wrap items-center justify-center gap-8 font-mono text-xs text-[#64748B]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
                <span>Zero Data Retention Mode</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
                <span>Verbatim Substring Proof</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#059669]" />
                <span>US, EP & WIPO Multi-Corpus</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
