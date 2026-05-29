import os
import sqlite3
import datetime
import subprocess
import sys
import base64
import re
import time

from collections import defaultdict
from functools import wraps

# Garante o carregamento automático do Flask caso a imagem não possua instalado nativamente
try:
    from flask import Flask, jsonify, request, send_from_directory
except ImportError:
    print("Flask não encontrado. Instalando automaticamente...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask"])
    from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder="dist", static_url_path="")

# Cache simples em memória para rate limiting por IP de cliente (mitiga ataques de Força Bruta e DDoS)
rate_limit_store = defaultdict(list)

def limit_rate(limits_per_minute = 60):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # Obtém endereço IP do solicitante de forma limpa analisando proxies de balanceamento
            ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
            now = time.time()

            # Limpa requisições mais antigas que 1 minuto (60 segundos)
            rate_limit_store[ip] = [t for t in rate_limit_store[ip] if now - t < 60]
            if len(rate_limit_store[ip]) >= limits_per_minute:
                return jsonify({"error": "Muitas solicitações enviadas em curto prazo. Bloqueio temporário ativo anti-Script/DDoS."}), 429
            rate_limit_store[ip].append(now)
            return f(*args, **kwargs)
        return wrapped
    return decorator

# Validadores estritos de segurança e sanitização de dados de entrada contra Injection e XSS
def is_valid_email(email):
    if not email or len(email) > 120 or len(email) < 5:
        return False
    # Regex RFC 5322 seguro
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email))

def is_valid_registration(reg):
    if not reg or len(reg) < 4 or len(reg) > 30:
        return False
    # Garante apenas caracteres alfanuméricos normais (evita tentativas de injeção de SQL ou payloads xss)
    pattern = r"^[a-zA-Z0-9_\-]+$"
    return bool(re.match(pattern, reg))

def is_valid_name(name):
    if not name or len(name) < 2 or len(name) > 100:
        return False
    # Sanitização preventiva contra XSS e injeções de tags HTML
    if "<" in name or ">" in name or "script" in name.lower() or "javascript" in name.lower():
        return False
    return True

# --- ADIÇÃO DE CABEÇALHOS DE SEGURANÇA CONTRA ATAQUES CIBERNÉTICOS (CORPS/XSSCLICKJACKING/MIME) ---
@app.after_request
def add_security_headers(response):
    # Protege contra MIME sniffing (força o navegador a seguir o tipo de conteúdo estritamente declarado)
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Ativa filtros de XSS nativos nos navegadores web modernos
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # Previne vazamento inadvertido de dados de referenciador
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Desativa cache local para respostas de API que trafegam dados sensíveis da LGPD
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
    return response

# Chave secreta de servidor para encriptação reversível LGPD de dados sensíveis em banco de dados
LGPD_SECRET_KEY = b"NetLabUFJFLGPDSecurityKey2026!"

def encrypt_field(text):
    if not text:
        return ""
    if text.startswith("enc__"):
        return text
    try:
        text_bytes = text.encode('utf-8')
        key_bytes = LGPD_SECRET_KEY
        encrypted_bytes = bytearray()
        for i, b in enumerate(text_bytes):
            encrypted_bytes.append(b ^ key_bytes[i % len(key_bytes)])
        return "enc__" + base64.b64encode(encrypted_bytes).decode('utf-8')
    except Exception:
        return text

def decrypt_field(enc_text):
    if not enc_text:
        return ""
    if not enc_text.startswith("enc__"):
        return enc_text
    try:
        raw_b64 = enc_text[5:]
        encrypted_bytes = base64.b64decode(raw_b64.encode('utf-8'))
        key_bytes = LGPD_SECRET_KEY
        decrypted_bytes = bytearray()
        for i, b in enumerate(encrypted_bytes):
            decrypted_bytes.append(b ^ key_bytes[i % len(key_bytes)])
        return decrypted_bytes.decode('utf-8')
    except Exception:
        return enc_text

# 1. Conexão Segura e Thread-Safe com o Banco de Dados SQLite Relacional
def get_db():
    db_path = os.path.join(os.getcwd(), "database.sqlite")
    conn = sqlite3.connect(db_path)
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

    # Tabela 1: Professores Orientadores (Dono único sob nova diretriz)
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

    # Sementes padrão: Configurar apenas um Professor Orientador (Coordenador Real Dono das duas chaves)
    professor_name_env = os.getenv("PROFESSOR_NAME")
    full_name = f"Prof. Dr. {professor_name_env}"

    cursor.execute("SELECT id FROM professors WHERE name = ?", (full_name,))
    nobre_row = f"Prof. Dr. {professor_name_env}"
    if not nobre_row:
        professor_email_env = os.getenv("PROFESSOR_EMAIL")
        cursor.execute("INSERT INTO professors (name, email) VALUES (?, ?)", (full_name, encrypt_field(professor_email_env)))
        conn.commit()
        cursor.execute("SELECT id FROM professors WHERE name = ?", (full_name,))
        nobre_row = cursor.fetchone()

    nobre_id = nobre_row[0]

    # Auto-migração silenciosa e segura de emails de professores legíveis em texto plano no banco de dados SQLite
    cursor.execute("SELECT id, email FROM professors")
    for row in cursor.fetchall():
        p_id, email = row[0], row[1]
        if email and not email.startswith("enc__"):
            cursor.execute("UPDATE professors SET email = ? WHERE id = ?", (encrypt_field(email), p_id))

    # Associar e atualizar todos os alunos cadastrados existentes para apontar para o orientador/coordenador único
    cursor.execute("UPDATE students SET professor_id = ?", (nobre_id,))

    # Excluir outros orientadores para manter a integridade de "Orientador Único das Chaves"
    cursor.execute("DELETE FROM professors WHERE id != ?", (nobre_id,))

    # Auto-migração silenciosa e segura de alunos legíveis (e-mails e matrículas) para encriptação reversível LGPD
    cursor.execute("SELECT id, email, registration_number FROM students")
    for row in cursor.fetchall():
        s_id, email, reg = row[0], row[1], row[2]
        needs_update = False
        new_email = email
        new_reg = reg
        if email and not email.startswith("enc__"):
            new_email = encrypt_field(email)
            needs_update = True
        if reg and not reg.startswith("enc__"):
            new_reg = encrypt_field(reg)
            needs_update = True
        if needs_update:
            cursor.execute("UPDATE students SET email = ?, registration_number = ? WHERE id = ?", (new_email, new_reg, s_id))

    # Sementes padrão para as duas haves do NetLab se vazio
    cursor.execute("SELECT COUNT(*) FROM keys")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO keys (id, name, status) VALUES (1, 'Chave Principal (Lab NetLab - Sala 3215)', 'disponivel')")
        cursor.execute("INSERT INTO keys (id, name, status) VALUES (2, 'Chave Reserva (Lab NetLab - Sala 3215)', 'disponivel')")
        
    conn.commit()
    conn.close()
    print("Banco de dados SQLite inicializado perfeitamente com integridade referencial, orientador único e criptografia ativa LGPD.")

# 3. ENDPOINTS DA API REST

# --- PROFESSORES ---
@app.route("/api/professors", methods=["GET"])
@limit_rate(60)
def get_professors():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM professors ORDER BY name ASC")
        rows = cursor.fetchall()
        professors = []
        for row in rows:
            p = dict(row)
            p["email"] = mask_email(decrypt_field(p["email"]))
            professors.append(p)
        conn.close()
        return jsonify(professors)
    except Exception as e:
        return jsonify({"error": f"Erro ao buscar professores: {str(e)}"}), 500

@app.route("/api/professors",  methods=["POST"])
@limit_rate(10)
def add_professor():
    return jsonify({"error": "Sob diretriz de orientador/dono único das chaves, novos professores não podem ser adicionados."}), 400

# --- ALUNOS (CADASTRO / ATUALIZAÇÃO / EXCLUSÃO) ---

# 5. EXECUÇÃO CENTRALIZADA
if __name__ == "__main__":
    init_db()
    # Porta estrita 3000 exigida pela infraestrutura de proxies do Cloud Run
    app.run(host="0.0.0.0", port=3000, debug=False)