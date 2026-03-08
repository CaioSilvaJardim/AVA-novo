# AVA — Escola Parque

Redesign não oficial do dashboard Moodle de [ava.escolaparque.g12.br](https://ava.escolaparque.g12.br/my/).

Built with **React + Vite + TypeScript + Tailwind CSS**.  
Fonte: JetBrains Mono.

---

## Como rodar localmente

### Pré-requisitos
- Node.js ≥ 18
- npm ≥ 9

### Instalação

```bash
git clone <repo-url>
cd ava-redesign
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Acesse em: `http://localhost:5173`

### Build de produção

```bash
npm run build
npm run preview
```

---

## AUTENTICAÇÃO

O sistema suporta dois fluxos de autenticação, com prioridade para o login Google:

---

### Fluxo 1 — Login com Google (OAuth2 via Moodle) ⭐ Recomendado

```
Usuário → [ENTRAR COM GOOGLE] → Moodle OAuth → Google → Moodle → /dashboard
```

#### Como funciona:

**Passo 1 — Buscar URL dinâmica do Google**

Na página de login (`/`), ao montar o componente, fazemos:

```
GET allorigins.win/get?url=https://ava.escolaparque.g12.br/login/index.php
```

O `allorigins.win` é um proxy CORS público que retorna o HTML da página de login do Moodle.  
Parseamos o HTML com regex e extraímos o `href` do botão de login Google:

```
https://ava.escolaparque.g12.br/auth/oauth2/login.php?id=1&wantsurl=...&sesskey=ABC123
```

> ⚠️ O `sesskey` muda a cada visita — por isso precisamos buscá-lo dinamicamente.

**Passo 2 — Redirecionar para o Google**

Ao clicar em `[ ENTRAR COM GOOGLE ]`:

```js
window.location.href = googleUrl
```

O fluxo OAuth completo ocorre:
1. Moodle recebe a requisição e valida o `sesskey`
2. Redireciona para o Google OAuth2
3. Usuário autentica com conta Google institucional
4. Google retorna para Moodle com o token
5. Moodle cria sessão (cookie `MoodleSession`) e redireciona para `wantsurl`

**Passo 3 — Detecção da sessão pós-OAuth**

O dashboard (`/dashboard`) detecta a sessão automaticamente:

```
GET allorigins.win/get?url=https://ava.escolaparque.g12.br/webservice/rest/server.php
     ?wsfunction=core_webservice_get_site_info&moodlewsrestformat=json
```

Se retornar `userid > 0`, o usuário está autenticado via sessão Moodle.  
Salva `userid` e `fullname` no `localStorage` para persistência.

**Passo 4 — Dados via proxy de sessão**

Todas as chamadas à API Moodle são feitas via `allorigins.win` como proxy:

```
GET allorigins.win/get?url=https://ava.escolaparque.g12.br/webservice/rest/server.php
     ?wsfunction=<FUNCTION>&moodlewsrestformat=json&<PARAMS>
```

> ⚠️ Nota: o `allorigins.win` não transmite cookies de sessão do browser.  
> Portanto, chamadas de sessão ao servidor Moodle funcionam apenas se o servidor
> não exigir autenticação por cookie para o endpoint `/webservice/rest/server.php`.
> Se o servidor rejeitar, os dados aparecerão vazios (comportamento esperado).

---

### Fluxo 2 — Login Manual (token de API)

```
Usuário preenche usuário/senha → POST /login/token.php → token salvo → /dashboard
```

#### Como funciona:

1. Usuário clica em **login manual ↓** na página de login
2. Preenche `username` e `password`
3. Fazemos `POST` direto para:
   ```
   https://ava.escolaparque.g12.br/login/token.php
   ?username=X&password=Y&service=moodle_mobile_app
   ```
4. Se retornar `{ token }`: salva em `localStorage.moodle_token`
5. Dashboard usa o token em todas as chamadas REST

> ⚠️ Requer que o serviço `moodle_mobile_app` esteja habilitado no servidor.  
> Se a API REST não estiver habilitada, retorna erro: _"API REST não habilitada no servidor"_.

---

### Comparação dos modos

| | Google OAuth | Manual (Token) |
|---|---|---|
| Requer config. servidor | Apenas OAuth2 habilitado | API REST + `moodle_mobile_app` |
| UX | Melhor (SSO institucional) | Requer senha separada |
| Dados disponíveis | Via proxy (pode ser limitado) | Via token (completo) |
| Persistência | `sessionStorage` / detecção | `localStorage.moodle_token` |

---

### Arquitetura de arquivos

```
src/
├── api/
│   ├── moodle.ts      ← Token-based REST client + login
│   └── proxy.ts       ← CORS proxy (allorigins) para scraping e session
├── pages/
│   ├── LoginPage.tsx  ← Login Google + manual fallback
│   └── DashboardPage.tsx ← Dashboard com detecção de auth mode
├── components/
│   ├── Timeline.tsx
│   ├── AgendaBlock.tsx
│   ├── CalendarMini.tsx
│   └── CourseList.tsx
├── hooks/
│   └── useTheme.ts
└── App.tsx
```

---

## Deploy na Vercel

1. Faça push do projeto para o GitHub
2. Acesse [vercel.com](https://vercel.com) → **New Project** → importe o repositório
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Clique em **Deploy** ✓

> O deploy é 100% estático — sem custo no plano gratuito da Vercel.

---

## Limitações conhecidas

- **CORS**: chamadas diretas ao Moodle são bloqueadas pelo browser. Usamos `allorigins.win` como proxy público — pode ter latência ou limitações de rate.
- **Sessão via proxy**: o `allorigins.win` não transmite cookies do browser, então dados de sessão pós-OAuth podem aparecer vazios se o servidor Moodle exigir autenticação via cookie.
- **Token API**: o serviço `moodle_mobile_app` pode estar desabilitado no servidor Moodle da Escola Parque, tornando o login manual indisponível.
- **sesskey dinâmico**: o `sesskey` do Google OAuth expira com a sessão PHP do Moodle. Se o usuário esperar muito na tela de login, o link pode expirar — basta recarregar a página.

---

## Tecnologias

- [React 19](https://react.dev)
- [Vite 7](https://vitejs.dev)
- [TypeScript 5](https://typescriptlang.org)
- [Tailwind CSS 4](https://tailwindcss.com)
- [React Router 7](https://reactrouter.com)
- [allorigins.win](https://allorigins.win) — CORS proxy público

---

*Projeto não oficial. Desenvolvido para fins educacionais.*
