import {
  averageAssessments,
  createInitialData,
  initialTeam,
  normalizeAssessmentScores,
  SESSION_KEY,
  STORAGE_KEY,
  type SchoolData,
  type Session,
} from "@/lib/school";

export interface LoadResult {
  data: SchoolData;
  warning: string | null;
}

export interface AppState extends LoadResult {
  session: Session | null;
}

let snapshot: AppState | null = null;
const listeners = new Set<() => void>();

export function getAppState(): AppState | null {
  if (typeof window === "undefined") return null;
  if (!snapshot) {
    const result = loadSchoolData();
    const session = loadSession();
    snapshot = {
      ...result,
      session:
        session?.role === "student" &&
        !result.data.students.some((student) => student.id === session.studentId)
          ? null
          : session,
    };
  }
  return snapshot;
}

export function subscribeToAppState(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === SESSION_KEY || event.key === null) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function loadSchoolData(): LoadResult {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { data: createInitialData(), warning: null };

    const parsed: unknown = JSON.parse(stored);
    if (!isSchoolData(parsed)) {
      return {
        data: createInitialData(),
        warning: "Os dados salvos nao puderam ser reconhecidos. Eles foram preservados; novos dados serao usados nesta sessao.",
      };
    }
    const students = parsed.students.map((student) => {
      const savedAssessments = (student as SchoolData["students"][number] & { assessments?: unknown }).assessments;
      const assessmentRecord =
        savedAssessments && typeof savedAssessments === "object"
          ? (savedAssessments as Record<string, unknown>)
          : {};
      const assessments = Object.fromEntries(
        Object.entries(student.grades).map(([subjectId, legacyGrade]) => [
          subjectId,
          normalizeAssessmentScores(assessmentRecord[subjectId], legacyGrade),
        ]),
      );
      return {
        ...student,
        assessments,
        grades: Object.fromEntries(
          Object.entries(assessments).map(([subjectId, scores]) => [subjectId, averageAssessments(scores)]),
        ),
      };
    });
    const data: SchoolData = {
      ...parsed,
      version: 2,
      team: migrateDefaultTeam(parsed.team),
      students,
      adminCredentials: parsed.adminCredentials ?? { username: "admin", password: "admin123" },
    };
    let warning: string | null = null;
    if (parsed.version !== 2) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        warning = "Os dados foram carregados, mas a atualizacao do formato local nao pode ser salva.";
      }
    }
    return { data, warning };
  } catch {
    return {
      data: createInitialData(),
      warning: "O armazenamento local esta indisponivel ou corrompido. Os dados anteriores nao foram alterados.",
    };
  }
}

export function saveSchoolData(data: SchoolData): boolean {
  let saved = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    saved = false;
  }
  const current = getAppState();
  if (current) {
    snapshot = {
      ...current,
      data,
      warning: saved
        ? null
        : "Nao foi possivel salvar no navegador. Verifique o espaco disponivel e as permissoes de armazenamento.",
    };
    notify();
  }
  return saved;
}

export function loadSession(): Session | null {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(SESSION_KEY) ?? "null",
    );
    if (!value || typeof value !== "object") return null;
    const session = value as Partial<Session>;
    if (session.role === "admin") return { role: "admin" };
    if (session.role === "student" && typeof session.studentId === "string") {
      return { role: "student", studentId: session.studentId };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null): void {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Login continues for this browser session if storage is unavailable.
  }
  const current = getAppState();
  if (current) {
    snapshot = { ...current, session };
    notify();
  }
}

function isSchoolData(value: unknown): value is SchoolData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<SchoolData>;
  return (
    (data.version === 1 || data.version === 2) &&
    Array.isArray(data.students) &&
    Array.isArray(data.subjects) &&
    Array.isArray(data.team) &&
    (data.adminCredentials === undefined ||
      (typeof data.adminCredentials.username === "string" &&
        typeof data.adminCredentials.password === "string")) &&
    !!data.rules &&
    ["pending-rule", "passed", "recovery", "failed"].includes(
      data.rules.fiveToSix,
    )
  );
}

function migrateDefaultTeam(team: string[]): string[] {
  if (team.length > 0 && team.every((member, index) => member === `Integrante ${index + 1}`)) {
    return [...initialTeam];
  }
  return team.map((member, index) =>
    /^Integrante \d+$/.test(member) ? initialTeam[index] ?? member : member,
  );
}