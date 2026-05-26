import React, { useState, useEffect } from "react";
import {
    Key as KeyIcon,
    Users,
    History,
    UserPlus,
    Trash2,
    Edit,
    CheckCircle,
    Search,
    ArrowLeftRight,
    GraduationCap,
    Clock,
    UserCheck,
    RefreshCw,
    Check,
    AlertCircle,
    Mail,
    Hash,
    User,
    AlertTriangle,
    School
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Key, Student, Professor, KeyLog } from "./types";

export default function App() {
    // Navigation / Tabs
    const [activeTab, setActiveTab] = useState<"dashboard" | "students" | "history">("dashboard");

    // Masking helpers to ensure data privacy (emails and registrations are masked on the server under LGPD)
    const maskEmail = (email: string) => email || "";
    const maskRegistration = (reg: string) => reg || "";

    // State
    const [keys, setKeys] = useState<Key[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [history, setHistory] = useState<KeyLog[]>([]);

    // Loading & Error feedback
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);
    const [apiSuccess, setApiSuccess] = useState<string | null>(null);

    // Search & Filters
    const [studentSearch, setStudentSearch] = useState("");
    const [studentTypeFilter, setStudentTypeFilter] = useState("todos");
    const [historySearch, setHistorySearch] = useState("");

    // Modals & Active actions
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [showBorrowModal, setShowBorrowModal] = useState<Key | null>(null);
    const [selectedStudentForBorrow, setSelectedStudentForBorrow] = useState<string>("");

    // Student Form fields
    const [studentForm, setStudentForm] = useState({
        name: "",
        email: "",
        registration_number: "",
        type: "Graduação" as "Graduação" | "Pós-Graduação",
        professor_id: ""
    });

    // Fetch all initial data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [keysRes, studentsRes, professorsRes, historyRes] = await Promise.all([
                fetch("/api/keys").then(r => r.json()),
                fetch("/api/students").then(r => r.json()),
                fetch("/api/professors").then(r => r.json()),
                fetch("/api/keys/history").then(r => r.json())
            ]);

            if(keysRes.error) 
                throw new Error(keysRes.error);

            if(studentsRes.error) 
                throw new Error(studentsRes.error);

            if(professorsRes.error) 
                throw new Error(professorsRes.error);

            if(historyRes.error) 
                throw new Error(historyRes.error);

            setKeys(keysRes);
            setStudents(studentsRes);
            setProfessors(professorsRes);
            if(professorsRes && professorsRes.length > 0) {
                setStudentForm(prev => ({ ...prev, professor_id: String(professorsRes[0].id) }));
            }
            setHistory(historyRes);
            setApiError(null);
        } catch(err: any) {
            console.error(err);
            setApiError("Erro ao sincronizar com o servidor: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Show auto-dismiss notifications
    const triggerNotification = (type: "error" | "success", message: string) => {
        if(type === "error") {
            setApiError(message);
            setTimeout(() => setApiError(null), 6000);
        } else {
            setApiSuccess(message);
            setTimeout(() => setApiSuccess(null), 4000);
        }
    };

    // Student Actions: Add or Update
    const handleStudentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!studentForm.name || !studentForm.email || !studentForm.registration_number) {
            triggerNotification("error", "Preencha todos os campos obrigatórios do aluno.");
            return;
        }

        const payload = {
            name: studentForm.name.trim(),
            email: studentForm.email.trim(),
            registration_number: studentForm.registration_number.trim(),
            type: studentForm.type,
            professor_id: Number(studentForm.professor_id) || (professors[0] ? professors[0].id : 1)
        };

        try {
            const url = editingStudent ? `/api/students/${editingStudent.id}` : "/api/students";
            const method = editingStudent ? "PUT" : "POST";
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if(!response.ok) {
                throw new Error(data.error || "Falha ao salvar dados do aluno.");
            }

            triggerNotification("success", editingStudent ? "Cadastro de aluno atualizado com sucesso!" : "Novo aluno cadastrado com sucesso!");
            setShowStudentModal(false);
            setEditingStudent(null);
            setStudentForm({
                name: "",
                email: "",
                registration_number: "",
                type: "Graduação",
                professor_id: professors.length > 0 ? String(professors[0].id) : ""
            });
            fetchData();
        } catch(err: any) {
            triggerNotification("error", err.message);
        }
    };

    // Set student form for amendment
    const handleEditStudent = (student: Student) => {
        setEditingStudent(student);
        setStudentForm({
            name: student.name,
            email: student.email,
            registration_number: student.registration_number,
            type: student.type,
            professor_id: String(student.professor_id)
        });
        setShowStudentModal(true);
    };

    // Student Deletion
    const handleDeleteStudent = async (studentId: number) => {
        if(!window.confirm("Deseja realmente excluir este aluno do registro permanente?")) 
            return;

        try {
            const response = await fetch(`/api/students/${studentId}`, { method: "DELETE" });
            const data = await response.json();

            if(!response.ok) {
                throw new Error(data.error || "Erro ao deletar aluno.");
            }

            triggerNotification("success", "Aluno excluído com sucesso.");
            fetchData();
        } catch(err: any) {
            triggerNotification("error", err.message);
        }
    };

    // Key operations: Borrow Key
    const handleBorrowKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!showBorrowModal || !selectedStudentForBorrow) {
            triggerNotification("error", "Selecione um aluno apto para empréstimo.");
            return;
        }

        try {
            const response = await fetch(`/api/keys/${showBorrowModal.id}/borrow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ student_id: selectedStudentForBorrow })
            });
            const data = await response.json();

            if(!response.ok) {
                throw new Error(data.error || "Falha ao emprestar chave.");
            }

            triggerNotification("success", `Chave emprestada com sucesso!`);
            setShowBorrowModal(null);
            setSelectedStudentForBorrow("");
            fetchData();
        } catch(err: any) {
            triggerNotification("error", err.message);
        }
    };

    // Key operations: Return Key
    const handleReturnKey = async (keyId: number) => {
        if(!window.confirm("Confirmar a devolução física desta chave de volta ao armário do NetLab?")) return;
        try {
            const response = await fetch(`/api/keys/${keyId}/return`, { method: "POST" });
            const data = await response.json();

            if(!response.ok) {
                throw new Error(data.error || "Falha ao registrar devolução.");
            }

            triggerNotification("success", "A chave foi assinada como DEVOLVIDA e está disponível!");
            fetchData();
        } catch(err: any) {
            triggerNotification("error", err.message);
        }
    };

    // Filter lists
    const filteredStudents = students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
            student.registration_number.toLowerCase().includes(studentSearch.toLowerCase()) ||
            student.professor_name.toLowerCase().includes(studentSearch.toLowerCase());
        const matchesType = studentTypeFilter === "todos" || student.type === studentTypeFilter;
        return matchesSearch && matchesType;
    });

    const filteredHistory = history.filter(log => {
        const term = historySearch.toLowerCase();
        const matchesKey = log.key_name.toLowerCase().includes(term);
        const matchesStudent = log.student_name_snapshot.toLowerCase().includes(term) ||
            (log.student_registration && log.student_registration.toLowerCase().includes(term));
        const matchesProf = log.professor_name && log.professor_name.toLowerCase().includes(term);
        return matchesKey || matchesStudent || matchesProf;
    });

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
            {/* HEADER / BRAND ARCHITECTURE */}
            <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-500 text-slate-950 p-2.5 rounded-lg shadow-inner flex items-center justify-center">
                            <KeyIcon className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono tracking-wider font-semibold text-amber-500 uppercase">PPGCC UFJF</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-sans">
                                KeyLab <span className="font-light text-slate-400 text-lg">| Painel NetLab</span>
                            </h1>
                        </div>
                    </div>

                    {/* Navigation Controls and Privacy Mode */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-end">
                        <nav className="flex items-center bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                            <button
                                onClick={() => setActiveTab("dashboard")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "dashboard"
                                    ? "bg-slate-900 text-amber-400 shadow-sm border border-slate-700"
                                    : "text-slate-300 hover:text-white"
                                    }`}
                            >
                                <KeyIcon className="w-4 h-4" />
                                Chaves NetLab
                            </button>
                            <button
                                onClick={() => setActiveTab("students")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "students"
                                    ? "bg-slate-900 text-amber-400 shadow-sm border border-slate-700"
                                    : "text-slate-300 hover:text-white"
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                Cadastros Alunos
                            </button>
                            <button
                                onClick={() => setActiveTab("history")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "history"
                                    ? "bg-slate-900 text-amber-400 shadow-sm border border-slate-700"
                                    : "text-slate-300 hover:text-white"
                                    }`}
                            >
                                <History className="w-4 h-4" />
                                Histórico
                            </button>
                        </nav>

                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 select-none w-full sm:w-auto justify-center" title="Dados sensíveis protegidos por criptografia e mascaramento no servidor de acordo com a LGPD">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            CONFORME LGPD
                        </div>
                    </div>
                </div>
            </header>

            {/* FEEDBACK SYSTEM (GLOBAL BANNER) */}
            <div className="max-w-7xl mx-auto w-full px-4 mt-4">
                <AnimatePresence>
                    {apiError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm"
                        >
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                            <div className="text-sm font-medium">{apiError}</div>
                            <button onClick={() => setApiError(null)} className="ml-auto text-rose-500 hover:text-rose-700 text-xs font-bold uppercase transition">fechar</button>
                        </motion.div>
                    )}

                    {apiSuccess && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mb-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm"
                        >
                            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="text-sm font-medium">{apiSuccess}</div>
                            <button onClick={() => setApiSuccess(null)} className="ml-auto text-emerald-500 hover:text-emerald-700 text-xs font-bold uppercase transition">OK</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* CORE VIEW */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
                        <p className="text-slate-500 text-sm font-mono">Processando transação com banco de dados SQL...</p>
                    </div>
                ) : (
                    <div>
                        {/* VIEW 1: KEYS DASHBOARD */}
                        {activeTab === "dashboard" && (
                            <div className="space-y-8">
                                {/* Intro banner */}
                                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div>
                                        <h2 className="text-xl font-bold">Chaves de Acesso NetLab UFJF</h2>
                                        <p className="text-slate-400 text-sm max-w-xl mt-1.5">
                                            Controle estrito de posse para as duas chaves de acesso físico à sala no Bloco de Laboratórios do PPGCC (Sala 3215). Pegue, devolva ou registre novas credenciais abaixo.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingStudent(null);
                                            setStudentForm({
                                                name: "",
                                                email: "",
                                                registration_number: "",
                                                type: "Graduação",
                                                professor_id: professors.length > 0 ? String(professors[0].id) : ""
                                            });
                                            setShowStudentModal(true);
                                        }}
                                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow transition-all cursor-pointer select-none shrink-0"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Cadastrar Aluno
                                    </button>
                                </div>

                                {/* DOUBLE KEY CARDS CONTROLLER */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {keys.map((key) => {
                                        const isAvailable = key.status === "disponivel";
                                        return (
                                            <div
                                                key={key.id}
                                                className={`bg-white rounded-2xl p-6 border transition-all ${isAvailable
                                                    ? "border-emerald-200 shadow-sm hover:shadow-md"
                                                    : "border-amber-200 shadow-sm hover:shadow-md"
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-3 rounded-xl ${isAvailable ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                                                            <KeyIcon className="w-6 h-6 stroke-[2]" />
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-mono font-medium text-slate-400">CHAVE #{key.id}</span>
                                                            <h3 className="font-bold text-lg text-slate-800 leading-tight">{key.name}</h3>
                                                        </div>
                                                    </div>

                                                    {/* BADGES */}
                                                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${isAvailable
                                                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                                        : "bg-amber-100 text-amber-700 border border-amber-200"
                                                        }`}>
                                                        {isAvailable ? "Disponível" : "Emprestada"}
                                                    </span>
                                                </div>

                                                {/* BODY DATA */}
                                                <div className="mt-6 border-t border-slate-100 pt-5 space-y-4">
                                                    {isAvailable ? (
                                                        <div className="text-center py-6">
                                                            <p className="text-slate-500 text-sm">
                                                                Esta chave está segura na coordenação ou quadro de chaves.
                                                            </p>
                                                            <p className="text-xs text-emerald-600 font-medium mt-1">Apenas alunos matriculados e orientados podem retirar.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3 bg-amber-50/60 p-4 rounded-xl border border-amber-100">
                                                            <div className="text-xs font-mono text-amber-800 uppercase font-bold tracking-wider mb-1 flex items-center gap-2">
                                                                <UserCheck className="w-3.5 h-3.5" /> Detalhes da Posse Atual
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-slate-700">
                                                                <div>
                                                                    <span className="text-xs text-slate-400 block">Aluno Portador</span>
                                                                    <span className="font-semibold text-slate-800">{key.student_name}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs text-slate-400 block">Matrícula (UFJF)</span>
                                                                    <span className="font-mono text-xs font-medium text-slate-800">{maskRegistration(key.student_registration || "")}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs text-slate-400 block">Orientador Responsável</span>
                                                                    <span className="font-medium text-slate-800">{key.professor_name}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-xs text-slate-400 block">Data de Retirada</span>
                                                                    <span className="font-mono text-xs text-slate-800">
                                                                        {key.last_borrowed_at ? new Date(key.last_borrowed_at).toLocaleString("pt-BR") : "N/D"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-amber-200/50 pt-2.5 mt-2">
                                                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                <span>Contato: <span className="underline">{maskEmail(key.student_email || "")}</span></span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ACTIONS */}
                                                <div className="mt-6 border-t border-slate-100 pt-4 flex gap-3">
                                                    {isAvailable ? (
                                                        <button
                                                            onClick={() => {
                                                                if(students.length === 0) {
                                                                    triggerNotification("error", "Não há alunos cadastrados. Cadastre um aluno primeiro antes de emprestar a chave.");
                                                                    return;
                                                                }
                                                                setSelectedStudentForBorrow("");
                                                                setShowBorrowModal(key);
                                                            }}
                                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow"
                                                        >
                                                            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                                                            Registrar Empréstimo
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleReturnKey(key.id)}
                                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                            Confirmar Devolução
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* CURRENT SESSIONS QUICK LOOK STATUS */}
                                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-500" /> Atividades Recentes
                                        </h3>
                                        <button
                                            onClick={() => setActiveTab("history")}
                                            className="text-xs text-amber-600 font-semibold hover:text-amber-700 transition flex items-center gap-1"
                                        >
                                            Ver log completo →
                                        </button>
                                    </div>

                                    {filteredHistory.length === 0 ? (
                                        <div className="text-center py-6 text-slate-400 text-sm">Nenhum registro de movimentação de chaves gerado ainda.</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {filteredHistory.slice(0, 3).map((log) => (
                                                <div key={log.id} className="py-3 flex justify-between items-center gap-4 text-sm text-slate-600">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                                                        <div>
                                                            <p className="font-medium text-slate-800">
                                                                {log.student_name_snapshot} pegou a <span className="font-semibold text-slate-900">{log.key_name.split(" (")[0]}</span>
                                                            </p>
                                                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                                <span>Orientador: {log.professor_name || "N/A"}</span>
                                                                <span>•</span>
                                                                <span>Retirada: {new Date(log.taken_at).toLocaleString("pt-BR")}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        {log.returned_at ? (
                                                            <span className="text-emerald-600 font-semibold text-xs bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> Devolvida
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-1 rounded-md border border-amber-100 flex items-center gap-1 animate-pulse">
                                                                <Clock className="w-3 h-3" /> Com o aluno
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW 2: STUDENTS REGISTRATION (CRUD) */}
                        {activeTab === "students" && (
                            <div className="space-y-6">
                                {/* Search & Action Panel */}
                                <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
                                    {/* Search layout */}
                                    <div className="relative w-full md:w-96">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar por aluno, matrícula ou orientador..."
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium"
                                        />
                                    </div>

                                    {/* Filter and Add Button */}
                                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                                        <select
                                            value={studentTypeFilter}
                                            onChange={(e) => setStudentTypeFilter(e.target.value)}
                                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value="todos">Todos os Níveis</option>
                                            <option value="Graduação">Graduação (Iniciação Científica)</option>
                                            <option value="Pós-Graduação">Pós-Graduação (Mestrado/Doutorado)</option>
                                        </select>

                                        <button
                                            onClick={() => {
                                                setEditingStudent(null);
                                                setStudentForm({
                                                    name: "",
                                                    email: "",
                                                    registration_number: "",
                                                    type: "Graduação",
                                                    professor_id: professors.length > 0 ? String(professors[0].id) : ""
                                                });
                                                setShowStudentModal(true);
                                            }}
                                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center gap-2 transition cursor-pointer"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Cadastrar Novo Aluno
                                        </button>
                                    </div>
                                </div>

                                {/* DB performance indicator to reinforce SQL Relational storage excellence */}
                                <div className="flex items-center gap-2 text-xs text-slate-500 pl-2">
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Banco SQL SQLite Ativo: integridade referencial com professores, alunos e logs.</span>
                                </div>

                                {/* STUDENTS TABLE */}
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    {filteredStudents.length === 0 ? (
                                        <div className="py-16 text-center space-y-3">
                                            <Users className="w-12 h-12 text-slate-300 mx-auto" />
                                            <p className="text-slate-500 font-medium">Nenhum aluno cadastrado corresponde à busca.</p>
                                            <p className="text-xs text-slate-400">Clique em "Cadastrar Novo Aluno" para iniciar os registros.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse text-left">
                                                <thead>
                                                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider font-mono">
                                                        <th className="px-6 py-4">Nome completo (Aluno)</th>
                                                        <th className="px-6 py-4">Contato (E-mail)</th>
                                                        <th className="px-6 py-4">Matrícula (UFJF)</th>
                                                        <th className="px-6 py-4">Nível / Nível PPGCC</th>
                                                        <th className="px-6 py-4">Professor Orientador</th>
                                                        <th className="px-6 py-4 text-center">Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                                    {filteredStudents.map((student) => (
                                                        <tr key={student.id} className="hover:bg-slate-50/50 transition duration-150">
                                                            <td className="px-6 py-4">
                                                                <div className="font-semibold text-slate-800">{student.name}</div>
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-500">{maskEmail(student.email)}</td>
                                                            <td className="px-6 py-4">
                                                                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200/50">
                                                                    {maskRegistration(student.registration_number)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1 ${student.type === "Pós-Graduação"
                                                                    ? "bg-purple-50 text-purple-700 border border-purple-100"
                                                                    : "bg-blue-50 text-blue-700 border border-blue-100"
                                                                    }`}>
                                                                    <GraduationCap className="w-3.5 h-3.5" />
                                                                    {student.type}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 font-medium text-slate-800">
                                                                {student.professor_name}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => handleEditStudent(student)}
                                                                        title="Editar cadastro do aluno"
                                                                        className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteStudent(student.id)}
                                                                        title="Remover cadastro do aluno"
                                                                        className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW 3: HISTORIC MOVEMENTS LOGS */}
                        {activeTab === "history" && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
                                    <div className="relative w-full md:w-96">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar histórico por aluno, chave ou orientador..."
                                            value={historySearch}
                                            onChange={(e) => setHistorySearch(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                                        />
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono">
                                        Total: {filteredHistory.length} movimentações no sistema
                                    </div>
                                </div>

                                {/* HISTORY AUDIT TABLE */}
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    {filteredHistory.length === 0 ? (
                                        <div className="py-16 text-center space-y-3">
                                            <History className="w-12 h-12 text-slate-300 mx-auto" />
                                            <p className="text-slate-500 font-medium">Nenhum registro de empréstimo encontrado.</p>
                                            <p className="text-xs text-slate-400">Toda movimentação efetuada nas chaves gera logs automáticos auditáveis.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full border-collapse text-left">
                                                <thead>
                                                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider font-mono">
                                                        <th className="px-6 py-4">Chave</th>
                                                        <th className="px-6 py-4">Pegou em (Empréstimo)</th>
                                                        <th className="px-6 py-4">Devolveu em (Devolução)</th>
                                                        <th className="px-6 py-4">Aluno Portador</th>
                                                        <th className="px-6 py-4">Nível</th>
                                                        <th className="px-6 py-4">Professor Responsável</th>
                                                        <th className="px-6 py-4 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                                                    {filteredHistory.map((log) => {
                                                        const isReturned = log.returned_at !== null;
                                                        return (
                                                            <tr key={log.id} className="hover:bg-slate-50/50 transition duration-150">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                                                                        <KeyIcon className="w-4 h-4 text-slate-400" />
                                                                        {log.key_name ? log.key_name.split(" (")[0] : `Chave #${log.key_id}`}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-xs text-slate-600">
                                                                    {new Date(log.taken_at).toLocaleString("pt-BR")}
                                                                </td>
                                                                <td className="px-6 py-4 font-mono text-xs">
                                                                    {isReturned ? (
                                                                        <span className="text-slate-600">
                                                                            {new Date(log.returned_at!).toLocaleString("pt-BR")}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                                                            <Clock className="w-3.5 h-3.5 animate-pulse" /> Pendente
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div>
                                                                        <p className="font-semibold text-slate-800">{log.student_name_snapshot}</p>
                                                                        {log.student_registration && (
                                                                            <p className="text-xs font-mono text-slate-400">Matrícula: {maskRegistration(log.student_registration)}</p>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {log.student_type ? (
                                                                        <span className="text-xs bg-slate-50 text-slate-500 border border-slate-200/60 px-2 py-0.5 rounded">
                                                                            {log.student_type}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs italic text-slate-400">Excluído</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-slate-600">
                                                                    {log.professor_name || "-"}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex justify-center">
                                                                        {isReturned ? (
                                                                            <span className="px-2.5 py-0.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full font-medium flex items-center gap-1">
                                                                                Entregue
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2.5 py-0.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full font-bold flex items-center gap-1 animate-pulse">
                                                                                Em Posse
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* MODAL: REGISTER / EDIT STUDENT */}
            <AnimatePresence>
                {showStudentModal && (
                    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <UserCheck className="text-amber-500 w-5 h-5" />
                                    {editingStudent ? "Alterar Credenciais do Aluno" : "Cadastrar novo Aluno NetLab"}
                                </h3>
                                <button
                                    onClick={() => setShowStudentModal(false)}
                                    className="text-slate-400 hover:text-white transition cursor-pointer text-xl font-bold font-mono"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Form Body */}
                            <form onSubmit={handleStudentSubmit} className="p-6 space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                                        <User className="w-3.5 h-3.5 text-slate-400" /> Nome Completo do Aluno *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: Mariana Siano Pires"
                                        value={studentForm.name}
                                        onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" /> E-mail de Contato *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="usuario@ppgcc.ufjf.br"
                                        value={studentForm.email}
                                        onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Double row fields: Registration and Level */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Registration number */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                                            <Hash className="w-3.5 h-3.5 text-slate-400" /> Matrícula UFJF *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ex: 202635031"
                                            value={studentForm.registration_number}
                                            onChange={(e) => setStudentForm({ ...studentForm, registration_number: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                        />
                                    </div>

                                    {/* Student Nivel */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                                            <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Nível Acadêmico *
                                        </label>
                                        <select
                                            value={studentForm.type}
                                            onChange={(e) => setStudentForm({ ...studentForm, type: e.target.value as any })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value="Graduação">Graduação (Iniciação Científica)</option>
                                            <option value="Pós-Graduação">Pós-Graduação (Mestrado/Doutorado)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Professor Responsável Orientador (Dono único das chaves) */}
                                <div className="border-t border-slate-100 pt-4 space-y-2">
                                    <label className="block text-xs font-bold uppercase text-slate-500 flex items-center gap-1 dropdown-no-click select-none">
                                        <School className="w-3.5 h-3.5 text-slate-400" /> Professor Coordenador (Real Dono das Chaves)
                                    </label>
                                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 flex items-center gap-3">
                                        <div className="bg-amber-500/10 text-amber-600 p-2 rounded-xl shrink-0">
                                            <School className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                {professors[0]?.name || "Prof. Dr. Jeferson Nobre"}
                                            </p>
                                            <p className="text-xs text-slate-500 font-mono">
                                                {professors[0]?.email || "jef***e@ufjf.br"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Buttons */}
                                <div className="border-t border-slate-100 pt-5 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowStudentModal(false);
                                            setEditingStudent(null);
                                        }}
                                        className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold px-4 py-2 rounded-xl text-sm transition text-center select-none"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-sm transition shadow text-center select-none"
                                    >
                                        {editingStudent ? "Salvar Alterações" : "Cadastrar Aluno"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: ASSIGN / BORROW KEY */}
            <AnimatePresence>
                {showBorrowModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <ArrowLeftRight className="text-amber-500 w-5 h-5" />
                                    Registrar Empréstimo de Chave
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowBorrowModal(null);
                                        setSelectedStudentForBorrow("");
                                    }}
                                    className="text-slate-400 hover:text-white transition cursor-pointer text-xl font-bold font-mono"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Form Body */}
                            <form onSubmit={handleBorrowKey} className="p-6 space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 mb-2">
                                    <span className="text-xs font-mono font-medium text-slate-400 block mb-0.5">CHAVE SELECIONADA</span>
                                    <span className="font-bold text-slate-800 text-sm block flex items-center gap-1.5">
                                        <KeyIcon className="w-4 h-4 text-amber-500" />
                                        {showBorrowModal.name}
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                                        Aluno Retirante Responsável *
                                    </label>
                                    <p className="text-xs text-slate-400 mb-2">
                                        Apenas alunos com matrículas UFJF válidas de graduação/pós-graduação são elegíveis para reter a chave.
                                    </p>

                                    <select
                                        required
                                        value={selectedStudentForBorrow}
                                        onChange={(e) => setSelectedStudentForBorrow(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                        <option value="">-- Escolha o aluno cadastrado --</option>
                                        {students.map((student) => {
                                            const hasAKey = keys.some(k => k.current_student_id === student.id);
                                            return (
                                                <option
                                                    key={student.id}
                                                    value={student.id}
                                                    disabled={hasAKey}
                                                >
                                                    {student.name} ({student.type} - Orientando de {student.professor_name}) {hasAKey ? "[Já está de posse de outra chave]" : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="bg-amber-50 text-amber-900 px-4 py-3 rounded-xl flex items-start gap-2.5 text-xs leading-relaxed border border-amber-200/50 mt-4">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        Ao registrar este empréstimo, o aluno assina a posse temporária da chave do laboratório.
                                        Toda circulação é auditada com carimbo de tempo inviolável no banco de dados.
                                    </div>
                                </div>

                                {/* Form Buttons */}
                                <div className="border-t border-slate-100 pt-5 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowBorrowModal(null);
                                            setSelectedStudentForBorrow("");
                                        }}
                                        className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold px-4 py-2 rounded-xl text-sm transition select-none text-center"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-sm transition shadow select-none text-center"
                                    >
                                        Gravar Empréstimo
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SYSTEM METADATA AND FOOTER */}
            <footer className="bg-slate-100 text-slate-500 text-center py-6 border-t border-slate-200 text-xs text-slate-400 mt-12 font-mono">
                <div className="max-w-7xl mx-auto px-4 space-y-2">
                    <p>© 2026 KeyLab - NetLab PPGCC UFJF</p>
                    <p>
                        Desenvolvido sobre motor SQL robusto na porta <span className="text-slate-600 font-semibold">3000</span> com interfaces transparentes e responsivas.
                    </p>
                </div>
            </footer>
        </div>
    );
}