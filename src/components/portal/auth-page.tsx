"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  GraduationCap,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Sparkles,
  BookOpen,
  Brain,
  FileCheck,
  ArrowRight,
  Shield,
  Zap,
  KeyRound,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
};

export default function AuthPage() {
  const { setUser } = useAppStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    invitationCode: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", {
        email: loginForm.email,
        password: loginForm.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid email or password" : result.error);
      } else {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        if (session?.user) {
          setUser({
            id: (session.user as { id: string }).id,
            name: session.user.name || "",
            email: session.user.email || "",
            role: (session.user as { role: string }).role as "STUDENT" | "TEACHER" | "ADMIN",
          });
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    if (registerForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password,
          role,
          invitationCode: role === "TEACHER" ? registerForm.invitationCode : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); return; }

      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", {
        email: registerForm.email,
        password: registerForm.password,
        redirect: false,
      });
      if (result?.ok) {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        if (session?.user) {
          setUser({
            id: (session.user as { id: string }).id,
            name: session.user.name || "",
            email: session.user.email || "",
            role: (session.user as { role: string }).role as "STUDENT" | "TEACHER" | "ADMIN",
          });
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Brain, title: "AI-Powered Grading", desc: "Instant intelligent feedback using advanced language models" },
    { icon: FileCheck, title: "Smart Submissions", desc: "Upload PDF, DOCX, or TXT files with automatic text extraction" },
    { icon: Zap, title: "Real-time Analytics", desc: "Track grades, submissions, and performance at a glance" },
    { icon: Shield, title: "Secure & Private", desc: "Role-based access control for students and teachers" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl animate-float" />
          <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-teal-500/8 blur-3xl animate-float-delayed" />
          <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-cyan-500/6 blur-3xl animate-pulse-soft" />
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">ReachyGrade</h1>
              <p className="text-emerald-400/70 text-xs font-medium">AI Assignment Portal</p>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
                Intelligent grading,<br />
                <span className="gradient-text" style={{
                  background: 'linear-gradient(135deg, #34d399, #2dd4bf, #22d3ee)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  amplified learning.
                </span>
              </h2>
              <p className="text-slate-400 text-base leading-relaxed max-w-md">
                Submit your assignments and receive instant, detailed AI-powered feedback. Teachers can review, override, and guide students to excellence.
              </p>
            </motion.div>

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 gap-3"
            >
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                  className="group rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-4 hover:bg-white/[0.06] transition-all duration-300"
                >
                  <feature.icon className="w-5 h-5 text-emerald-400 mb-2.5 group-hover:scale-110 transition-transform duration-300" />
                  <p className="text-white text-sm font-semibold mb-0.5">{feature.title}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-slate-600 text-xs"
          >
            Powered by advanced AI &middot; Built for modern education
          </motion.p>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 gradient-mesh relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent" />

        <motion.div
          key={mode}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-[420px] relative z-10"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">ReachyGrade</span>
          </div>

          <Card className="border-0 shadow-xl shadow-slate-900/[0.03] bg-white/90 backdrop-blur-xl overflow-hidden">
            {/* Top Accent */}
            <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

            <CardContent className="pt-8 pb-2 px-8">
              <AnimatePresence mode="wait">
                {mode === "login" ? (
                  <motion.div key="login-header" {...fadeUp}>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
                    <p className="text-slate-500 text-sm mt-1.5">Sign in to access your assignments</p>
                    {/* Role Indicator */}
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-gradient-to-br from-emerald-50/60 to-teal-50/40">
                        <GraduationCap className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-700">I am a Student</p>
                          <p className="text-[11px] text-slate-400">Submit & view grades</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200/80 bg-gradient-to-br from-violet-50/60 to-purple-50/40">
                        <BookOpen className="w-5 h-5 text-violet-600 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-slate-700">I am a Teacher</p>
                          <p className="text-[11px] text-slate-400">Create & review</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="register-header" {...fadeUp}>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create account</h2>
                    <p className="text-slate-500 text-sm mt-1.5">Join the assignment portal</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-5">
                  <Alert variant="destructive" className="border-0 shadow-sm">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {mode === "login" ? (
                  <motion.form
                    key="login-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleLogin}
                    className="mt-7 space-y-5"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-slate-700 text-sm font-medium">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@example.com"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                          className="pl-11 h-11 bg-slate-50/80 border-slate-200/80 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-slate-700 text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                          className="pl-11 pr-11 h-11 bg-slate-50/80 border-slate-200/80 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 font-medium"
                    >
                      {isLoading ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                        </motion.div>
                      ) : (
                        <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="register-form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleRegister}
                    className="mt-7 space-y-5"
                  >
                    {/* Role Selection */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 text-sm font-medium">I am a</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["STUDENT", "TEACHER"] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`relative flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-300 ${
                              role === r
                                ? r === "TEACHER"
                                  ? "border-violet-400 bg-violet-50/80 shadow-sm shadow-violet-100"
                                  : "border-emerald-400 bg-emerald-50/80 shadow-sm shadow-emerald-100"
                                : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300"
                            }`}
                          >
                            {r === "STUDENT" ? (
                              <GraduationCap className={`w-5 h-5 ${role === r ? "text-emerald-600" : "text-slate-400"}`} />
                            ) : (
                              <BookOpen className={`w-5 h-5 ${role === r ? "text-violet-600" : "text-slate-400"}`} />
                            )}
                            <div className="text-left">
                              <span className={`text-sm font-semibold ${role === r ? (r === "TEACHER" ? "text-violet-700" : "text-emerald-700") : "text-slate-600"}`}>
                                I am a {r === "STUDENT" ? "Student" : "Teacher"}
                              </span>
                              <p className={`text-[11px] ${role === r ? (r === "TEACHER" ? "text-violet-600/70" : "text-emerald-600/70") : "text-slate-400"}`}>
                                {r === "STUDENT" ? "Submit assignments" : "Create & review"}
                              </p>
                            </div>
                            {role === r && (
                              <motion.div
                                layoutId="role-indicator"
                                className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${r === "TEACHER" ? "bg-violet-500" : "bg-emerald-500"}`}
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Invitation Code for Teacher */}
                    <AnimatePresence>
                      {role === "TEACHER" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-2 overflow-hidden"
                        >
                          <Label htmlFor="reg-code" className="text-violet-700 text-sm font-medium flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> Invitation Code <span className="text-red-400">*</span>
                          </Label>
                          <div className="relative">
                            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-violet-400" />
                            <Input
                              id="reg-code"
                              placeholder="e.g., RG-ABCD1234"
                              value={registerForm.invitationCode}
                              onChange={(e) => setRegisterForm({ ...registerForm, invitationCode: e.target.value.toUpperCase() })}
                              className="pl-11 h-11 bg-violet-50/60 border-violet-200/80 focus:border-violet-400 focus:ring-violet-400/20 transition-all font-mono tracking-wider"
                              required={role === "TEACHER"}
                            />
                          </div>
                          <p className="text-[11px] text-violet-500/70">Teachers need a valid invitation code to register. Contact your administrator.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="text-slate-700 text-sm font-medium">Full name</Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
                        <Input
                          id="reg-name"
                          placeholder="John Doe"
                          value={registerForm.name}
                          onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                          className="pl-11 h-11 bg-slate-50/80 border-slate-200/80 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-slate-700 text-sm font-medium">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="you@example.com"
                          value={registerForm.email}
                          onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                          className="pl-11 h-11 bg-slate-50/80 border-slate-200/80 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="reg-password" className="text-slate-700 text-sm font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
                          <Input
                            id="reg-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 6 chars"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                            className="pl-11 h-11 bg-slate-50/80 border-slate-200/80 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-confirm" className="text-slate-700 text-sm font-medium">Confirm</Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
                          <Input
                            id="reg-confirm"
                            type="password"
                            placeholder="Re-enter"
                            value={registerForm.confirmPassword}
                            onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                            className="pl-11 h-11 bg-slate-50/80 border-slate-200/80 focus:border-emerald-400 focus:ring-emerald-400/20 transition-all"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 font-medium"
                    >
                      {isLoading ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                        </motion.div>
                      ) : (
                        <>Create Account <ArrowRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </CardContent>

            <CardFooter className="px-8 pb-7 pt-2">
              <p className="text-sm text-slate-500 w-full text-center">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                  className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors inline-flex items-center gap-0.5"
                >
                  {mode === "login" ? "Sign up" : "Sign in"} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </p>
            </CardFooter>
          </Card>

          <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Secured with role-based authentication
          </p>
        </motion.div>
      </div>
    </div>
  );
}
