import os
import sqlite3
import datetime
import subprocess
import sys

# Garante o carregamento automático do Flask caso a imagem não possua instalado nativamente
try:
    from flask import Flask, jsonify, request, send_from_directory
except ImportError:
    print("Flask não encontrado. Instalando automaticamente...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask"])
    from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder="dist", static_url_path="")

# 1. Conexão Segura e Thread-Safe com o Banco de Dados SQLite Relacional
def get_db():
    db_path = os.path.join(os.getcwd(), "database.sqlite")
    conn = sqlite3.connect (db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

# 1.1 Auxiliares de Mascaramento LGPD (Server-side Sanitization)
def mask_email(email):
    if not email:
        return ""

    try:
        parts = email.split("@")
        if len(parts) == 2:
            local, domain = parts
            if len(local) <= 3:
                return f"{local[0]}***@{domain}"
            return f"{local[:3]}***{local[-1]}@{domain}"
    except Exception:
        pass
    return "e***@***.com"

def mask_registration(reg):
    if not reg:
        return ""
    if len(reg) <= 4:
        return "****"
    return f"{reg[:3]}***{reg[-2:]}"

# 2. Inicialização do Esquema de Tabelas Profissionais
def init_db():
    db_path = os.path.join(os.getcwd(), "database.sqlite")
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    # Tabela 1: Professores Orientadores (Dono único das chaves)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS professors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        email TEXT
    )
    """)
    
    # Tabela 2: Alunos (Graduação e Pós-Graduação)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        registration_number TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL, -- 'Graduação' ou 'Pós-Graduação'
        professor_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE RESTRICT
    )
    """)
    
    # Tabela 3: Chaves do NetLab
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS keys (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'disponivel', -- 'disponivel' ou 'emprestada'
        current_student_id INTEGER,
        last_borrowed_at DATETIME,
        FOREIGN KEY (current_student_id) REFERENCES students(id) ON DELETE SET NULL
    )
    """)
    
    # Tabela 4: Registro de Histórico de Empréstimo de Chaves
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS key_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_id INTEGER NOT NULL,
        student_id INTEGER,
        student_name_snapshot TEXT NOT NULL,
        taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        returned_at DATETIME,
        FOREIGN KEY (key_id) REFERENCES keys(id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
    )
    """)

    # Sementes padrão: Configurar apenas um Professor Orientador