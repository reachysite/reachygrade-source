"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, type InvitationCode } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GraduationCap,
  Plus,
  Users,
  Shield,
  LogOut,
  KeyRound,
  Trash2,
  Ban,
  CheckCircle2,
  Copy,
  LayoutDashboard,
  Send,
  PanelLeftClose,
  PanelLeft,
  Menu,
  UserPlus,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  UserCog,
  Mail,
  CalendarDays,
  ArrowLeft,
  ClipboardList,
  Settings,
  AlertOctagon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AdminStats {
  totalStudents: number;
  totalTeachers: number;
  totalCodes: number;
  activeCodes: number;
  totalAssignments: number;
  totalSubmissions: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count?: { assignments: number; submissions: number };
  receivedSubmissions?: number;
}

interface AdminAssignment {
  id: string;
  title: string;
  description: string;
  totalMarks: number;
  dueDate: string | null;
  createdAt: string;
  teacher: { id: string; name: string; email: string };
  _count: { submissions: number };
}

interface AdminSubmission {
  id: string;
  content: string;
  fileName: string;
  fileType: string;
  autoGrade: number | null;
  autoFeedback: string | null;
  teacherGrade: number | null;
  teacherFeedback: string | null;
  createdAt: string;
  student: { id: string; name: string; email: string };
  assignment: { id: string; title: string; totalMarks: number; teacher: { name: string } };
}

type AdminView = "dashboard" | "codes" | "users" | "students" | "teachers" | "assignments" | "submissions" | "settings";

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
};

export default function AdminDashboard() {
  const { user, logout } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState<{ maxUses: string; expiresInDays: string }>({
    maxUses: "1",
    expiresInDays: "30",
  });
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);

  const fetchCodes = useCallback(async () => {
    try {
      const res = await fetch("/api/invitation-codes");
      const data = await res.json();
      if (res.ok) setCodes(data.codes);
    } catch (err) {
      console.error("Failed to fetch codes:", err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok) setUsers(data.users);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (res.ok) setStats(data.stats);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/assignments");
      const data = await res.json();
      if (res.ok) setAssignments(data.assignments);
    } catch (err) {
      console.error("Failed to fetch assignments:", err);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/submissions");
      const data = await res.json();
      if (res.ok) setSubmissions(data.submissions);
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchCodes(), fetchStats(), fetchUsers(), fetchAssignments(), fetchSubmissions()]);
      setIsLoading(false);
    };
    loadAll();
  }, [fetchCodes, fetchStats, fetchUsers, fetchAssignments, fetchSubmissions]);

  const handleCreateCode = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/invitation-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxUses: parseInt(newCode.maxUses) || 1,
          expiresInDays: parseInt(newCode.expiresInDays) || 30,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create code");
        return;
      }
      setShowCreateDialog(false);
      setNewCode({ maxUses: "1", expiresInDays: "30" });
      await fetchCodes();
      await fetchStats();
      toast.success(`Code created: ${data.code.code}`);
    } catch {
      setError("Failed to create code");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleCode = async (code: InvitationCode) => {
    try {
      const res = await fetch("/api/invitation-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: code.id, isActive: !code.isActive }),
      });
      if (res.ok) {
        await fetchCodes();
        await fetchStats();
        toast.success(code.isActive ? "Code deactivated" : "Code activated");
      }
    } catch {}
  };

  const handleDeleteCode = async (code: InvitationCode) => {
    if (!confirm(`Delete code ${code.code}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/invitation-codes?id=${code.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchCodes();
        await fetchStats();
        toast.success("Code deleted");
      }
    } catch {}
  };

  const handleCopyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Code copied to clipboard!");
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([fetchCodes(), fetchStats(), fetchUsers(), fetchAssignments(), fetchSubmissions()]);
    setIsLoading(false);
    toast.success("Data refreshed");
  };

  const [isResetting, setIsResetting] = useState(false);

  const handleSelectiveReset = async (targets: string[]) => {
    const labels = targets.map((t) =>
      t === "teachers" ? "Teachers" :
      t === "students" ? "Students" :
      t === "assignments" ? "Assignments" :
      t === "submissions" ? "Submissions" :
      t === "codes" ? "Invitation Codes" : t
    );

    if (!confirm(`Are you sure you want to reset: ${labels.join(", ")}?\n\nThis action CANNOT be undone.`)) return;
    if (!confirm("FINAL WARNING: This data will be permanently deleted. Click OK to proceed.")) return;

    setIsResetting(true);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset data");
        return;
      }
      toast.success(data.message);
      await Promise.all([fetchCodes(), fetchStats(), fetchUsers(), fetchAssignments(), fetchSubmissions()]);
    } catch {
      toast.error("Failed to reset data");
    } finally {
      setIsResetting(false);
    }
  };

  const sidebarItems = [
    { id: "dashboard" as AdminView, label: "Dashboard", icon: LayoutDashboard },
    { id: "students" as AdminView, label: "Students", icon: GraduationCap },
    { id: "teachers" as AdminView, label: "Teachers", icon: UserCog },
    { id: "codes" as AdminView, label: "Invitation Codes", icon: KeyRound },
    { id: "assignments" as AdminView, label: "Assignments", icon: ClipboardList },
    { id: "submissions" as AdminView, label: "Submissions", icon: Send },
    { id: "users" as AdminView, label: "All Users", icon: Users },
    { id: "settings" as AdminView, label: "Settings", icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-50/80 gradient-mesh">
        <div className="flex h-full">
          <div className="w-64 border-r bg-white/60 p-6 space-y-4 shrink-0">
            <Skeleton className="h-10 w-40" />
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
          <div className="flex-1 p-8 space-y-6 overflow-auto">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50/80 gradient-mesh flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-[72px]"
        } border-r border-slate-200/60 bg-white/70 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out shrink-0`}
      >
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/15">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900">
                ReachyGrade
              </span>
            </motion.div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
        <Separator className="mx-3" />
        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map((item, idx) => {
            const isActive = activeView === item.id;
            const isLast = idx === sidebarItems.length - 1;
            return (
              <div key={item.id}>
                {isLast && idx > 0 && <Separator className="my-2" />}
                <button
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "text-amber-700 bg-amber-50 shadow-sm shadow-amber-100/50"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <item.icon
                    className={`w-[18px] h-[18px] shrink-0 ${
                      isActive ? "text-amber-600" : "text-slate-400"
                    }`}
                  />
                  {sidebarOpen && <span>{item.label}</span>}
                  {sidebarOpen && isActive && (
                    <motion.div
                      layoutId="admin-sidebar-active"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500"
                    />
                  )}
                </button>
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200/60">
          <div
            className={`flex items-center ${
              sidebarOpen ? "gap-3" : "justify-center"
            } p-2 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-amber-600 font-medium">Admin</p>
              </div>
            )}
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="w-7 h-7 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 lg:p-8 max-w-[1280px]">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm">ReachyGrade</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ====== DASHBOARD VIEW ====== */}
            {activeView === "dashboard" && (
              <motion.div key="dashboard" {...pageTransition} className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      Dashboard
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                      System overview and quick actions
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {[
                    {
                      label: "Students",
                      value: stats?.totalStudents || 0,
                      icon: GraduationCap,
                      color: "#10b981",
                      bg: "bg-emerald-50",
                      view: "students" as AdminView,
                    },
                    {
                      label: "Teachers",
                      value: stats?.totalTeachers || 0,
                      icon: UserCog,
                      color: "#8b5cf6",
                      bg: "bg-violet-50",
                      view: "teachers" as AdminView,
                    },
                    {
                      label: "Active Codes",
                      value: stats?.activeCodes || 0,
                      icon: KeyRound,
                      color: "#f59e0b",
                      bg: "bg-amber-50",
                      view: "codes" as AdminView,
                    },
                    {
                      label: "Total Codes",
                      value: stats?.totalCodes || 0,
                      icon: Send,
                      color: "#64748b",
                      bg: "bg-slate-100",
                      view: "codes" as AdminView,
                    },
                    {
                      label: "Assignments",
                      value: stats?.totalAssignments || 0,
                      icon: ClipboardList,
                      color: "#3b82f6",
                      bg: "bg-blue-50",
                      view: "assignments" as AdminView,
                    },
                    {
                      label: "Submissions",
                      value: stats?.totalSubmissions || 0,
                      icon: Send,
                      color: "#ec4899",
                      bg: "bg-pink-50",
                      view: "submissions" as AdminView,
                    },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                    >
                      <Card
                        className="border-0 shadow-sm shadow-slate-900/[0.02] card-hover overflow-hidden cursor-pointer"
                        onClick={() => setActiveView(stat.view)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                {stat.label}
                              </p>
                              <p className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
                                {stat.value}
                              </p>
                            </div>
                            <div
                              className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}
                            >
                              <stat.icon
                                className="w-4 h-4"
                                style={{ color: stat.color }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-0 shadow-sm shadow-slate-900/[0.02] card-hover overflow-hidden cursor-pointer" onClick={() => setActiveView("codes")}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200/40">
                          <KeyRound className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            Manage Invitation Codes
                          </p>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {stats?.activeCodes || 0} active codes · Generate new ones
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm shadow-slate-900/[0.02] card-hover overflow-hidden cursor-pointer" onClick={() => setActiveView("users")}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-md shadow-violet-200/40">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            Manage Users
                          </p>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {(stats?.totalStudents || 0) + (stats?.totalTeachers || 0)}{" "}
                            total users · View all accounts
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* ====== INVITATION CODES VIEW ====== */}
            {activeView === "codes" && (
              <motion.div key="codes" {...pageTransition} className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      Invitation Codes
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                      Generate and manage teacher registration codes
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-200/50 hidden sm:flex"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Generate Code
                  </Button>
                </div>

                <Card className="border-0 shadow-sm shadow-slate-900/[0.02] overflow-hidden">
                  <CardHeader className="pb-3 px-6 pt-5 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-500" /> All Codes
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-amber-100 text-amber-700 border-0"
                      >
                        {codes.length} total
                      </Badge>
                    </CardTitle>
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm sm:hidden"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="px-6 pb-5">
                    {codes.length === 0 ? (
                      <div className="text-center py-12">
                        <KeyRound className="w-12 h-12 mx-auto text-amber-200 mb-3" />
                        <p className="font-semibold text-slate-500">
                          No invitation codes yet
                        </p>
                        <p className="text-sm text-slate-400 mt-1 mb-5">
                          Generate codes to allow teachers to register
                        </p>
                        <Button
                          onClick={() => setShowCreateDialog(true)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/50"
                        >
                          <Plus className="w-4 h-4 mr-2" /> Generate First Code
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent">
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Code
                              </TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                                Status
                              </TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Usage
                              </TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                                Expires
                              </TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                                Created By
                              </TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {codes.map((code) => {
                              const isExpired =
                                code.expiresAt && new Date() > new Date(code.expiresAt);
                              const isDepleted = code.usedCount >= code.maxUses;
                              const isUsable =
                                code.isActive && !isExpired && !isDepleted;

                              return (
                                <TableRow
                                  key={code.id}
                                  className={`border-slate-100 ${!isUsable ? "opacity-60" : ""}`}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <code className="text-sm font-mono font-bold tracking-wider text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                                        {code.code}
                                      </code>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400 hover:text-slate-600"
                                        onClick={() =>
                                          handleCopyCode(code.code, code.id)
                                        }
                                      >
                                        {copiedId === code.id ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5" />
                                        )}
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    {isUsable ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                                      </Badge>
                                    ) : isExpired ? (
                                      <Badge className="bg-red-100 text-red-600 border-0 text-[10px]">
                                        <Clock className="w-3 h-3 mr-1" /> Expired
                                      </Badge>
                                    ) : isDepleted ? (
                                      <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px]">
                                        <AlertTriangle className="w-3 h-3 mr-1" /> Used Up
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px]">
                                        <Ban className="w-3 h-3 mr-1" /> Disabled
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm font-medium text-slate-700">
                                      {code.usedCount}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {" "}
                                      / {code.maxUses}
                                    </span>
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          isDepleted ? "bg-red-400" : "bg-amber-400"
                                        }`}
                                        style={{
                                          width: `${Math.min(
                                            (code.usedCount / code.maxUses) * 100,
                                            100
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell text-xs text-slate-400">
                                    {code.expiresAt
                                      ? format(new Date(code.expiresAt), "MMM d, yyyy")
                                      : "Never"}
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                                    {code.creator?.name}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleCode(code)}
                                        className={`h-7 w-7 p-0 ${
                                          code.isActive
                                            ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                        }`}
                                      >
                                        {code.isActive ? (
                                          <EyeOff className="w-3.5 h-3.5" />
                                        ) : (
                                          <Eye className="w-3.5 h-3.5" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteCode(code)}
                                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Info Box */}
                <Card className="border border-amber-200/60 bg-gradient-to-r from-amber-50/60 to-orange-50/40 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          How Invitation Codes Work
                        </p>
                        <ul className="text-xs text-slate-500 mt-1.5 space-y-1">
                          <li className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-amber-400" />
                            Generate codes to allow teachers to register
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-amber-400" />
                            Share codes securely with authorized teachers
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-amber-400" />
                            Students can register freely — no code needed
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-amber-400" />
                            Deactivate or delete codes anytime to revoke access
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ====== USERS VIEW ====== */}
            {activeView === "users" && (
              <motion.div key="users" {...pageTransition} className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      Users
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                      View and manage all system users
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </Button>
                </div>

                {/* Role Filter Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "Students",
                      value: users.filter((u) => u.role === "STUDENT").length,
                      icon: GraduationCap,
                      color: "#10b981",
                      bg: "bg-emerald-50",
                    },
                    {
                      label: "Teachers",
                      value: users.filter((u) => u.role === "TEACHER").length,
                      icon: UserCog,
                      color: "#8b5cf6",
                      bg: "bg-violet-50",
                    },
                    {
                      label: "Admins",
                      value: users.filter((u) => u.role === "ADMIN").length,
                      icon: Shield,
                      color: "#f59e0b",
                      bg: "bg-amber-50",
                    },
                  ].map((stat) => (
                    <Card
                      key={stat.label}
                      className="border-0 shadow-sm shadow-slate-900/[0.02] overflow-hidden"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}
                          >
                            <stat.icon
                              className="w-5 h-5"
                              style={{ color: stat.color }}
                            />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-slate-900">
                              {stat.value}
                            </p>
                            <p className="text-xs text-slate-400">{stat.label}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Users Table */}
                <Card className="border-0 shadow-sm shadow-slate-900/[0.02] overflow-hidden">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-violet-500" /> All Users
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-slate-100 text-slate-600 border-0"
                      >
                        {users.length} total
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-5">
                    {users.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                        <p className="font-semibold text-slate-500">No users found</p>
                        <p className="text-sm text-slate-400 mt-1">
                          Users will appear here once they register
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent">
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                User
                              </TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                                Email
                              </TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Role
                              </TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
                                Joined
                              </TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                                Activity
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((u) => (
                              <TableRow key={u.id} className="border-slate-100">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                        u.role === "ADMIN"
                                          ? "bg-gradient-to-br from-amber-400 to-orange-500"
                                          : u.role === "TEACHER"
                                            ? "bg-gradient-to-br from-violet-400 to-purple-500"
                                            : "bg-gradient-to-br from-emerald-400 to-teal-500"
                                      }`}
                                    >
                                      <span className="text-white text-xs font-bold">
                                        {u.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-slate-800">
                                        {u.name}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-sm text-slate-500">
                                  {u.email}
                                </TableCell>
                                <TableCell>
                                  {u.role === "ADMIN" ? (
                                    <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">
                                      <Shield className="w-3 h-3 mr-1" /> Admin
                                    </Badge>
                                  ) : u.role === "TEACHER" ? (
                                    <Badge className="bg-violet-100 text-violet-700 border-0 text-[10px]">
                                      <UserCog className="w-3 h-3 mr-1" /> Teacher
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">
                                      <GraduationCap className="w-3 h-3 mr-1" /> Student
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs text-slate-400">
                                  {format(new Date(u.createdAt), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  <div className="flex items-center gap-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <LayoutDashboard className="w-3 h-3" />
                                      {u._count?.assignments || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Send className="w-3 h-3" />
                                      {u._count?.submissions || 0}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ====== STUDENTS VIEW ====== */}
            {activeView === "students" && (
              <motion.div key="students" {...pageTransition} className="space-y-6">
                <Button variant="ghost" size="sm" onClick={() => setActiveView("dashboard")} className="gap-2 text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Button>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students</h1>
                  <p className="text-slate-500 text-sm mt-1">All registered student accounts</p>
                </div>

                <Card className="border-0 shadow-sm shadow-slate-900/[0.02] overflow-hidden">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-500" /> All Students
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 border-0">
                        {users.filter((u) => u.role === "STUDENT").length} total
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-5">
                    {users.filter((u) => u.role === "STUDENT").length === 0 ? (
                      <div className="text-center py-12">
                        <GraduationCap className="w-12 h-12 mx-auto text-emerald-200 mb-3" />
                        <p className="font-semibold text-slate-500">No students found</p>
                        <p className="text-sm text-slate-400 mt-1">Students will appear here once they register</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent">
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Email</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Joined</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Submissions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users
                              .filter((u) => u.role === "STUDENT")
                              .map((u) => (
                                <TableRow key={u.id} className="border-slate-100">
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                                        <span className="text-white text-xs font-bold">{u.name.charAt(0).toUpperCase()}</span>
                                      </div>
                                      <p className="text-sm font-medium text-slate-800">{u.name}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell text-sm text-slate-500">{u.email}</TableCell>
                                  <TableCell className="hidden md:table-cell text-xs text-slate-400">
                                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    <span className="text-xs font-medium text-slate-600">{u._count?.submissions || 0}</span>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ====== TEACHERS VIEW ====== */}
            {activeView === "teachers" && (
              <motion.div key="teachers" {...pageTransition} className="space-y-6">
                <Button variant="ghost" size="sm" onClick={() => setActiveView("dashboard")} className="gap-2 text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Button>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teachers</h1>
                  <p className="text-slate-500 text-sm mt-1">All registered teacher accounts</p>
                </div>

                <Card className="border-0 shadow-sm shadow-slate-900/[0.02] overflow-hidden">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <UserCog className="w-4 h-4 text-violet-500" /> All Teachers
                      <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 border-0">
                        {users.filter((u) => u.role === "TEACHER").length} total
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-5">
                    {users.filter((u) => u.role === "TEACHER").length === 0 ? (
                      <div className="text-center py-12">
                        <UserCog className="w-12 h-12 mx-auto text-violet-200 mb-3" />
                        <p className="font-semibold text-slate-500">No teachers found</p>
                        <p className="text-sm text-slate-400 mt-1">Teachers will appear here once they register with an invitation code</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent">
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Email</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Joined</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Assignments</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Submissions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users
                              .filter((u) => u.role === "TEACHER")
                              .map((u) => (
                                <TableRow key={u.id} className="border-slate-100">
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0">
                                        <span className="text-white text-xs font-bold">{u.name.charAt(0).toUpperCase()}</span>
                                      </div>
                                      <p className="text-sm font-medium text-slate-800">{u.name}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell text-sm text-slate-500">{u.email}</TableCell>
                                  <TableCell className="hidden md:table-cell text-xs text-slate-400">
                                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    <span className="text-xs font-medium text-slate-600">{u._count?.assignments || 0}</span>
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    <span className="text-xs font-medium text-slate-600">{u.receivedSubmissions ?? 0}</span>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ====== ASSIGNMENTS VIEW ====== */}
            {activeView === "assignments" && (
              <motion.div key="assignments" {...pageTransition} className="space-y-6">
                <Button variant="ghost" size="sm" onClick={() => setActiveView("dashboard")} className="gap-2 text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Button>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assignments</h1>
                  <p className="text-slate-500 text-sm mt-1">All assignments across the system</p>
                </div>

                <Card className="border-0 shadow-sm shadow-slate-900/[0.02] overflow-hidden">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-blue-500" /> All Assignments
                      <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 border-0">
                        {assignments.length} total
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-5">
                    {assignments.length === 0 ? (
                      <div className="text-center py-12">
                        <ClipboardList className="w-12 h-12 mx-auto text-blue-200 mb-3" />
                        <p className="font-semibold text-slate-500">No assignments found</p>
                        <p className="text-sm text-slate-400 mt-1">Assignments will appear here once teachers create them</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent">
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Teacher</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Total Marks</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Submissions</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Due Date</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Created</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assignments.map((a) => (
                              <TableRow key={a.id} className="border-slate-100">
                                <TableCell>
                                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0">
                                      <span className="text-white text-[10px] font-bold">{a.teacher.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <span className="text-sm text-slate-500">{a.teacher.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-sm text-slate-600">{a.totalMarks}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-0">
                                    {a._count.submissions}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-xs text-slate-400">
                                  {a.dueDate ? format(new Date(a.dueDate), "MMM d, yyyy") : (
                                    <span className="text-slate-300">No deadline</span>
                                  )}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-xs text-slate-400">
                                  {format(new Date(a.createdAt), "MMM d, yyyy")}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ====== SUBMISSIONS VIEW ====== */}
            {activeView === "submissions" && (
              <motion.div key="submissions" {...pageTransition} className="space-y-6">
                <Button variant="ghost" size="sm" onClick={() => setActiveView("dashboard")} className="gap-2 text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Button>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Submissions</h1>
                  <p className="text-slate-500 text-sm mt-1">All student submissions across the system</p>
                </div>

                <Card className="border-0 shadow-sm shadow-slate-900/[0.02] overflow-hidden">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Send className="w-4 h-4 text-pink-500" /> All Submissions
                      <Badge variant="secondary" className="text-[10px] bg-pink-100 text-pink-700 border-0">
                        {submissions.length} total
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-5">
                    {submissions.length === 0 ? (
                      <div className="text-center py-12">
                        <Send className="w-12 h-12 mx-auto text-pink-200 mb-3" />
                        <p className="font-semibold text-slate-500">No submissions found</p>
                        <p className="text-sm text-slate-400 mt-1">Submissions will appear here once students submit work</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-100 hover:bg-transparent">
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Assignment</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">File</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Grade</TableHead>
                              <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Submitted</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {submissions.map((s) => {
                              const grade = s.teacherGrade ?? s.autoGrade;
                              const totalMarks = s.assignment.totalMarks;
                              return (
                                <TableRow key={s.id} className="border-slate-100">
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                                        <span className="text-white text-[10px] font-bold">{s.student.name.charAt(0).toUpperCase()}</span>
                                      </div>
                                      <span className="text-sm font-medium text-slate-800">{s.student.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <div>
                                      <p className="text-sm text-slate-700">{s.assignment.title}</p>
                                      <p className="text-[11px] text-slate-400">by {s.assignment.teacher.name}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-slate-500">{s.fileName || s.fileType}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    {grade !== null ? (
                                      <Badge className={`border-0 text-[10px] ${
                                        grade >= totalMarks * 0.8
                                          ? "bg-emerald-100 text-emerald-700"
                                          : grade >= totalMarks * 0.5
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-red-100 text-red-600"
                                      }`}>
                                        {grade}/{totalMarks}
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px]">Pending</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell text-xs text-slate-400">
                                    {format(new Date(s.createdAt), "MMM d, yyyy")}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ====== SETTINGS VIEW ====== */}
            {activeView === "settings" && (
              <motion.div key="settings" {...pageTransition} className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
                  <p className="text-slate-500 text-sm mt-1">System administration and data management</p>
                </div>

                {/* System Info */}
                <Card className="border-0 shadow-sm shadow-slate-900/[0.02] overflow-hidden">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-500" /> System Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-5">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { label: "Students", value: stats?.totalStudents || 0, icon: GraduationCap, color: "#10b981", bg: "bg-emerald-50" },
                        { label: "Teachers", value: stats?.totalTeachers || 0, icon: UserCog, color: "#8b5cf6", bg: "bg-violet-50" },
                        { label: "Assignments", value: stats?.totalAssignments || 0, icon: ClipboardList, color: "#3b82f6", bg: "bg-blue-50" },
                        { label: "Submissions", value: stats?.totalSubmissions || 0, icon: Send, color: "#ec4899", bg: "bg-pink-50" },
                        { label: "Invitation Codes", value: stats?.totalCodes || 0, icon: KeyRound, color: "#f59e0b", bg: "bg-amber-50" },
                        { label: "Admins", value: users.filter((u) => u.role === "ADMIN").length, icon: Shield, color: "#f59e0b", bg: "bg-amber-50" },
                      ].map((stat) => (
                        <div key={stat.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80">
                          <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                            <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-slate-900">{stat.value}</p>
                            <p className="text-[11px] text-slate-400">{stat.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Selective Reset */}
                <Card className="border border-red-200/60 bg-gradient-to-r from-red-50/60 to-orange-50/40 overflow-hidden">
                  <CardHeader className="pb-3 px-6 pt-5">
                    <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 text-red-500" /> Data Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-5 space-y-4">
                    <p className="text-xs text-slate-500">
                      Select which data to reset. Your admin account will always be kept safe.
                    </p>

                    <div className="space-y-3">
                      {[
                        {
                          key: "teachers" as const,
                          label: "Teachers",
                          desc: "Delete all teacher accounts, their assignments, and submissions on those assignments",
                          icon: UserCog,
                          color: "#8b5cf6",
                          bg: "bg-violet-50",
                          border: "border-violet-200",
                          count: stats?.totalTeachers || 0,
                        },
                        {
                          key: "students" as const,
                          label: "Students",
                          desc: "Delete all student accounts and their submissions",
                          icon: GraduationCap,
                          color: "#10b981",
                          bg: "bg-emerald-50",
                          border: "border-emerald-200",
                          count: stats?.totalStudents || 0,
                        },
                        {
                          key: "assignments" as const,
                          label: "Assignments",
                          desc: "Delete all assignments and their submissions",
                          icon: ClipboardList,
                          color: "#3b82f6",
                          bg: "bg-blue-50",
                          border: "border-blue-200",
                          count: stats?.totalAssignments || 0,
                        },
                        {
                          key: "submissions" as const,
                          label: "Submissions",
                          desc: "Delete all submission records only (keeps users and assignments intact)",
                          icon: Send,
                          color: "#ec4899",
                          bg: "bg-pink-50",
                          border: "border-pink-200",
                          count: stats?.totalSubmissions || 0,
                        },
                        {
                          key: "codes" as const,
                          label: "Invitation Codes",
                          desc: "Delete all invitation codes (teachers can no longer register with existing codes)",
                          icon: KeyRound,
                          color: "#f59e0b",
                          bg: "bg-amber-50",
                          border: "border-amber-200",
                          count: stats?.totalCodes || 0,
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border ${item.border} ${item.bg}/60`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                              <item.icon className="w-5 h-5" style={{ color: item.color }} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                                <Badge variant="secondary" className="text-[10px] bg-white/80 text-slate-600 border-0">
                                  {item.count} current
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 max-w-sm">{item.desc}</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleSelectiveReset([item.key])}
                            disabled={isResetting || item.count === 0}
                            variant="outline"
                            className={`border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 shrink-0 gap-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {isResetting ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                <div className="w-3 h-3 border-2 border-red-200 border-t-red-500 rounded-full" />
                              </motion.div>
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Reset
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Reset All */}
                    <div className="pt-2">
                      <Separator className="bg-red-200/50 mb-4" />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-red-300/80 bg-red-100/40">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <AlertOctagon className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-800">Reset Everything</p>
                            <p className="text-xs text-red-600/70 mt-0.5 max-w-sm">
                              Delete ALL teachers, students, assignments, submissions, and invitation codes at once. Only your admin account is kept.
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSelectiveReset(["teachers", "students", "assignments", "submissions", "codes"])}
                          disabled={isResetting}
                          className="bg-red-600 hover:bg-red-700 text-white shrink-0 gap-2 text-xs shadow-sm shadow-red-200/50"
                        >
                          {isResetting ? (
                            <>
                              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
                              </motion.div>
                              <span>Resetting...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              Reset All Data
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-red-100/50 border border-red-200/50">
                      <div className="flex gap-2">
                        <AlertOctagon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-red-700">Warning</p>
                          <p className="text-[11px] text-red-600/80 mt-0.5">
                            Reset operations are permanent and cannot be undone. Make sure you have any important data backed up before proceeding.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Create Code Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto border-0 shadow-2xl shadow-slate-900/[0.08]">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 -mt-6 -mx-6 mb-0 rounded-t-2xl" />
          <DialogHeader className="pt-2">
            <DialogTitle className="text-lg flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" /> Generate Invitation
              Code
            </DialogTitle>
            <DialogDescription>
              Create a code for teachers to register with
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-0">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Max Uses</Label>
              <Select
                value={newCode.maxUses}
                onValueChange={(v) => setNewCode({ ...newCode, maxUses: v })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 use (single teacher)</SelectItem>
                  <SelectItem value="5">5 uses (small group)</SelectItem>
                  <SelectItem value="10">10 uses (department)</SelectItem>
                  <SelectItem value="50">50 uses (large group)</SelectItem>
                  <SelectItem value="100">100 uses (unlimited)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Expires In</Label>
              <Select
                value={newCode.expiresInDays}
                onValueChange={(v) =>
                  setNewCode({ ...newCode, expiresInDays: v })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCode}
              disabled={creating}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-200/50"
            >
              {creating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  </motion.div>
                  <span className="ml-2">Generating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-2" /> Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
