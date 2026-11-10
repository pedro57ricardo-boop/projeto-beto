"use client";

import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import {
  classifyGrade,
  createId,
  statusLabels,
  statusStyles,
  studentAverage,
  validateGrade,
  type GradeStatus,
  type SchoolData,
  type Session,
  type Student,
  type Subject,
} from "@/lib/school";
import {
  getAppState,
  saveSchoolData,
  saveSession,
  subscribeToAppState,
} from "@/lib/storage";

type View = "dashboard" | "students" | "subjects" | "grades" | "report" | "team";

const navigation: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Visao geral", icon: LayoutDashboard },
  { id: "students", label: "Alunos", icon: Users },
  { id: "subjects", label: "Disciplinas", icon: BookMarked },
  { id: "grades", label: "Notas e medias", icon: ClipboardList },
  { id: "report", label: "Boletim escolar", icon: BookOpen },
  { id: "team", label: "Nossa equipe", icon: UsersRound },
];

const routeViews: Record<string, View> = {
  "/": "dashboard",
  "/login": "dashboard",
  "/admin": "dashboard",
  "/admin/dashboard": "dashboard",
  "/admin/alunos": "students",
  "/admin/disciplinas": "subjects",
  "/admin/notas": "grades",
  "/admin/boletim": "report",
  "/aluno/boletim": "report",
  "/equipe": "team",
};

function routeForView(view: View, role: Session["role"]): string {
  if (view === "team") return "/equipe";
  if (view === "report") return role === "admin" ? "/admin/boletim" : "/aluno/boletim";
  const paths: Record<Exclude<View, "report" | "team">, string> = {
    dashboard: "/admin/dashboard",
    students: "/admin/alunos",
    subjects: "/admin/disciplinas",
    grades: "/admin/notas",
  };
  return paths[view];
}

const pageTitles: Record<View, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: "CENTRAL DE GESTAO",
    title: "Visao geral",
    description: "Acompanhe o andamento academico da sua escola.",
  },
  students: {
    eyebrow: "GESTAO ESCOLAR",
    title: "Alunos",
    description: "Cadastre e acompanhe os estudantes da turma.",
  },
  subjects: {
    eyebrow: "ORGANIZACAO ACADEMICA",
    title: "Disciplinas",
    description: "Organize as materias e seus responsaveis.",
  },
  grades: {
    eyebrow: "ACOMPANHAMENTO ACADEMICO",
    title: "Notas e medias",
    description: "Associe disciplinas e mantenha as medias atualizadas.",
  },
  report: {
    eyebrow: "DOCUMENTO ACADEMICO",
    title: "Boletim escolar",
    description: "Confira o desempenho por disciplina.",
  },
  team: {
    eyebrow: "QUEM FAZ A ESCOLA",
    title: "Nossa equipe",
    description: "As pessoas por tras do projeto Escola Online.",
  },
};

interface StudentForm {
  name: string;
  enrollment: string;
  username: string;
  password: string;
}

interface SubjectForm {
  name: string;
  teacher: string;
}

const emptyStudentForm: StudentForm = {
  name: "",
  enrollment: "",
  username: "",
  password: "aluno123",
};

const emptySubjectForm: SubjectForm = { name: "", teacher: "" };

export default function SchoolApp() {
  const appState = useSyncExternalStore(subscribeToAppState, getAppState, () => null);
  const pathname = usePathname();
  const router = useRouter();
  const data = appState?.data ?? null;
  const session = appState?.session ?? null;
  const ready = appState !== null;
  const [warningDismissed, setWarningDismissed] = useState(false);
  const warning = warningDismissed ? null : appState?.warning ?? null;
  const view = routeViews[pathname] ?? "dashboard";
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [search, setSearch] = useState("");
  const [studentEditor, setStudentEditor] = useState<Student | null | "new">(null);
  const [studentForm, setStudentForm] = useState<StudentForm>(emptyStudentForm);
  const [studentError, setStudentError] = useState("");
  const [subjectEditor, setSubjectEditor] = useState<Subject | null | "new">(null);
  const [subjectForm, setSubjectForm] = useState<SubjectForm>(emptySubjectForm);
  const [subjectError, setSubjectError] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, string>>({});
  const [gradeErrors, setGradeErrors] = useState<Record<string, string>>({});
  const [teamDraft, setTeamDraft] = useState<string[]>([]);
  const [teamEditing, setTeamEditing] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      if (pathname !== "/" && pathname !== "/login" && pathname !== "/equipe") {
        router.replace("/login");
      }
      return;
    }
    if (pathname === "/" || pathname === "/login") {
      router.replace(routeForView("dashboard", session.role));
      return;
    }
    if (session.role === "student" && pathname !== "/aluno/boletim" && pathname !== "/equipe") {
      router.replace("/aluno/boletim");
    } else if (session.role === "admin" && pathname === "/aluno/boletim") {
      router.replace("/admin/boletim");
    }
  }, [pathname, ready, router, session]);

  const commit = (nextData: SchoolData, message?: string) => {
    setWarningDismissed(false);
    if (!saveSchoolData(nextData)) {
      setToast("Alteracao aplicada apenas nesta sessao.");
    } else if (message) {
      setToast(message);
    }
  };

  const currentStudent =
    data && session?.role === "student"
      ? data.students.find((student) => student.id === session.studentId) ?? null
      : null;

  const goTo = (nextView: View) => {
    if (!session) return;
    if (session.role === "student" && nextView !== "report" && nextView !== "team") {
      router.push("/aluno/boletim");
      return;
    }
    router.push(routeForView(nextView, session.role));
    setMobileMenuOpen(false);
    setSearch("");
  };

  const signIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data) return;
    const username = loginUser.trim().toLowerCase();
    const adminCredentials = data.adminCredentials ?? { username: "admin", password: "admin123" };
    if (username === adminCredentials.username.toLowerCase() && loginPassword === adminCredentials.password) {
      const nextSession: Session = { role: "admin" };
      saveSession(nextSession);
      router.replace("/admin/dashboard");
      setLoginError("");
      return;
    }
    const student = data.students.find(
      (item) => item.username.toLowerCase() === username && item.password === loginPassword,
    );
    if (student) {
      const nextSession: Session = { role: "student", studentId: student.id };
      saveSession(nextSession);
      router.replace("/aluno/boletim");
      setLoginError("");
      return;
    }
    setLoginError("Usuario ou senha incorretos. Confira os dados e tente novamente.");
  };

  const signOut = () => {
    saveSession(null);
    router.replace("/login");
    setLoginUser("");
    setLoginPassword("");
  };

  const openNewStudent = () => {
    setStudentForm(emptyStudentForm);
    setStudentError("");
    setStudentEditor("new");
  };

  const openStudent = (student: Student) => {
    setStudentForm({
      name: student.name,
      enrollment: student.enrollment,
      username: student.username,
      password: student.password,
    });
    setStudentError("");
    setStudentEditor(student);
  };

  const saveStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (session?.role !== "admin" || !data) return;
    const name = studentForm.name.trim();
    const enrollment = studentForm.enrollment.trim();
    const username = studentForm.username.trim();
    const password = studentForm.password.trim();
    if (!name || !enrollment || !username || !password) {
      setStudentError("Preencha todos os campos para continuar.");
      return;
    }
    const existingId = studentEditor !== "new" && studentEditor ? studentEditor.id : null;
    if (data.students.some((student) => student.id !== existingId && student.enrollment === enrollment)) {
      setStudentError("Esta matricula ja esta cadastrada.");
      return;
    }
    if (data.students.some((student) => student.id !== existingId && student.username.toLowerCase() === username.toLowerCase())) {
      setStudentError("Este usuario ja esta em uso.");
      return;
    }

    const student: Student = existingId
      ? {
          ...data.students.find((item) => item.id === existingId)!,
          name,
          enrollment,
          username,
          password,
        }
      : {
          id: createId("student"),
          name,
          enrollment,
          username,
          password,
          grades: Object.fromEntries(data.subjects.map((subject) => [subject.id, null])),
        };
    const students = existingId
      ? data.students.map((item) => (item.id === existingId ? student : item))
      : [...data.students, student];
    commit({ ...data, students }, existingId ? "Cadastro atualizado." : "Aluno cadastrado.");
    setStudentEditor(null);
  };

  const deleteStudent = (student: Student) => {
    if (session?.role !== "admin" || !data) return;
    if (!window.confirm(`Excluir ${student.name}? As medias associadas tambem serao removidas.`)) return;
    commit({ ...data, students: data.students.filter((item) => item.id !== student.id) }, "Aluno removido.");
  };

  const openNewSubject = () => {
    setSubjectForm(emptySubjectForm);
    setSubjectError("");
    setSubjectEditor("new");
  };

  const openSubject = (subject: Subject) => {
    setSubjectForm({ name: subject.name, teacher: subject.teacher });
    setSubjectError("");
    setSubjectEditor(subject);
  };

  const saveSubject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (session?.role !== "admin" || !data) return;
    const name = subjectForm.name.trim();
    const teacher = subjectForm.teacher.trim();
    if (!name || !teacher) {
      setSubjectError("Informe o nome da disciplina e o professor responsavel.");
      return;
    }
    const existingId = subjectEditor !== "new" && subjectEditor ? subjectEditor.id : null;
    if (data.subjects.some((subject) => subject.id !== existingId && subject.name.toLowerCase() === name.toLowerCase())) {
      setSubjectError("Ja existe uma disciplina com esse nome.");
      return;
    }
    const subject: Subject = existingId
      ? { id: existingId, name, teacher }
      : { id: createId("subject"), name, teacher };
    const subjects = existingId
      ? data.subjects.map((item) => (item.id === existingId ? subject : item))
      : [...data.subjects, subject];
    const students = existingId
      ? data.students
      : data.students.map((student) => ({ ...student, grades: { ...student.grades, [subject.id]: null } }));
    commit({ ...data, subjects, students }, existingId ? "Disciplina atualizada." : "Disciplina criada e associada aos alunos.");
    setSubjectEditor(null);
  };

  const deleteSubject = (subject: Subject) => {
    if (session?.role !== "admin" || !data) return;
    if (!window.confirm(`Excluir ${subject.name}? As medias desta disciplina tambem serao removidas.`)) return;
    const students = data.students.map((student) => {
      const grades = { ...student.grades };
      delete grades[subject.id];
      return { ...student, grades };
    });
    commit({ ...data, subjects: data.subjects.filter((item) => item.id !== subject.id), students }, "Disciplina removida.");
  };

  const toggleAssociation = (student: Student, subject: Subject, checked: boolean) => {
    if (session?.role !== "admin" || !data) return;
    const students = data.students.map((item) => {
      if (item.id !== student.id) return item;
      const grades = { ...item.grades };
      if (checked) grades[subject.id] = null;
      else delete grades[subject.id];
      return { ...item, grades };
    });
    commit({ ...data, students }, checked ? "Disciplina associada." : "Associacao removida.");
  };

  const saveGrade = (student: Student, subject: Subject) => {
    if (session?.role !== "admin" || !data) return;
    const key = `${student.id}:${subject.id}`;
    const raw = gradeDrafts[key] ?? (student.grades[subject.id] === null ? "" : String(student.grades[subject.id]));
    const grade = validateGrade(raw);
    if (raw.trim() !== "" && grade === null) {
      setGradeErrors((errors) => ({ ...errors, [key]: "Use um valor de 0 a 10." }));
      return;
    }
    const students = data.students.map((item) =>
      item.id === student.id
        ? { ...item, grades: { ...item.grades, [subject.id]: grade } }
        : item,
    );
    setGradeErrors((errors) => ({ ...errors, [key]: "" }));
    setGradeDrafts((drafts) => ({ ...drafts, [key]: grade === null ? "" : String(grade) }));
    commit({ ...data, students }, grade === null ? "Media removida." : "Media salva e situacao recalculada.");
  };

  const saveTeam = () => {
    if (session?.role !== "admin" || !data) return;
    const members = teamDraft.map((name) => name.trim()).filter(Boolean).slice(0, 6);
    commit({ ...data, team: members }, "Equipe atualizada.");
    setTeamDraft(members);
    setTeamEditing(false);
  };

  if (!ready || !data) {
    return <main className="loading-screen"><span className="loading-mark"><GraduationCap size={24} /></span><p>Preparando sua escola...</p></main>;
  }

  if (!session || (session.role === "student" && !currentStudent)) {
    return (
      <LoginScreen
        data={data}
        loginUser={loginUser}
        loginPassword={loginPassword}
        loginError={loginError}
        onUserChange={setLoginUser}
        onPasswordChange={setLoginPassword}
        onSubmit={signIn}
        onTeam={() => router.replace(pathname === "/equipe" ? "/login" : "/equipe")}
        teamOpen={pathname === "/equipe"}
      />
    );
  }

  const isAdmin = session.role === "admin";
  const activeView = !isAdmin && view !== "team" ? "report" : view;
  const title = pageTitles[activeView];
  const filteredStudents = data.students.filter((student) =>
    `${student.name} ${student.enrollment} ${student.username}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedStudent = data.students.find((student) => student.id === selectedStudentId) ?? data.students[0];

  return (
    <div className="app-shell">
      {mobileMenuOpen && <button className="mobile-scrim" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <span className="brand-mark"><GraduationCap size={22} strokeWidth={2.2} /></span>
          <span className="brand-copy"><strong>escola<span>online</span></strong><small>PLATAFORMA ACADEMICA</small></span>
          <button className="icon-button sidebar-close" aria-label="Fechar menu" onClick={() => setMobileMenuOpen(false)}><X size={18} /></button>
        </div>
        <div className="school-switcher">
          <span className="school-monogram">EO</span>
          <span><strong>Escola Horizonte</strong><small>Ano letivo 2026</small></span>
          <ChevronDown size={15} />
        </div>
        <nav className="side-nav" aria-label="Navegacao principal">
          <p className="nav-caption">MENU PRINCIPAL</p>
          {navigation.filter((item) => isAdmin || item.id === "report" || item.id === "team").map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`nav-item ${activeView === item.id ? "nav-item-active" : ""}`} onClick={() => goTo(item.id)}>
                <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>
                {activeView === item.id && <span className="nav-active-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon"><CircleHelp size={17} /></span><strong>Ambiente demonstrativo</strong><p>Dados locais, sem protecao para uso real.</p></div>
          <div className="sidebar-profile">
            <span className="avatar avatar-sidebar">{isAdmin ? "AD" : initials(currentStudent?.name ?? "Aluno")}</span>
            <span className="profile-copy"><strong>{isAdmin ? "Administrador" : currentStudent?.name}</strong><small>{isAdmin ? "Acesso administrativo" : "Estudante"}</small></span>
            <button className="icon-button logout-button" aria-label="Sair" title="Sair" onClick={signOut}><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Abrir menu" onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>Escola Horizonte</span><span className="breadcrumb-slash">/</span><strong>{title.title}</strong></div>
          <div className="topbar-user"><span className="online-dot" /><span>{isAdmin ? "Administrador" : "Area do aluno"}</span><span className="avatar avatar-top">{isAdmin ? "AD" : initials(currentStudent?.name ?? "Aluno")}</span></div>
        </header>

        <div className="page-content">
          {warning && <div className="storage-warning"><AlertTriangle size={17} /><span>{warning}</span><button aria-label="Dispensar aviso" onClick={() => setWarningDismissed(true)}><X size={16} /></button></div>}
          <div className="page-heading">
            <div><p className="eyebrow">{title.eyebrow}</p><h1>{title.title}</h1><p className="page-description">{isAdmin ? title.description : activeView === "report" ? "Seu desempenho academico, sempre atualizado." : title.description}</p></div>
            {isAdmin && activeView === "students" && <button className="button button-primary" onClick={openNewStudent}><Plus size={17} />Novo aluno</button>}
            {isAdmin && activeView === "subjects" && <button className="button button-primary" onClick={openNewSubject}><Plus size={17} />Nova disciplina</button>}
          </div>

          {activeView === "dashboard" && isAdmin && <Dashboard data={data} onNavigate={goTo} />}
          {activeView === "students" && isAdmin && (
            <StudentsPage
              students={filteredStudents}
              data={data}
              search={search}
              onSearch={setSearch}
              onEdit={openStudent}
              onDelete={deleteStudent}
              onReport={(student) => { setSelectedStudentId(student.id); goTo("report"); }}
            />
          )}
          {activeView === "subjects" && isAdmin && <SubjectsPage subjects={data.subjects} students={data.students} onEdit={openSubject} onDelete={deleteSubject} onGrades={() => goTo("grades")} />}
          {activeView === "grades" && isAdmin && (
            <GradesPage
              data={data}
              selectedStudentId={selectedStudent?.id ?? ""}
              onStudentChange={(id) => { setSelectedStudentId(id); setGradeDrafts({}); setGradeErrors({}); }}
              drafts={gradeDrafts}
              errors={gradeErrors}
              onDraftChange={(key, value) => setGradeDrafts((drafts) => ({ ...drafts, [key]: value }))}
              onSave={saveGrade}
              onAssociate={toggleAssociation}
              onRuleChange={(value) => commit({ ...data, rules: { fiveToSix: value } }, "Regra academica atualizada.")}
            />
          )}
          {activeView === "report" && <ReportPage student={isAdmin ? selectedStudent : currentStudent} data={data} isAdmin={isAdmin} students={isAdmin ? data.students : []} onStudentChange={setSelectedStudentId} />}
          {activeView === "team" && <TeamPage data={data} isAdmin={isAdmin} draft={teamDraft} editing={teamEditing} onEdit={() => { setTeamDraft(data.team); setTeamEditing(true); }} onCancel={() => setTeamEditing(false)} onChange={(index, value) => setTeamDraft((team) => team.map((name, current) => current === index ? value : name))} onAdd={() => setTeamDraft((team) => team.length < 6 ? [...team, ""] : team)} onRemove={(index) => setTeamDraft((team) => team.filter((_, current) => current !== index))} onSave={saveTeam} />}
        </div>
        <footer className="app-footer"><span>Escola Online <span className="footer-separator">/</span> Demonstracao academica</span><span><ShieldCheck size={14} /> Autenticacao local demonstrativa</span></footer>
      </main>

      {studentEditor && <Modal title={studentEditor === "new" ? "Cadastrar aluno" : "Editar aluno"} onClose={() => setStudentEditor(null)}>
        <form className="form-stack" onSubmit={saveStudent}>
          <p className="modal-intro">Os dados de acesso sao demonstrativos e devem ser substituidos por autenticacao de servidor em producao.</p>
          <FormField label="Nome completo"><input autoFocus value={studentForm.name} onChange={(event) => setStudentForm({ ...studentForm, name: event.target.value })} placeholder="Ex.: Maria Silva" required /></FormField>
          <div className="form-grid"><FormField label="Matricula"><input value={studentForm.enrollment} onChange={(event) => setStudentForm({ ...studentForm, enrollment: event.target.value })} placeholder="2026101" required /></FormField><FormField label="Usuario"><input value={studentForm.username} onChange={(event) => setStudentForm({ ...studentForm, username: event.target.value })} placeholder="maria.silva" required /></FormField></div>
          <FormField label="Senha demonstrativa"><input value={studentForm.password} onChange={(event) => setStudentForm({ ...studentForm, password: event.target.value })} autoComplete="new-password" required /></FormField>
          {studentError && <p className="form-error" role="alert">{studentError}</p>}
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setStudentEditor(null)}>Cancelar</button><button type="submit" className="button button-primary"><Save size={16} />Salvar aluno</button></div>
        </form>
      </Modal>}

      {subjectEditor && <Modal title={subjectEditor === "new" ? "Nova disciplina" : "Editar disciplina"} onClose={() => setSubjectEditor(null)}>
        <form className="form-stack" onSubmit={saveSubject}>
          <FormField label="Nome da disciplina"><input autoFocus value={subjectForm.name} onChange={(event) => setSubjectForm({ ...subjectForm, name: event.target.value })} placeholder="Ex.: Geografia" required /></FormField>
          <FormField label="Professor responsavel"><input value={subjectForm.teacher} onChange={(event) => setSubjectForm({ ...subjectForm, teacher: event.target.value })} placeholder="Nome do professor" required /></FormField>
          {subjectError && <p className="form-error" role="alert">{subjectError}</p>}
          <div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setSubjectEditor(null)}>Cancelar</button><button type="submit" className="button button-primary"><Save size={16} />Salvar disciplina</button></div>
        </form>
      </Modal>}
      {toast && <div className="toast-message" role="status"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  );
}

function LoginScreen({
  data,
  loginUser,
  loginPassword,
  loginError,
  onUserChange,
  onPasswordChange,
  onSubmit,
  onTeam,
  teamOpen,
}: {
  data: SchoolData;
  loginUser: string;
  loginPassword: string;
  loginError: string;
  onUserChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTeam: () => void;
  teamOpen: boolean;
}) {
  return (
    <main className="login-screen">
      <section className="login-art-panel">
        <div className="login-art-top"><span className="brand-mark brand-mark-light"><GraduationCap size={22} /></span><strong>escola<span>online</span></strong><button className="login-team-link" onClick={onTeam}>Nossa equipe <ArrowUpRight size={14} /></button></div>
        <div className="login-illustration" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-sun" /><div className="art-book"><BookOpen size={66} strokeWidth={1.25} /></div><div className="art-star star-one">✳</div><div className="art-star star-two">✦</div><div className="art-label label-one">APRENDER</div><div className="art-label label-two">CRESCER</div></div>
        <div className="login-art-copy"><p className="eyebrow eyebrow-light">UM NOVO JEITO DE APRENDER</p><h1>Conhecimento que<br /><em>abre caminhos.</em></h1><p>Uma escola conectada ao futuro e presente em cada conquista.</p><div className="login-art-foot"><span>01</span><span className="art-foot-line" /><span>ACOMPANHAMENTO ESCOLAR</span></div></div>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-mobile-brand"><span className="brand-mark"><GraduationCap size={20} /></span><strong>escola<span>online</span></strong></div>
          {teamOpen ? <TeamPublic data={data} onBack={onTeam} /> : <>
            <div className="login-heading"><p className="eyebrow">PORTAL ESCOLA HORIZONTE</p><h2>Bem-vindo de volta</h2><p>Acesse sua conta para continuar.</p></div>
            <form className="login-form" onSubmit={onSubmit}>
              <FormField label="Usuario"><input autoComplete="username" value={loginUser} onChange={(event) => onUserChange(event.target.value)} placeholder="Digite seu usuario" required /></FormField>
              <FormField label="Senha"><input type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => onPasswordChange(event.target.value)} placeholder="Digite sua senha" required /></FormField>
              {loginError && <p className="form-error login-error" role="alert"><AlertTriangle size={15} />{loginError}</p>}
              <button className="button button-primary login-submit" type="submit">Entrar no portal <ArrowRight size={17} /></button>
            </form>
            <details className="demo-accounts"><summary><span><LockKeyhole size={15} />Contas para demonstracao</span><ChevronDown size={15} /></summary>
              <div className="demo-account admin-demo"><span className="demo-role">ADMINISTRADOR</span><button type="button" onClick={() => { onUserChange("admin"); onPasswordChange("admin123"); }}>admin <span>Senha: admin123</span></button></div>
              <div className="demo-student-list"><span className="demo-role">ALUNOS · senha aluno123</span>{data.students.map((student) => <button key={student.id} type="button" onClick={() => { onUserChange(student.username); onPasswordChange("aluno123"); }}><span>{student.name}</span><strong>{student.username}</strong></button>)}</div>
            </details>
            <div className="login-disclaimer"><ShieldCheck size={16} /><p><strong>Acesso demonstrativo</strong><br />As credenciais e os dados ficam neste navegador. Nao utilize informacoes reais.</p></div>
          </>}
          <p className="login-copyright">© 2026 Escola Online <span>·</span> Projeto academico</p>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ data, onNavigate }: { data: SchoolData; onNavigate: (view: View) => void }) {
  const studentStatuses = data.students.map((student) => classifyGrade(studentAverage(student), data.rules.fiveToSix));
  const pendingGrades = data.students.reduce((total, student) => total + Object.values(student.grades).filter((grade) => grade === null).length, 0);
  const metrics = [
    { label: "Alunos cadastrados", value: data.students.length, detail: "matriculas ativas", icon: Users, tone: "mint" },
    { label: "Disciplinas", value: data.subjects.length, detail: "na grade escolar", icon: BookMarked, tone: "blue" },
    { label: "Alunos aprovados", value: studentStatuses.filter((status) => status === "passed").length, detail: "pela media geral", icon: CheckCircle2, tone: "green" },
    { label: "Em recuperacao", value: studentStatuses.filter((status) => status === "recovery").length, detail: "pela media geral", icon: Clock3, tone: "yellow" },
    { label: "Alunos reprovados", value: studentStatuses.filter((status) => status === "failed").length, detail: "pela media geral", icon: AlertTriangle, tone: "red" },
    { label: "Medias pendentes", value: pendingGrades, detail: "notas nao lancadas", icon: ClipboardList, tone: "neutral" },
  ];
  const recentStudents = [...data.students].slice(0, 5);

  return <>
    <section className="welcome-banner"><div className="welcome-copy"><span className="banner-kicker"><span className="banner-kicker-dot" />ANO LETIVO 2026</span><h2>Um bom dia para acompanhar<br />o <em>progresso de cada aluno.</em></h2><p>Os dados do painel refletem os registros salvos neste navegador.</p></div><div className="welcome-graphic" aria-hidden="true"><div className="graphic-ring ring-back" /><div className="graphic-ring ring-front" /><div className="graphic-book"><BookOpen size={50} strokeWidth={1.35} /></div><span className="graphic-star">✳</span><span className="graphic-dot dot-a" /><span className="graphic-dot dot-b" /></div><span className="banner-index">ESCOLA<br />HORIZONTE <span>· 2026</span></span></section>
    <div className="metrics-grid">{metrics.map((metric) => { const Icon = metric.icon; return <MetricCard key={metric.label} {...metric} icon={<Icon size={18} strokeWidth={1.8} />} />; })}</div>
    {data.rules.fiveToSix === "pending-rule" && <div className="rule-notice"><span className="rule-notice-icon"><CircleHelp size={17} /></span><p><strong>Faixa academica pendente de confirmacao</strong><span>Notas entre 5,00 e 5,99 seguem sem classificacao definitiva. Ajuste essa regra em Notas e medias.</span></p><button className="text-action" onClick={() => onNavigate("grades")}>Revisar regra <ArrowRight size={15} /></button></div>}
    <div className="dashboard-lower-grid"><section className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">ACOMPANHAMENTO</p><h2>Alunos recentes</h2></div><button className="text-action" onClick={() => onNavigate("students")}>Ver todos <ArrowRight size={15} /></button></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Aluno</th><th>Matricula</th><th>Media geral</th><th>Situacao</th></tr></thead><tbody>{recentStudents.map((student) => { const average = studentAverage(student); const status = classifyGrade(average, data.rules.fiveToSix); return <tr key={student.id}><td><div className="student-cell"><span className="avatar avatar-table">{initials(student.name)}</span><strong>{student.name}</strong></div></td><td className="muted-cell">{student.enrollment}</td><td>{average === null ? "—" : average.toFixed(1).replace(".", ",")}</td><td><StatusBadge status={status} /></td></tr>; })}</tbody></table></div></section><section className="panel quick-panel"><div className="panel-heading"><div><p className="eyebrow">ATALHOS</p><h2>Acesso rapido</h2></div><span className="quick-corner"><ArrowUpRight size={17} /></span></div><button className="quick-link" onClick={() => onNavigate("grades")}><span className="quick-link-icon quick-icon-coral"><ClipboardList size={18} /></span><span><strong>Lancar medias</strong><small>Atualize as notas da turma</small></span><ArrowRight size={16} /></button><button className="quick-link" onClick={() => onNavigate("students")}><span className="quick-link-icon quick-icon-blue"><Users size={18} /></span><span><strong>Gerenciar alunos</strong><small>Cadastros e matriculas</small></span><ArrowRight size={16} /></button><button className="quick-link" onClick={() => onNavigate("subjects")}><span className="quick-link-icon quick-icon-yellow"><BookMarked size={18} /></span><span><strong>Organizar disciplinas</strong><small>Materias e professores</small></span><ArrowRight size={16} /></button></section></div>
  </>;
}

function StudentsPage({ students, data, search, onSearch, onEdit, onDelete, onReport }: { students: Student[]; data: SchoolData; search: string; onSearch: (value: string) => void; onEdit: (student: Student) => void; onDelete: (student: Student) => void; onReport: (student: Student) => void }) {
  return <section className="panel table-panel"><div className="list-toolbar"><div className="list-count"><strong>{students.length}</strong><span>alunos encontrados</span></div><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por nome ou matricula" aria-label="Buscar aluno" />{search && <button aria-label="Limpar busca" onClick={() => onSearch("")}><X size={15} /></button>}</label></div>
    {students.length ? <div className="table-scroll"><table className="data-table student-table"><thead><tr><th>Estudante</th><th>Matricula</th><th>Usuario</th><th>Media geral</th><th>Situacao</th><th><span className="sr-only">Acoes</span></th></tr></thead><tbody>{students.map((student) => { const average = studentAverage(student); const status = classifyGrade(average, data.rules.fiveToSix); return <tr key={student.id}><td><div className="student-cell"><span className="avatar avatar-table">{initials(student.name)}</span><span><strong>{student.name}</strong><small>Senha demo: {student.password}</small></span></div></td><td className="muted-cell">{student.enrollment}</td><td><span className="username-cell">{student.username}</span></td><td>{average === null ? "—" : average.toFixed(1).replace(".", ",")}</td><td><StatusBadge status={status} /></td><td><div className="row-actions"><button className="icon-button" title="Ver boletim" aria-label={`Ver boletim de ${student.name}`} onClick={() => onReport(student)}><BookOpen size={16} /></button><button className="icon-button" title="Editar aluno" aria-label={`Editar ${student.name}`} onClick={() => onEdit(student)}><Pencil size={15} /></button><button className="icon-button icon-danger" title="Excluir aluno" aria-label={`Excluir ${student.name}`} onClick={() => onDelete(student)}><Trash2 size={15} /></button></div></td></tr>; })}</tbody></table></div> : <EmptyState title="Nenhum aluno encontrado" detail="Tente outro termo de busca ou cadastre um novo aluno." icon={<Users size={22} />} />}
    <div className="table-footnote"><ShieldCheck size={14} />Senhas demonstrativas ficam visiveis apenas para administracao neste navegador.</div></section>;
}

function SubjectsPage({ subjects, students, onEdit, onDelete, onGrades }: { subjects: Subject[]; students: Student[]; onEdit: (subject: Subject) => void; onDelete: (subject: Subject) => void; onGrades: () => void }) {
  return <><div className="subject-summary"><span className="summary-icon"><BookMarked size={19} /></span><div><strong>{subjects.length} disciplinas cadastradas</strong><p>As novas disciplinas sao associadas aos alunos existentes sem media lancada.</p></div><button className="text-action" onClick={onGrades}>Gerenciar associacoes <ArrowRight size={15} /></button></div>
    {subjects.length ? <div className="subject-grid">{subjects.map((subject, index) => <article className="subject-card" key={subject.id}><div className={`subject-card-top subject-color-${index % 4}`}><span className="subject-monogram">{subject.name.slice(0, 2).toUpperCase()}</span><div className="row-actions"><button className="icon-button" title="Editar disciplina" aria-label={`Editar ${subject.name}`} onClick={() => onEdit(subject)}><Pencil size={15} /></button><button className="icon-button icon-danger" title="Excluir disciplina" aria-label={`Excluir ${subject.name}`} onClick={() => onDelete(subject)}><Trash2 size={15} /></button></div></div><div className="subject-card-content"><p className="eyebrow">DISCIPLINA</p><h2>{subject.name}</h2><p className="teacher-name"><span className="teacher-dot" />{subject.teacher}</p><div className="subject-card-foot"><span><Users size={14} />{students.filter((student) => Object.hasOwn(student.grades, subject.id)).length} alunos associados</span><button className="text-action" onClick={onGrades}>Notas <ArrowRight size={14} /></button></div></div></article>)}</div> : <div className="panel"><EmptyState title="Nenhuma disciplina cadastrada" detail="Adicione uma disciplina para comecar a organizar a grade escolar." icon={<BookMarked size={22} />} /></div>}
  </>;
}

function GradesPage({ data, selectedStudentId, onStudentChange, drafts, errors, onDraftChange, onSave, onAssociate, onRuleChange }: { data: SchoolData; selectedStudentId: string; onStudentChange: (id: string) => void; drafts: Record<string, string>; errors: Record<string, string>; onDraftChange: (key: string, value: string) => void; onSave: (student: Student, subject: Subject) => void; onAssociate: (student: Student, subject: Subject, checked: boolean) => void; onRuleChange: (value: SchoolData["rules"]["fiveToSix"]) => void }) {
  const student = data.students.find((item) => item.id === selectedStudentId);
  const ruleLabels = { "pending-rule": "Pendente de confirmacao", recovery: "Recuperacao", failed: "Reprovado", passed: "Aprovado" };
  return <div className="grades-layout"><section className="panel grades-panel"><div className="grade-toolbar"><div><p className="eyebrow">REGISTRO INDIVIDUAL</p><h2>Medias por disciplina</h2><p>Uma media em branco permanece como nao lancada.</p></div><label className="select-field"><span>Selecionar aluno</span><select value={selectedStudentId} onChange={(event) => onStudentChange(event.target.value)}>{data.students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></label></div>
      {student ? <div className="grade-list">{data.subjects.map((subject) => { const associated = Object.hasOwn(student.grades, subject.id); const key = `${student.id}:${subject.id}`; const grade = associated ? student.grades[subject.id] : null; const draft = drafts[key] ?? (grade === null ? "" : String(grade)); const status = associated ? classifyGrade(grade, data.rules.fiveToSix) : "ungraded"; return <div className={`grade-row ${!associated ? "grade-row-muted" : ""}`} key={subject.id}><label className="association-control"><input type="checkbox" checked={associated} onChange={(event) => onAssociate(student, subject, event.target.checked)} /><span className="custom-check"><CheckCircle2 size={14} /></span></label><div className="grade-subject-info"><strong>{subject.name}</strong><span>{associated ? subject.teacher : "Nao associada a este aluno"}</span></div>{associated ? <><div className="grade-entry"><label htmlFor={`grade-${subject.id}`}>Media</label><div className="grade-input-wrap"><input id={`grade-${subject.id}`} type="number" min="0" max="10" step="0.1" value={draft} onChange={(event) => onDraftChange(key, event.target.value)} placeholder="—" aria-label={`Media de ${subject.name}`} /><span>/ 10</span></div>{errors[key] && <small className="grade-error">{errors[key]}</small>}</div><StatusBadge status={status} /><button className="button button-outline grade-save" onClick={() => onSave(student, subject)}><Save size={15} /><span>Salvar</span></button></> : <span className="not-associated-label">Sem associacao</span>}</div>; })}{data.subjects.length === 0 && <EmptyState title="Sem disciplinas" detail="Cadastre disciplinas antes de lancar medias." icon={<BookMarked size={22} />} />}</div> : <EmptyState title="Nenhum aluno cadastrado" detail="Cadastre alunos para iniciar o acompanhamento." icon={<Users size={22} />} />}
      <div className="grade-legend"><span><i className="legend-dot dot-green" />Aprovado</span><span><i className="legend-dot dot-yellow" />Recuperacao</span><span><i className="legend-dot dot-red" />Reprovado</span><span><i className="legend-dot dot-gray" />Nao lancada</span><span><i className="legend-dot dot-outline" />Regra pendente</span></div>
    </section><aside className="grade-side-column"><section className="panel rule-panel"><div className="side-panel-heading"><span className="rule-symbol"><SlidersHorizontal size={17} /></span><span><p className="eyebrow">CONFIGURACAO</p><h2>Faixa 5,00 a 5,99</h2></span></div><p>A regra original nao define uma situacao para essa faixa. Escolha um criterio provisoriamente ou mantenha pendente.</p><label className="rule-select-label">Situacao atribuida<select value={data.rules.fiveToSix} onChange={(event) => onRuleChange(event.target.value as SchoolData["rules"]["fiveToSix"])}>{Object.entries(ruleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span className="rule-pending-note"><CircleHelp size={14} />A confirmacao oficial ainda e necessaria.</span></section><section className="grade-guidance"><span className="guidance-icon"><AlertTriangle size={17} /></span><div><strong>Importante</strong><p>Digite um valor entre 0 e 10. Deixe em branco para indicar que a media ainda nao foi lancada.</p></div></section></aside></div>;
}

function ReportPage({ student, data, isAdmin, students, onStudentChange }: { student: Student | null | undefined; data: SchoolData; isAdmin: boolean; students: Student[]; onStudentChange: (id: string) => void }) {
  if (!student) return <div className="panel"><EmptyState title="Boletim indisponivel" detail="Nao foi possivel localizar os dados deste aluno." icon={<BookOpen size={22} />} /></div>;
  const grades = data.subjects.filter((subject) => Object.hasOwn(student.grades, subject.id));
  const average = studentAverage(student);
  const status = classifyGrade(average, data.rules.fiveToSix);
  const pending = grades.filter((subject) => student.grades[subject.id] === null).length;
  return <div className="report-wrap">{isAdmin && <div className="report-admin-select"><span>Visualizar boletim de:</span><label className="select-field"><select value={student.id} onChange={(event) => onStudentChange(event.target.value)}>{students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15} /></label></div>}
    <article className="report-document"><div className="report-accent" /><header className="report-header"><div className="report-school-mark"><span className="brand-mark"><GraduationCap size={20} /></span><span><strong>ESCOLA HORIZONTE</strong><small>BOLETIM ESCOLAR · 2026</small></span></div><span className="report-term">ANO LETIVO<br /><strong>2026</strong></span></header><div className="report-student-block"><div><p className="eyebrow">DADOS DO ESTUDANTE</p><h2>{student.name}</h2><p>Matricula <strong>{student.enrollment}</strong></p></div><div className="report-average"><span>MEDIA GERAL</span><strong>{average === null ? "—" : average.toFixed(1).replace(".", ",")}</strong><StatusBadge status={status} /></div></div><div className="report-table-heading"><div><p className="eyebrow">DESEMPENHO ACADEMICO</p><h3>Componentes curriculares</h3></div><span>{grades.length} disciplinas</span></div><div className="table-scroll"><table className="data-table report-table"><thead><tr><th>Disciplina</th><th>Professor</th><th>Media</th><th>Situacao academica</th></tr></thead><tbody>{grades.map((subject) => { const grade = student.grades[subject.id]; return <tr key={subject.id}><td><strong>{subject.name}</strong></td><td className="muted-cell">{subject.teacher}</td><td><strong className={grade === null ? "grade-null" : ""}>{grade === null ? "Nao lancada" : grade.toFixed(1).replace(".", ",")}</strong></td><td><StatusBadge status={classifyGrade(grade, data.rules.fiveToSix)} /></td></tr>; })}</tbody></table></div>{grades.length === 0 && <EmptyState title="Nenhuma disciplina associada" detail="A administracao ainda nao associou disciplinas a este aluno." icon={<BookOpen size={22} />} />}<footer className="report-footer"><span><ShieldCheck size={14} />Documento para consulta academica</span><span>{pending} medias pendentes</span></footer></article><p className="report-privacy"><LockKeyhole size={14} />Este boletim e pessoal. As medias nao podem ser alteradas nesta area.</p></div>;
}

function TeamPage({ data, isAdmin, draft, editing, onEdit, onCancel, onChange, onAdd, onRemove, onSave }: { data: SchoolData; isAdmin: boolean; draft: string[]; editing: boolean; onEdit: () => void; onCancel: () => void; onChange: (index: number, value: string) => void; onAdd: () => void; onRemove: (index: number) => void; onSave: () => void }) {
  return <div className="team-page"><section className="team-banner"><div><p className="eyebrow eyebrow-light">PROJETO ACADEMICO · 2026</p><h2>Escola<br /><em>Online.</em></h2><p>Uma plataforma feita para aproximar pessoas, aprendizado e novas possibilidades.</p></div><div className="team-banner-art" aria-hidden="true"><span className="team-art-circle" /><span className="team-art-book"><BookOpen size={55} strokeWidth={1.4} /></span><span className="team-art-star">✳</span></div><span className="team-banner-foot">EDUCACAO QUE CONECTA</span></section><section className="team-section"><div className="team-heading"><div><p className="eyebrow">POR TRAS DO PROJETO</p><h2>Nossa equipe</h2><p>Conheca quem construiu esta experiencia.</p></div>{isAdmin && !editing && <button className="button button-outline" onClick={onEdit}><Pencil size={15} />Editar nomes</button>}</div>{editing ? <div className="team-edit-panel"><div className="team-edit-fields">{draft.map((member, index) => <div className="team-edit-row" key={`team-${index}`}><label className="sr-only" htmlFor={`member-${index}`}>Nome do integrante {index + 1}</label><span className="team-edit-number">0{index + 1}</span><input id={`member-${index}`} value={member} onChange={(event) => onChange(index, event.target.value)} placeholder={`Nome do integrante ${index + 1}`} maxLength={70} />{draft.length > 1 && <button className="icon-button icon-danger" aria-label={`Remover integrante ${index + 1}`} onClick={() => onRemove(index)}><Trash2 size={15} /></button>}</div>)}</div><div className="team-edit-actions"><button className="button button-quiet" onClick={onCancel}>Cancelar</button>{draft.length < 6 && <button className="button button-outline" onClick={onAdd}><Plus size={15} />Adicionar integrante</button>}<button className="button button-primary" onClick={onSave}><Save size={15} />Salvar equipe</button></div></div> : <div className="team-member-grid">{data.team.map((member, index) => <article className={`team-member-card member-card-${index % 3}`} key={`${member}-${index}`}><span className="team-member-index">0{index + 1}</span><span className="team-member-avatar">{member.trim() ? initials(member) : "EO"}</span><div><p className="eyebrow">EQUIPE ESCOLA ONLINE</p><h3>{member || "Integrante"}</h3><span className="team-member-role">Desenvolvimento do projeto</span></div><span className="member-card-mark">✳</span></article>)}{data.team.length === 0 && <EmptyState title="Equipe a definir" detail="A administracao pode adicionar ate seis integrantes." icon={<UsersRound size={22} />} />}</div>}</section><div className="team-note"><span className="team-note-mark"><GraduationCap size={17} /></span><p><strong>Aprender e construir juntos.</strong><span>Escola Online foi desenvolvido como projeto de demonstracao academica.</span></p><span className="team-note-year">2026</span></div></div>;
}

function TeamPublic({ data, onBack }: { data: SchoolData; onBack: () => void }) {
  return <div className="public-team"><button className="text-action" onClick={onBack}>← Voltar ao acesso</button><p className="eyebrow">PROJETO ACADEMICO</p><h2>Nossa equipe</h2><p className="public-team-description">Escola Online · uma plataforma feita para aproximar pessoas e aprendizado.</p>{data.team.map((member, index) => <div className="public-team-member" key={`${member}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{member}</strong><small>Desenvolvimento do projeto</small></div>)}</div>;
}

function MetricCard({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: ReactNode; tone: string }) {
  return <article className="metric-card"><span className={`metric-icon metric-${tone}`}>{icon}</span><span className="metric-detail">{detail}</span><p>{label}</p><strong>{value.toLocaleString("pt-BR")}</strong><span className="metric-trend"><span className="trend-mark">↗</span> atualizado agora</span></article>;
}

function StatusBadge({ status }: { status: GradeStatus }) {
  const icons: Record<GradeStatus, ReactNode> = {
    passed: <CheckCircle2 size={13} />,
    recovery: <Clock3 size={13} />,
    failed: <AlertTriangle size={13} />,
    ungraded: <span className="badge-neutral-dot" />,
    "pending-rule": <CircleHelp size={13} />,
  };
  return <span className={`status-badge ${statusStyles[status]}`}>{icons[status]}{statusLabels[status]}</span>;
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header className="modal-header"><div><p className="eyebrow">ESCOLA ONLINE</p><h2 id="modal-title">{title}</h2></div><button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={19} /></button></header>{children}</section></div>;
}

function EmptyState({ title, detail, icon }: { title: string; detail: string; icon: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{detail}</p></div>;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}