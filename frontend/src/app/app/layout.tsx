"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Briefcase,
  Layers,
  CheckCircle2,
  GitCompare,
  Bookmark,
  Users,
  Shield,
  Settings,
  LogOut,
  ExternalLink,
  Lock,
  Plus,
  Home,
  FileCheck,
  ChevronDown,
  ChevronRight,
  Share2,
  Activity,
  FileText,
  Building,
  User as UserIcon,
  Check,
  Sparkles,
  X,
} from "lucide-react";
import CommandPalette from "@/components/CommandPalette";
import {
  getStoredUser,
  clearAuthSession,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  fetchApi,
  setAuthSession,
  getStoredToken,
} from "@/lib/api";

interface WorkspaceItem {
  id: string;
  org_id?: string | null;
  name: string;
  description?: string | null;
  workspace_type: "PERSONAL" | "ORGANIZATION";
  is_default: boolean;
  matters_count: number;
  searches_count: number;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceItem | null>(null);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsType, setNewWsType] = useState<"ORGANIZATION" | "PERSONAL">("ORGANIZATION");

  const [userName, setUserName] = useState("Research Professional");
  const [userRole, setUserRole] = useState("ATTORNEY");
  const [userOrg, setUserOrg] = useState<string | null>(null);

  // Onboarding modal state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardDomain, setOnboardDomain] = useState("Energy & Solid-State Chemistry");
  const [onboardJurisdictions, setOnboardJurisdictions] = useState<string[]>(["US", "EP"]);
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load user profile & accessible workspaces
  const loadWorkspaces = async () => {
    try {
      const data = await fetchApi<WorkspaceItem[]>("/api/v1/workspaces");
      if (Array.isArray(data) && data.length > 0) {
        setWorkspaces(data);
        const storedWsId = getActiveWorkspaceId();
        const active = data.find((w) => w.id === storedWsId) || data[0];
        setActiveWorkspace(active);
        if (!storedWsId || storedWsId !== active.id) {
          setActiveWorkspaceId(active.id);
        }
      }
    } catch (e) {
      console.warn("Failed to load workspaces:", e);
    }
  };

  useEffect(() => {
    const u = getStoredUser();
    if (u) {
      if (u.full_name) setUserName(u.full_name);
      if (u.role) setUserRole(u.role);
      if (u.organization_name) setUserOrg(u.organization_name);
      if (u.onboarding_completed === false) {
        setShowOnboarding(true);
      }
    }
    loadWorkspaces();

    const handleWsChange = () => {
      loadWorkspaces();
    };
    window.addEventListener("patent_workspace_changed", handleWsChange);
    return () => window.removeEventListener("patent_workspace_changed", handleWsChange);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsWorkspaceMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global shortcut (⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectWorkspace = (ws: WorkspaceItem) => {
    setActiveWorkspace(ws);
    setActiveWorkspaceId(ws.id);
    setIsWorkspaceMenuOpen(false);
    // Reload page to reflect new workspace scope in all queries
    window.location.reload();
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    try {
      const created = await fetchApi<WorkspaceItem>("/api/v1/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: newWsName.trim(),
          workspace_type: newWsType,
        }),
      });
      setIsCreateModalOpen(false);
      setNewWsName("");
      await loadWorkspaces();
      handleSelectWorkspace(created);
    } catch (err: any) {
      alert(err.message || "Failed to create workspace");
    }
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardSubmitting(true);
    try {
      const updatedUser = await fetchApi("/api/v1/user/onboarding", {
        method: "POST",
        body: JSON.stringify({
          technical_domain: onboardDomain,
          preferred_jurisdictions: onboardJurisdictions,
          default_search_mode: "hybrid",
        }),
      });
      const token = getStoredToken();
      if (token) {
        setAuthSession(token, updatedUser);
      }
      setShowOnboarding(false);
    } catch (err: any) {
      console.warn("Failed onboarding:", err);
      setShowOnboarding(false);
    } finally {
      setOnboardSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  const isOwnerOrAdmin = userRole === "OWNER" || userRole === "ADMIN";

  const navSections = [
    {
      title: "RESEARCH",
      items: [
        { label: "Overview", href: "/app", icon: Home },
        { label: "Prior-Art Search", href: "/app/search", icon: Search },
        { label: "Legal Matters", href: "/app/matters", icon: Briefcase },
        { label: "Dossier Studio", href: "/app/dossier", icon: FileText },
      ],
    },
    {
      title: "DISCOVERY & GRAPH",
      items: [
        { label: "Corpus Coverage", href: "/app/corpus", icon: Layers },
        { label: "Knowledge Graph", href: "/app/graph", icon: Share2 },
        { label: "Patent Explorer", href: "/app/explorer", icon: Layers },
        { label: "Saved Publications", href: "/app/saved", icon: Bookmark },
      ],
    },
    {
      title: "EVIDENCE & CHARTS",
      items: [
        { label: "Evidence Claim Charts", href: "/app/claim-charts", icon: FileCheck },
        { label: "Comparative Claim Matrix", href: "/app/claim-map", icon: FileCheck },
        { label: "Patent Comparison", href: "/app/compare", icon: GitCompare },
      ],
    },
    {
      title: "ORGANIZATION & GOVERNANCE",
      items: [
        ...(isOwnerOrAdmin
          ? [{ label: "Research Eval Lab", href: "/app/eval-lab", icon: Activity }]
          : []),
        { label: "Team & Seats", href: "/app/team", icon: Users },
        { label: "Audit Non-Repudiation", href: "/app/audit", icon: Shield },
        { label: "Platform Settings", href: "/app/settings", icon: Settings },
      ],
    },
  ];

  const personalWorkspaces = workspaces.filter((w) => w.workspace_type === "PERSONAL");
  const orgWorkspaces = workspaces.filter((w) => w.workspace_type === "ORGANIZATION");

  return (
    <div className="flex h-screen w-full bg-[#F8F9FA] text-[#0F172A] font-sans overflow-hidden">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 border-r border-[#E2E8F0] bg-white flex flex-col justify-between shrink-0 shadow-xs z-20">
        <div className="overflow-y-auto">
          {/* Brand Header */}
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <Link href="/app" className="flex items-center gap-2.5 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-[5px] bg-[#0F172A] text-white shadow-xs group-hover:bg-[#1E40AF] transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div>
                <span className="font-mono text-xs font-bold tracking-tight text-[#0F172A] uppercase block">
                  Patent Prior-Art
                </span>
                <span className="text-[10px] text-[#64748B] block font-mono">Intelligence Engine</span>
              </div>
            </Link>
            <Link href="/" target="_blank" title="View Public Website" className="text-[#94A3B8] hover:text-[#0F172A] transition">
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Quick Action: New Investigation */}
          <div className="p-3 border-b border-[#E2E8F0]">
            <Link
              href="/app/search"
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-[#0F172A] hover:bg-[#1E40AF] text-white text-xs font-semibold rounded-[5px] transition shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> New Investigation
            </Link>
          </div>

          {/* Navigation Sections */}
          <div className="py-3 space-y-4">
            {navSections.map((sec) => (
              <div key={sec.title} className="px-3">
                <div className="px-2 py-1 font-mono text-[9px] font-bold tracking-wider text-[#94A3B8] uppercase">
                  {sec.title}
                </div>
                <div className="mt-1 space-y-0.5">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[5px] text-xs transition ${
                          isActive
                            ? "bg-[#EFF6FF] text-[#1E40AF] font-semibold"
                            : "text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#1E40AF]" : "text-[#94A3B8]"}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Card & Sign Out */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center justify-between text-xs">
            <div className="truncate pr-2">
              <div className="font-semibold text-[#0F172A] truncate text-[12px]">{userName}</div>
              <div className="font-mono text-[10px] text-[#64748B] uppercase">{userRole}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="text-[#94A3B8] hover:text-red-600 p-1 rounded transition cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP STATUS BAR & WORKSPACE SWITCHER */}
        <header className="h-12 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6 shrink-0 shadow-2xs relative z-30">
          {/* Interactive Workspace Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider hidden sm:inline">
                WORKSPACE:
              </span>
              <button
                onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-[5px] text-xs font-semibold text-[#0F172A] transition cursor-pointer"
                title="Switch Research Workspace"
              >
                {activeWorkspace?.workspace_type === "PERSONAL" ? (
                  <UserIcon className="h-3 w-3 text-[#64748B]" />
                ) : (
                  <Building className="h-3 w-3 text-[#1E40AF]" />
                )}
                <span className="font-mono text-[11px] max-w-[200px] truncate">
                  {activeWorkspace?.name || "Personal Workspace"}
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-[3px] font-bold ${
                  activeWorkspace?.workspace_type === "PERSONAL"
                    ? "bg-[#F1F5F9] text-[#475569]"
                    : "bg-[#EFF6FF] text-[#1E40AF]"
                }`}>
                  {activeWorkspace?.workspace_type === "PERSONAL" ? "PERSONAL" : "ORG"}
                </span>
                <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {isWorkspaceMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-[6px] bg-white border border-[#CBD5E1] shadow-lg py-2 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 font-mono text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Personal Research (Private)
                </div>
                {personalWorkspaces.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => handleSelectWorkspace(w)}
                    className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="truncate">
                      <div className="font-semibold text-[#0F172A] truncate flex items-center gap-1.5">
                        <UserIcon className="h-3 w-3 text-[#64748B]" />
                        <span>{w.name}</span>
                      </div>
                      <div className="text-[10px] text-[#64748B] font-mono pl-4.5">
                        {w.matters_count} matters • {w.searches_count} searches
                      </div>
                    </div>
                    {activeWorkspace?.id === w.id && <Check className="h-3.5 w-3.5 text-[#1E40AF] shrink-0" />}
                  </button>
                ))}

                {orgWorkspaces.length > 0 && (
                  <>
                    <div className="border-t border-[#E2E8F0] my-1.5" />
                    <div className="px-3 py-1 font-mono text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                      Organization Workspaces
                    </div>
                    {orgWorkspaces.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => handleSelectWorkspace(w)}
                        className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] flex items-center justify-between transition cursor-pointer"
                      >
                        <div className="truncate">
                          <div className="font-semibold text-[#0F172A] truncate flex items-center gap-1.5">
                            <Building className="h-3 w-3 text-[#1E40AF]" />
                            <span>{w.name}</span>
                          </div>
                          <div className="text-[10px] text-[#64748B] font-mono pl-4.5">
                            {w.matters_count} matters • {w.searches_count} searches
                          </div>
                        </div>
                        {activeWorkspace?.id === w.id && <Check className="h-3.5 w-3.5 text-[#1E40AF] shrink-0" />}
                      </button>
                    ))}
                  </>
                )}

                <div className="border-t border-[#E2E8F0] mt-1.5 pt-1.5 px-2">
                  <button
                    onClick={() => {
                      setIsWorkspaceMenuOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-[#1E40AF] hover:bg-[#EFF6FF] rounded-[4px] transition cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Create New Workspace
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Status Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 text-xs text-[#64748B] hover:text-[#0F172A] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-[5px] transition cursor-pointer"
              title="Global Omni-Search (⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="hidden md:inline text-[11px]">Omni-Search</span>
              <kbd className="font-mono text-[10px] bg-white border border-[#CBD5E1] px-1.5 py-0.2 rounded-[3px] text-[#475569]">
                ⌘K
              </kbd>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-[11px] font-mono font-semibold">
              <Lock className="h-3 w-3" />
              <span>TENANT ISOLATED</span>
            </div>
            <Link
              href="/app/search"
              className="px-3 py-1 text-xs font-semibold rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] transition"
            >
              Submit Claim
            </Link>
          </div>
        </header>

        {/* WORKSPACE VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8F9FA]">
          {children}
        </main>
      </div>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

      {/* CREATE WORKSPACE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] border border-[#CBD5E1] shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-semibold text-sm text-[#0F172A]">Create New Research Workspace</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solid-State Anodes Taskforce"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-[5px] focus:outline-none focus:border-[#1E40AF]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">Workspace Type</label>
                <select
                  value={newWsType}
                  onChange={(e) => setNewWsType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-[5px] focus:outline-none focus:border-[#1E40AF]"
                >
                  <option value="ORGANIZATION">Organization Workspace (Team Access)</option>
                  <option value="PERSONAL">Personal Workspace (Strictly Private)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#64748B] hover:text-[#0F172A] border border-[#CBD5E1] rounded-[5px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E40AF] rounded-[5px]"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW USER ONBOARDING MODAL */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[10px] border border-[#CBD5E1] shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1E40AF] uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-[#1E40AF]" />
              <span>Personalized Research Setup</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">Welcome to Patent Prior-Art Search Engine</h2>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Your private workspace has been initialized. Personalize your practice domain and jurisdictional focus to calibrate limitation retrieval models.
              </p>
            </div>

            <form onSubmit={handleCompleteOnboarding} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                  Primary Technological Domain
                </label>
                <select
                  value={onboardDomain}
                  onChange={(e) => setOnboardDomain(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-[5px] focus:outline-none focus:border-[#1E40AF]"
                >
                  <option value="Energy & Solid-State Chemistry">Energy & Solid-State Battery Chemistry</option>
                  <option value="Semiconductors & Nanotechnology">Semiconductors, GAA Nanosheets & Lithography</option>
                  <option value="Neuromorphic AI & Transformers">Neuromorphic Hardware & Sparse Transformer Architectures</option>
                  <option value="Quantum Hardware & Cryptography">Quantum Computing & Post-Quantum Cryptography</option>
                  <option value="Nanomedicine & Biotechnology">mRNA Therapeutics & Nanoparticle Delivery</option>
                  <option value="Autonomous Systems & Sensor Fusion">Autonomous Vehicles, LiDAR & Computer Vision</option>
                  <option value="General Multi-Disciplinary">General Multi-Disciplinary Engineering</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                  Filing Jurisdictions of Interest
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { code: "US", label: "US (USPTO)" },
                    { code: "EP", label: "EP (EPO)" },
                    { code: "WO", label: "WO (WIPO/PCT)" },
                    { code: "JP", label: "JP (JPO)" },
                    { code: "CN", label: "CN (CNIPA)" },
                    { code: "KR", label: "KR (KIPO)" },
                  ].map((j) => {
                    const isChecked = onboardJurisdictions.includes(j.code);
                    return (
                      <label
                        key={j.code}
                        className={`flex items-center gap-2 p-2 border rounded-[5px] cursor-pointer transition text-[11px] font-medium ${
                          isChecked
                            ? "bg-[#EFF6FF] border-[#93C5FD] text-[#1E40AF]"
                            : "bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOnboardJurisdictions([...onboardJurisdictions, j.code]);
                            } else {
                              setOnboardJurisdictions(onboardJurisdictions.filter((c) => c !== j.code));
                            }
                          }}
                          className="rounded text-[#1E40AF]"
                        />
                        <span>{j.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] font-mono">
                  You can modify preferences anytime in Settings
                </span>
                <button
                  type="submit"
                  disabled={onboardSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E40AF] rounded-[5px] transition shadow-xs disabled:opacity-50"
                >
                  {onboardSubmitting ? "Configuring..." : "Launch Investigation Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
