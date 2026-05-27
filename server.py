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