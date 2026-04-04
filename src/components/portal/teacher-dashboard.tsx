"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, type Assignment, type Submission } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  BookOpen,
  Users,
  FileText,
  Star,
  LogOut,
  Sparkles,
  Trash2,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  Loader2,
  X,
  Save,
  TrendingUp,
  ClipboardList,
  Send,
  PanelLeftClose,
  PanelLeft,
  Menu,
  UserCheck,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface TeacherAnalytics {
  totalAssignments: number;
  totalSubmissions: number;
  averageGrade: number;
  totalStudents: number;
  gradeDistribution: { A: number; B: number; C: number; D: number; F: number };
  recentSubmissions: Submission[];
}

type Tab = "overview" | "assignments" | "submissions";

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
};

export default function TeacherDashboard() {
  const { user, assignments, submissions, setAssignments, setSubmissions, logout } = useAppStore();
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedAssignmentForFilter, setSelectedAssignmentForFilter] = useState<string>("all");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: "", description: "", modelAnswer: "", dueDate: "", totalMarks: "100",
  });
  const [gradeForm, setGradeForm] = useState({ teacherGrade: "", teacherFeedback: "" });

  const fetchAssignments = useCallback(async () => {
    const res = await fetch("/api/assignments");
    const data = await res.json();
    if (res.ok) setAssignments(data.assignments);
  }, [setAssignments]);

  const fetchSubmissions = useCallback(async (assignmentId?: string) => {
    const url = assignmentId && assignmentId !== "all" ? `/api/submissions?assignmentId=${assignmentId}` : "/api/submissions";
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) setSubmissions(data.submissions);
  }, [setSubmissions]);

  const fetchAnalytics = useCallback(async () => {
    const res = await fetch("/api/analytics");
    const data = await res.json();
    if (res.ok) setAnalytics(data.analytics);
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchAssignments(), fetchSubmissions(), fetchAnalytics()]);
      setIsLoading(false);
    };
    loadAll();
  }, [fetchAssignments, fetchSubmissions, fetchAnalytics]);

  const handleFilterChange = (value: string) => {
    setSelectedAssignmentForFilter(value);
    fetchSubmissions(value);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, totalMarks: parseInt(createForm.totalMarks) || 100, dueDate: createForm.dueDate || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create"); return; }
      setShowCreateDialog(false);
      setCreateForm({ title: "", description: "", modelAnswer: "", dueDate: "", totalMarks: "100" });
      await Promise.all([fetchAssignments(), fetchAnalytics()]);
      toast.success("Assignment created successfully!");
    } catch { setError("Failed to create assignment"); }
    finally { setCreating(false); }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Delete this assignment and all submissions?")) return;
    try {
      await fetch(`/api/assignments/${id}`, { method: "DELETE" });
      await Promise.all([fetchAssignments(), fetchSubmissions(selectedAssignmentForFilter), fetchAnalytics()]);
      toast.success("Assignment deleted");
    } catch {}
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;
    setSaving(true);
    setError("");
    try {
      const payload: { teacherGrade?: number; teacherFeedback?: string } = {};
      const gradeVal = gradeForm.teacherGrade.trim();
      if (gradeVal !== "") {
        const parsed = parseInt(gradeVal, 10);
        if (isNaN(parsed)) {
          setError("Please enter a valid number for the grade");
          setSaving(false);
          return;
        }
        payload.teacherGrade = parsed;
      }
      if (gradeForm.teacherFeedback.trim()) {
        payload.teacherFeedback = gradeForm.teacherFeedback.trim();
      }
      const res = await fetch(`/api/submissions/${selectedSubmission.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to update grade"); return; }
      setShowGradeDialog(false);
      setSelectedSubmission(null);
      toast.success("Grade updated successfully!");
      // Refresh data in background (don't block on errors)
      Promise.all([fetchSubmissions(selectedAssignmentForFilter), fetchAnalytics()]).catch(() => {});
    } catch {
      setError("Failed to update grade. Please try again.");
    } finally { setSaving(false); }
  };

  const openGradeDialog = (sub: Submission) => {
    setSelectedSubmission(sub);
    setGradeForm({ teacherGrade: sub.teacherGrade?.toString() || sub.autoGrade?.toString() || "", teacherFeedback: sub.teacherFeedback || "" });
    setError("");
    setShowGradeDialog(true);
  };

  const getGradeColor = (grade: number, total: number) => {
    const pct = (grade / total) * 100;
    if (pct >= 80) return "text-emerald-600";
    if (pct >= 60) return "text-amber-600";
    return "text-red-500";
  };

  const sidebarItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "assignments", label: "Assignments", icon: ClipboardList },
    { id: "submissions", label: "Submissions", icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-50/80 gradient-mesh">
        <div className="flex h-full">
          <div className="w-64 border-r bg-white/60 p-6 space-y-4 shrink-0">
            <Skeleton className="h-10 w-40" />
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
          <div className="flex-1 p-8 space-y-6 overflow-auto">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const totalDist = analytics?.gradeDistribution || { A: 0, B: 0, C: 0, D: 0, F: 0 };
  const distTotal = totalDist.A + totalDist.B + totalDist.C + totalDist.D + totalDist.F;

  return (
    <div className="h-screen bg-slate-50/80 gradient-mesh flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-[72px]"} border-r border-slate-200/60 bg-white/70 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out shrink-0`}>
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/15">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900">ReachyGrade</span>
            </motion.div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </Button>
        </div>
        <Separator className="mx-3" />
        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? "bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/80"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-emerald-600" : ""}`} />
                {sidebarOpen && <span>{item.label}</span>}
                {isActive && sidebarOpen && <motion.div layoutId="teacher-sidebar-active" className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200/60">
          <div className={`flex items-center ${sidebarOpen ? "gap-3" : "justify-center"} p-2 rounded-xl hover:bg-slate-100/80 transition-colors`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
            )}
            {sidebarOpen && (
              <Button variant="ghost" size="icon" onClick={logout} className="w-7 h-7 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0">
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 lg:p-8 max-w-[1280px]">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Overview */}
            {activeTab === "overview" && (
              <motion.div key="overview" {...pageTransition} className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.name?.split(" ")[0]}! Here&apos;s your teaching overview.</p>
                  </div>
                  <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-200/50 hidden sm:flex">
                    <Plus className="w-4 h-4 mr-2" /> New Assignment
                  </Button>
                  <Button onClick={() => setShowCreateDialog(true)} className="sm:hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md" size="icon">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Assignments", value: analytics?.totalAssignments || 0, icon: ClipboardList, iconColor: "#10b981", bg: "bg-emerald-50" },
                    { label: "Submissions", value: analytics?.totalSubmissions || 0, icon: FileText, iconColor: "#3b82f6", bg: "bg-blue-50" },
                    { label: "Students", value: analytics?.totalStudents || 0, icon: Users, iconColor: "#8b5cf6", bg: "bg-violet-50" },
                    { label: "Avg Grade", value: analytics?.averageGrade || 0, icon: TrendingUp, iconColor: "#f59e0b", bg: "bg-amber-50", suffix: "%" },
                  ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.08 }}>
                      <Card className="border-0 shadow-sm shadow-slate-900/[0.02] card-hover overflow-hidden">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                              <p className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{stat.value}{stat.suffix || ""}</p>
                            </div>
                            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                              <stat.icon className="w-5 h-5" style={{ color: stat.iconColor }} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-5 gap-6">
                  {/* Grade Distribution */}
                  <Card className="border-0 shadow-sm shadow-slate-900/[0.02] lg:col-span-2">
                    <CardHeader className="pb-3 px-6 pt-5">
                      <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-slate-400" /> Grade Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-5 space-y-3">
                      {[
                        { label: "Excellent (A)", range: "80-100", count: totalDist.A, color: "#10b981", bgColor: "bg-emerald-500" },
                        { label: "Good (B)", range: "60-79", count: totalDist.B, color: "#3b82f6", bgColor: "bg-blue-500" },
                        { label: "Average (C)", range: "40-59", count: totalDist.C, color: "#f59e0b", bgColor: "bg-amber-500" },
                        { label: "Below Avg (D)", range: "20-39", count: totalDist.D, color: "#f97316", bgColor: "bg-orange-500" },
                        { label: "Fail (F)", range: "0-19", count: totalDist.F, color: "#ef4444", bgColor: "bg-red-500" },
                      ].map((item) => (
                        <div key={item.label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">{item.label}</span>
                            <span className="text-slate-400">{item.count} student{item.count !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: distTotal > 0 ? `${(item.count / distTotal) * 100}%` : "0%" }}
                              transition={{ duration: 0.6, delay: 0.2 }}
                              className={`h-full rounded-full ${item.bgColor}`}
                            />
                          </div>
                        </div>
                      ))}
                      {distTotal === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">No graded submissions yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Submissions */}
                  <Card className="border-0 shadow-sm shadow-slate-900/[0.02] lg:col-span-3">
                    <CardHeader className="pb-3 px-6 pt-5">
                      <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Send className="w-4 h-4 text-slate-400" /> Recent Submissions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-5">
                      {analytics?.recentSubmissions && analytics.recentSubmissions.length > 0 ? (
                        <div className="space-y-2">
                          {analytics.recentSubmissions.map((sub, i) => {
                            const grade = sub.teacherGrade ?? sub.autoGrade;
                            const total = sub.assignment?.totalMarks || 100;
                            return (
                              <motion.div
                                key={sub.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50/80 transition-colors"
                              >
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-slate-600">{sub.student?.name?.charAt(0)}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-700 truncate">{sub.student?.name}</p>
                                  <p className="text-[11px] text-slate-400 truncate">{sub.assignment?.title} &middot; {format(new Date(sub.createdAt), "MMM d")}</p>
                                </div>
                                {grade !== null ? (
                                  <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${grade / total >= 0.8 ? "bg-emerald-50 text-emerald-600" : grade / total >= 0.6 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>
                                    {grade}<span className="text-[10px] font-normal opacity-60">/{total}</span>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-slate-400">Pending</Badge>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <UserCheck className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                          <p className="text-sm font-medium text-slate-400">No submissions yet</p>
                          <p className="text-xs text-slate-300 mt-1">Student submissions will appear here</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Assignments */}
            {activeTab === "assignments" && (
              <motion.div key="assignments" {...pageTransition} className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assignments</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your assignments</p>
                  </div>
                  <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-200/50 hidden sm:flex">
                    <Plus className="w-4 h-4 mr-2" /> New Assignment
                  </Button>
                </div>
                {assignments.length === 0 ? (
                  <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center">
                    <ClipboardList className="w-14 h-14 mx-auto text-slate-200 mb-4" />
                    <p className="font-semibold text-slate-500">No assignments yet</p>
                    <p className="text-sm text-slate-400 mt-1 mb-5">Create your first assignment to get started</p>
                    <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/50">
                      <Plus className="w-4 h-4 mr-2" /> Create Assignment
                    </Button>
                  </CardContent></Card>
                ) : (
                  <div className="grid gap-4">
                    {assignments.map((a, i) => (
                      <motion.div key={a.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                        <Card className="border-0 shadow-sm shadow-slate-900/[0.02] card-hover overflow-hidden">
                          <CardContent className="p-5 lg:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center shrink-0 border border-emerald-100/60">
                                  <BookOpen className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-slate-800">{a.title}</h3>
                                  <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{a.description}</p>
                                  <div className="flex flex-wrap items-center gap-3 mt-2.5">
                                    <Badge variant="secondary" className="text-[11px] bg-slate-100 text-slate-600 border-0">
                                      <UserCheck className="w-3 h-3 mr-1" /> {a._count?.submissions || 0} submissions
                                    </Badge>
                                    <span className="text-[11px] text-slate-400"><Star className="w-3 h-3 inline mr-0.5" />{a.totalMarks} marks</span>
                                    {a.dueDate && <span className="text-[11px] text-slate-400"><TrendingUp className="w-3 h-3 inline mr-0.5" />Due: {format(new Date(a.dueDate), "MMM d, yyyy")}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:ml-4 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setSelectedAssignmentForFilter(a.id); fetchSubmissions(a.id); setActiveTab("submissions"); }}
                                  className="border-slate-200 text-slate-600 hover:bg-slate-50"
                                >
                                  <Eye className="w-4 h-4 mr-1" /> View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteAssignment(a.id)}
                                  className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Submissions */}
            {activeTab === "submissions" && (
              <motion.div key="submissions" {...pageTransition} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Submissions</h1>
                    <p className="text-slate-500 text-sm mt-1">Review and grade student submissions</p>
                  </div>
                  <Select value={selectedAssignmentForFilter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-full sm:w-72 bg-white/80 border-slate-200/80">
                      <SelectValue placeholder="Filter by assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignments</SelectItem>
                      {assignments.map((a) => (<SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                {submissions.length === 0 ? (
                  <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center">
                    <FileText className="w-14 h-14 mx-auto text-slate-200 mb-4" />
                    <p className="font-semibold text-slate-500">No submissions found</p>
                    <p className="text-sm text-slate-400 mt-1">Submissions will appear here when students submit work</p>
                  </CardContent></Card>
                ) : (
                  <Card className="border-0 shadow-sm shadow-slate-900/[0.02] overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-100 hover:bg-transparent">
                          <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Assignment</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Grade</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Final</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</TableHead>
                          <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {submissions.map((sub) => {
                          const grade = sub.teacherGrade ?? sub.autoGrade;
                          const total = sub.assignment?.totalMarks || 100;
                          return (
                            <TableRow key={sub.id} className="border-slate-100 hover:bg-slate-50/50">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-slate-600">{sub.student?.name?.charAt(0)}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-700 truncate">{sub.student?.name}</p>
                                    <p className="text-[11px] text-slate-400 truncate hidden lg:block">{sub.student?.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <p className="text-sm text-slate-600 truncate max-w-[200px]">{sub.assignment?.title}</p>
                              </TableCell>
                              <TableCell>
                                {sub.autoGrade !== null ? (
                                  <span className={`text-sm font-bold ${getGradeColor(sub.autoGrade, total)}`}>{sub.autoGrade}/{total}</span>
                                ) : (
                                  <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                                )}
                              </TableCell>
                              <TableCell>
                                {grade !== null ? (
                                  <span className={`text-sm font-bold ${getGradeColor(grade, total)}`}>
                                    {grade}/{total}
                                    {sub.teacherGrade !== null && <span className="ml-1 text-[10px] text-violet-500 font-medium">&#10003;</span>}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">--</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-xs text-slate-400">
                                {format(new Date(sub.createdAt), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedSubmission(sub); setShowViewDialog(true); }} className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => openGradeDialog(sub)} className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50">
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Create Assignment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto border-0 shadow-2xl shadow-slate-900/[0.08]">
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 -mt-6 -mx-6 mb-0 rounded-t-2xl" />
          <DialogHeader className="pt-2">
            <DialogTitle className="text-lg">Create Assignment</DialogTitle>
            <DialogDescription>Set up a new assignment with model answer for AI grading</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAssignment} className="space-y-4">
            {error && <Alert variant="destructive" className="border-0"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Title *</Label>
              <Input placeholder="e.g., Introduction to Machine Learning" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} className="h-11" required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Description *</Label>
              <Textarea placeholder="Describe the assignment requirements..." rows={3} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Model Answer * <span className="text-slate-400 font-normal">(AI compares against this)</span></Label>
              <Textarea placeholder="Write the expected answer that students should provide..." rows={5} value={createForm.modelAnswer} onChange={(e) => setCreateForm({ ...createForm, modelAnswer: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Total Marks</Label>
                <Input type="number" min="1" max="1000" value={createForm.totalMarks} onChange={(e) => setCreateForm({ ...createForm, totalMarks: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Due Date</Label>
                <Input type="date" value={createForm.dueDate} onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })} className="h-11" />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={creating} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-200/50">
                {creating ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /></motion.div><span className="ml-2">Creating...</span></>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" /> Create</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Submission Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto border-0 shadow-2xl shadow-slate-900/[0.08]">
          {selectedSubmission && (
            <>
              <div className="h-1 bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 -mt-6 -mx-6 mb-0 rounded-t-2xl" />
              <DialogHeader className="pt-2">
                <DialogTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-600">{selectedSubmission.student?.name?.charAt(0)}</span>
                  </div>
                  {selectedSubmission.student?.name}&apos;s Submission
                </DialogTitle>
                <DialogDescription>{selectedSubmission.assignment?.title}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="text-slate-500">{selectedSubmission.fileName}</Badge>
                  <Badge variant="outline" className="text-slate-500 uppercase">{selectedSubmission.fileType}</Badge>
                  <span className="text-slate-400">{format(new Date(selectedSubmission.createdAt), "MMMM d, yyyy 'at' h:mm a")}</span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Submitted Content</p>
                  <div className="bg-slate-50 rounded-xl p-4 max-h-48 overflow-y-auto border border-slate-100">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedSubmission.content}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4 text-center">
                    <p className="text-[11px] font-semibold text-emerald-600 mb-1 flex items-center justify-center gap-1"><Sparkles className="w-3 h-3" /> AI Grade</p>
                    <p className="text-2xl font-bold text-emerald-600">{selectedSubmission.autoGrade ?? "Pending"}/<span className="text-sm">{selectedSubmission.assignment?.totalMarks || 100}</span></p>
                  </div>
                  <div className={`rounded-xl border p-4 text-center ${selectedSubmission.teacherGrade !== null ? "border-violet-100 bg-gradient-to-br from-violet-50/80 to-white" : "border-slate-100 bg-slate-50/50"}`}>
                    <p className="text-[11px] font-semibold text-violet-600 mb-1 flex items-center justify-center gap-1"><GraduationCap className="w-3 h-3" /> Teacher Grade</p>
                    <p className={`text-2xl font-bold ${selectedSubmission.teacherGrade !== null ? "text-violet-600" : "text-slate-300"}`}>{selectedSubmission.teacherGrade ?? "Not set"}/<span className="text-sm">{selectedSubmission.assignment?.totalMarks || 100}</span></p>
                  </div>
                </div>

                {selectedSubmission.autoFeedback && (
                  <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-4">
                    <p className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Feedback</p>
                    <p className="text-sm text-emerald-800/80 whitespace-pre-wrap leading-relaxed">{selectedSubmission.autoFeedback}</p>
                  </div>
                )}
                {selectedSubmission.teacherFeedback && (
                  <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-4">
                    <p className="text-xs font-semibold text-violet-600 mb-2 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Teacher Feedback</p>
                    <p className="text-sm text-violet-800/80 whitespace-pre-wrap leading-relaxed">{selectedSubmission.teacherFeedback}</p>
                  </div>
                )}
                {selectedSubmission.assignment?.modelAnswer && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Model Answer (reference)</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedSubmission.assignment.modelAnswer}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
                <Button onClick={() => { setShowViewDialog(false); openGradeDialog(selectedSubmission); }} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-200/50">
                  <Edit3 className="w-4 h-4 mr-2" /> Edit Grade
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Grade Override Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto border-0 shadow-2xl shadow-slate-900/[0.08]">
          {selectedSubmission && (
            <>
              <div className="h-1 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 -mt-6 -mx-6 mb-0 rounded-t-2xl" />
              <DialogHeader className="pt-2">
                <DialogTitle className="text-lg">Review & Override Grade</DialogTitle>
                <DialogDescription>{selectedSubmission.student?.name} &middot; {selectedSubmission.assignment?.title}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {error && <Alert variant="destructive" className="border-0"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>}
                {selectedSubmission.autoGrade !== null && (
                  <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-teal-50/60 p-3.5 flex items-center justify-between">
                    <span className="text-sm text-emerald-700 font-medium">AI Auto Grade</span>
                    <span className="font-bold text-emerald-700">{selectedSubmission.autoGrade}/{selectedSubmission.assignment?.totalMarks || 100}</span>
                  </div>
                )}
                {selectedSubmission.autoFeedback && (
                  <div className="bg-slate-50 rounded-xl p-3.5 max-h-28 overflow-y-auto border border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">AI Feedback</p>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{selectedSubmission.autoFeedback}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Override Grade <span className="text-slate-400 font-normal">(leave to keep current)</span></Label>
                  <Input type="number" min="0" max={selectedSubmission.assignment?.totalMarks || 100} placeholder={`0 - ${selectedSubmission.assignment?.totalMarks || 100}`} value={gradeForm.teacherGrade} onChange={(e) => setGradeForm({ ...gradeForm, teacherGrade: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Additional Feedback</Label>
                  <Textarea placeholder="Add your comments or suggestions..." rows={4} value={gradeForm.teacherFeedback} onChange={(e) => setGradeForm({ ...gradeForm, teacherFeedback: e.target.value })} />
                </div>
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowGradeDialog(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveGrade} disabled={saving} className="flex-1 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-md shadow-violet-200/50">
                  {saving ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /></motion.div><span className="ml-2">Saving...</span></>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save</>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
