"use client";

import React, { useState, useEffect } from "react";
import { Users, UserPlus, Shield, Mail, Key, CheckCircle, Clock, Building2, AlertCircle } from "lucide-react";
import { getApiBaseUrl, getAuthHeaders } from "@/lib/api";

interface Member {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface OrgUsage {
  period_month?: string;
  searches_count?: number;
  documents_viewed?: number;
  dossiers_exported?: number;
  max_searches?: number;
  max_exports?: number;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [usage, setUsage] = useState<OrgUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("attorney");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTeamData();
    window.addEventListener("patent_workspace_changed", fetchTeamData);
    return () => window.removeEventListener("patent_workspace_changed", fetchTeamData);
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();

      const [membersRes, usageRes] = await Promise.all([
        fetch(`${baseUrl}/api/v1/organization/members`, { headers }),
        fetch(`${baseUrl}/api/v1/organization/usage`, { headers }),
      ]);

      if (membersRes.ok) {
        setMembers(await membersRes.json());
      }
      if (usageRes.ok) {
        setUsage(await usageRes.json());
      }
    } catch (e) {
      console.error("Failed to load team data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setInviteStatus(null);

    try {
      const baseUrl = getApiBaseUrl();
      const headers = getAuthHeaders();

      const res = await fetch(`${baseUrl}/api/v1/organization/invite`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (res.ok) {
        setInviteStatus("success");
        setInviteEmail("");
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteStatus(null);
          fetchTeamData();
        }, 1500);
      } else {
        setInviteStatus("error");
      }
    } catch (err) {
      setInviteStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. HEADER & CONTROL INSTRUMENT */}
      <div className="surface-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#1E40AF] bg-[#EFF6FF] px-2 py-0.5 rounded-[4px]">
                GOVERNANCE & ACCESS
              </span>
              <span className="text-[11px] font-mono text-[#CBD5E1]">&bull;</span>
              <span className="text-[11px] font-mono text-[#64748B]">MULTI-TENANT SEATS</span>
            </div>
            <h1 className="text-2xl text-[#0F172A] font-semibold mt-1">
              Practitioner Seats & Organization Roles
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-1.5 text-xs font-semibold rounded-[5px] bg-[#0F172A] text-white hover:bg-[#1E40AF] flex items-center gap-1.5 transition shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" /> Invite Colleague
            </button>
          </div>
        </div>

        {/* Usage Overview Stats */}
        {usage && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono pt-1">
            <div className="p-3 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC]">
              <span className="text-[10px] uppercase text-[#94A3B8] block mb-0.5">Billing Period</span>
              <span className="font-bold text-sm text-[#0F172A]">{usage.period_month || "Current"}</span>
            </div>
            <div className="p-3 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC]">
              <span className="text-[10px] uppercase text-[#94A3B8] block mb-0.5">Prior-Art Searches</span>
              <span className="font-bold text-sm text-[#0F172A]">
                {usage.searches_count || 0} / {usage.max_searches || 500}
              </span>
            </div>
            <div className="p-3 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC]">
              <span className="text-[10px] uppercase text-[#94A3B8] block mb-0.5">Documents Viewed</span>
              <span className="font-bold text-sm text-[#0F172A]">
                {usage.documents_viewed || 0} Publications
              </span>
            </div>
            <div className="p-3 rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC]">
              <span className="text-[10px] uppercase text-[#94A3B8] block mb-0.5">Dossiers Exported</span>
              <span className="font-bold text-sm text-[#0F172A]">
                {usage.dossiers_exported || 0} / {usage.max_exports || 100}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. MEMBERS TABLE */}
      <div className="surface-panel overflow-hidden">
        <div className="p-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-[#0F172A]">
            {members.length} PROVISIONED SEATS
          </span>
          <span className="text-[#94A3B8]">ROLE-BASED PERMISSION ACCESS</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#94A3B8]">Loading team roster...</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#94A3B8]">No organization members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-mono text-[10px] uppercase tracking-wider">
                  <th className="p-3.5">Practitioner Name</th>
                  <th className="p-3.5">Email Identity</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5">Provisioned Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="p-3.5 font-semibold text-[#0F172A] whitespace-nowrap">
                      {m.full_name}
                    </td>
                    <td className="p-3.5 text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                      {m.email}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="badge-tech font-bold uppercase">
                        {m.role}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {m.is_active ? (
                        <span className="badge-verified">
                          Active Seat
                        </span>
                      ) : (
                        <span className="badge-tech">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-[#94A3B8] whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. INVITE MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="rounded-[6px] border border-[#E2E8F0] bg-white max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#0F172A] font-mono uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#1E40AF]" /> Invite Organization Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Practitioner Email Address *
                </label>
                <input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@patentfirm.com"
                  className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Access Level / Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs text-[#0F172A] focus:border-[#1E40AF] focus:bg-white focus:outline-none"
                >
                  <option value="attorney">Patent Attorney / Agent (Full Research Access)</option>
                  <option value="researcher">Technical Researcher / Scientist</option>
                  <option value="admin">Organization Administrator</option>
                </select>
              </div>

              {inviteStatus === "success" && (
                <div className="p-2.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[5px] text-[#065F46] text-xs">
                  Invitation dispatched successfully.
                </div>
              )}

              {inviteStatus === "error" && (
                <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-[5px] text-[#DC2626] text-xs">
                  Failed to send invitation. Check email or seat limits.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 text-xs font-medium border border-[#E2E8F0] rounded-[5px] bg-[#F8FAFC] text-[#0F172A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold rounded-[5px] bg-[#0F172A] text-white hover:bg-[#1E40AF] transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Inviting..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
