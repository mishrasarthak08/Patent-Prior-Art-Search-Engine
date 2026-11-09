import React from "react";
import Link from "next/link";
import { ArrowRight, Layers, Search, CheckCircle2, Database, FileText, Sliders } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function ProductOverviewPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#1E40AF] font-bold">
              PLATFORM ARCHITECTURE & CAPABILITIES
            </span>
            <h1 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
              The Patent Prior-Art Search Engine
            </h1>
            <p className="text-[#475569] text-sm sm:text-base leading-relaxed">
              An evidence-first research environment engineered for intellectual property practitioners who demand verifiable provenance, atomic claim decomposition, and transparent ranking.
            </p>
          </div>

          <div className="space-y-6">
            {/* Capability 1 */}
            <div className="surface-panel p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-xs">
              <div className="md:col-span-3 flex justify-center">
                <div className="h-16 w-16 rounded-[6px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1E40AF]">
                  <Layers className="h-8 w-8" />
                </div>
              </div>
              <div className="md:col-span-9 space-y-2">
                <span className="font-mono text-[11px] text-[#1E40AF] font-bold uppercase tracking-wider">
                  01. Claim Understanding
                </span>
                <h3 className="text-lg font-semibold text-[#0F172A]">Atomic Limitation Decomposition</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Raw patent claims are parsed into formal limitation trees preserving verbatim character offsets (<code className="text-[#0F172A] bg-[#F8FAFC] px-1 py-0.5 border border-[#E2E8F0]">start_char</code>, <code className="text-[#0F172A] bg-[#F8FAFC] px-1 py-0.5 border border-[#E2E8F0]">end_char</code>), preamble, transitional phrase (<code className="text-[#0F172A] bg-[#F8FAFC] px-1 py-0.5 border border-[#E2E8F0]">comprising</code> vs <code className="text-[#0F172A] bg-[#F8FAFC] px-1 py-0.5 border border-[#E2E8F0]">consisting of</code>), and technical entities. A deterministic heuristic fallback ensures zero pipeline failures under API throttling.
                </p>
              </div>
            </div>

            {/* Capability 2 */}
            <div className="surface-panel p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-xs">
              <div className="md:col-span-3 flex justify-center">
                <div className="h-16 w-16 rounded-[6px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1E40AF]">
                  <Search className="h-8 w-8" />
                </div>
              </div>
              <div className="md:col-span-9 space-y-2">
                <span className="font-mono text-[11px] text-[#1E40AF] font-bold uppercase tracking-wider">
                  02. Hybrid Retrieval
                </span>
                <h3 className="text-lg font-semibold text-[#0F172A]">Field-Weighted Lexical & Dense Vector Fusion</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Combines BM25 lexical search with heavy field multipliers (Title x3.0, Abstract x2.0, Claims x2.0, Description x1.0) and Qdrant dense vector retrieval, fused via Reciprocal Rank Fusion (<code className="text-[#0F172A] bg-[#F8FAFC] px-1 py-0.5 border border-[#E2E8F0]">RRF k=60</code>). Native pre-filtering isolates target CPC classifications, priority date cutoffs, and patent families.
                </p>
              </div>
            </div>

            {/* Capability 3 */}
            <div className="surface-panel p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-xs">
              <div className="md:col-span-3 flex justify-center">
                <div className="h-16 w-16 rounded-[6px] bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
              </div>
              <div className="md:col-span-9 space-y-2">
                <span className="font-mono text-[11px] text-[#059669] font-bold uppercase tracking-wider">
                  03. Evidence Mapping
                </span>
                <h3 className="text-lg font-semibold text-[#0F172A]">Zero-Hallucination Substring Verification</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Maps prior-art passages against each atomic claim limitation and categorizes support levels (<code className="text-[#0F172A] bg-[#F8FAFC] px-1 py-0.5 border border-[#E2E8F0]">DIRECTLY_SUPPORTED</code>, <code className="text-[#0F172A] bg-[#F8FAFC] px-1 py-0.5 border border-[#E2E8F0]">PARTIALLY_SUPPORTED</code>, <code className="text-[#0F172A] bg-[#F8FAFC] px-1 py-0.5 border border-[#E2E8F0]">RELATED</code>, <code className="text-[#0F172A] bg-[#F8FAFC] px-1 py-0.5 border border-[#E2E8F0]">NOT_FOUND</code>). Every quoted citation is programmatically verified as a literal substring of the authoritative patent text.
                </p>
              </div>
            </div>

            {/* Capability 4 */}
            <div className="surface-panel p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-xs">
              <div className="md:col-span-3 flex justify-center">
                <div className="h-16 w-16 rounded-[6px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#0F172A]">
                  <Database className="h-8 w-8" />
                </div>
              </div>
              <div className="md:col-span-9 space-y-2">
                <span className="font-mono text-[11px] text-[#0F172A] font-bold uppercase tracking-wider">
                  04. Persistence & Workspaces
                </span>
                <h3 className="text-lg font-semibold text-[#0F172A]">ACID Matter Relational Architecture</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Multi-tenant organizational segregation by organization and workspace IDs. All search runs, decomposed claims, candidate hits, attorney annotations, and compliance logs persist in relational tables with full foreign-key integrity.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-14 text-center">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-[5px] bg-[#0F172A] px-6 py-3 text-xs font-semibold text-white hover:bg-[#1E40AF] transition shadow-xs"
            >
              Launch Search Engine <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
