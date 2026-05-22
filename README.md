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