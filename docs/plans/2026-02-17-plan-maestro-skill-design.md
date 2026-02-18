# Design: /plan-maestro Global Skill

**Date:** 2026-02-17
**Status:** Approved
**Author:** Claude Code (via brainstorming skill)

---

## Overview

A global Claude Code skill (`~/.claude/skills/plan-maestro/`) that generates professional pitch documents, business plans, and strategic plans for any product, startup, or service. It produces unique, formal HTML + PDF output adapted to the project type.

---

## Goals

- Generate polished, investor-quality plan documents from minimal input
- Adapt visual design and section set to the project type automatically
- Never produce two documents that look the same
- Keep all designs formal and professional (no casual aesthetics)
- Support Spanish and English (auto-detected, confirmable)
- Output: HTML file + PDF via Playwright — always both

---

## Architecture: Enfoque B (SKILL.md + Support Files)

```
~/.claude/skills/plan-maestro/
├── SKILL.md              # Lightweight process orchestrator (~250 words)
├── html-template.md      # 6 design personalities + CSS component library
├── sections.md           # Content guide per section (what to ask, examples)
└── section-matrix.md     # Project type → sections activation table
```

**Rationale:** SKILL.md stays under 300 words for token efficiency. Heavy content (CSS, section guides, matrices) lives in support files loaded on demand during execution.

---

## Process: 5 Phases

### Phase 1 — Discover (Parallel)
- Scan current project folder: README, CLAUDE.md, package.json, docs/
- Ask user: "What is the name of the product/company?" and "What type of plan do you need?"
- Detect language from project files; confirm if ambiguous

### Phase 2 — Gap Questions (Sequential, Max 5 Questions)
- Identify missing critical data for core sections
- Ask one question at a time: problem, target market, team, revenue model, stage
- Stop at 5 questions maximum — use "TBD / Por definir" for unknowns

### Phase 3 — Web Research (Parallel, 3 Agents)
- Agent A: Market size + industry trends for the detected vertical
- Agent B: Top 3-5 competitors (pricing, positioning, strengths/weaknesses)
- Agent C: Regulatory or technical context (if relevant to project type)
- Synthesize findings into structured data blocks

### Phase 4 — Generate HTML
- Select design personality based on project type (see Design System)
- Apply section matrix (core 12 + optional sections for project type)
- Build single self-contained HTML file with inline CSS and embedded fonts
- File name: `docs/{ProductName}-Plan-Maestro-{YYYY}.html`

### Phase 5 — Export PDF
- Launch Playwright chromium headless
- `printBackground: true`, A4 format, margins: 0
- File name: `docs/{ProductName}-Plan-Maestro-{YYYY}.pdf`
- Report final file sizes

---

## Section Matrix

### Core Sections (always included — 12 total)

| # | Section | Key Content |
|---|---------|-------------|
| 1 | Cover | Product name, tagline, date, version |
| 2 | Table of Contents | Auto-generated, clickable anchors |
| 3 | El Problema | Pain points, evidence, who is affected |
| 4 | La Solución | Product overview, key differentiator |
| 5 | Mercado (TAM/SAM/SOM) | Market sizing with visual breakdown |
| 6 | Modelo de Negocio | Revenue streams, pricing, unit economics |
| 7 | Go-to-Market | Channels, launch sequence, partnerships |
| 8 | Roadmap | Timeline with phases/milestones |
| 9 | KPIs y Métricas | Key metrics, targets, tracking method |
| 10 | Análisis Competitivo | Competitor matrix, positioning map |
| 11 | Equipo | Founders/team with roles and highlights |
| 12 | Estado Actual + CTA | Traction, what's needed, call to action |

### Optional Sections by Project Type

| Project Type | Additional Sections |
|---|---|
| SaaS B2B | Arquitectura Técnica, Proyecciones Financieras, Plan de Inversión, Oportunidades Estratégicas |
| Consumer App | Estrategia de Marca, Oportunidades Estratégicas |
| Agencia / Studio | Estrategia de Marca, Proyecciones Financieras, Portafolio / Casos de Éxito, Oportunidades Estratégicas |
| Marketplace | Arquitectura Técnica, Proyecciones Financieras, Network Effects, Oportunidades Estratégicas |
| Fundraising Round | Arquitectura Técnica, Proyecciones Financieras, Marco Legal / Estructura, Plan de Inversión, Oportunidades Estratégicas |

---

## Design System: 6 Formal Personalities

Each plan gets one personality assigned automatically by project type (overridable with `--theme`).

| Personalidad | Tipo de Proyecto | Background | Accent | Fuentes |
|---|---|---|---|---|
| **Tech Dark** | SaaS, dev tools, APIs | Navy `#0F172A` | Electric Blue `#3B82F6` | Space Grotesk + Inter |
| **Finance Gold** | Fintech, inversión, banca | Charcoal `#1C1C1E` | Amber `#F59E0B` | Playfair Display + Inter |
| **Trust Teal** | Salud, legal, educación | Dark Blue `#0C1B33` | Teal `#14B8A6` | Lato + Source Sans Pro |
| **Brand Violet** | Consumer, lifestyle, D2C | Deep Purple `#1E1B4B` | Coral `#F97316` | Outfit + DM Sans |
| **Industrial Slate** | Manufactura, servicios B2B | Slate `#1E293B` | Orange `#EA580C` | Barlow + Roboto |
| **Platform Emerald** | Marketplace, comunidad, SaaS PLG | Midnight Green `#042F2E` | Cyan `#06B6D4` | Sora + Nunito |

**All personalities share:**
- White text on dark backgrounds for contrast
- Accent color for headings, borders, highlights, CTAs
- Data visualizations in personality accent color
- Print-optimized CSS (forced backgrounds, no orphaned headings)
- Google Fonts loaded from CDN (embedded for PDF generation)

---

## CLI Flags

| Flag | Example | Effect |
|---|---------|--------|
| `--theme` | `--theme finance-gold` | Override auto-detected personality |
| `--color` | `--color "#E11D48"` | Override accent color only |
| `--add` | `--add "Análisis FODA"` | Add a custom section |
| `--skip` | `--skip "Marco Legal"` | Skip an optional section |
| `--pdf-only` | `--pdf-only` | Regenerate PDF from existing HTML |
| `--lang` | `--lang en` | Force language (es/en) |

---

## File Outputs

```
docs/
└── {ProductName}-Plan-Maestro-{YYYY}.html   # Primary output (self-contained)
└── {ProductName}-Plan-Maestro-{YYYY}.pdf    # PDF export via Playwright
```

Both files committed to project git after generation.

---

## SKILL.md Frontmatter (Draft)

```yaml
---
name: plan-maestro
description: Use when the user wants to create a professional pitch document, business
plan, investor deck, or strategic plan for a product, startup, or service. Use when
asked to generate /plan-maestro, create a "plan maestro", build a pitch deck, or
produce a strategic document for a project or business.
---
```

---

## Success Criteria

- [ ] Skill loads globally in any project (`~/.claude/skills/plan-maestro/`)
- [ ] SKILL.md is under 300 words
- [ ] HTML output is self-contained (no external dependencies at render time)
- [ ] PDF is generated via Playwright with `printBackground: true`
- [ ] No two plan documents share the same visual design personality
- [ ] Skill asks maximum 5 clarifying questions
- [ ] Web research runs in parallel (3 agents)
- [ ] Output files land in `docs/` directory of current project
- [ ] All 6 design personalities produce print-safe output
