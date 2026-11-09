import React from "react";
import Link from "next/link";
import { Shield, Lock, EyeOff, FileCheck, CheckCircle2 } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#059669] font-bold">
              SECURITY & CONFIDENTIALITY
            </span>
            <h1 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
              Confidentiality First Architecture
            </h1>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              Unpublished patent disclosures represent irreplaceable intellectual property. We engineered the platform with zero-retention controls, SHA-256 telemetry masking, and strict multi-tenant isolation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="surface-panel p-6 space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-[6px] bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
                <EyeOff className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Zero-Retention Confidential Mode</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                When activated, claim submissions, queries, and extracted technical limitation texts are retained in volatile memory only during the active search session. They are never written to disk logs, database tables, or monitoring telemetry.
              </p>
            </div>

            <div className="surface-panel p-6 space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-[6px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1E40AF]">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A]">No Model Training Guarantees</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Your submitted invention disclosures, independent claims, and attorney notes are never fed back into language models, embeddings indices, or external training pipelines.
              </p>
            </div>

            <div className="surface-panel p-6 space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-[6px] bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1E40AF]">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Tenant & Matter Level Isolation</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Every research matter is segregated by organization and workspace boundaries. Foreign tenants cannot discover, query, or enumerate your research projects or saved prior-art citations.
              </p>
            </div>

            <div className="surface-panel p-6 space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-[6px] bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">
                <FileCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Non-Repudiation Audit Logs</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Full cryptographic traceability of every query execution, document view, and exported dossier to comply with regulatory corporate compliance mandates.
              </p>
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
