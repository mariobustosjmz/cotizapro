# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** CotizaPro
**Confirmed:** 2026-02-17 (from landing page implementation)
**Category:** B2B Service — HVAC/plumbing/electrical/painting contractors in Mexico

---

## Global Rules

### Color Palette

| Role | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Primary | `#1E40AF` | `blue-800` | Headings, nav logo, primary actions |
| Secondary | `#3B82F6` | `blue-500` | Feature icons, badges, accents |
| CTA/Accent | `#F97316` | `orange-500` | Primary CTA buttons, highlights |
| Background | `#EFF6FF` | `blue-50` | Hero section tint |
| Surface | `#FFFFFF` | `white` | Cards, panels |
| Dark bg | `#0F172A` | `slate-900` | Stats bar, footer sections |
| Text | `#0F172A` | `slate-900` | Body text |
| Muted | `#475569` | `slate-600` | Subtitles, descriptions |
| Border | `#E2E8F0` | `slate-200` | Dividers, card borders |

**Color Notes:** Blue authority + orange CTA contrast. Do NOT use amber (`#F59E0B`) — use orange-500 (`#F97316`) for CTAs.

### Typography

- **Font Family:** Geist Sans (loaded via `next/font/google` in `app/layout.tsx`)
- **Mood:** professional, technical, precise, trustworthy
- **Heading sizes:** 3xl–7xl for marketing, xl–2xl for dashboard
- **Body:** 16px minimum, `leading-relaxed`

**Anti-pattern:** Do NOT import Fira Code or Fira Sans — Geist Sans is already configured.

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | `4px` / `0.25rem` | Tight gaps |
| `sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `md` | `16px` / `1rem` | Standard padding |
| `lg` | `24px` / `1.5rem` | Section padding |
| `xl` | `32px` / `2rem` | Large gaps |
| `2xl` | `48px` / `3rem` | Section margins |
| `3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Usage |
|-------|-------|
| `shadow-sm` | Subtle lift |
| `shadow-md` | Cards, buttons |
| `shadow-lg` | Modals, dropdowns |
| `shadow-xl` | Hero images, featured cards |

---

## Component Specs

### Buttons

```tsx
// Primary CTA — orange with glow
<button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 cursor-pointer">

// Secondary — blue outline
<button className="border-2 border-blue-800 text-blue-800 hover:bg-blue-50 px-6 py-3 rounded-lg font-semibold transition-all duration-200 cursor-pointer">

// Ghost / tertiary
<button className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors duration-200 cursor-pointer">
```

### Cards

```tsx
<div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer">
```

### Inputs

```tsx
<input className="px-4 py-3 border border-slate-200 rounded-lg text-base transition-colors duration-200 focus:border-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-800/20">
```

### Modals

```tsx
// Overlay
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm">
// Modal
<div className="bg-white rounded-2xl p-8 shadow-xl max-w-lg w-[90%]">
```

### Navigation Active State (Dashboard)

```tsx
// Active nav item
<Link className="bg-blue-50 text-blue-700 flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium">

// Inactive nav item
<Link className="text-slate-600 hover:bg-slate-100 flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer">
```

---

## Style: Light Modern (Trust & Authority)

**Keywords:** Professional credentials, clear data hierarchy, trust signals, precise typography

**Key Effects:**
- Smooth transitions: 150–300ms
- Hover: subtle bg-gray-100 lift (no layout shift)
- Focus: 2px ring in primary color
- Loading: skeleton screens or spinners

**Section Order (Marketing):**
1. Hero — value prop + primary CTA + secondary CTA
2. Social proof metrics bar (dark background)
3. Features — 3 category blocks with cards
4. Testimonials
5. Pricing — 3 tiers
6. FAQ
7. Final CTA section
8. Footer

---

## Animations (CSS-only, Server Component safe)

All keyframes defined in `app/globals.css`:

| Class | Effect | Use For |
|-------|--------|---------|
| `.gradient-text-animated` | Animated gradient text | Hero heading accent |
| `.animate-float` | Floating up/down | Hero mockup cards |
| `.animate-float-slow` | Slow float + rotate | Secondary hero elements |
| `.animate-blob` | Morphing blob pulse | Background blobs |
| `.feature-card-1..4` | Staggered fade-in | Feature grid cards |
| `.animate-fade-in-up` | Fade + slide up | Hero content blocks |
| `.animate-slide-in-right` | Slide from right | Hero side column |
| `.btn-glow-orange` | Pulsing orange glow | Primary CTA button |

**Always include:** `prefers-reduced-motion` disables all animations (already in globals.css).

---

## Anti-Patterns (Do NOT Use)

- No emojis as icons — use SVG icons (Heroicons, Lucide)
- No `cursor: auto` on clickable elements — always `cursor-pointer`
- No layout-shifting hovers — use opacity/color changes, not scale transforms
- No low contrast text — minimum 4.5:1 ratio
- No instant state changes — always transitions 150–300ms
- No invisible focus states — focus rings required for a11y
- No amber (`#F59E0B`) for CTAs — use orange-500 (`#F97316`)
- No Fira Code / Fira Sans — Geist Sans is the project font
- No AI purple/pink gradients
- No `any` TypeScript types

---

## Pre-Delivery Checklist

- [ ] No emojis used as icons (SVG only)
- [ ] All icons from Heroicons or Lucide
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150–300ms)
- [ ] Text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
- [ ] No `any` TypeScript types
- [ ] CTA color is orange-500 (#F97316), not amber
