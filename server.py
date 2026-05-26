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