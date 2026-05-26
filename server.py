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
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

# 2. Inicialização do Esquema de Tabelas Profissionais
def init_db():
    db_path = os.path.join(os.getcwd(), "database.sqlite")
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    # Tabela 1: Professores Orientadores
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

    # Sementes padrão de Professores Orientadores do PPGCC/UFJF se vazio
    cursor.execute("SELECT COUNT(*) FROM professors")
    if cursor.fetchone()[0] == 0:
        default_profs = [
            ("Prof. Dr. Jeferson Nobre", "jeferson.nobre@ufjf.br"),
            ("Prof. Dr. Eduardo Barrere", "eduardo.barrere@ufjf.br"),
            ("Prof. Dr. Rodrigo Weber", "rodrigo.weber@ufjf.br"),
            ("Prof. Dr. Victor Ströele", "victor.strole@ufjf.br"),
            ("Prof. Dr. Regina Braga", "regina.braga@ufjf.br"),
            ("Prof. Dr. Marco Antônio de Souza", "marco.antonio@ufjf.br"),
            ("Prof. Dr. Itamar Leite", "itamar.leite@ufjf.br"),
            ("Prof. Dr. Gleiph Ghiardi", "gleiph.ghiardi@ufjf.br")
        ]
        cursor.executemany("INSERT INTO professors (name, email) VALUES (?, ?)", default_profs)

    # Sementes padrão para as 2 chaves do NetLab se vazio
    cursor.execute("SELECT COUNT(*) FROM keys")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO keys (id, name, status) VALUES (1, 'Chave Principal (Lab NetLab - Sala 3215)', 'disponivel')")
        cursor.execute("INSERT INTO keys (id, name, status) VALUES (2, 'Chave Reserva (Lab NetLab - Sala 3215)', 'disponivel')")

    conn.commit()
    conn.close()
    print("Banco de dados SQLite inicializado perfeitamente com intrgridade referencial")

# 3. ENDPOINTS DA API REST

# --- PROFESSORES ---
@app.route("/api/professors", methods=["GET"])
def get_professors():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM professors ORDER BY name ASC")
        rows = cursor.fetchall()
        professors = [dict(row) for row in rows]
        conn.close()
        return jsonify(professors)
    except Exception as e:
        return jsonify({"error": f"Erro ao buscar professores: {str(e)}"}), 500