# /plan-maestro Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a global Claude Code skill (`~/.claude/skills/plan-maestro/`) that generates professional pitch/plan documents with adaptive design personalities, HTML + PDF output, and intelligent data gathering from project context and web research.

**Architecture:** 4-file skill (SKILL.md orchestrator + 3 support files). SKILL.md stays under 300 words for token efficiency. Support files (section-matrix.md, sections.md, html-template.md) are loaded on demand during skill execution. Playwright generates PDFs from the HTML output.

**Tech Stack:** Claude Code skills format, HTML/CSS (inline, self-contained), Playwright (PDF), Google Fonts (CDN for HTML, embedded for PDF fallback)

---

## Task 1: Create Skill Directory

**Files:**
- Create: `~/.claude/skills/plan-maestro/` (directory)

**Step 1: Create directory**

```bash
mkdir -p ~/.claude/skills/plan-maestro
```

**Step 2: Verify**

```bash
ls ~/.claude/skills/
```
Expected: `find-skills  plan-maestro`

**Step 3: Commit** *(N/A — global skill directory, not in project repo)*

---

## Task 2: Write `section-matrix.md`

**Files:**
- Create: `~/.claude/skills/plan-maestro/section-matrix.md`

**Step 1: Create the file with this exact content**

````markdown
# Section Matrix — /plan-maestro

## Core Sections (Always Included)

1. Cover
2. Table of Contents
3. El Problema / The Problem
4. La Solución / The Solution
5. Mercado (TAM/SAM/SOM)
6. Modelo de Negocio / Business Model
7. Go-to-Market
8. Roadmap
9. KPIs y Métricas / KPIs & Metrics
10. Análisis Competitivo / Competitive Analysis
11. Equipo / Team
12. Estado Actual + CTA / Current Status + CTA

## Optional Sections by Project Type

### SaaS B2B / Dev Tools / APIs
Design personality: Tech Dark
Additional sections (insert after core in order):
- After Equipo: Arquitectura Técnica / Technical Architecture
- After Análisis Competitivo: Proyecciones Financieras / Financial Projections
- After Proyecciones Financieras: Plan de Inversión / Investment Plan
- After Estado Actual: Oportunidades Estratégicas / Strategic Opportunities

### Consumer App / Mobile / Lifestyle / D2C
Design personality: Brand Violet
Additional sections:
- After Go-to-Market: Estrategia de Marca / Brand Strategy
- After Estado Actual: Oportunidades Estratégicas / Strategic Opportunities

### Agencia / Studio / Consultora
Design personality: Industrial Slate
Additional sections:
- After Go-to-Market: Estrategia de Marca / Brand Strategy
- After Análisis Competitivo: Portafolio / Casos de Éxito / Portfolio & Case Studies
- After Portafolio: Proyecciones Financieras / Financial Projections
- After Estado Actual: Oportunidades Estratégicas / Strategic Opportunities

### Marketplace / Comunidad / Platform (PLG)
Design personality: Platform Emerald
Additional sections:
- After La Solución: Arquitectura Técnica / Technical Architecture
- After Análisis Competitivo: Network Effects / Flywheel
- After Network Effects: Proyecciones Financieras / Financial Projections
- After Estado Actual: Oportunidades Estratégicas / Strategic Opportunities

### Fundraising Round / Investor Deck
Design personality: Finance Gold
Additional sections:
- After La Solución: Arquitectura Técnica / Technical Architecture (if tech product)
- After Análisis Competitivo: Proyecciones Financieras / Financial Projections
- After Proyecciones Financieras: Marco Legal / Estructura / Legal & Structure
- After Marco Legal: Plan de Inversión / Investment Plan
- After Estado Actual: Oportunidades Estratégicas / Strategic Opportunities

### Healthcare / Legal / Education / Trust-Based
Design personality: Trust Teal
Additional sections:
- After La Solución: Marco Regulatorio / Regulatory Framework
- After Análisis Competitivo: Proyecciones Financieras / Financial Projections
- After Estado Actual: Oportunidades Estratégicas / Strategic Opportunities

## Design Personality Auto-Detection Rules

Detect project type from:
1. README/CLAUDE.md keywords
2. package.json dependencies (react-native → Consumer, stripe → SaaS, etc.)
3. User's description of the product
4. File structure (e.g., /mobile → Consumer App)

Fallback: Ask user to select type if ambiguous.

Always confirm: "Detected project type: [X]. Design personality: [Y]. Correct? (y/n)"
````

**Step 2: Verify file exists**

```bash
ls ~/.claude/skills/plan-maestro/
cat ~/.claude/skills/plan-maestro/section-matrix.md | head -20
```
Expected: file exists, first 20 lines show correct content

---

## Task 3: Write `sections.md`

**Files:**
- Create: `~/.claude/skills/plan-maestro/sections.md`

**Step 1: Create the file with this exact content**

````markdown
# Section Content Guide — /plan-maestro

For each section: what data to gather, what questions to ask, what to generate.

---

## 1. Cover

**Data needed:** Product name, tagline (1 line), document version, date, optional logo URL
**Ask if missing:** "What is the product/company name? Do you have a tagline?"
**Generate:**
- Large product name
- Tagline below
- "Plan Maestro {YYYY}" subtitle
- Version + date bottom-right
- Personality-specific decorative element (geometric shape or gradient bar)

---

## 2. Table of Contents

**Data needed:** Auto-generated from section list
**Generate:** Clickable anchor links to all sections. Two-column layout if >10 sections.

---

## 3. El Problema / The Problem

**Data needed:** What problem exists, who has it, how painful is it (quantified if possible)
**Ask if missing:** "What problem does {product} solve? Who experiences it most?"
**Research:** Search for industry statistics on the problem scale
**Generate:**
- Opening hook (statistic or story)
- 3-4 pain points with supporting evidence
- "Who is affected" section (personas or segments)
- Visual: pain point cards or numbered list with icons

---

## 4. La Solución / The Solution

**Data needed:** What the product does, key features, how it solves the problem
**Ask if missing:** "Describe {product} in 2-3 sentences. What are the 3 main features?"
**Generate:**
- Solution overview paragraph
- 3-4 feature highlights with descriptions
- "Before/After" or "How it works" (3-step process)
- Visual: feature cards or process flow

---

## 5. Mercado (TAM/SAM/SOM)

**Data needed:** Industry, geography, target segment size
**Ask if missing:** "What industry/vertical? What geography are you targeting initially?"
**Research:** Search for "{industry} market size {year}" to get TAM figures
**Generate:**
- TAM (Total Addressable Market) with source
- SAM (Serviceable Addressable Market — your segment)
- SOM (Serviceable Obtainable Market — realistic 3-year target)
- Visual: nested circles or bar chart showing TAM→SAM→SOM funnel
- Note all figures with year and source

---

## 6. Modelo de Negocio / Business Model

**Data needed:** Revenue streams, pricing, who pays, unit economics if known
**Ask if missing:** "How does {product} make money? What does it cost per user/month?"
**Generate:**
- Revenue model description (SaaS, marketplace %, one-time, freemium, etc.)
- Pricing tiers table (if applicable)
- Unit economics: CAC estimate, LTV target, payback period
- Visual: revenue stream diagram or pricing table

---

## 7. Go-to-Market

**Data needed:** Target customer, acquisition channels, launch plan, partnerships
**Ask if missing:** "Who is your ideal first customer? How will you reach them?"
**Generate:**
- ICP (Ideal Customer Profile) definition
- Primary + secondary acquisition channels
- Launch sequence (Phase 1: beta, Phase 2: launch, Phase 3: scale)
- Key partnerships or distribution channels
- Visual: GTM funnel or launch timeline

---

## 8. Roadmap

**Data needed:** Current stage, next 12-18 months milestones
**Ask if missing:** "What stage are you at? What are the next 3 major milestones?"
**Generate:**
- Phase-based roadmap (Q1-Q2, Q3-Q4, Year 2)
- Each phase: 3-5 bullet milestones
- Current position marked
- Visual: horizontal timeline or phase cards

---

## 9. KPIs y Métricas / KPIs & Metrics

**Data needed:** Key metrics for the business type, current baselines if any
**Research:** Common KPIs for detected project type
**Generate:**
- 6-8 key metrics with definitions
- Current value (if known) vs target
- North Star Metric highlighted
- Visual: metric cards with progress indicators

**KPI templates by type:**
- SaaS: MRR, Churn Rate, CAC, LTV, NPS, DAU/MAU
- Marketplace: GMV, Take Rate, Buyer/Seller Ratio, Liquidity
- Consumer App: DAU, Retention D1/D7/D30, LTV, Viral Coefficient
- Agencia: Revenue per Client, Utilization Rate, Client Retention, NPS

---

## 10. Análisis Competitivo / Competitive Analysis

**Data needed:** Main competitors (3-5)
**Research:** Search for top competitors, their pricing and positioning
**Generate:**
- Competitor comparison matrix (5-6 criteria, checkmarks/scores)
- Positioning map (2x2: price vs. feature richness, or speed vs. completeness)
- "Our advantage" summary paragraph
- Visual: comparison table + positioning map

---

## 11. Equipo / Team

**Data needed:** Founder names, roles, key backgrounds
**Ask if missing:** "Who are the founders/key team members? What are their relevant backgrounds?"
**Generate:**
- Team cards with name, role, 2-3 background highlights
- Advisors section (if applicable)
- "Why this team" paragraph
- Visual: team cards in grid layout

---

## 12. Estado Actual + CTA / Current Status + CTA

**Data needed:** Current traction (users, revenue, partnerships), what's needed next
**Ask if missing:** "What traction do you have? What are you looking for (investment, partners, clients)?"
**Generate:**
- Traction highlights (bullet list with numbers)
- "What we need" statement
- Clear call to action (contact info, meeting link, or next step)
- Visual: traction metrics + prominent CTA button/box

---

## Optional Sections

### Arquitectura Técnica / Technical Architecture
**Research:** Look for technical stack in project files
**Generate:** Stack diagram, key technical decisions, scalability approach

### Proyecciones Financieras / Financial Projections
**Ask:** "Do you have revenue projections for Year 1-3? What are your main cost drivers?"
**Generate:** 3-year projection table (conservative/base/optimistic), burn rate, breakeven

### Plan de Inversión / Investment Plan
**Ask:** "How much are you raising? How will you use the funds?"
**Generate:** Funding ask, use of funds pie chart, funding history (if any)

### Oportunidades Estratégicas / Strategic Opportunities
**Research:** Industry trends, strategic partnership opportunities
**Generate:** 3-4 strategic opportunities with rationale

### Estrategia de Marca / Brand Strategy
**Ask:** "What brand values and tone define {product}?"
**Generate:** Brand positioning, voice/tone, visual identity principles

### Portafolio / Casos de Éxito / Portfolio & Case Studies
**Ask:** "Can you share 2-3 client projects or results?"
**Generate:** Case study cards with challenge/solution/result format

### Network Effects / Flywheel
**Generate:** Flywheel diagram showing how growth feeds itself, chicken-and-egg strategy

### Marco Regulatorio / Regulatory Framework
**Research:** Key regulations for the industry/geography
**Generate:** Regulatory landscape, compliance approach, certifications

### Marco Legal / Estructura / Legal & Structure
**Ask:** "What is the company legal structure? Where is it incorporated?"
**Generate:** Entity structure, cap table overview (if fundraising), jurisdiction
````

**Step 2: Verify**

```bash
wc -l ~/.claude/skills/plan-maestro/sections.md
```
Expected: ~200 lines

---

## Task 4: Write `html-template.md`

**Files:**
- Create: `~/.claude/skills/plan-maestro/html-template.md`

**Step 1: Create the file with this exact content**

This file contains the CSS and HTML structure for all 6 design personalities.

````markdown
# HTML Template Guide — /plan-maestro

## Document Shell

All plans use this HTML shell. Replace `{CSS_VARIABLES}` and `{GOOGLE_FONTS_URL}` per personality.

```html
<!DOCTYPE html>
<html lang="{LANG}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{PRODUCT_NAME} — Plan Maestro {YEAR}</title>
  <link href="{GOOGLE_FONTS_URL}" rel="stylesheet">
  <style>
    {CSS_VARIABLES}
    {SHARED_CSS}
  </style>
</head>
<body>
  {SECTIONS}
</body>
</html>
```

---

## Shared CSS (included in every plan)

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-body);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Layout */
.section {
  padding: 60px 80px;
  min-height: 100vh;
  border-bottom: 1px solid var(--border);
  page-break-inside: avoid;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 40px;
}

.section-number {
  font-family: var(--font-heading);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--accent);
  text-transform: uppercase;
  opacity: 0.7;
}

h1 { font-family: var(--font-heading); font-size: 3.5rem; font-weight: 800; line-height: 1.1; }
h2 { font-family: var(--font-heading); font-size: 2rem; font-weight: 700; color: var(--accent); }
h3 { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 600; }
p { color: var(--text-secondary); font-size: 1rem; }

/* Cards */
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-top: 32px; }
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  padding: 24px;
}
.card h3 { color: var(--text-primary); margin-bottom: 8px; }
.card p { font-size: 0.9rem; }

/* Tables */
table { width: 100%; border-collapse: collapse; margin-top: 24px; }
th { background: var(--accent); color: var(--bg-primary); padding: 12px 16px; text-align: left; font-family: var(--font-heading); font-size: 0.85rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--text-secondary); font-size: 0.9rem; }
tr:nth-child(even) td { background: var(--bg-card); }

/* Cover section */
.cover {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
  page-break-after: always;
}
.cover::before {
  content: '';
  position: absolute;
  top: -10%;
  right: -5%;
  width: 500px;
  height: 500px;
  background: var(--accent);
  opacity: 0.06;
  border-radius: 50%;
}
.cover-content { padding: 80px; position: relative; z-index: 1; }
.cover-tag {
  display: inline-block;
  background: var(--accent);
  color: var(--bg-primary);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 32px;
}
.cover h1 { color: var(--text-primary); margin-bottom: 20px; }
.cover .tagline { font-size: 1.25rem; color: var(--text-secondary); max-width: 600px; margin-bottom: 60px; }
.cover-meta { display: flex; gap: 40px; }
.cover-meta-item { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
.cover-meta-item span { display: block; color: var(--accent); font-weight: 600; margin-top: 4px; font-size: 0.9rem; }

/* TOC */
.toc-list { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 48px; margin-top: 32px; }
.toc-list li { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.toc-list a { color: var(--text-secondary); text-decoration: none; font-size: 0.9rem; }
.toc-list a:hover { color: var(--accent); }
.toc-num { color: var(--accent); font-weight: 700; font-size: 0.8rem; min-width: 24px; }

/* Accent bar */
.accent-bar { height: 3px; background: var(--accent); width: 48px; margin-bottom: 16px; }

/* Metric cards */
.metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-top: 32px; }
.metric-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 24px; text-align: center; }
.metric-value { font-family: var(--font-heading); font-size: 2rem; font-weight: 800; color: var(--accent); }
.metric-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }
.metric-target { font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px; }

/* CTA box */
.cta-box { background: var(--accent); border-radius: 12px; padding: 48px; text-align: center; margin-top: 48px; }
.cta-box h2 { color: var(--bg-primary); margin-bottom: 16px; }
.cta-box p { color: var(--bg-primary); opacity: 0.85; margin-bottom: 32px; }
.cta-button { display: inline-block; background: var(--bg-primary); color: var(--accent); padding: 14px 32px; border-radius: 6px; font-weight: 700; text-decoration: none; font-family: var(--font-heading); }

/* Timeline */
.timeline { position: relative; padding-left: 32px; margin-top: 32px; }
.timeline::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--border); }
.timeline-item { position: relative; margin-bottom: 40px; }
.timeline-item::before { content: ''; position: absolute; left: -37px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); }
.timeline-phase { font-family: var(--font-heading); font-size: 0.75rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }

/* Competitor table check marks */
.check { color: var(--accent); font-weight: 700; }
.cross { color: var(--text-muted); }

/* Print */
@media print {
  .section { page-break-inside: avoid; }
  .cover { page-break-after: always; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

---

## Design Personalities

### 1. Tech Dark — SaaS, Dev Tools, APIs

```css
/* CSS Variables — Tech Dark */
:root {
  --bg-primary: #0F172A;
  --bg-card: #1E293B;
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #475569;
  --accent: #3B82F6;
  --border: #1E293B;
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```

Google Fonts URL:
```
https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap
```

Cover decorative element: Blue gradient glow top-right. Geometric grid lines at 0.03 opacity.

---

### 2. Finance Gold — Fintech, Investment, Banking

```css
/* CSS Variables — Finance Gold */
:root {
  --bg-primary: #1C1C1E;
  --bg-card: #2C2C2E;
  --text-primary: #F5F5F0;
  --text-secondary: #A8A89A;
  --text-muted: #636363;
  --accent: #F59E0B;
  --border: #3A3A3C;
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Inter', sans-serif;
}
```

Google Fonts URL:
```
https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap
```

Cover decorative element: Gold diagonal stripes at 0.04 opacity on right side. Serif elegance — no rounded corners (border-radius: 4px max).

Additional CSS override:
```css
.card { border-radius: 4px; }
table { border-top: 2px solid var(--accent); }
h2 { font-style: italic; }
```

---

### 3. Trust Teal — Healthcare, Legal, Education

```css
/* CSS Variables — Trust Teal */
:root {
  --bg-primary: #0C1B33;
  --bg-card: #162440;
  --text-primary: #E2EAF4;
  --text-secondary: #8AA4C8;
  --text-muted: #4A6588;
  --accent: #14B8A6;
  --border: #1E3050;
  --font-heading: 'Lato', sans-serif;
  --font-body: 'Source Sans Pro', sans-serif;
}
```

Google Fonts URL:
```
https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&family=Source+Sans+Pro:wght@400;600&display=swap
```

Cover decorative element: Teal horizontal rule lines (subtle, evenly spaced). Trust-inspired — clean, structured.

Additional CSS override:
```css
h2 { font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; font-size: 1.5rem; }
.section-number { font-size: 0.7rem; }
```

---

### 4. Brand Violet — Consumer App, Lifestyle, D2C

```css
/* CSS Variables — Brand Violet */
:root {
  --bg-primary: #1E1B4B;
  --bg-card: #2D2A5E;
  --text-primary: #EDE9FE;
  --text-secondary: #A5B4FC;
  --text-muted: #6366F1;
  --accent: #F97316;
  --border: #312E81;
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'DM Sans', sans-serif;
}
```

Google Fonts URL:
```
https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap
```

Cover decorative element: Orange coral gradient blob top-right + purple gradient bottom-left. Energetic but professional.

Additional CSS override:
```css
.card { border-radius: 16px; }
.cta-box { border-radius: 24px; }
.metric-card { border-radius: 12px; }
.cover-tag { border-radius: 20px; }
```

---

### 5. Industrial Slate — Manufacturing, B2B Services

```css
/* CSS Variables — Industrial Slate */
:root {
  --bg-primary: #1E293B;
  --bg-card: #273445;
  --text-primary: #E2E8F0;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --accent: #EA580C;
  --border: #334155;
  --font-heading: 'Barlow', sans-serif;
  --font-body: 'Roboto', sans-serif;
}
```

Google Fonts URL:
```
https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Roboto:wght@400;500&display=swap
```

Cover decorative element: Orange diagonal slash accent (top-left corner). Heavy, industrial feel — bold headers.

Additional CSS override:
```css
h1 { font-weight: 800; letter-spacing: -0.02em; text-transform: uppercase; }
h2 { font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; font-size: 1.3rem; }
th { text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; }
.card { border-radius: 0; border-left: 4px solid var(--accent); }
```

---

### 6. Platform Emerald — Marketplace, Community, PLG

```css
/* CSS Variables — Platform Emerald */
:root {
  --bg-primary: #042F2E;
  --bg-card: #0D3D3C;
  --text-primary: #ECFDF5;
  --text-secondary: #6EE7B7;
  --text-muted: #34D399;
  --accent: #06B6D4;
  --border: #134E4A;
  --font-heading: 'Sora', sans-serif;
  --font-body: 'Nunito', sans-serif;
}
```

Google Fonts URL:
```
https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Nunito:wght@400;500;600&display=swap
```

Cover decorative element: Cyan circular glow center-right. Deep emerald — ecosystem feel.

Additional CSS override:
```css
.card { border-radius: 12px; border-color: #134E4A; border-left: 3px solid var(--accent); }
p { color: #9FDFD4; }
.toc-list li { border-bottom-color: #134E4A; }
```

---

## Section HTML Patterns

### Cover Section
```html
<section class="cover" id="cover">
  <div class="cover-content">
    <span class="cover-tag">Plan Maestro {YEAR}</span>
    <h1>{PRODUCT_NAME}</h1>
    <p class="tagline">{TAGLINE}</p>
    <div class="cover-meta">
      <div class="cover-meta-item">Versión<span>{VERSION}</span></div>
      <div class="cover-meta-item">Fecha<span>{DATE}</span></div>
      <div class="cover-meta-item">Tipo<span>{PROJECT_TYPE}</span></div>
    </div>
  </div>
</section>
```

### Standard Section
```html
<section class="section" id="{SECTION_ID}">
  <div class="section-header">
    <div>
      <div class="section-number">{N:02d} — {SECTION_TITLE_SHORT}</div>
      <div class="accent-bar"></div>
      <h2>{SECTION_TITLE}</h2>
    </div>
  </div>
  {SECTION_CONTENT}
</section>
```

### Competitor Matrix
```html
<table>
  <thead>
    <tr>
      <th>Empresa</th>
      <th>Criterio 1</th>
      <th>Criterio 2</th>
      <th>Criterio 3</th>
      <th>Precio</th>
      <th>Notas</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong style="color:var(--accent)">{PRODUCT_NAME} ✦</strong></td>
      <td><span class="check">✓</span></td>
      <td><span class="check">✓</span></td>
      <td><span class="check">✓</span></td>
      <td>{PRICE}</td>
      <td>Nuestra solución</td>
    </tr>
    <!-- repeat for competitors -->
  </tbody>
</table>
```
````

**Step 2: Verify**

```bash
wc -l ~/.claude/skills/plan-maestro/html-template.md
```
Expected: ~300+ lines

---

## Task 5: Write `SKILL.md` (Main Orchestrator)

**Files:**
- Create: `~/.claude/skills/plan-maestro/SKILL.md`

**Step 1: Create the file with this exact content**

````markdown
---
name: plan-maestro
description: Use when the user wants to create a professional pitch document, business plan, investor deck, or strategic plan for a product, startup, or service. Use when asked to generate /plan-maestro, create a "plan maestro", build a pitch deck, or produce a strategic document for a project or business.
---

# /plan-maestro — Professional Plan Document Generator

You generate polished HTML + PDF plan documents. Read support files in ~/.claude/skills/plan-maestro/ before starting.

## Phase 1: Discover (run in parallel)

1. Scan project folder: README.md, CLAUDE.md, package.json, docs/ for product context
2. Ask user: "What is the product/company name?" and "What type of plan? (SaaS B2B / Consumer App / Agencia / Marketplace / Fundraising / Other)"
3. Detect language from project files and user message. Default to Spanish. Confirm if English detected.
4. Read section-matrix.md to select sections for project type
5. Announce: "Detected project type: [X]. Design personality: [Y]. Core sections: 12. Additional: [N]. Correct? (y/n)"

## Phase 2: Gap Questions (max 5, one at a time)

Ask only for missing critical data. Priority order:
1. Problem + who has it (if unclear)
2. How product solves it (if unclear)
3. Target market / geography (if unclear)
4. Revenue model (if unclear)
5. Team / founders (if unknown)

Use "Por definir / TBD" for anything not answered after 5 questions.

## Phase 3: Web Research (parallel agents)

Launch 3 parallel searches:
- Agent A: "{product} market size {industry} {year}" + industry trends
- Agent B: Top 3-5 competitors for {product} — pricing and positioning
- Agent C: Regulatory/technical context relevant to project type

Synthesize into data blocks for sections: Mercado, Competidores, Oportunidades.

## Phase 4: Generate HTML

Read html-template.md for personality CSS and document shell.
Read sections.md for content guidance per section.

Build single self-contained HTML with:
- Inline all CSS (no external stylesheets)
- Google Fonts <link> tag in <head>
- All section content from gathered data
- File: docs/{ProductName}-Plan-Maestro-{YYYY}.html

## Phase 5: Export PDF

```javascript
// Playwright PDF generation
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file://${htmlPath}`);
await page.waitForLoadState('networkidle');
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 }
});
await browser.close();
```

Report: "Plan Maestro generado: HTML ({size}) + PDF ({size})"

## Flags

--theme [name]: Override auto-detected personality (tech-dark/finance-gold/trust-teal/brand-violet/industrial-slate/platform-emerald)
--lang [es|en]: Force language
--add "[section]": Add custom section
--skip "[section]": Skip optional section
--pdf-only: Regenerate PDF from existing HTML only
````

**Step 2: Count words — must be under 300 words in the skill body (below frontmatter)**

```bash
# Count body words (skip frontmatter)
tail -n +6 ~/.claude/skills/plan-maestro/SKILL.md | wc -w
```
Expected: under 300 words

---

## Task 6: Verify Skill Structure

**Step 1: List all skill files**

```bash
ls -la ~/.claude/skills/plan-maestro/
```
Expected:
```
SKILL.md
html-template.md
section-matrix.md
sections.md
```

**Step 2: Validate SKILL.md frontmatter**

```bash
head -5 ~/.claude/skills/plan-maestro/SKILL.md
```
Expected: `---` → `name: plan-maestro` → `description: Use when...` → `---`

**Step 3: Verify description starts with "Use when"**

```bash
grep "description:" ~/.claude/skills/plan-maestro/SKILL.md
```
Expected: `description: Use when...`

**Step 4: Check description is under 1024 chars**

```bash
grep "description:" ~/.claude/skills/plan-maestro/SKILL.md | wc -c
```
Expected: under 1024

---

## Task 7: Smoke Test — Invoke the Skill

**Step 1: In a new Claude Code session, type:**

```
/plan-maestro
```

**Expected behavior:**
- Skill is found in completion (shows plan-maestro)
- Claude reads section-matrix.md, sections.md, html-template.md
- Claude asks for product name and project type
- Claude proceeds through 5 phases
- Output: HTML + PDF in docs/ directory

**Step 2: Verify output files exist**

```bash
ls docs/*.html docs/*.pdf
```
Expected: at least one of each

**Step 3: Check PDF opened correctly**

```bash
open docs/*.pdf
```
Expected: PDF opens with correct design personality, all sections visible, dark background preserved

---

## Execution Notes

- No unit tests apply (skill = markdown instructions, not executable code)
- Verification is behavioral: invoke the skill and check outputs
- If Playwright is not installed in target project, skill should fall back to: "Run `npx playwright install chromium` then retry"
- All 4 files are standalone — no cross-dependencies except SKILL.md referencing support files by name
- Support files should be read via the Read tool during skill execution, not pre-loaded

---

## Checklist

- [ ] Directory `~/.claude/skills/plan-maestro/` created
- [ ] `section-matrix.md` written with 6 project types
- [ ] `sections.md` written with all 12 core + 8 optional sections
- [ ] `html-template.md` written with 6 personalities + shared CSS + HTML patterns
- [ ] `SKILL.md` written, frontmatter valid, body under 300 words
- [ ] `description:` starts with "Use when"
- [ ] Skill appears in Claude Code skill list
- [ ] Smoke test invocation produces HTML + PDF output
