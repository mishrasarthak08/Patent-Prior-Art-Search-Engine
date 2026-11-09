"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X, ArrowRight, Shield, Layers, Search, Cpu, FileText, CheckCircle2 } from "lucide-react";

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Brand Identity / Wordmark */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-[#0F172A] text-white shadow-xs group-hover:bg-[#1E40AF] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <path d="M11 8v6M8 11h6" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold tracking-tight text-[#0F172A] uppercase">
                Patent Prior-Art
              </span>
              <span className="rounded-[4px] bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#475569] border border-[#E2E8F0]">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] font-normal leading-none mt-0.5">Search & Evidence Intelligence</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 lg:flex text-[13px] font-medium text-[#475569]">
          <Link href="/product" className="transition hover:text-[#0F172A]">
            Platform
          </Link>

          {/* Solutions Dropdown */}
          <div className="relative" onMouseLeave={() => setSolutionsOpen(false)}>
            <button 
              onClick={() => setSolutionsOpen(!solutionsOpen)} 
              onMouseEnter={() => setSolutionsOpen(true)}
              className="flex items-center gap-1 transition hover:text-[#0F172A] py-1"
            >
              Solutions <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
            </button>

            {solutionsOpen && (
              <div className="absolute top-full -left-4 w-80 rounded-md border border-[#E2E8F0] bg-white p-2 shadow-lg space-y-1">
                <Link
                  href="/solutions/patent-professionals"
                  className="block rounded p-2.5 hover:bg-[#F8FAFC] transition"
                  onClick={() => setSolutionsOpen(false)}
                >
                  <div className="font-semibold text-xs text-[#0F172A]">Patent Attorneys & Agents</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Invalidity studies, 102/103 prior-art & claim defense</div>
                </Link>
                <Link
                  href="/solutions/in-house-ip"
                  className="block rounded p-2.5 hover:bg-[#F8FAFC] transition"
                  onClick={() => setSolutionsOpen(false)}
                >
                  <div className="font-semibold text-xs text-[#0F172A]">Corporate In-House Counsel</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Invention screening, freedom-to-operate & portfolio risk</div>
                </Link>
                <Link
                  href="/solutions/researchers"
                  className="block rounded p-2.5 hover:bg-[#F8FAFC] transition"
                  onClick={() => setSolutionsOpen(false)}
                >
                  <div className="font-semibold text-xs text-[#0F172A]">R&D & Engineering Teams</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Pre-filing state-of-the-art discovery across literature</div>
                </Link>
              </div>
            )}
          </div>

          {/* Features Dropdown */}
          <div className="relative" onMouseLeave={() => setFeaturesOpen(false)}>
            <button 
              onClick={() => setFeaturesOpen(!featuresOpen)} 
              onMouseEnter={() => setFeaturesOpen(true)}
              className="flex items-center gap-1 transition hover:text-[#0F172A] py-1"
            >
              Capabilities <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
            </button>

            {featuresOpen && (
              <div className="absolute top-full -left-4 w-72 rounded-md border border-[#E2E8F0] bg-white p-2 shadow-lg space-y-1">
                <Link
                  href="/features/claim-analysis"
                  className="block rounded p-2.5 hover:bg-[#F8FAFC] transition"
                  onClick={() => setFeaturesOpen(false)}
                >
                  <div className="font-semibold text-xs text-[#0F172A]">Claim Decomposition</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Automated preamble & limitation tree extraction</div>
                </Link>
                <Link
                  href="/features/prior-art-search"
                  className="block rounded p-2.5 hover:bg-[#F8FAFC] transition"
                  onClick={() => setFeaturesOpen(false)}
                >
                  <div className="font-semibold text-xs text-[#0F172A]">Hybrid Retrieval</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">BM25 + Qdrant vectors + Cohere reranking</div>
                </Link>
                <Link
                  href="/features/evidence-mapping"
                  className="block rounded p-2.5 hover:bg-[#F8FAFC] transition"
                  onClick={() => setFeaturesOpen(false)}
                >
                  <div className="font-semibold text-xs text-[#0F172A]">Evidence Verification</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Certified verbatim substring quotation checks</div>
                </Link>
                <Link
                  href="/features/research-workspace"
                  className="block rounded p-2.5 hover:bg-[#F8FAFC] transition"
                  onClick={() => setFeaturesOpen(false)}
                >
                  <div className="font-semibold text-xs text-[#0F172A]">Research Workspaces</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Matters, saved citations & multi-format export</div>
                </Link>
              </div>
            )}
          </div>

          <Link href="/how-it-works" className="transition hover:text-[#0F172A]">
            How It Works
          </Link>
          <Link href="/pricing" className="transition hover:text-[#0F172A]">
            Pricing
          </Link>
          <Link href="/security" className="transition hover:text-[#0F172A]">
            Security
          </Link>
          <Link href="/documentation" className="transition hover:text-[#0F172A]">
            Docs
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="text-[13px] font-medium text-[#475569] hover:text-[#0F172A] px-3 py-1.5 transition"
          >
            Sign In
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#0F172A] px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-[#1E40AF] transition-colors shadow-xs"
          >
            Launch Search Engine <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-1.5 text-[#475569] hover:text-[#0F172A]"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-[#E2E8F0] bg-white p-6 lg:hidden space-y-4 shadow-lg">
          <div className="space-y-2">
            <Link
              href="/product"
              className="block py-2 text-sm font-medium text-[#0F172A]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Platform Overview
            </Link>
            <Link
              href="/how-it-works"
              className="block py-2 text-sm font-medium text-[#0F172A]"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="/features/claim-analysis"
              className="block py-2 text-sm font-medium text-[#0F172A]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Claim Decomposition
            </Link>
            <Link
              href="/pricing"
              className="block py-2 text-sm font-medium text-[#0F172A]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing & Plans
            </Link>
            <Link
              href="/security"
              className="block py-2 text-sm font-medium text-[#0F172A]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Confidentiality & Security
            </Link>
            <Link
              href="/documentation"
              className="block py-2 text-sm font-medium text-[#0F172A]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Documentation
            </Link>
          </div>
          <div className="pt-4 border-t border-[#E2E8F0] flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full text-center py-2 text-sm font-semibold rounded border border-[#E2E8F0] text-[#0F172A]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/app"
              className="w-full text-center py-2 text-sm font-semibold rounded bg-[#0F172A] text-white hover:bg-[#1E40AF]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Launch Search Engine
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
