# Frontend Implementation Plan

## Autonomous Compliance & Regulatory Intelligence System

Status: planning document. Scope is **only the missing pieces** of the
Next.js frontend. Existing components, routes, and styling utilities
are kept untouched unless explicitly required.

Design language: **Neo-Brutalism**, tokens defined in `neo.json` at the
project root. All new components must consume the same CSS variables
already used by existing components in `frontend/components/*`
(e.g. `var(--color-neo-accent-yellow)`, `var(--color-neo-fg-primary)`).

> ⚠️ **Custom Next.js build.** `frontend/AGENTS.md` warns that this
> repo uses a fork of Next.js with breaking changes. Before writing any
> new page/route/layout, **read the relevant guide in
> `node_modules/next/dist/docs/`** to confirm current APIs and file
> conventions. Do not rely on training-data defaults.

---

## 1. Current State (audit)

### Already implemented
- **Stack:** Next.js (custom build, App Router), React 19, Tailwind v4, TypeScript. No `axios` yet — use `fetch` or add `axios` only if needed.
- **Neo-brutalism primitives** in `frontend/components/`:
  - `Button.tsx` — variants `primary | secondary | danger | ghost | dark | accent`, sizes `sm | md | lg | xl`, hard-shadow press animation already wired.
  - `Card.tsx`, `Badge.tsx`, `Input.tsx`, `StepIndicator.tsx`, `Navbar.tsx`, `UploadBox.tsx`, `AgentCard.tsx`, `ImpactPanel.tsx`.
- **Pages & layout:**
  - `app/layout.tsx`, `app/page.tsx`
  - `app/onboarding/page.tsx` (stub)
  - `app/dashboard/page.tsx` (stub)
- **Dashboard internals** in `app/components/`:
  - `Canvas.tsx`, `NodeCard.tsx`, `AgentCircle.tsx`, `ConnectionLine.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `RightPanel.tsx`.
- **State:** `app/context/WorkflowContext.tsx` (scaffolded).
- **Types:** `app/types/workflow.ts`.
- **Mock data:** `lib/mockData.ts`.
- **Global styles:** `app/globals.css` with the neo CSS vars wired.

### Gaps (the work this doc plans)
1. No **authentication** flow — login/signup screens and session handling missing. App currently assumes a logged-in user.
2. **Onboarding** is a single stub page, not a two-step flow (company details → document upload) gated on completion.
3. Dashboard uses custom `Canvas.tsx` + `ConnectionLine.tsx` instead of **React Flow**, which the spec requires for the agent visualization.
4. No **hover-to-reveal thinking** surface on agent nodes.
5. No **real backend integration** — `lib/mockData.ts` is the only data source. `POST /company`, `POST /compliance/documents/upload`, `POST /compliance/run`, `GET /compliance/reports` are not called yet.
6. No **settings sidebar** (bottom-left trigger → slide-in panel with company details / file list / logout).
7. No **routing guard** to send new users → onboarding, returning users → dashboard.
8. No **typed API client** — fetch calls are ad-hoc in stubs.
9. No **pipeline progress stream** — the UI has no way to reflect the sequential activation of 5 agents in real time.
10. No environment config — `NEXT_PUBLIC_API_BASE_URL` is not defined.

---

## 2. Architecture Overview

```
frontend/
├── app/
│   ├── layout.tsx                      (existing; add AuthProvider wrap)
│   ├── page.tsx                        (existing; becomes router gate)
│   ├── login/page.tsx                  NEW
│   ├── signup/page.tsx                 NEW
│   ├── onboarding/
│   │   ├── page.tsx                    EXTEND (multi-step host)
│   │   ├── company/page.tsx            NEW (step 1)
│   │   └── documents/page.tsx          NEW (step 2)
│   ├── dashboard/
│   │   ├── page.tsx                    EXTEND (React Flow + live pipeline)
│   │   └── layout.tsx                  NEW (settings sidebar host)
│   ├── components/                     (existing dashboard internals)
│   ├── context/
│   │   ├── WorkflowContext.tsx         EXTEND (real pipeline state)
│   │   ├── AuthContext.tsx             NEW
│   │   └── CompanyContext.tsx          NEW
│   └── types/
│       ├── workflow.ts                 EXTEND
│       ├── api.ts                      NEW (request/response DTOs)
│       └── company.ts                  NEW
├── components/                         (neo primitives — REUSE, do not fork)
└── lib/
    ├── mockData.ts                     (keep as fallback)
    ├── api/                            NEW
    │   ├── client.ts                   (fetch wrapper + base URL + auth header)
    │   ├── company.ts                  (POST/GET/PATCH /company)
    │   ├── compliance.ts               (/compliance/run, /documents/upload, /reports)
    │   └── auth.ts                     (login, signup, logout, session)
    └── hooks/                          NEW
        ├── useAuth.ts
        ├── useCompany.ts
        └── usePipelineRun.ts
```

**Rule of thumb:** reuse `frontend/components/*` as the atomic design system. New code lives in `frontend/app/*` (pages, routes, state) and `frontend/lib/*` (data/hooks).

---

## 3. Phased Plan

Each phase lists: **goal**, **new files**, **modified files**, **integration points**, and **risks**. Phases are ordered by dependency.

---

### Phase 1 — Environment & API Client

**Goal:** a single, typed way to talk to the backend.

**New files**
- `frontend/.env.local.example`
  ```
  NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
  ```
- `frontend/lib/api/client.ts`
  - `apiFetch<T>(path, init?)`: thin wrapper over `fetch`, reads base URL from `process.env.NEXT_PUBLIC_API_BASE_URL`, injects `Authorization: Bearer <token>` from `AuthContext`, parses JSON, throws typed `ApiError { status, message }`.
  - Exports helpers `get`, `post`, `patch`, `del`.
- `frontend/lib/api/auth.ts`, `company.ts`, `compliance.ts` — one file per backend module.
- `frontend/app/types/api.ts` — DTOs mirroring backend Pydantic schemas (`CompanyOut`, `PipelineRunOut`, `ImpactReportOut`, `CircularOut`, `ValidationOut`).

**Touched** — none.

**Risks** — custom Next.js may have different env-var conventions; verify in `node_modules/next/dist/docs/`.

---

### Phase 2 — Auth Context + Login/Signup Screens

**Goal:** gate the entire app behind authentication and persist session.

**New files**
- `frontend/app/context/AuthContext.tsx`
  - Provider holds `{ user, token, loading, login, signup, logout }`.
  - Persists token to `localStorage` under `compliance_token`.
  - On mount: hydrates from storage, calls `GET /auth/me`, sets user or clears token on 401.
- `frontend/app/login/page.tsx` — email + password form using existing `Input`, `Button`, `Card`.
- `frontend/app/signup/page.tsx` — same shape; on success goes to `/onboarding/company`.
- `frontend/lib/hooks/useAuth.ts` — `useContext(AuthContext)` re-export.

**Touched**
- `frontend/app/layout.tsx` — wrap children in `<AuthProvider>`.
- `frontend/app/page.tsx` — becomes a **router gate**:
  - loading → skeleton
  - unauthenticated → redirect `/login`
  - authenticated + no company → redirect `/onboarding/company`
  - authenticated + has company → redirect `/dashboard`

**Neo-brutalism notes**
- Login card: white card, 3px black border, `shadow-[6px_6px_0px_#0A0A0A]`.
- Submit button: `variant="primary"` (yellow).
- Form errors: `variant="danger"` (coral) with shake on error.
- Background: `FFFEF2` base with optional `patterns.dots` from `neo.json`.

**Risks** — backend `/auth/me` exists; `/auth/login` and `/auth/signup` may not. If missing, temporarily mock them in `lib/api/auth.ts` and add a TODO that points to the Supabase auth flow.

---

### Phase 3 — Onboarding Flow (2 steps)

**Goal:** new users provide company details, then upload at least one document, then land on the dashboard.

**New files**
- `frontend/app/onboarding/company/page.tsx` — Step 1
  - Fields: `name`, `industry`, `product_description` (textarea).
  - Uses existing `Input`, `Button`, `StepIndicator` (step 1 of 2).
  - On submit → `POST /company` → save returned `company_id` to `CompanyContext` + `localStorage` under `compliance_company_id` → navigate to `/onboarding/documents`.
- `frontend/app/onboarding/documents/page.tsx` — Step 2
  - Reuses existing `UploadBox.tsx`.
  - Drag-and-drop multi-file (PDF / DOCX / TXT). Shows a list of staged files with a brutal delete button per file.
  - **Next button disabled until `uploadedCount >= 1`.**
  - On each file drop → `POST /compliance/documents/upload` (multipart: `company_id`, `file`) → append to "uploaded" list with server-returned chunk count.
  - On Next → navigate to `/dashboard`.
- `frontend/app/context/CompanyContext.tsx`
  - `{ company, setCompany, uploadedDocs, addUpload, removeUpload, refresh }`.

**Touched**
- `frontend/app/onboarding/page.tsx` — becomes a thin redirect to `/onboarding/company` (preserves existing route).
- `frontend/app/layout.tsx` — wrap in `<CompanyProvider>` inside `<AuthProvider>`.

**Neo-brutalism notes**
- Use `StepIndicator` across the top with thick connectors.
- Staged files: small brutal cards with coral delete `×` button.
- Drag-over state: 4px dashed yellow border.

**Risks** — multipart upload shape must match backend `POST /compliance/documents/upload`. Verify field names (`company_id`, `file`).

---

### Phase 4 — Dashboard: React Flow Agent Visualization

**Goal:** replace the current custom `Canvas.tsx` with React Flow for
the 5-agent pipeline, while keeping the neo-brutalism look.

**Dependencies to add**
```
"reactflow": "^11.11.4"
```
(Verify compatibility with the custom Next.js build before installing.)

**New files**
- `frontend/app/dashboard/components/PipelineFlow.tsx`
  - `<ReactFlow>` instance with:
    - **5 nodes**, fixed x/y layout: `source_monitor`, `document_extractor`, `change_detector`, `impact_mapper`, `report_generator`.
    - Custom node type `agentNode` that renders `NodeCard.tsx` (already exists).
    - **Edges start empty.** As the pipeline runs, edges are appended one at a time in order so the graph visually connects itself.
- `frontend/app/dashboard/components/AgentNode.tsx`
  - Custom React Flow node wrapping the existing `NodeCard`.
  - States: `idle | active | done | error`.
  - `idle`: white card, black border, shadow `4px 4px 0 #0A0A0A`.
  - `active`: yellow (`#FFE500`) background + pulsing shadow.
  - `done`: lime (`#BFFF00`) background, thick check badge.
  - `error`: coral (`#FF4D4D`) background.
  - `on:mouseenter` → show tooltip with `currentThought` (see Phase 5).
- `frontend/app/dashboard/components/AgentTooltip.tsx`
  - Absolutely positioned, styled via `components.tooltip` tokens from `neo.json`: black bg, off-white text, 2px border, mono font, 3px hard shadow.

**Touched**
- `frontend/app/dashboard/page.tsx` — replaces direct use of `Canvas.tsx` with `<PipelineFlow />`.
- `frontend/app/context/WorkflowContext.tsx` — add:
  - `nodes: AgentNodeState[]`
  - `edges: AgentEdge[]`
  - `advance(agentName, phase, thought)` — reducer called as pipeline progresses.
- `frontend/app/types/workflow.ts` — add `AgentNodeState`, `AgentEdge`, `AgentPhase`.

**Neo-brutalism notes**
- React Flow default controls (zoom/fit) must be restyled: override container `border: 3px solid #0A0A0A`, `borderRadius: 0`, `boxShadow: 4px 4px 0 #0A0A0A`.
- Edges: plain black, `strokeWidth: 3`, no curves (use `type="step"` or `"straight"`), animated dash for active connection.
- **Never** keep React Flow's default rounded look.

**Risks** — React Flow's default CSS may fight Tailwind v4. Import `reactflow/dist/style.css` **before** `globals.css` in `app/layout.tsx` so our overrides win.

---

### Phase 5 — Live Pipeline Run + Agent Thinking

**Goal:** actually trigger the backend, reflect sequential agent
activation, and surface each agent's current thought on hover.

**Strategy:** the backend currently returns a single `PipelineRunOut`
at the end of `/compliance/run` — no streaming. The frontend fakes
progressive reveal by **posting and immediately starting a staged
animation loop** that advances one node every ~1.2s, then reconciles
with the real response when it arrives.

**New files**
- `frontend/lib/hooks/usePipelineRun.ts`
  - `runPipeline(companyId)` returns `{ status, nodes, report }`.
  - Step 1: `dispatch({ type: 'start' })`.
  - Step 2: kick `POST /compliance/run` (background).
  - Step 3: every 1.2s, `advance` the next agent locally with a canned thought (`"Fetching RBI circulars..."`, `"Extracting clauses..."`, etc.).
  - Step 4: when the server response arrives, clamp to `done` and attach the real `report` and `validation` fields.
  - Step 5: on error, mark the currently-active node `error`.
- `frontend/lib/agentThoughts.ts`
  - Static map `{ source_monitor: [...phrases], document_extractor: [...], ... }`. Rotates per tick for visual variety.

**Touched**
- `frontend/app/dashboard/page.tsx` — adds a **RUN** button (`variant="primary"`, size `xl`) that calls `usePipelineRun`. Disabled while `status === 'running'`.
- `frontend/app/dashboard/components/AgentNode.tsx` — reads `phase` and `currentThought` from `WorkflowContext`.
- `frontend/app/dashboard/components/RightPanel.tsx` — becomes the **report viewer** once `report` is set: executive summary, affected teams (badges), action items (checklist), citations, validation confidence bar.

**API calls (already defined in backend)**
- `POST /api/v1/compliance/run` with body `{ company_id }`.
- `GET /api/v1/compliance/reports?limit=1` for the latest report if user revisits.

**Risks** — mismatch between staged animation and server duration. Mitigation: clamp the local animation to `min(real_duration, 6s)`; if the server is faster, snap all remaining nodes to `done` instantly.

---

### Phase 6 — Settings Sidebar (bottom-left)

**Goal:** slide-in panel for company management, file management, and logout — without disturbing the main canvas.

**New files**
- `frontend/app/dashboard/components/SettingsButton.tsx`
  - Fixed `bottom-6 left-6`, round-square, `variant="dark"`, gear icon.
  - Pressing toggles `settingsOpen` on `WorkflowContext` (or a new `UiContext`).
- `frontend/app/dashboard/components/SettingsSidebar.tsx`
  - Slide-in from the left, width `380px`, full height.
  - Thick right border `4px solid #0A0A0A`, `boxShadow: 12px 0 0 #0A0A0A`.
  - Sections:
    1. **Company** — inline-editable `name`, `industry`, `product_description` → `PATCH /company/{id}` on blur.
    2. **Documents** — list from `GET /company/{id}/documents` (or cached `uploadedDocs`), each row with filename + size + delete button → `DELETE /company/{id}/documents/{doc_id}`.
    3. **Upload more** — reuses `UploadBox` inline.
    4. **Account** — email, logout button (`variant="danger"`).
  - Dismissal: click-outside, `Esc`, or the close `×` in the header.

**Touched**
- `frontend/app/dashboard/layout.tsx` (NEW in Phase 2 if not yet created) — mounts `<SettingsButton />` + `<SettingsSidebar />` as siblings of `{children}` so they render over any page content.

**Animation**
- Open: `transform: translateX(0)`, `transition: transform 150ms cubic-bezier(0.2,0,0,1)` (from `neo.json` motion tokens).
- Closed: `transform: translateX(-100%)`.
- No fade — neo-brutalism is snappy, not soft.

**Risks** — focus trap while open. Use a small home-grown trap (query focusable elements, loop Tab) rather than pulling in a library.

---

### Phase 7 — Reports Page (optional, but cheap)

**Goal:** lets returning users browse past pipeline runs.

**New files**
- `frontend/app/dashboard/reports/page.tsx` — list from `GET /compliance/reports`, each as a brutal card, click → drawer with full markdown.
- `frontend/app/dashboard/reports/[id]/page.tsx` — detail view, renders `report.markdown` via a small sanitizer (no HTML injection).

**Touched**
- `frontend/app/components/Topbar.tsx` — add a "Reports" link.

**Risks** — markdown rendering. Use `react-markdown` + `remark-gfm`, but confirm they ship with the custom Next.js or need polyfills.

---

## 4. Shared UI Rules (Neo-Brutalism)

All phases must respect:

1. **Zero border-radius** anywhere (`rounded-none`). Even circles are squares with a square badge inside when possible. Agent circles in `AgentCircle.tsx` are the only legitimate round element.
2. **3–4px black borders** on every interactive surface. Use `border-neo` utility already set up, or inline `border-[3px] border-[#0A0A0A]`.
3. **Hard offset shadows only.** `shadow-[4px_4px_0px_#0A0A0A]` default, `shadow-[6px_6px_0px_#0A0A0A]` hover, `shadow-[1px_1px_0px_#0A0A0A]` active. No `blur`, no `rgba` softness.
4. **Flat accent colors** from `neo.json`:
   - Yellow `#FFE500` — primary CTA, active state
   - Lime `#BFFF00` — done/success
   - Coral `#FF4D4D` — error/delete
   - Blue `#0066FF` — focus ring, info
5. **Typography** — headings `Archivo Black uppercase`, body `IBM Plex Mono`, labels `Barlow Condensed uppercase`. All already loaded in existing components; do not import new fonts.
6. **Motion** — 100–150ms snappy transitions. Never bounce. No `ease-in-out` on anything except one-off `bounce` for celebratory confirms.
7. **No gradients.** Ever.
8. **Reused primitives.** If a UI piece can be built by composing existing `Button / Card / Input / Badge`, **do not invent a new primitive**.

---

## 5. API Contract (what the frontend will call)

| Method | Path | Phase | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | 2 | session token |
| `POST` | `/auth/signup` | 2 | create user |
| `GET`  | `/auth/me` | 2 | hydrate user on mount |
| `POST` | `/company` | 3 | create company (name, industry, product_description) |
| `GET`  | `/company/{id}` | 6 | fetch company for settings |
| `PATCH`| `/company/{id}` | 6 | inline edit in settings |
| `POST` | `/compliance/documents/upload` | 3, 6 | multipart: `company_id` + `file` |
| `GET`  | `/compliance/documents?company_id=...` | 6 | list uploaded docs |
| `DELETE`|`/compliance/documents/{doc_id}` | 6 | remove an upload |
| `POST` | `/compliance/run` | 5 | trigger the 5-agent pipeline for a company |
| `GET`  | `/compliance/reports?limit=...` | 5, 7 | list recent reports |
| `GET`  | `/compliance/reports/{id}` | 7 | single report detail |

Any endpoint not yet implemented on the backend goes into a `TODO(backend): …` comment next to its mock, so the gap is obvious when wiring real data.

---

## 6. State Model

```ts
// app/types/workflow.ts (extended)
export type AgentName =
  | "source_monitor"
  | "document_extractor"
  | "change_detector"
  | "impact_mapper"
  | "report_generator";

export type AgentPhase = "idle" | "active" | "done" | "error";

export interface AgentNodeState {
  name: AgentName;
  label: string;
  phase: AgentPhase;
  currentThought: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface AgentEdge {
  from: AgentName;
  to: AgentName;
  visible: boolean;
}

export interface WorkflowState {
  status: "idle" | "running" | "done" | "error";
  nodes: AgentNodeState[];
  edges: AgentEdge[];
  report: ReportPayload | null;
  validation: ValidationPayload | null;
  runError: string | null;
}
```

All mutations go through a single reducer in `WorkflowContext` so
React Flow re-renders are predictable.

---

## 7. Routing Map

| Route | Who sees it | Redirect rules |
| --- | --- | --- |
| `/login`, `/signup` | unauthenticated | auth'd → `/dashboard` |
| `/` | anyone | always redirects |
| `/onboarding/company` | authenticated + no company | has company → `/dashboard` |
| `/onboarding/documents` | authenticated + has company + no uploads | has uploads → `/dashboard` |
| `/dashboard` | fully onboarded | not onboarded → relevant onboarding step |
| `/dashboard/reports` | fully onboarded | same |

Centralize the redirect logic in a `useAuthGate()` hook used by `app/page.tsx` and each top-level `page.tsx`. Do not duplicate the checks inline.

---

## 8. Risk / Breaking-Change Analysis

| Area | Risk | Mitigation |
| --- | --- | --- |
| Custom Next.js build | Training-data APIs may not exist | **Before each new file, read `node_modules/next/dist/docs/`.** No exceptions. |
| React Flow default CSS | Fights our hard-shadow look | Import React Flow CSS first, override in a small `pipeline-flow.css` colocated next to `PipelineFlow.tsx`. |
| Backend endpoints may lag | `/auth/login`, `/compliance/documents/*` may not exist | Typed mocks in `lib/api/*` behind a `USE_MOCKS` flag; switch once backend ships. |
| Long pipeline runtimes | Users stare at a static canvas | Staged animation reveal (Phase 5) runs independently of the real request. |
| File upload size | Multipart limits | Cap per file at 10 MB client-side; show a clear brutal error card on reject. |
| Focus + keyboard | Slide-in sidebar focus trap | Home-grown trap, tested with `Tab`/`Shift+Tab`/`Esc`. |
| Storage of token | XSS if `localStorage` | Acceptable for hackathon; document the trade-off, plan to move to httpOnly cookies post-demo. |

**No existing file is rewritten.** Every change listed above is either a new file, a thin wrap, or a section-level edit (e.g. `layout.tsx` gets providers added; `dashboard/page.tsx` swaps `Canvas` for `PipelineFlow`).

---

## 9. Verification Plan

After each phase:

1. **`next build`** with zero type errors (custom Next.js build).
2. **Route smoke test:** visit `/login`, `/signup`, `/onboarding/company`, `/onboarding/documents`, `/dashboard`, `/dashboard/reports` and confirm redirects behave per §7.
3. **Storybook-less visual pass:** on the dashboard, manually drive `WorkflowContext` with a mock dispatch to walk through `idle → active → done → error` per node and confirm neo tokens render correctly.
4. **API wiring:** hit a running backend (`uvicorn app.main:app --reload`) and run a real `POST /compliance/run` end-to-end. Confirm the report panel populates with real markdown and citation badges.
5. **Accessibility spot-check:**
   - All buttons have visible focus rings (blue, 3px).
   - Sidebar trap works; `Esc` closes.
   - Colour contrast meets `neo.json.accessibility.minimumContrast` 4.5:1 on body text.

---

## 10. Execution Order Summary

1. **Phase 1** — env + `lib/api/client.ts` + DTOs
2. **Phase 2** — `AuthContext` + login/signup + router gate in `app/page.tsx`
3. **Phase 3** — two-step onboarding, `CompanyContext`, file upload plumbing
4. **Phase 4** — React Flow agent canvas, custom node, edge reveal
5. **Phase 5** — `usePipelineRun`, live staged animation, RUN button, report panel
6. **Phase 6** — settings sidebar with company edit + docs + logout
7. **Phase 7** — reports browsing page (optional)

Each phase ends with:
- `next build` clean
- The new screens pixel-checked against neo-brutalism rules in §4
- A one-line update to this document marking the phase ✅ DONE with
  an "Implementation notes (actual)" block, matching the style used in
  `implementation.md` for the backend.

---

## 11. Out of Scope (deliberately not in this plan)

- SSR / server components for the dashboard (it is client-only by design).
- i18n / RTL.
- Offline mode.
- Desktop installer / PWA manifest.
- Real-time WebSocket pipeline streaming (staged client-side animation is the hackathon compromise).
- Theme switching — neo-brutalism light theme only; dark mode is not part of this PS.
- Replacing existing neo primitives in `frontend/components/*`.
