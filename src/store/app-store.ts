import { create } from "zustand";

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";
export type ViewType = "auth" | "student" | "teacher" | "admin";

export interface InvitationCode {
  id: string;
  code: string;
  isActive: boolean;
  maxUses: number;
  usedCount: number;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  creator?: { name: string; email: string };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  modelAnswer?: string;
  dueDate: string | null;
  totalMarks: number;
  teacherId: string;
  teacher?: { name: string; email?: string };
  createdAt: string;
  hasSubmitted?: boolean;
  submission?: {
    id: string;
    autoGrade: number | null;
    teacherGrade: number | null;
    createdAt: string;
  };
  _count?: { submissions: number };
}

export interface Submission {
  id: string;
  content: string;
  fileName: string;
  fileType: string;
  autoGrade: number | null;
  autoFeedback: string | null;
  teacherGrade: number | null;
  teacherFeedback: string | null;
  assignmentId: string;
  studentId: string;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; name: string; email: string };
  assignment?: {
    id: string;
    title: string;
    totalMarks: number;
    description?: string;
    modelAnswer?: string;
    teacher?: { name: string };
  };
}

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  view: ViewType;
  isLoading: boolean;

  // Data
  assignments: Assignment[];
  submissions: Submission[];

  // Actions
  setUser: (user: User | null) => void;
  setView: (view: ViewType) => void;
  setLoading: (loading: boolean) => void;
  setAssignments: (assignments: Assignment[]) => void;
  setSubmissions: (submissions: Submission[]) => void;
  logout: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  view: "auth",
  isLoading: true,
  assignments: [],
  submissions: [],

  setUser: (user) =>
    set({
      user,
      isAuthenticated: !!user,
      view: user?.role === "ADMIN" ? "admin" : user?.role === "TEACHER" ? "teacher" : user?.role === "STUDENT" ? "student" : "auth",
    }),

  setView: (view) => set({ view }),

  setLoading: (isLoading) => set({ isLoading }),

  setAssignments: (assignments) => set({ assignments }),

  setSubmissions: (submissions) => set({ submissions }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
      view: "auth",
      assignments: [],
      submissions: [],
    }),

  reset: () =>
    set({
      user: null,
      isAuthenticated: false,
      view: "auth",
      isLoading: true,
      assignments: [],
      submissions: [],
    }),
}));
