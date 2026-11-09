"use client";

import React, { useState, useEffect } from "react";
import { Download, RefreshCw, Search, Lock, Shield, Scale } from "lucide-react";
import { getApiBaseUrl, getAuthHeaders } from "@/lib/api";

interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  confidential_mode: boolean;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [confidentialOnly, setConfidentialOnly] = useState(false);

  useEffect(() => {
    fetchLogs();
    window.addEventListener("patent_workspace_changed", fetchLogs);
    return () => window.removeEventListener("patent_workspace_changed", fetchLogs);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();

      const res = await fetch(`${baseUrl}/api/v1/organization/audit-logs`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load audit logs", e);
    } finally {
      setLoading(false);
    }
  };

  const getDetailsString = (details: any): string => {
    if (!details) return "";
    if (typeof details === "string") return details;
    try {
      return JSON.stringify(details);
    } catch {
      return String(details);
    }
  };

  const exportAuditCSV = () => {
    if (logs.length === 0) return;
    const headers = ["ID", "Timestamp", "Action", "Resource Type", "Resource ID", "IP Address", "Confidential Mode", "Details"];
    const rows = logs.map((l) => [
      l.id,
      l.created_at,
      l.action,
      l.resource_type,
      l.resource_id || "",
      l.ip_address || "",
      l.confidential_mode ? "TRUE" : "FALSE",
      `"${getDetailsString(l.details).replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Patent_Search_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((log) => {
    const query = (searchQuery || "").toLowerCase().trim();
    const actionStr = (log.action || "").toLowerCase();
    const resTypeStr = (log.resource_type || "").toLowerCase();
    const resIdStr = (log.resource_id || "").toLowerCase();
    const detailsStr = getDetailsString(log.details).toLowerCase();

    const matchesSearch =
      !query ||
      actionStr.includes(query) ||
      resTypeStr.includes(query) ||
      resIdStr.includes(query) ||
      detailsStr.includes(query);

    const matchesAction = filterAction === "ALL" || log.action === filterAction;
    const matchesConfidential = !confidentialOnly || log.confidential_mode;

    return matchesSearch && matchesAction && matchesConfidential;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. HEADER & CONTROL INSTRUMENT */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-[4px]">
                NON-REPUDIATION AUDIT
              </span>
              <span className="text-[11px] font-mono text-[#CBD5E1]">&bull;</span>
              <span className="text-[11px] font-mono text-[#64748B]">REGULATORY COMPLIANCE</span>
            </div>
            <h1 className="text-2xl text-[#0F172A] font-semibold mt-1">
              Enterprise Compliance Audit Trail
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={exportAuditCSV}
              disabled={logs.length === 0}
              className="px-4 py-1.5 text-xs font-semibold rounded-[5px] bg-[#0F172A] text-white hover:bg-[#1E40AF] flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            >
              <Download className="h-3 w-3" /> Export Audit CSV
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2 relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit actions, resources, or details..."
              className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 py-1.5 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
            >
              <option value="ALL">All Event Types ({logs.length})</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center pl-2">
            <label className="flex items-center gap-2 text-xs text-[#0F172A] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confidentialOnly}
                onChange={(e) => setConfidentialOnly(e.target.checked)}
                className="rounded border-[#CBD5E1] text-[#1E40AF] focus:ring-0"
              />
              Confidential Mode Only
            </label>
          </div>
        </div>
      </div>

      {/* 2. AUDIT LOGS TABLE */}
      <div className="surface-panel overflow-hidden">
        <div className="p-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-[#0F172A]">
            {filteredLogs.length} RECORDED AUDIT EVENTS
          </span>
          <span className="text-[#94A3B8]">IMMUTABLE COMPLIANCE STORAGE</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#94A3B8]">Retrieving audit trail...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#94A3B8]">
            No audit records found matching active filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] text-[10px] uppercase tracking-wider font-mono">
                  <th className="p-3.5">Timestamp (UTC)</th>
                  <th className="p-3.5">Event Action</th>
                  <th className="p-3.5">Target Resource</th>
                  <th className="p-3.5">Security Level</th>
                  <th className="p-3.5">IP Origin</th>
                  <th className="p-3.5">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredLogs.map((log) => {
                  const detailsText = getDetailsString(log.details) || "—";
                  return (
                    <tr key={log.id} className="hover:bg-[#F8FAFC] transition">
                      <td className="p-3.5 text-[#94A3B8] whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toISOString().replace("T", " ").slice(0, 19) : "—"}
                      </td>
                      <td className="p-3.5 font-bold text-[#0F172A]">
                        <span className="badge-tech">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#0F172A]">
                        <span className="text-[#1E40AF] font-semibold">{log.resource_type}</span>
                        {log.resource_id && (
                          <span className="text-[#94A3B8] ml-1.5 text-[10px]">
                            [{log.resource_id.slice(0, 8)}]
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {log.confidential_mode ? (
                          <span className="badge-verified">
                            <Lock className="h-3 w-3" /> Zero-Retention
                          </span>
                        ) : (
                          <span className="badge-tech">
                            Standard
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[#94A3B8]">{log.ip_address || "127.0.0.1"}</td>
                      <td className="p-3.5 text-[#475569] max-w-xs truncate" title={detailsText}>
                        {detailsText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. COMPLIANCE ASSURANCE NOTICE */}
      <div className="surface-panel p-3.5 text-[11px] text-[#64748B] flex items-center gap-2">
        <Scale className="h-4 w-4 text-[#1E40AF] shrink-0" />
        <span>
          <strong>Audit Non-Repudiation Policy:</strong> All query submissions, search execution fingerprints, document views, and dossier exports are cryptographically logged with user identity and timestamp to ensure full compliance with internal IP governance requirements.
        </span>
      </div>
    </div>
  );
}
