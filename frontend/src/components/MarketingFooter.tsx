import React from "react";
import Link from "next/link";
import { Shield, Scale, FileText, CheckCircle2 } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] text-xs">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-[#0F172A] text-white">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <span className="font-mono text-xs font-bold text-[#0F172A] tracking-tight uppercase">
                Patent Prior-Art Search Engine
              </span>
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-[#64748B]">
              High-precision patent information retrieval, atomic claim decomposition, and certified evidence verification for patent attorneys, patent agents, and corporate research departments.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#059669] font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Zero-Retention Confidential Mode Supported</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#0F172A]">Platform</h3>
            <ul className="mt-3.5 space-y-2 text-xs">
              <li><Link href="/product" className="hover:text-[#0F172A] transition">Architecture & Engine</Link></li>
              <li><Link href="/features/claim-analysis" className="hover:text-[#0F172A] transition">Claim Decomposition</Link></li>
              <li><Link href="/features/prior-art-search" className="hover:text-[#0F172A] transition">Hybrid IR Retrieval</Link></li>
              <li><Link href="/features/evidence-mapping" className="hover:text-[#0F172A] transition">Evidence Claim Charts</Link></li>
              <li><Link href="/pricing" className="hover:text-[#0F172A] transition">Subscription Tiers</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#0F172A]">Solutions</h3>
            <ul className="mt-3.5 space-y-2 text-xs">
              <li><Link href="/solutions/patent-professionals" className="hover:text-[#0F172A] transition">Patent Counsel</Link></li>
              <li><Link href="/solutions/in-house-ip" className="hover:text-[#0F172A] transition">In-House IP Counsel</Link></li>
              <li><Link href="/solutions/researchers" className="hover:text-[#0F172A] transition">R&D Teams</Link></li>
              <li><Link href="/how-it-works" className="hover:text-[#0F172A] transition">Research Pipeline</Link></li>
              <li><Link href="/security" className="hover:text-[#0F172A] transition">Security & Trust</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#0F172A]">Legal & Reference</h3>
            <ul className="mt-3.5 space-y-2 text-xs">
              <li><Link href="/privacy" className="hover:text-[#0F172A] transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#0F172A] transition">Terms of Service</Link></li>
              <li><Link href="/documentation" className="hover:text-[#0F172A] transition">API Documentation</Link></li>
              <li><Link href="/faq" className="hover:text-[#0F172A] transition">FAQ Knowledgebase</Link></li>
              <li><Link href="/contact" className="hover:text-[#0F172A] transition">Contact Counsel</Link></li>
            </ul>
          </div>
        </div>

        {/* Statutory Legal Notice */}
        <div className="mt-12 rounded-[6px] border border-[#E2E8F0] bg-white p-4.5 text-xs leading-relaxed text-[#64748B] shadow-xs">
          <p className="font-mono font-semibold text-[#0F172A] text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-[#1E40AF]" /> Statutory Research Notice & Regulatory Disclaimer
          </p>
          <p>
            The Patent Prior-Art Search Engine is an automated technical information-retrieval and evidence-verification research engine. It is strictly an assistive decision-support tool. It does NOT constitute legal advice, formal patentability opinions, invalidity determinations, or Freedom-to-Operate (FTO) clearances under 35 U.S.C. §§ 102/103. All claims, limitation breakdowns, citations, and claim charts produced by this system must be independently reviewed and verified by a qualified, registered patent attorney or patent agent before any filing, licensing, or litigation action.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[#E2E8F0] pt-8 sm:flex-row text-xs text-[#94A3B8]">
          <p>&copy; {new Date().getFullYear()} Patent Prior-Art Search Engine. All rights reserved.</p>
          <div className="flex gap-6 font-medium">
            <Link href="/privacy" className="hover:text-[#0F172A]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#0F172A]">Terms</Link>
            <Link href="/security" className="hover:text-[#0F172A]">Security</Link>
            <Link href="/documentation" className="hover:text-[#0F172A]">API Docs</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
