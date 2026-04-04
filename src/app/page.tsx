"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import AuthPage from "@/components/portal/auth-page";
import StudentDashboard from "@/components/portal/student-dashboard";
import TeacherDashboard from "@/components/portal/teacher-dashboard";
import AdminDashboard from "@/components/portal/admin-dashboard";
import { Toaster } from "sonner";
import { GraduationCap, Download } from "lucide-react";

function AppContent() {
  const { view, setUser, setLoading, isLoading } = useAppStore();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user) {
          setUser({
            id: (session.user as { id: string }).id,
            name: session.user.name || "",
            email: session.user.email || "",
            role: (session.user as { role: string }).role as "STUDENT" | "TEACHER" | "ADMIN",
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to check session:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [setUser, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-5"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20"
            >
              <GraduationCap className="w-8 h-8 text-white" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-2xl border-2 border-emerald-400"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Loading ReachyGrade</p>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15, ease: "easeInOut" }}
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Download source code button — visible on auth page */}
      {view === "auth" && (
        <a
          href="/api/download"
          download="reachygrade-source.zip"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
          title="Download Source Code"
        >
          <Download className="w-4 h-4" />
          <span>Download Source</span>
        </a>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {view === "auth" && <AuthPage />}
          {view === "student" && <StudentDashboard />}
          {view === "teacher" && <TeacherDashboard />}
          {view === "admin" && <AdminDashboard />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return (
    <SessionProvider>
      <AppContent />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgb(0,0,0,0.08)",
            border: "none",
          },
        }}
      />
    </SessionProvider>
  );
}
