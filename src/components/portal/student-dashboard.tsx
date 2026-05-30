"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, type Assignment, type Submission } from "@/store/app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  GraduationCap,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Star,
  LogOut,
  Sparkles,
  FileUp,
  X,
  BookOpen,
  Award,
  TrendingUp,
  Inbox,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeft,
  AlertTriangle,
  ShieldAlert,
  ArrowLeft,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface StudentAnalytics {
  totalAssignments: number;
  submittedCount: number;
  gradedCount: number;
  pendingCount: number;
  averageGrade: number;
}

type Tab = "overview" | "assignments" | "grades";

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
};

export default function StudentDashboard() {
  const { user, assignments, submissions, setAssignments, setSubmissions, logout } = useAppStore();
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [grading, setGrading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  // ===== 3 separate fetches — each calls a real endpoint that exists =====
  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch("/api/assignments");
      const data = await res.json();
      if (res.ok) setAssignments(data.assignments);
    } catch (err) {
      console.error("[Dashboard] Failed to fetch assignments:", err);
    }
  }, [setAssignments]);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/submissions");
      const data = await res.json();
      if (res.ok) setSubmissions(data.submissions);
    } catch (err) {
      console.error("[Dashboard] Failed to fetch submissions:", err);
    }
  }, [setSubmissions]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/student-analytics");
      const data = await res.json();
      if (res.ok) setAnalytics(data.analytics);
    } catch (err) {
      console.error("[Dashboard] Failed to fetch analytics:", err);
    }
  }, []);

  // ===== Runs all 3 in parallel for speed =====
  const fetchDashboard = useCallback(async () => {
    await Promise.all([fetchAssignments(), fetchSubmissions(), fetchAnalytics()]);
  }, [fetchAssignments, fetchSubmissions, fetchAnalytics]);

  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      setIsLoading(true);
      await fetchDashboard();
      if (!cancelled) setIsLoading(false);
    };
    loadAll();
    return () => { cancelled = true; };
  }, [fetchDashboard]);

  const handleRegrade = async (submissionId: string) => {
    setGrading(prev => ({ ...prev, [submissionId]: true }));
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, force: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Grading failed. Try again later.");
      } else {
        toast.success("Grading complete!");
      }
    } catch {
      toast.error("Grading request failed.");
    } finally {
      setGrading(prev => ({ ...prev, [submissionId]: false }));
      await fetchDashboard();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "docx", "txt"].includes(ext || "")) {
        setError("Only PDF, DOCX, and TXT files are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      setSelectedFile(file);
      setError("");
    }
  };

  const handleProceedToConfirm = () => {
    if (!selectedFile || !selectedAssignment) return;
    setShowConfirmStep(true);
    setConfirmChecked(false);
  };

  const handleBackToFileSelect = () => {
    setShowConfirmStep(false);
    setConfirmChecked(false);
  };

    const extractTextFromFile = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "txt") {
      return await file.text();
    }

    if (ext === "pdf") {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
        }
        return fullText.trim();
      } catch (err) {
        console.error("Client-side PDF extraction error:", err);
        throw new Error("Could not read PDF. Please try a TXT file instead.");
      }
    }

    if (ext === "docx") {
      try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value.trim();
      } catch (err) {
        console.error("Client-side DOCX extraction error:", err);
        throw new Error("Could not read DOCX. Please try a TXT file instead.");
      }
    }

    throw new Error("Unsupported file type");
  };

  const handleSubmitFile = async () => {
    if (!selectedFile || !selectedAssignment) return;
    setShowConfirmStep(false);
    setUploading(true);
    setError("");
    try {
      // Extract text on client side before sending to server
      const content = await extractTextFromFile(selectedFile);

      if (!content || content.trim().length === 0) {
        setError("Could not extract any text from the file. It may be empty or corrupted.");
        return;
      }

      const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "txt";

      // Send extracted text as JSON (no file parsing on server)
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAssignment.id,
          content: content.trim(),
          fileName: selectedFile.name,
          fileType: ext,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); return; }

      setUploadSuccess(true);
      toast.success("Assignment submitted! AI is grading your work...");

      setGrading(prev => ({ ...prev, [data.submission.id]: true }));
      try {
        const gradeRes = await fetch("/api/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId: data.submission.id }),
        });
        const gradeData = await gradeRes.json();
        if (!gradeRes.ok) {
          toast.error(gradeData.error || "Grading failed. Teacher will review later.");
        } else {
          toast.success("Grading complete! Check your grades.");
        }
      } catch { toast.error("Grading is taking longer than expected."); }
      finally { setGrading(prev => ({ ...prev, [data.submission.id]: false })); }

      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
    finally { setUploading(false); }
  };
  
  const getGradeColor = (grade: number, total: number) => {
    const pct = (grade / total) * 100;
    if (pct >= 80) return "text-emerald-600";
    if (pct >= 60) return "text-amber-600";
    return "text-red-500";
  };

  const getGradeBg = (grade: number, total: number) => {
    const pct = (grade / total) * 100;
    if (pct >= 80) return "bg-emerald-50 border-emerald-200/80 text-emerald-700";
    if (pct >= 60) return "bg-amber-50 border-amber-200/80 text-amber-700";
    return "bg-red-50 border-red-200/80 text-red-700";
  };

  // Memoize filtered lists
  const pendingAssignments = useMemo(
    () => assignments.filter(a => !a.hasSubmitted),
    [assignments]
  );

  const gradedSubmissions = useMemo(
    () => submissions.filter(s => s.autoGrade !== null),
    [submissions]
  );

  const sidebarItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "assignments", label: "Assignments", icon: BookOpen },
    { id: "grades", label: "My Grades", icon: Award },
  ];

  // Loading skeleton
  const contentSkeleton = (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );

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
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? "bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/80"}`}>
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-emerald-600" : ""}`} />
                {sidebarOpen && <span>{item.label}</span>}
                {isActive && sidebarOpen && <motion.div layoutId="sidebar-active" className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200/60">
          <div className={`flex items-center ${sidebarOpen ? "gap-3" : "justify-center"} p-2 rounded-xl hover:bg-slate-100/80 transition-colors`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm shrink-0">
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

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 lg:p-8 max-w-[1200px]">
          <div className="lg:hidden flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
                <Menu className="w-5 h-5" />
              </Button>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          </div>

          {isLoading ? (
            contentSkeleton
          ) : (
          <AnimatePresence mode="wait">
            {/* ===== OVERVIEW ===== */}
            {activeTab === "overview" && (
              <motion.div key="overview" {...pageTransition} className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                  <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.name?.split(" ")[0]}! Here&apos;s your academic overview.</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Assignments", value: analytics?.totalAssignments || 0, icon: BookOpen, color: "from-blue-500 to-indigo-500", bg: "bg-blue-50" },
                    { label: "Submitted", value: analytics?.submittedCount || 0, icon: CheckCircle2, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50" },
                    { label: "Graded", value: analytics?.gradedCount || 0, icon: Sparkles, color: "from-amber-500 to-orange-500", bg: "bg-amber-50" },
                    { label: "Average Grade", value: analytics?.averageGrade || 0, icon: TrendingUp, color: "from-violet-500 to-purple-500", bg: "bg-violet-50", suffix: "%" },
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
                              <stat.icon className={`w-5 h-5 bg-gradient-to-r ${stat.color} bg-clip-text`} style={{ color: stat.color.includes("blue") ? "#3b82f6" : stat.color.includes("emerald") ? "#10b981" : stat.color.includes("amber") ? "#f59e0b" : "#8b5cf6" }} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-sm shadow-slate-900/[0.02]">
                    <CardHeader className="pb-3 px-6 pt-5">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700"><Clock className="w-4 h-4 text-amber-500" /> Pending Submissions</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-5">
                      {pendingAssignments.length === 0 ? (
                        <div className="text-center py-8">
                          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-300 mb-3" />
                          <p className="text-sm text-slate-400 font-medium">All caught up!</p>
                          <p className="text-xs text-slate-300 mt-1">No pending assignments</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {pendingAssignments.slice(0, 4).map((a) => (
                            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100/60 hover:bg-amber-50 transition-colors group">
                              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0"><Inbox className="w-4 h-4 text-amber-600" /></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{a.title}</p>
                                {a.dueDate && <p className="text-[11px] text-slate-400">Due: {format(new Date(a.dueDate), "MMM d, yyyy")}</p>}
                              </div>
                              <Button size="sm" onClick={() => { setSelectedAssignment(a); setShowSubmitDialog(true); setUploadSuccess(false); }} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200/50 h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                Submit <ChevronRight className="w-3 h-3 ml-0.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm shadow-slate-900/[0.02]">
                    <CardHeader className="pb-3 px-6 pt-5">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700"><Star className="w-4 h-4 text-emerald-500" /> Recent Grades</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-5">
                      {gradedSubmissions.length === 0 ? (
                        <div className="text-center py-8">
                          <Award className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                          <p className="text-sm text-slate-400 font-medium">No grades yet</p>
                          <p className="text-xs text-slate-300 mt-1">Submit assignments to see your grades</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {gradedSubmissions.slice(0, 4).map((sub) => {
                            const grade = sub.teacherGrade ?? sub.autoGrade ?? 0;
                            const total = sub.assignment?.totalMarks || 100;
                            return (
                              <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm ${getGradeBg(grade, total)}`}>{grade}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-700 truncate">{sub.assignment?.title}</p>
                                  <p className="text-[11px] text-slate-400">{format(new Date(sub.createdAt), "MMM d, yyyy")}</p>
                                </div>
                                {sub.teacherGrade !== null && <Badge className="bg-violet-100 text-violet-600 border-0 text-[10px] font-medium">Reviewed</Badge>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* ===== ASSIGNMENTS ===== */}
            {activeTab === "assignments" && (
              <motion.div key="assignments" {...pageTransition} className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assignments</h1>
                  <p className="text-slate-500 text-sm mt-1">Browse and submit your assignments</p>
                </div>
                {assignments.length === 0 ? (
                  <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center">
                    <BookOpen className="w-14 h-14 mx-auto text-slate-200 mb-4" />
                    <p className="font-semibold text-slate-500">No assignments yet</p>
                    <p className="text-sm text-slate-400 mt-1">Your teachers will publish assignments here</p>
                  </CardContent></Card>
                ) : (
                  <div className="grid gap-4">
                    {assignments.map((a, i) => (
                      <motion.div key={a.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                        <Card className="border-0 shadow-sm shadow-slate-900/[0.02] card-hover overflow-hidden">
                          <CardContent className="p-5 lg:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${a.hasSubmitted ? "bg-emerald-50" : "bg-slate-100"}`}>
                                  {a.hasSubmitted ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5 text-slate-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-slate-800 truncate">{a.title}</h3>
                                    {a.hasSubmitted && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-medium shrink-0">Submitted</Badge>}
                                  </div>
                                  <p className="text-sm text-slate-500 line-clamp-1">{a.description}</p>
                                  <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400">
                                    <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{a.teacher?.name}</span>
                                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{a.totalMarks} marks</span>
                                    {a.dueDate && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(a.dueDate), "MMM d, yyyy")}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="sm:ml-4 shrink-0">
                                {a.hasSubmitted && a.submission && a.submission.autoGrade !== null ? (
                                  <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${getGradeBg(a.submission.teacherGrade ?? a.submission.autoGrade, a.totalMarks)}`}>
                                    <span className={`text-xl font-bold tracking-tight ${getGradeColor(a.submission.teacherGrade ?? a.submission.autoGrade, a.totalMarks)}`}>{a.submission.teacherGrade ?? a.submission.autoGrade}</span>
                                    <span className="text-xs opacity-70">/{a.totalMarks}</span>
                                  </div>
                                ) : a.hasSubmitted && grading[a.submission?.id || ""] ? (
                                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60">
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                                      <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-500 rounded-full" />
                                    </motion.div>
                                    <span className="text-xs font-medium text-emerald-600">AI Grading...</span>
                                  </div>
                                ) : a.hasSubmitted && a.submission ? (
                                  <Button onClick={() => handleRegrade(a.submission.id)} size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-200/50 h-9 text-xs">
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Request AI Grade
                                  </Button>
                                ) : (
                                  <Button onClick={() => { setSelectedAssignment(a); setShowSubmitDialog(true); setUploadSuccess(false); }} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-200/50">
                                    <Upload className="w-4 h-4 mr-2" /> Submit
                                  </Button>
                                )}
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

            {/* ===== GRADES ===== */}
            {activeTab === "grades" && (
              <motion.div key="grades" {...pageTransition} className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Grades</h1>
                  <p className="text-slate-500 text-sm mt-1">Review your grades and feedback</p>
                </div>
                {submissions.length === 0 ? (
                  <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center">
                    <Award className="w-14 h-14 mx-auto text-slate-200 mb-4" />
                    <p className="font-semibold text-slate-500">No grades yet</p>
                    <p className="text-sm text-slate-400 mt-1">Submit an assignment to get started</p>
                  </CardContent></Card>
                ) : (
                  <div className="grid gap-5">
                    {submissions.map((sub, i) => {
                      const grade = sub.teacherGrade ?? sub.autoGrade;
                      const total = sub.assignment?.totalMarks || 100;
                      const pct = grade ? (grade / total) * 100 : 0;
                      return (
                        <motion.div key={sub.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.06 }}>
                          <Card className="border-0 shadow-sm shadow-slate-900/[0.02] card-hover overflow-hidden">
                            <CardContent className="p-5 lg:p-6 space-y-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-slate-800">{sub.assignment?.title}</h3>
                                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> {sub.fileName} &middot; {format(new Date(sub.createdAt), "MMM d, yyyy")}
                                    {sub.teacherGrade !== null && <Badge className="bg-violet-100 text-violet-600 border-0 text-[10px]">Teacher reviewed</Badge>}
                                  </p>
                                </div>
                                {grade !== null ? (
                                  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border shrink-0" style={{
                                    background: pct >= 80 ? "linear-gradient(135deg, #ecfdf5, #d1fae5)" : pct >= 60 ? "linear-gradient(135deg, #fffbeb, #fef3c7)" : "linear-gradient(135deg, #fef2f2, #fee2e2)",
                                    borderColor: pct >= 80 ? "#a7f3d0" : pct >= 60 ? "#fde68a" : "#fecaca",
                                  }}>
                                    <span className={`text-2xl font-bold tracking-tighter ${getGradeColor(grade, total)}`}>{grade}</span>
                                    <span className="text-xs font-medium text-slate-400">/{total}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 shrink-0">
                                    {grading[sub.id] ? (
                                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
                                          <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-500 rounded-full" />
                                        </motion.div>
                                        <span className="text-xs font-medium text-emerald-600">Grading...</span>
                                      </div>
                                    ) : (
                                      <Button onClick={() => handleRegrade(sub.id)} size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-200/50 h-9 text-xs">
                                        <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Request AI Grade
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                              {grade !== null && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>Score</span>
                                    <span className="font-medium">{Math.round(pct)}%</span>
                                  </div>
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }} className={`h-full rounded-full ${pct >= 80 ? "bg-gradient-to-r from-emerald-400 to-teal-400" : pct >= 60 ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gradient-to-r from-red-400 to-rose-400"}`} />
                                  </div>
                                </div>
                              )}
                              {(sub.autoFeedback || sub.teacherFeedback) && (
                                <div className="space-y-2.5">
                                  {sub.autoFeedback && (
                                    <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4">
                                      <p className="text-xs font-semibold text-emerald-600 mb-1.5 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> AI Feedback</p>
                                      <p className="text-sm text-emerald-800/80 leading-relaxed whitespace-pre-wrap">{sub.autoFeedback}</p>
                                    </div>
                                  )}
                                  {sub.teacherFeedback && (
                                    <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-4">
                                      <p className="text-xs font-semibold text-violet-600 mb-1.5 flex items-center gap-1.5"><GraduationCap className="w-3 h-3" /> Teacher Feedback</p>
                                      <p className="text-sm text-violet-800/80 leading-relaxed whitespace-pre-wrap">{sub.teacherFeedback}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </main>

      {/* ===== SUBMIT DIALOG ===== */}
      <Dialog open={showSubmitDialog} onOpenChange={(open) => { setShowSubmitDialog(open); setSelectedFile(null); setError(""); setUploadSuccess(false); setShowConfirmStep(false); setConfirmChecked(false); }}>
        <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto border-0 shadow-2xl shadow-slate-900/[0.08]">
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 -mt-6 -mx-6 mb-0 rounded-t-2xl" />
          {uploadSuccess ? (
            <div className="py-10 text-center space-y-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}>
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8 text-emerald-600" /></div>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <h3 className="font-bold text-lg text-slate-900">Submitted Successfully!</h3>
                <p className="text-sm text-slate-500 mt-1">AI is grading your assignment. Check your grades shortly.</p>
              </motion.div>
            </div>
          ) : (
            <>
              {!showConfirmStep ? (
                <>
                  <DialogHeader className="pt-2">
                    <DialogTitle className="text-lg">Submit Assignment</DialogTitle>
                    <DialogDescription className="text-sm">{selectedAssignment?.title}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {error && <Alert variant="destructive" className="border-0"><AlertDescription className="text-sm">{error}</AlertDescription></Alert>}
                    <div className="border-2 border-dashed rounded-2xl p-8 text-center hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer" onClick={() => document.getElementById("file-upload")?.click()}>
                      <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileSelect} className="hidden" id="file-upload" />
                      {selectedFile ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto"><FileText className="w-6 h-6 text-emerald-600" /></div>
                          <div>
                            <p className="font-semibold text-sm text-slate-700">{selectedFile.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}><X className="w-3 h-3 mr-1" /> Remove file</Button>
                        </motion.div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto"><FileUp className="w-6 h-6 text-slate-400" /></div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Click to upload</p>
                            <p className="text-xs text-slate-400 mt-0.5">PDF, DOCX, or TXT &middot; Max 5MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setShowSubmitDialog(false)} className="flex-1">Cancel</Button>
                    <Button onClick={handleProceedToConfirm} disabled={!selectedFile} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-200/50">
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Review & Submit</>
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader className="pt-2">
                    <DialogTitle className="text-lg flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" /> Confirm Submission</DialogTitle>
                    <DialogDescription className="text-sm">Please review carefully before submitting</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
                        <div>
                          <p className="font-semibold text-sm text-amber-800">This action cannot be undone</p>
                          <p className="text-xs text-amber-600/80 mt-1 leading-relaxed">Once you submit this assignment, <strong>you will not be able to replace, edit, or withdraw</strong> your submission. Please double-check your file before confirming.</p>
                        </div>
                      </div>
                    </motion.div>
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submission Summary</p>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4 text-emerald-600" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-400">Assignment</p>
                          <p className="text-sm font-medium text-slate-700 truncate">{selectedAssignment?.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${selectedFile?.name.endsWith(".pdf") ? "bg-red-100" : selectedFile?.name.endsWith(".docx") ? "bg-blue-100" : "bg-slate-100"}`}>
                          <FileCheck className={`w-4 h-4 ${selectedFile?.name.endsWith(".pdf") ? "text-red-600" : selectedFile?.name.endsWith(".docx") ? "text-blue-600" : "text-slate-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-400">File</p>
                          <p className="text-sm font-medium text-slate-700 truncate">{selectedFile?.name}</p>
                          <p className="text-[11px] text-slate-400">{selectedFile?.name.split(".").pop()?.toUpperCase()} &middot; {(selectedFile ? selectedFile.size / 1024 : 0).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pt-1">
                        {selectedAssignment?.dueDate && <div className="flex items-center gap-1.5 text-xs text-slate-400"><Clock className="w-3 h-3" /><span>Due: {format(new Date(selectedAssignment.dueDate), "MMM d, yyyy")}</span></div>}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400"><Star className="w-3 h-3" /><span>{selectedAssignment?.totalMarks} marks</span></div>
                      </div>
                    </div>
                    <div className={`rounded-xl border p-4 transition-all duration-200 ${confirmChecked ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"}`}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox checked={confirmChecked} onCheckedChange={(checked) => setConfirmChecked(checked === true)} className="mt-0.5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-700 leading-snug">I have reviewed my file and confirm this is my final submission</p>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">I understand that once submitted, this action is permanent and cannot be reversed.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 pt-1">
                    <Button variant="outline" onClick={handleBackToFileSelect} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" /> Go Back</Button>
                    <Button onClick={handleSubmitFile} disabled={!confirmChecked || uploading} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-200/50">
                      {uploading ? (
                        <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /></motion.div><span className="ml-2">Submitting...</span></>
                      ) : (
                        <><FileCheck className="w-4 h-4 mr-2" /> Confirm & Submit</>
                      )}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}