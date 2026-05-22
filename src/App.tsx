import React, { useState, useEffect } from "react";
import {
    Key as KeyIcon,
    Users,
    History,
    UserPlus,
    Plus,
    Trash2,
    Edit,
    CheckCircle,
    XSquare,
    Search,
    ArrowLeftRight,
    GraduationCap,
    Clock,
    UserCheck,
    RefreshCw,
    FileText,
    Check,
    AlertCircle,
    Mail,
    Hash,
    User,
    AlertTriangle,
    School
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Key, Student, Professor, KeyLog } from "./types";

export default function App() {
    // Navigation / Tabs
    const [activeTab, setActiveTab] = useState<"dashboard" | "students" | "history">("dashboard");

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
}