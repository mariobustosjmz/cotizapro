# CotizaPro Landing Page Redesign — Design Document

**Date:** 2026-02-17
**Product:** CotizaPro — Quote management SaaS for HVAC/plumbing/electrical/painting contractors in Mexico

---

## Objective

Rework the marketing landing page (`app/(marketing)/page.tsx`) to feel modern and innovative, aligned with a B2B home-services / technical contractor audience. Add advanced CSS-only animations and background effects. Improve conversion copy and trust signals.

---

## Design System

### Pattern
- **Conversion-Optimized + Trust** (Hero-Centric)
- Above the fold: clear value prop + primary CTA + one secondary CTA
- Below fold: social proof (metrics bar) → features → testimonials → pricing → FAQ → final CTA

### Colors
| Role | Value | Usage |
|------|-------|-------|
| Primary | `#1E40AF` (blue-800) | Headings, nav logo |
| Secondary | `#3B82F6` (blue-500) | Feature icons, badges |
| CTA | `#F97316` (orange-500) | Primary CTA button, Pro plan highlight |
| Background | `#EFF6FF` (blue-50) | Hero section soft tint |
| Dark bg | `#0F172A` (slate-900) | Stats bar section |
| Text | `#0F172A` (slate-900) | Body text |
| Muted | `#475569` (slate-600) | Subtitles, descriptions |

### Typography
- Headings: Geist Sans Bold/Black (already loaded), 3xl–7xl
- Body: Geist Sans Regular, 16px minimum, `leading-relaxed`
- Gradient hero text: animated 270° gradient via CSS

### Effects & Animations (CSS-only, Server Component safe)
1. **Gradient mesh hero** — 3 absolutely-positioned `div` blobs with `rounded-full blur-3xl opacity-40` acting as aurora effect behind hero content
2. **Animated gradient text** — `@keyframes gradientFlow` on `background-position` for hero `<h1>` word
3. **Floating mockup cards** — 3 decorative cards in hero right column: Quote card, Stats card, Notification card; CSS `@keyframes float` / `floatSlow` with staggered `animation-delay`
4. **Staggered feature cards** — `.feature-card-1` through `.feature-card-4` with staggered `@keyframes fadeInUp`
5. **Orange CTA glow** — `.btn-glow-orange` with `@keyframes ctaGlow` pulsing box-shadow on primary CTA button
6. **Blob pulse on final CTA** — `@keyframes blobPulse` on background blobs
7. **prefers-reduced-motion** — all animations disabled via media query

### No-Emoji Rule
Replace all emoji section headers and UI decoration:
- `🎯` → SVG lightning bolt icon (cotización)
- `📅` → SVG refresh arrows icon (seguimiento)
- `💰` → SVG dollar circle icon (gestión)
- `❤️` in footer → plain text `con pasión`

---

## Page Sections

### 1. Navigation
- Sticky, `backdrop-blur-md bg-white/80 border-b border-slate-200/60`
- Logo: blue icon + "Cotiza**Pro**" bold
- Nav links: Características / Precios / FAQ
- CTA: orange "Empieza Gratis" button

### 2. Hero
- Background: `bg-gradient-to-br from-blue-50 via-white to-slate-50` + 3 gradient mesh blobs
- Left column: Badge "Nuevo: WhatsApp integrado" | H1 with animated gradient accent | subtitle | 2 CTAs | 3 trust chips (stars, empresas, certificado)
- Right column: 3 floating mockup cards demonstrating product value
  - **Quote card**: "Cotización #1247 — Instalación A/C → $4,500 MXN" with progress bar
  - **Stats card**: "Cotizaciones Enviadas 127 | Tasa de Cierre 68%"
  - **Notification card**: "Cliente aprobó cotización" with green checkmark

### 3. Stats Bar
- `bg-slate-900 text-white` full-width section
- 4 metrics in grid: **500+** Técnicos Activos | **30 seg** Por Cotización | **4.8★** Calificación Promedio | **+40%** Más Ventas Promedio

### 4. Features
- H2: "Todo lo que necesitas para crecer" with orange underline accent
- 3 category blocks, each with:
  - SVG category icon (no emoji) + category name badge
  - 4 feature cards in 2×2 grid with staggered fade-in animation
  - Each card: colored icon circle + title + description + colored badge

### 5. Testimonials
- H2: "Lo que dicen nuestros técnicos"
- 3 cards with: 5 filled SVG stars | quote text | avatar initials circle + name + profession
- `bg-slate-50` section background

### 6. Pricing
- 3 plan cards: Free / Pro / Empresa
- Pro card: `bg-gradient-to-br from-blue-600 to-blue-800 text-white` with "Más Popular" badge
- Pro CTA: orange button with glow effect
- Feature lists with SVG checkmark icons

### 7. FAQ
- 8 items using native `<details>/<summary>` styled as rounded-xl cards
- `bg-white border border-slate-200 rounded-xl` per item

### 8. Final CTA
- `bg-gradient-to-br from-blue-700 to-blue-900` with 2 gradient blob decorations
- "Únete a más de 500 técnicos" heading
- Orange primary CTA with glow + white secondary "Ver demo" link

### 9. Footer
- `bg-slate-900 text-slate-400`
- 4 columns: Logo/tagline | Producto links | Empresa links | Legal links
- Bottom bar: copyright without emojis + trust badges (SSL, Stripe, privacy)

---

## Implementation Plan

1. **`app/globals.css`** — Append animation keyframes and utility classes after existing `@layer base` block
2. **`app/(marketing)/page.tsx`** — Full rewrite of JSX while preserving:
   - JSON-LD structured data (unchanged)
   - `features` data object (unchanged, just updated rendering)
   - `colorClasses` map (unchanged)
   - `getIconPath()` function (unchanged)
   - All pricing plans, testimonials, FAQ data (content unchanged)

---

## Acceptance Criteria

- [ ] No emojis as UI icons anywhere in the page
- [ ] Hero has gradient mesh background effect
- [ ] Hero heading has animated gradient text on key word
- [ ] 3 floating mockup cards visible in hero right column
- [ ] Stats bar section between hero and features
- [ ] Feature section uses SVG category icons
- [ ] Feature cards have staggered fade-in animations
- [ ] Pro pricing card has blue gradient background
- [ ] Primary CTA buttons use orange with glow effect
- [ ] Final CTA section has gradient background with blob decorations
- [ ] Footer has no emojis
- [ ] `prefers-reduced-motion` disables all animations
- [ ] Page remains a Server Component (no `'use client'`)
- [ ] Build passes with no TypeScript errors
