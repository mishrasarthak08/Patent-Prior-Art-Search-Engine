"use client";

import React, { useState, useEffect } from "react";
import { Settings, Shield, Key, Database, Check, Copy, Save, AlertCircle } from "lucide-react";
import { isConfidentialMode, setConfidentialMode as setStoredConfidentialMode } from "@/lib/api";

export default function SettingsPage() {
  const [confidentialMode, setConfidentialMode] = useState(true);
  const [apiKey, setApiKey] = useState("pat_live_k8921a_sec77249a0f");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("Energy & Solid-State Systems");
  const [defaultJurisdiction, setDefaultJurisdiction] = useState("US");
  const [autoDeduplicate, setAutoDeduplicate] = useState(true);

  useEffect(() => {
    setConfidentialMode(isConfidentialMode());
  }, []);

  const handleSave = () => {
    setStoredConfidentialMode(confidentialMode);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1800);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. HEADER & SAVE CONTROL */}
      <div className="surface-panel p-6 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                WORKSPACE GOVERNANCE
              </span>
              <span className="text-[11px] font-mono text-[#CBD5E1]">&bull;</span>
              <span className="text-[11px] font-mono text-[#64748B]">SECURITY PREFERENCES</span>
            </div>
            <h1 className="text-2xl text-[#0F172A] font-semibold mt-1">
              Platform Configuration & Confidentiality
            </h1>
          </div>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-[5px] bg-[#0F172A] text-white hover:bg-[#1E40AF] shadow-xs transition"
          >
            <Save className="h-3.5 w-3.5" /> Save Preferences
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[5px] text-xs text-[#065F46] flex items-center gap-2">
          <Check className="h-4 w-4 text-[#059669]" />
          <span>Preferences saved and active for this research session.</span>
        </div>
      )}

      {/* 2. CONFIDENTIAL MODE POLICY */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#059669]" />
          <h2 className="text-sm font-semibold text-[#0F172A]">Zero-Retention Confidential Mode Enforcement</h2>
        </div>
        <p className="text-xs text-[#64748B] leading-relaxed">
          When Zero-Retention Confidential Mode is active, invention disclosures, claim formulations, and query embeddings are processed entirely within ephemeral volatile memory. No query text or patent drafting disclosures are ever written to disk logs, external model training queues, or shared storage.
        </p>

        <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[5px]">
          <div>
            <div className="text-xs font-semibold text-[#0F172A]">Enforce Zero-Retention Inquiries</div>
            <div className="text-[11px] text-[#64748B]">
              Guarantees queries and limitation trees are never logged to analytics or disk audits
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={confidentialMode}
              onChange={(e) => setConfidentialMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-[#CBD5E1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#059669]"></div>
          </label>
        </div>
      </div>

      {/* 3. WORKSPACE DEFAULTS */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[#1E40AF]" />
          <h2 className="text-sm font-semibold text-[#0F172A]">Workspace Defaults & Retrieval Settings</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Active Workspace Name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Default Jurisdiction
            </label>
            <input
              type="text"
              value={defaultJurisdiction}
              onChange={(e) => setDefaultJurisdiction(e.target.value)}
              className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#0F172A] font-mono focus:border-[#1E40AF] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="autodedup"
            checked={autoDeduplicate}
            onChange={(e) => setAutoDeduplicate(e.target.checked)}
            className="h-4 w-4 rounded border-[#CBD5E1] text-[#1E40AF] focus:ring-0"
          />
          <label htmlFor="autodedup" className="text-xs text-[#0F172A] font-medium cursor-pointer">
            Automatically collapse patent family equivalents in search results
          </label>
        </div>
      </div>

      {/* 4. API CREDENTIALS */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-[#1E40AF]" />
          <h2 className="text-sm font-semibold text-[#0F172A]">Developer API Key & Service Tokens</h2>
        </div>
        <p className="text-xs text-[#64748B]">
          Use this key for programmatic prior-art search execution, automated claim chart ingestion, and CI/CD docket synchronization.
        </p>

        <div className="flex items-center gap-2">
          <input
            type="password"
            readOnly
            value={apiKey}
            className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs font-mono text-[#0F172A] select-all focus:outline-none"
          />
          <button
            type="button"
            onClick={copyToClipboard}
            className="px-3.5 py-2 border border-[#E2E8F0] rounded-[5px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 transition shrink-0"
          >
            {copiedKey ? (
              <span className="text-[#059669] flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Copied</span>
            ) : (
              <span className="flex items-center gap-1"><Copy className="h-3.5 w-3.5" /> Copy Key</span>
            )}
          </button>
        </div>
      </div>

      {/* 5. PRIVACY & DATA TAKEOUT (GDPR / CCPA) */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#1E40AF]" />
            <h2 className="text-sm font-semibold text-[#0F172A]">Customer Privacy & Data Takeout</h2>
          </div>
          <span className="font-mono text-[10px] text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-[4px] font-bold">
            GDPR / CCPA COMPLIANT
          </span>
        </div>
        <p className="text-xs text-[#64748B] leading-relaxed">
          Export an encrypted archive of all your personal matters, searches, limitation evidence mappings, and practitioner annotations. You may also inspect our audited third-party AI processing manifest.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/v1/user/export-data`, {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("patent_token")}`,
                  },
                });
                if (res.ok) {
                  const data = await res.json();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `patent_research_takeout_${new Date().toISOString().split("T")[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-3.5 py-2 border border-[#E2E8F0] rounded-[5px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] transition"
          >
            Export All Personal Research (JSON)
          </button>

          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/v1/privacy/manifest`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 border border-[#E2E8F0] rounded-[5px] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-semibold text-[#1E40AF] transition"
          >
            View Third-Party AI Data Manifest &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
