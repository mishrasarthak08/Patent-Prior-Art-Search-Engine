import React from "react";
import Link from "next/link";
import { Terminal, Code, ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function DocumentationPage() {
  const endpoints = [
    { method: "POST", path: "/api/v1/auth/login", desc: "Authenticate with practitioner credentials and retrieve JWT bearer access token" },
    { method: "POST", path: "/api/v1/auth/register", desc: "Provision a new law firm or enterprise organization and administrator user" },
    { method: "POST", path: "/api/v1/search", desc: "Submit raw invention claim, decompose limitations, and execute hybrid prior-art retrieval" },
    { method: "GET", path: "/api/v1/matters", desc: "List all persistent legal research matters filtered by status or jurisdiction" },
    { method: "POST", path: "/api/v1/matters", desc: "Create a new legal research matter container with client reference number" },
    { method: "GET", path: "/api/v1/patents/explore", desc: "Query patent database directly by publication number, keyword, or CPC code" },
    { method: "POST", path: "/api/v1/patents/compare", desc: "Perform side-by-side technical comparison between multiple patent publications" },
    { method: "GET", path: "/api/v1/searches/{id}/evidence", desc: "Retrieve verified claim-to-document limitation evidence matrix and quotation stamps" },
    { method: "POST", path: "/api/v1/searches/{id}/annotate", desc: "Add practitioner clearance notes, tags, and acceptance flags to candidates" },
    { method: "GET", path: "/api/v1/searches/{id}/export", desc: "Export research dossier in print-ready HTML, Markdown, CSV, or raw JSON" },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1 py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-[#1E40AF] font-bold">
              API SPECIFICATION & GUIDES
            </span>
            <h1 className="text-3xl sm:text-5xl text-[#0F172A] font-serif font-normal leading-tight">
              Developer Documentation
            </h1>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              Complete guides, architecture specifications, and REST API endpoints for integrating the Patent Prior-Art Search Engine into your IP practice.
            </p>
          </div>

          {/* Quickstart Curl Example */}
          <div className="surface-panel p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-[#0F172A] flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-[#1E40AF]" /> Quickstart Execution Example
              </span>
              <span className="badge-tech">BASH / CURL</span>
            </div>
            <pre className="rounded-[5px] bg-[#F8FAFC] border border-[#E2E8F0] p-4 font-mono text-xs text-[#0F172A] overflow-x-auto leading-relaxed">
{`# 1. Execute prior-art search with Bearer token or API Key
curl -X POST http://localhost:8001/api/v1/search \\
  -H "Authorization: Bearer <ACCESS_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "raw_claim": "A high-capacity lithium-ion secondary battery comprising...",
    "limit": 10,
    "confidence_threshold": 0.5,
    "enable_verification": true
  }'`}
            </pre>
          </div>

          {/* Endpoints Table */}
          <div className="surface-panel overflow-hidden shadow-xs">
            <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] font-mono text-xs font-bold text-[#0F172A]">
              CORE REST API ENDPOINTS
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {endpoints.map((ep, i) => (
                <div key={i} className="p-4 hover:bg-[#F8FAFC] transition space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="badge-tech font-bold text-[#1E40AF]">
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-semibold text-[#0F172A]">
                      {ep.path}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] pl-1">{ep.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
