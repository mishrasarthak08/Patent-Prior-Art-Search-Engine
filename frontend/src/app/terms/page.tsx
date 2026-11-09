import React from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-6 space-y-8">
          <div className="border-b border-[#E2E8F0] pb-6 space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-[#1E40AF] font-bold">TERMS OF USE</span>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#0F172A] font-normal">Terms of Service & Regulatory Notice</h1>
            <p className="text-xs text-[#94A3B8] font-mono">Last Updated: November 2026 &bull; Patent Prior-Art Search Engine</p>
          </div>

          <div className="space-y-6 text-xs text-[#475569] leading-relaxed">
            <section className="space-y-2 p-4 border border-[#E2E8F0] bg-white rounded-[5px]">
              <h2 className="text-sm font-semibold text-[#0F172A]">1. Statutory Non-Legal-Advice Disclaimer</h2>
              <p className="text-[#0F172A] font-medium">
                The Patent Prior-Art Search Engine is an automated information-retrieval and decision-support platform designed to assist qualified professionals in identifying and evaluating patent literature. The platform DOES NOT provide legal advice, formal patentability opinions, invalidity determinations, or Freedom-to-Operate (FTO) clearances.
              </p>
              <p>
                No attorney-client relationship is created through your access to or use of this software. All search results, claim charts, and evidence scores must be independently reviewed and verified by a licensed patent attorney or patent agent.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">2. Scope of Algorithmic Retrieval</h2>
              <p>
                The platform provides tools for claim limitation parsing, hybrid keyword and vector retrieval, candidate reranking, and quotation verification. All outputs represent algorithmically ranked candidate literature and must be independently evaluated by qualified counsel.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">3. Permitted Use and Seat Governance</h2>
              <p>
                User accounts are designated for individual named practitioners. Sharing credentials across unauthorized external parties or attempting to bypass tenant isolation boundaries is strictly prohibited.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">4. Service Level & Operational Reliability</h2>
              <p>
                While the search engine incorporates resilient failover (such as automatic fallback from vector engines to field-weighted lexical search), uninterrupted availability is not guaranteed.
              </p>
            </section>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
