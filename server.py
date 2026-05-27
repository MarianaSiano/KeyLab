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