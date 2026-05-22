# KeyLab • Sistema de Gerenciamento do NetLab (PPGCC/UFJF)

O **KeyLab** é um sistema completo, profissional e altamente perfomático para controle de fluxo e posse física das duas chaves do laboratório **NetLab**, pertencente ao Programa de Pós-Graduação em Ciência da Computação (PPGCC) da Universidade Federal de Juiz de Fora (**UFJF**).

Esta aplicação conta com uma arquitetura **Full-stack moderna utilizando Python no Backend** e **React no Frontend**, unificados de forma integrada na porta **3000**.

---

## 🛠️ Arquitetura e Tecnologias

- **Backend (Python & APIs REST)**
  - **Python 3:** Linguagem robusta e ágil no backend.
  - **Flask:** Framework leve para provisionamento de endpoints REST robustos de alta performance.
  - **SQLite3 Relacional:** Banco de dados relacional baseado em arquivo (`database.sqlite`) com suporte nativo a ACID, restrições estruturadas via chaves estrangeiras (`PRAGMA foreign_keys = ON;`), e índices para altíssimo desempenho em consultas.
  - **Auto-Instador Inteligente:** O backend detecta se o `Flack` está instalado no sistema operacional e, caso contrário, instala-o via `pip` automaticamente ao iniciar.

- **Frontend (Cliente React)**
  - **React 19 & Vite:** Visualização instantânea e reatividade no gerenciamento do estado no navegador.
  - **Tailwind CSS:** Estilização baseada em utilitários de alta legibilidade, com cores acadêmicos sóbrias, excelente contraste de tela e design responsivo adaptável a tablets, celulares e desktops.
  - **Lucide React:** Biblioteca rica de ícones vetoriais refinados e modernos.
  - **Motion:** Micro-animações nativas para transições orgânicas e acolhedoras em modais e atualizações.

---

## 🗄️ Esquema do Banco de Dados SQL

O banco relacional conta com quatro tabelas interligadas que mantêm a integridade absoluta dos dados:

1. **`professors` (Docentes Orientadores):**
  - Registra os professores membros do PPGCC do laboratório em específico.
  - Colunas: `id` (PK), `name` (Texto Único), `email` (Texto).
  - Pré-populado com os professores eminentes.

2. **`students` (Alunos de Graduação e Pós):**
  - Contém discentes ativos elegíveis a retirar chaves.
  - Colunas: 
    - `id` (PK);
    - `name` (Texto);
    - `email` (Texto);
    - `registration_number` (Texto Único);
    - `Type` (Texto: 'Graduação' ou 'Pós-Graduação');
    - `Professor_id` (FK refenciado `professors`).

3. **`keys` (As Duas Chaves):**
  - Gerencia a disponibilidade física das duas chaves do laboratório NetLab.
  -Colunas: 
    - `id` (PK);
    - `name` (Texto);
    - `status` (Texto: 'Disponível' ou 'emprestada');
    - `current_student_id` (FK para `students`)
    - `last_borrowed_at` (Data/Hora de retirada).

4. **`key_logs` (Histórico Inviolável de Movimentações):**
  - Rastreabilidade de empréstimos ("Quem pegou, quando pegou e quando devolveu") para auditoria transparente do laboratório.
  - Colunas: 
    - `id` (PK);
    - `key_id` (FK para `keys`); 
    - `student_id` (FK para `students` com `ON DELETE SET NULL` para manter logs históricos mesmo que cadastros sejam modificados);
    - `student_name_snapshot` (Garantia de histórico com o nome do aluno blindado a alterações futuras);
    - `taken_at` (Timestamp de retirada);
    - `returned_at` (Timestamp de devolução - nulo enquanto em posse).

---

## 🚀 Como Rodar o Projeto Localmente (Passo a Passo)

Siga atentamente as instruções detalhadas abaixo para colocar o KeyLab em pleno funcionamento no seu ambiente de desenvolvimento ou produção.

### 📋 Pré-requisitos

Certifique-se de possuir instalado em sua máquina:

1. **Node.js:** (Versão 22 ou superior recomendada, contendo o utilitário `npm`).
2. **Python 3:** (Com instalador `pip` ativo nas variáveis de ambientes globais).

---

### Passo 1: Preparar o Diretório do Projeto

Entre na pasta onde você extraiu ou clonou os arquivos da aplicação:

```bash
cd /caminho/do/projeto/keylab
```

---

### Passo 2: Instalar as Dependências do Frontend React
Instale as bibliotecas necessárias para a compilação e execução do React:

```bash
npm install
```

*Este comando gera a pasta `node_modules` com Vite, Tailwind, Motion e empacotadores essenciais.*

---

### Passo 3: Executar a Aplicação em Modo de Desenvolvimento (Vite + Python)

Para criar as primeiras frentes estáticas e ligar o servidor Python localmente de forma simples e direta, execute:

```bash
npm run dev
```

*O console do NPM executará o `vite build` para compilar o HTML/CSS/JS reativo e, em seguida, ligará o `server.py` em Flask na porta **3000**.*

Ao iniciar, você receberá o feedback do terminal:

```text
Flask não encontrado. Instalando automaticamente... (Se aplicável)
Banco de dados SQLite inicializado perfeitamente com integridade referencial.
 * Serving Flask app 'server'
 * Debug mode: off
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:3000
```

Abra o seu navegador e explore:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### Passo 4: Rodar o Servidor Diretamente em Produção (Sem remontar Vite)

Caso o seu frontend já esteja compilado dentro da pasta `/dist`, você pode pular a etapa do Vite e iniciar puramente o backend Python Flask (que servirá nativamente as páginas compiladas):

```bash
# Executa apenas o backend servindo o frontend estático já pronto
npm run start
```

*O sistema gerará automaticamente o arquivo persistente do banco `database.sqlite` na raiz do seu projeto mantendo todas as alterações salvas em segurança.*

---