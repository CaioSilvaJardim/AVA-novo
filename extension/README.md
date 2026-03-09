# AVA — Escola Parque · Extensão de Redesign

Extensão de browser (Chrome + Firefox) que injeta CSS e JavaScript diretamente nas páginas de `ava.escolaparque.g12.br`, redesenhando a interface do Moodle com identidade visual minimalista dark/light em tipografia mono.

---

## Por que extensão e não um site separado?

O Moodle usa cookies `SameSite=Lax` e sessões vinculadas ao domínio. Qualquer site externo sofreria bloqueio de CORS e não teria acesso à sessão do usuário. A extensão **roda dentro do próprio domínio** do AVA, tendo acesso completo ao DOM, cookies e sessão já autenticada — sem proxy, sem CORS, sem `invalidsesskey`.

---

## Estrutura de arquivos

```
extension/
├── manifest-chrome.json   → Manifest V3 (Chrome, Edge, Brave, Opera)
├── manifest-firefox.json  → Manifest V2 (Firefox 91+)
├── content.js             → Lógica principal injetada nas páginas
├── style.css              → Estilos (escopados em body.ava-redesign-active)
├── popup.html             → Interface do popup da extensão
├── popup.css              → Estilos do popup
├── popup.js               → Lógica dos toggles
└── README.md              → Este arquivo
```

---

## Instalação no Chrome / Edge / Brave / Opera

1. Abra `chrome://extensions` (ou `edge://extensions`)
2. Ative **Modo desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `extension/`
5. A extensão aparece com o ícone na barra de ferramentas

> **Nota:** O `manifest-chrome.json` já está nomeado corretamente. O Chrome lê o arquivo `manifest.json` — **renomeie** `manifest-chrome.json` para `manifest.json` antes de carregar.

```bash
cd extension/
cp manifest-chrome.json manifest.json
```

---

## Instalação no Firefox

1. Renomeie `manifest-firefox.json` para `manifest.json`:
   ```bash
   cd extension/
   cp manifest-firefox.json manifest.json
   ```
2. Abra `about:debugging`
3. Clique em **Este Firefox**
4. Clique em **Carregar extensão temporária...**
5. Selecione o arquivo `manifest.json` dentro da pasta `extension/`

> A extensão temporária é removida ao fechar o Firefox. Para instalação permanente é necessário assinar via [AMO](https://addons.mozilla.org/).

---

## Como usar

### Popup da extensão
Clique no ícone da extensão na barra de ferramentas para abrir o popup com:

| Controle | Função |
|---|---|
| **REDESIGN ATIVO / INATIVO** | Liga/desliga toda a extensão em tempo real sem recarregar |
| **DARK / LIGHT** | Alterna entre modo escuro e claro — salvo permanentemente |
| Links rápidos | Acesso direto ao dashboard, login e cursos |

### Botões injetados na página
Ao visitar `ava.escolaparque.g12.br/my/`, dois botões aparecem no canto inferior direito:

| Botão | Função |
|---|---|
| `◐ DARK` / `◑ LIGHT` | Alterna o tema |
| `[ ← ORIGINAL ]` | Remove o redesign e restaura o visual original do Moodle instantaneamente |

---

## Páginas afetadas

| URL | Comportamento |
|---|---|
| `/login/index.php` | Interface de login completamente substituída |
| `/my/` | Dashboard reorganizado em duas colunas |
| Qualquer outra página | Apenas estilos base (navbar, fundo, fonte) |

---

## Funcionalidades

### Página de login
- Interface completamente nova — fundo preto, tipografia mono
- Botão `[ ENTRAR COM GOOGLE ]` usa o `href` real do DOM (com `sesskey` válido da sessão do browser — **nunca de um proxy**)
- Link `login manual ↓` restaura o formulário original do Moodle
- Animação fade-in 0.5s ao carregar

### Dashboard (`/my/`)

#### Elementos ocultados
- Saudação "Olá, [nome]! 👋"
- Bloco "Acesso Rápido" (`#inst552596` — Google Calendar, Keep, Drive, Meet)
- Bloco "Últimos avisos" (`#inst492307`)
- Gaveta direita (`#theme_boost-drawers-blocks`)
- FAB de learning tools (bookmarks, focus, note)
- Rodapé do Moodle (`#page-footer`, `#footnote`)

#### Navbar redesenhada
- Logo substituída por texto `AVA — ESCOLA PARQUE` em roxo `#9B4DCA`
- Fundo `#0f0f0f`, borda inferior `1px solid #1f1f1f`
- Links de navegação mantidos e funcionais
- Ícones de notificação, mensagem e avatar preservados

#### Layout reorganizado
```
┌─────────────────────────────────────────────────────────┐
│  AVA — ESCOLA PARQUE          🔔 💬 [avatar]            │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────┐  ┌───────────────────────┐   │
│  │  // TIMELINE         │  │  // CALENDÁRIO        │   │
│  │  ●─── atividade 1   │  │  março 2026            │   │
│  │  ●─── atividade 2   │  │  Seg Ter Qua ...       │   │
│  │  ●─── atividade 3   │  │   2   3★  4  5  6  7   │   │
│  │                      │  │   9  10★ 11 12 ...     │   │
│  ├──────────────────────┤  ├───────────────────────┤   │
│  │  // AGENDA           │  │  // CURSOS            │   │
│  │  ● evento ....  data │  │  → 2026 - 2ª - Hist.  │   │
│  │  ● evento ....  data │  │  → 2026 - 2ª - Geo.   │   │
│  └──────────────────────┘  │  [ VER TODOS → ]      │   │
│                             └───────────────────────┘   │
│                                                         │
│                                  ◐ DARK  [ ← ORIGINAL ]│
└─────────────────────────────────────────────────────────┘
```

#### // TIMELINE
- Linha vertical roxa `2px solid #7B2FBE` à esquerda
- Bolinha roxa `●` em cada item
- Nome da atividade truncado em 1 linha
- Data em cinza `#666`
- Itens atrasados com texto tachado
- Animação escalonada `60ms` por item

#### // AGENDA
- Cada evento: `● nome .............. data`
- Hover com borda esquerda roxa
- Animação escalonada idêntica à Timeline

#### // CALENDÁRIO
- Grade compacta 7 colunas
- Hoje (`td.today`): fundo roxo `#7B2FBE`, texto branco
- Dias com eventos (`td.hasevent`): borda esquerda roxa
- Navegação ◄ ► funcional (Moodle original preservado)
- Cabeçalho com mês/ano em roxo

#### // CURSOS
- Mostra cursos de **2026 primeiro**, depois histórico
- Máximo 8 visíveis + botão `[ VER TODOS → ]`
- Cada linha: `→ nome do curso` com hover roxo
- Animação escalonada `40ms` por item

---

## Identidade Visual

| Token | Dark | Light |
|---|---|---|
| Fundo body | `#080808` | `#f0f0f0` |
| Cards/painéis | `#0f0f0f` | `#ffffff` |
| Hover | `#141414` | `#e8e8e8` |
| Roxo primário | `#7B2FBE` | `#7B2FBE` |
| Roxo claro | `#9B4DCA` | `#9B4DCA` |
| Roxo hover | `#B06AE8` | `#B06AE8` |
| Texto principal | `#E0E0E0` | `#111` |
| Texto dim | `#888` | `#555` |
| Bordas | `#1f1f1f` | `#ddd` |
| Fonte | JetBrains Mono | JetBrains Mono |
| Border-radius | `0` | `0` |

---

## Compatibilidade testada

| Browser | Versão mínima | Manifest |
|---|---|---|
| Chrome | 88+ | V3 |
| Edge | 88+ | V3 |
| Brave | 1.20+ | V3 |
| Firefox | 91+ | V2 |
| Opera | 74+ | V3 |

---

## Solução do `invalidsesskey`

O botão Google extrai o `href` diretamente de `a.login-identityprovider-btn` **no DOM já carregado pelo browser do usuário**. Esse `href` contém o `sesskey` gerado pelo Moodle para a sessão *deste browser específico* — portanto é sempre válido. Nenhum proxy externo é utilizado.

```
Browser carrega /login/index.php
  → Moodle gera sesskey para esta sessão
  → Embute no href do botão Google no HTML
  → content.js lê esse href do DOM
  → Botão usa esse href → OAuth funciona ✅
```

---

## Desenvolvimento

Para iterar rapidamente:
1. Edite `content.js` ou `style.css`
2. Vá em `chrome://extensions` → clique no botão de atualização (🔄) da extensão
3. Recarregue a página do AVA

O MutationObserver em `content.js` re-aplica transformações quando o Moodle carrega conteúdo via AJAX (ex: itens da timeline carregados dinamicamente).

---

## Licença

Projeto educacional — uso interno da Escola Parque.
