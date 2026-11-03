export type Role = "admin" | "student";

export type GradeStatus =
  | "passed"
  | "recovery"
  | "failed"
  | "ungraded"
  | "pending-rule";

export type AmbiguousBandStatus = Exclude<GradeStatus, "ungraded">;

export interface Student {
  id: string;
  name: string;
  enrollment: string;
  username: string;
  password: string;
  grades: Record<string, number | null>;
}

export interface Subject {
  id: string;
  name: string;
  teacher: string;
}

export interface SchoolData {
  version: 1;
  students: Student[];
  subjects: Subject[];
  team: string[];
  adminCredentials?: { username: string; password: string };
  rules: { fiveToSix: AmbiguousBandStatus };
}

export interface Session {
  role: Role;
  studentId?: string;
}

export const STORAGE_KEY = "escola-online-data-v1";
export const SESSION_KEY = "escola-online-session-v1";

const roster = [
  ["Ana Beatriz Souza", "2026001", "ana.souza"],
  ["Bruno Henrique Lima", "2026002", "bruno.lima"],
  ["Camila Ferreira Costa", "2026003", "camila.costa"],
  ["Daniel Oliveira Santos", "2026004", "daniel.santos"],
  ["Eduarda Martins Rocha", "2026005", "eduarda.rocha"],
  ["Felipe Almeida Nunes", "2026006", "felipe.nunes"],
  ["Giovanna Ribeiro Alves", "2026007", "giovanna.alves"],
  ["Heitor Carvalho Mendes", "2026008", "heitor.mendes"],
  ["Isabela Gomes Barros", "2026009", "isabela.barros"],
  ["Joao Pedro Cardoso", "2026010", "joao.cardoso"],
];

export function createInitialData(): SchoolData {
  const subjects: Subject[] = [
    { id: "sub-portugues", name: "Lingua Portuguesa", teacher: "Mariana Lopes" },
    { id: "sub-matematica", name: "Matematica", teacher: "Rafael Teixeira" },
    { id: "sub-ciencias", name: "Ciencias", teacher: "Patricia Moura" },
    { id: "sub-historia", name: "Historia", teacher: "Andre Campos" },
  ];

  return {
    version: 1,
    subjects,
    team: ["Integrante 1", "Integrante 2", "Integrante 3"],
    adminCredentials: { username: "admin", password: "admin123" },
    rules: { fiveToSix: "pending-rule" },
    students: roster.map(([name, enrollment, username]) => ({
      id: `student-${enrollment}`,
      name,
      enrollment,
      username,
      password: "aluno123",
      grades: Object.fromEntries(subjects.map((subject) => [subject.id, null])),
    })),
  };
}

export function classifyGrade(
  grade: number | null,
  fiveToSix: AmbiguousBandStatus = "pending-rule",
): GradeStatus {
  if (grade === null) return "ungraded";
  if (grade < 5) return "failed";
  if (grade < 6) return fiveToSix;
  if (grade < 7) return "recovery";
  return "passed";
}

export function studentAverage(student: Student): number | null {
  const grades = Object.values(student.grades).filter(
    (grade): grade is number => grade !== null,
  );
  if (grades.length === 0) return null;
  return grades.reduce((total, grade) => total + grade, 0) / grades.length;
}

export function validateGrade(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  const grade = Number(normalized);
  if (!Number.isFinite(grade) || grade < 0 || grade > 10) return null;
  return grade;
}

export function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

export const statusLabels: Record<GradeStatus, string> = {
  passed: "Aprovado",
  recovery: "Recuperacao",
  failed: "Reprovado",
  ungraded: "Media nao lancada",
  "pending-rule": "Regra pendente",
};

export const statusStyles: Record<GradeStatus, string> = {
  passed: "status-passed",
  recovery: "status-recovery",
  failed: "status-failed",
  ungraded: "status-ungraded",
  "pending-rule": "status-pending",
};