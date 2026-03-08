# AVA — Escola Parque

> Redesign moderno do dashboard Moodle de [ava.escolaparque.g12.br](https://ava.escolaparque.g12.br/my/)

Interface terminal-inspired com tema escuro (padrão) e claro, exibindo timeline de atividades, agenda de eventos, calendário mini e lista de cursos — tudo autenticado diretamente via token Moodle Mobile.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite |
| Roteamento | React Router DOM v6 |
| Estilos | Tailwind CSS v4 |
| Fonte | JetBrains Mono (Google Fonts) |
| API | Moodle Web Services REST API |
| Deploy | Vercel / qualquer host estático |

---

## Funcionalidades

- 🔐 **Login** via token Moodle Mobile App (`moodle_mobile_app`)
- 📋 **Timeline** — Atividades dos próximos 90 dias com indicador de atraso
- 📅 **Agenda** — Próximos eventos do calendário Moodle
- 🗓 **Calendário mini** — Mês atual navegável com pontos em dias com eventos
- 📚 **Cursos** — Lista de cursos filtrada por ano (2026 por padrão)
- 🌗 **Dark/Light mode** — Toggle persistido em `localStorage`
- ✨ **Animações** — Fade-in escalonado, skeleton loaders roxos

---

## Rodando localmente

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/ava-redesign.git
cd ava-redesign

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse em: **http://localhost:5173**

### Build para produção

```bash
npm run build
# Arquivos gerados em dist/
```

---

## Deploy na Vercel

### Método 1 — Interface Web (recomendado)

1. Faça push do projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) e clique em **"Add New Project"**
3. Importe o repositório
4. Configure:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Clique em **Deploy** ✅

### Método 2 — CLI

```bash
# Instale a CLI da Vercel
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel --prod
```

---

## Estrutura de arquivos

```
ava-redesign/
├── src/
│   ├── api/
│   │   └── moodle.ts          ← Toda comunicação com o Moodle REST API
│   ├── components/
│   │   ├── Timeline.tsx       ← Linha do tempo vertical de atividades
│   │   ├── AgendaBlock.tsx    ← Lista de próximos eventos
│   │   ├── CalendarMini.tsx   ← Calendário navegável compacto
│   │   └── CourseList.tsx     ← Lista de cursos com filtro por ano
│   ├── hooks/
│   │   └── useTheme.ts        ← Hook de dark/light mode
│   ├── pages/
│   │   ├── LoginPage.tsx      ← Página de login estilo terminal
│   │   └── DashboardPage.tsx  ← Dashboard principal
│   ├── App.tsx                ← Roteamento (React Router)
│   ├── main.tsx               ← Entry point
│   └── index.css              ← Estilos globais + animações
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Observações sobre CORS

A comunicação com o Moodle é feita **diretamente do browser** via `fetch`. Se o servidor Moodle não permitir CORS, a autenticação pode falhar.

**Para produção com Next.js** (migração futura), você pode usar API Routes como proxy:

```ts
// app/api/auth/route.ts
export async function POST(req: Request) {
  const { username, password } = await req.json()
  const res = await fetch('https://ava.escolaparque.g12.br/login/token.php', {
    method: 'POST',
    body: new URLSearchParams({ username, password, service: 'moodle_mobile_app' }),
  })
  const data = await res.json()
  return Response.json(data)
}
```

---

## Paleta de cores

| Nome | Hex |
|---|---|
| Roxo principal | `#7B2FBE` |
| Roxo claro | `#9B4DCA` |
| Fundo escuro | `#080808` |
| Card escuro | `#0f0f0f` |
| Borda escura | `#1f1f1f` / `#2a2a2a` |
| Fundo claro | `#f0f0f0` |
| Texto escuro | `#E0E0E0` |
| Texto claro | `#111111` |

---

## Licença

MIT — uso livre para fins educacionais e pessoais.

---

*Projeto não oficial. Não afiliado à Escola Parque ou ao Moodle.*
