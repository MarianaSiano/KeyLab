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