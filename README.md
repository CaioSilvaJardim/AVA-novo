# AVA — ESCOLA PARQUE

Redesign do dashboard Moodle de [ava.escolaparque.g12.br](https://ava.escolaparque.g12.br).
Interface terminal-style, dark/light mode, fonte JetBrains Mono.

---

## STACK

- **React 18** + **Vite** (SPA)
- **Tailwind CSS** + estilos inline
- **TypeScript** estrito
- **React Router v6**
- Fonte: **JetBrains Mono** (Google Fonts)

---

## AUTENTICAÇÃO

### Por que o sesskey scraping NÃO funciona

O fluxo Google OAuth do Moodle usa um **sesskey CSRF** dinâmico na URL:

```
https://ava.escolaparque.g12.br/auth/oauth2/login.php?id=1&wantsurl=...&sesskey=XXXXXXX
```

Tentativa anterior (quebrada):
1. CORS proxy busca `login/index.php` → Moodle cria uma sessão **para o proxy**
2. Moodle embute o sesskey válido **para essa sessão do proxy**
3. O browser do usuário usa esse sesskey → Moodle rejeita:
   **`error/moodle/invalidsesskey`**
   - O sesskey pertence à sessão do proxy, não à sessão do browser do usuário
   - São sessões HTTP completamente distintas

### Fluxo correto implementado

#### Fluxo 1 — Google OAuth (principal)

```
LoginPage
  └─ Clique em [ ENTRAR COM GOOGLE ]
       └─ window.location.href = 'https://ava.escolaparque.g12.br/login/index.php'
            └─ Browser carrega a página real do Moodle
                 └─ Moodle gera sesskey válido PARA O BROWSER DO USUÁRIO
                      └─ Usuário clica em Google → OAuth → Moodle logado
                           └─ Usuário volta ao AVA redesign
                                └─ Clica em [ JÁ FIZ LOGIN → DASHBOARD ]
                                     └─ Dashboard mostra o status OAuth
```

**Limitação**: cookies de sessão do Moodle são `SameSite=Lax` — o browser
não os envia em requisições cross-origin, então a API REST não pode ser
chamada via proxy com sessão. O dashboard no modo OAuth oferece:
- Link direto para o Moodle completo (com a sessão ativa)
- Botão para fazer login manual (token) para acesso à API

#### Fluxo 2 — Login Manual / Token (funcionamento completo)

```
LoginPage → login manual ↓
  └─ username + password
       └─ POST https://ava.escolaparque.g12.br/login/token.php
            ?username=X&password=Y&service=moodle_mobile_app
              └─ { token: "..." } → localStorage
                   └─ Dashboard carrega todos os dados via API token
```

**Requer**: serviço `moodle_mobile_app` habilitado no servidor Moodle.
Se desabilitado, o servidor retorna erro — o app exibe mensagem clara.

#### Por que a sessão cross-origin não funciona

```
Browser → Nosso app (localhost:5173 ou vercel.app)
            └─ fetch('ava.escolaparque.g12.br/webservice/...', { credentials: 'include' })
                 └─ Bloqueado pelo browser: CORS + SameSite=Lax cookies
                      → Moodle retorna: "requireloginerror"
```

Mesmo usando CORS proxy server-side:
```
Browser → Proxy (allorigins.win) → Moodle
                                     └─ Proxy tem sessão própria, não a do usuário
                                          → Requisição não autenticada
```

**Solução definitiva**: Habilitar `moodle_mobile_app` no painel admin do Moodle
e usar o login manual com token.

---

## RODAR LOCALMENTE

```bash
# Instalar dependências
npm install

# Iniciar dev server
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

Acesse: `http://localhost:5173`

---

## ESTRUTURA

```
src/
├── api/
│   ├── moodle.ts       ← Cliente REST Moodle (token mode)
│   └── proxy.ts        ← Helpers proxy/sessão (best-effort)
├── components/
│   ├── Timeline.tsx     ← Linha do tempo de atividades
│   ├── AgendaBlock.tsx  ← Próximos eventos
│   ├── CalendarMini.tsx ← Calendário compacto
│   └── CourseList.tsx   ← Lista de cursos
├── hooks/
│   └── useTheme.ts      ← Dark/light mode + localStorage
├── pages/
│   ├── LoginPage.tsx    ← Auth: Google redirect + manual
│   └── DashboardPage.tsx ← Dashboard principal
├── App.tsx              ← Router
├── main.tsx
└── index.css            ← Estilos globais + animações
```

---

## DEPLOY

### Vercel (recomendado)

```bash
npm install -g vercel
vercel --prod
```

### Netlify

```bash
npm run build
# Upload da pasta dist/
```

Adicionar `_redirects` em `public/`:
```
/* /index.html 200
```

---

## FUNCIONALIDADES

| Feature | Status | Modo |
|---|---|---|
| Login manual (token) | ✅ Funcional | Token |
| Redirect Google OAuth | ✅ Funcional | OAuth |
| Timeline de atividades | ✅ Funcional | Token |
| Próximos eventos | ✅ Funcional | Token |
| Calendário mini | ✅ Funcional | Token |
| Lista de cursos | ✅ Funcional | Token |
| Dark / Light mode | ✅ Funcional | Ambos |
| Dashboard OAuth completo | ⚠ Limitado por CORS | OAuth |

---

## DESIGN

- Fundo dark: `#080808` · cards: `#0f0f0f`
- Roxo primário: `#7B2FBE` · roxo claro: `#9B4DCA`
- Fundo light: `#f0f0f0` · cards: `#fff`
- Fonte: JetBrains Mono (monospace)
- Animações: fade-in + translateY, 0.4s
- Skeletons roxos pulsantes em carregamento
- Scrollbar customizada roxa

---

## NOTA

Este é um **redesign não-oficial** sem afiliação com a Escola Parque.
