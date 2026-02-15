# CotizaPro Complete Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand landing page from 6 to 12 features organized in 3 categories, showing complete SaaS roadmap including unimplemented features with "PRÓXIMAMENTE" badges.

**Architecture:** Update existing `app/(marketing)/page.tsx` to display 12 features in 3 semantic categories (Cotización Inteligente, Seguimiento & Automatización, Gestión & Pagos). Add visual badges for features not yet implemented. Update pricing section to reflect new feature availability per plan. Maintain current design system (TailwindCSS, inline SVG icons, responsive grid).

**Tech Stack:** Next.js 15, React 19, TypeScript 5.x, TailwindCSS 3.x, shadcn/ui Button component

---

## Week 1: Features Section Expansion

### Task 1: Define Complete Features Data Structure

**Files:**
- Modify: `app/(marketing)/page.tsx`

**Step 1: Add features data structure at top of component**

Above the return statement in `LandingPage` component, add:

```typescript
const features = {
  cotizacion: [
    {
      icon: "document",
      title: "Cotizaciones en 30 Segundos",
      description: "Catálogo pre-cargado de servicios con precios. Crea cotizaciones profesionales en menos de 30 segundos.",
      color: "blue",
      badge: null
    },
    {
      icon: "pdf",
      title: "PDF Profesional",
      description: "PDF con tu logo personalizado, términos y condiciones. Impresiona a tus clientes desde la primera impresión.",
      color: "red",
      badge: null
    },
    {
      icon: "calculator",
      title: "Cálculo Automático",
      description: "IVA, descuentos y totales calculados automáticamente. Precios en pesos mexicanos (MXN). Sin errores.",
      color: "orange",
      badge: null
    },
    {
      icon: "template",
      title: "Plantillas Personalizables",
      description: "Configura términos de pago, garantías y condiciones una vez. Reutiliza en todas tus cotizaciones.",
      color: "purple",
      badge: null
    }
  ],
  seguimiento: [
    {
      icon: "whatsapp",
      title: "Envío por WhatsApp/Email",
      description: "Envía cotizaciones directo al WhatsApp o Email de tus clientes. Rápido, conveniente y profesional.",
      color: "green",
      badge: null
    },
    {
      icon: "bell",
      title: "Recordatorios Automáticos",
      description: "WhatsApp automático para mantenimientos anuales. Nunca vuelvas a perder un cliente por olvido.",
      color: "yellow",
      badge: "PRÓXIMAMENTE"
    },
    {
      icon: "calendar",
      title: "Calendario de Servicios",
      description: "Agenda citas, visualiza tu semana y organiza tus servicios. Sincroniza con Google Calendar.",
      color: "indigo",
      badge: "PRÓXIMAMENTE"
    },
    {
      icon: "history",
      title: "Historial Completo",
      description: "Todas las cotizaciones, servicios y pagos por cliente. Acceso instantáneo al historial completo.",
      color: "teal",
      badge: null
    }
  ],
  gestion: [
    {
      icon: "users",
      title: "CRM Integrado",
      description: "Gestión de clientes con tags, notas y seguimiento. Organiza tu negocio como un profesional.",
      color: "purple",
      badge: null
    },
    {
      icon: "creditcard",
      title: "Link de Pago",
      description: "Cobra con Stripe (tarjeta o transferencia). Envía link de pago y recibe confirmación automática.",
      color: "blue",
      badge: "PRÓXIMAMENTE"
    },
    {
      icon: "receipt",
      title: "Facturación CFDI 4.0",
      description: "Facturas electrónicas automáticas cumpliendo con SAT. Integración con PAC certificado.",
      color: "green",
      badge: "PRÓXIMAMENTE"
    },
    {
      icon: "chart",
      title: "Dashboard de Ventas",
      description: "Métricas en tiempo real: conversión, ingresos, tendencias. Toma decisiones basadas en datos.",
      color: "red",
      badge: null
    }
  ]
}

const colorClasses = {
  blue: "bg-blue-100 text-blue-600",
  red: "bg-red-100 text-red-600",
  orange: "bg-orange-100 text-orange-600",
  purple: "bg-purple-100 text-purple-600",
  green: "bg-green-100 text-green-600",
  yellow: "bg-yellow-100 text-yellow-600",
  indigo: "bg-indigo-100 text-indigo-600",
  teal: "bg-teal-100 text-teal-600"
}
```

**Step 2: Verify TypeScript has no errors**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit data structure**

```bash
git add app/(marketing)/page.tsx
git commit -m "feat(landing): add complete features data structure with 12 features"
```

---

### Task 2: Create Icon SVG Mapping Helper

**Files:**
- Modify: `app/(marketing)/page.tsx`

**Step 1: Add icon mapping function after features data**

```typescript
const getIconPath = (iconName: string) => {
  const icons: Record<string, string> = {
    document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    pdf: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    calculator: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    template: "M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z",
    whatsapp: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
    bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    creditcard: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    receipt: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
    chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
  }
  return icons[iconName] || icons.document
}
```

**Step 2: Verify TypeScript has no errors**

Run: `npm run type-check`
Expected: No errors

**Step 3: Commit icon helper**

```bash
git add app/(marketing)/page.tsx
git commit -m "feat(landing): add icon SVG mapping helper function"
```

---

### Task 3: Replace Features Section with Category-Based Layout

**Files:**
- Modify: `app/(marketing)/page.tsx`

**Step 1: Locate existing Features Section**

Find the section starting with `<section id="features"` (around line 48)

**Step 2: Replace entire Features Section**

Replace from `<section id="features"` to the closing `</section>` with:

```tsx
{/* Features Section */}
<section id="features" className="container mx-auto px-4 py-20">
  <h2 className="text-4xl font-bold text-center mb-4">
    Todo lo que necesitas para cotizar
  </h2>
  <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
    Plataforma completa para técnicos de mantenimiento en México
  </p>

  {/* Categoría 1: Cotización Inteligente */}
  <div className="mb-16">
    <h3 className="text-2xl font-bold mb-8 flex items-center justify-center">
      <span className="text-3xl mr-3">🎯</span>
      Cotización Inteligente
    </h3>
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {features.cotizacion.map((feature, idx) => (
        <div key={idx} className="p-6 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className={`w-12 h-12 ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center mb-4`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(feature.icon)} />
            </svg>
          </div>
          <h4 className="text-xl font-semibold mb-2 flex items-center gap-2">
            {feature.title}
            {feature.badge && (
              <span className="inline-block px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                {feature.badge}
              </span>
            )}
          </h4>
          <p className="text-gray-600 text-sm">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  </div>

  {/* Categoría 2: Seguimiento & Automatización */}
  <div className="mb-16">
    <h3 className="text-2xl font-bold mb-8 flex items-center justify-center">
      <span className="text-3xl mr-3">📅</span>
      Seguimiento & Automatización
    </h3>
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {features.seguimiento.map((feature, idx) => (
        <div key={idx} className="p-6 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className={`w-12 h-12 ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center mb-4`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(feature.icon)} />
            </svg>
          </div>
          <h4 className="text-xl font-semibold mb-2 flex items-center gap-2">
            {feature.title}
            {feature.badge && (
              <span className="inline-block px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                {feature.badge}
              </span>
            )}
          </h4>
          <p className="text-gray-600 text-sm">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  </div>

  {/* Categoría 3: Gestión & Pagos */}
  <div>
    <h3 className="text-2xl font-bold mb-8 flex items-center justify-center">
      <span className="text-3xl mr-3">💰</span>
      Gestión & Pagos
    </h3>
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {features.gestion.map((feature, idx) => (
        <div key={idx} className="p-6 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
          <div className={`w-12 h-12 ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-lg flex items-center justify-center mb-4`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getIconPath(feature.icon)} />
            </svg>
          </div>
          <h4 className="text-xl font-semibold mb-2 flex items-center gap-2">
            {feature.title}
            {feature.badge && (
              <span className="inline-block px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                {feature.badge}
              </span>
            )}
          </h4>
          <p className="text-gray-600 text-sm">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Step 3: Verify dev server compiles**

If dev server is running, check for compilation errors in terminal
If not running: `npm run dev`
Expected: No errors, page loads at localhost:3000

**Step 4: Verify visually in browser**

Open `http://localhost:3000`
Expected: 12 features visible in 3 categories with category headers

**Step 5: Commit features section**

```bash
git add app/(marketing)/page.tsx
git commit -m "feat(landing): replace features section with 3 categories and 12 features"
```

---

### Task 4: Update Pricing Section Features

**Files:**
- Modify: `app/(marketing)/page.tsx`

**Step 1: Locate Plan Pro section**

Find the "Plan Pro" div (around line 242)

**Step 2: Update Pro plan features list**

Replace the `<ul className="space-y-3 mb-8">` inside Plan Pro with:

```tsx
<ul className="space-y-3 mb-8">
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span className="font-semibold">Cotizaciones ilimitadas</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span className="font-semibold">Clientes ilimitados</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>WhatsApp + Email</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span className="font-semibold">Recordatorios automáticos</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span className="font-semibold">Calendario de servicios</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Dashboard completo</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Soporte prioritario</span>
  </li>
</ul>
```

**Step 3: Locate Plan Empresa section**

Find the "Plan Empresa" div (around line 290)

**Step 4: Update Empresa plan features list**

Replace the `<ul className="space-y-3 mb-8">` inside Plan Empresa with:

```tsx
<ul className="space-y-3 mb-8">
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span className="font-semibold">Todo en Pro +</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Múltiples usuarios</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span className="font-semibold">Link de pago (Stripe)</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span className="font-semibold">Facturación CFDI 4.0</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>API de acceso</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Logo personalizado</span>
  </li>
  <li className="flex items-start">
    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <span>Soporte dedicado 24/7</span>
  </li>
</ul>
```

**Step 5: Verify visually in browser**

Refresh `http://localhost:3000` and scroll to pricing
Expected: Pro plan shows "Recordatorios automáticos" and "Calendario de servicios", Empresa plan shows "Link de pago" and "Facturación CFDI 4.0"

**Step 6: Commit pricing updates**

```bash
git add app/(marketing)/page.tsx
git commit -m "feat(landing): update pricing section with new features per plan"
```

---

### Task 5: Add Missing TailwindCSS Color Classes

**Files:**
- Modify: `app/globals.css`

**Step 1: Check if teal color utilities exist**

Run: `npm run dev` and check browser console for warnings about missing classes

**Step 2: If needed, add teal to tailwind.config**

If teal-100/teal-600 classes are not working, they should work by default with TailwindCSS 3.x. Verify by checking browser devtools that classes are applied.

Expected: Classes should work out of the box with Tailwind

**Step 3: No commit needed if no changes**

If Tailwind already supports teal (which it should), skip this task.

---

### Task 6: Test Responsive Behavior

**Files:**
- No file changes

**Step 1: Test desktop layout (>= 1024px)**

1. Open `http://localhost:3000`
2. Resize browser to 1280px width or larger
3. Scroll to Features section

Expected: 4 features per row in each category (lg:grid-cols-4)

**Step 2: Test tablet layout (768px - 1023px)**

1. Resize browser to 800px width
2. Scroll to Features section

Expected: 2 features per row in each category (md:grid-cols-2)

**Step 3: Test mobile layout (< 768px)**

1. Resize browser to 375px width (iPhone size)
2. Scroll to Features section

Expected: 1 feature per column (default grid behavior)

**Step 4: Test badges visibility**

1. On any screen size, scroll to "Seguimiento & Automatización" category
2. Find "Recordatorios Automáticos" and "Calendario de Servicios" cards

Expected: Yellow "PRÓXIMAMENTE" badges visible on both cards

**Step 5: Test badges in Gestión & Pagos**

1. Scroll to "Gestión & Pagos" category
2. Find "Link de Pago" and "Facturación CFDI 4.0" cards

Expected: Yellow "PRÓXIMAMENTE" badges visible on both cards

**Step 6: Document test results**

No commit needed, just visual verification complete.

---

### Task 7: Verify All Links Work

**Files:**
- No file changes

**Step 1: Test navigation links**

1. Click "Iniciar Sesión" in nav
Expected: Navigates to `/login` (may show 404, that's ok for now)

2. Click "Prueba Gratis" in nav
Expected: Navigates to `/signup` (may show 404, that's ok for now)

**Step 2: Test hero CTA links**

1. Scroll to hero section
2. Click "Comenzar Gratis" button
Expected: Navigates to `/signup`

3. Click "Ver Características" button
Expected: Smooth scrolls to #features section

**Step 3: Test pricing links**

1. Scroll to pricing section
2. Click each plan's CTA button
Expected: All navigate to `/signup` (Free, Pro, Empresa)

**Step 4: Test footer links**

1. Scroll to footer
2. Click random footer links
Expected: Navigate to respective pages (may show 404, expected)

**Step 5: Document verification**

All links working as expected (even if destinations don't exist yet).

---

### Task 8: Run Type Checks and Linting

**Files:**
- No file changes

**Step 1: Run TypeScript type check**

Run: `npm run type-check`
Expected: No type errors

**Step 2: Run ESLint**

Run: `npm run lint`
Expected: No linting errors (or only warnings, not errors)

**Step 3: Fix any errors if found**

If errors exist, fix them before proceeding.

Expected: Clean build

---

### Task 9: Final Visual QA

**Files:**
- No file changes

**Step 1: Full page scroll test**

1. Open `http://localhost:3000`
2. Scroll from top to bottom slowly
3. Verify:
   - Navigation sticky behavior works
   - Hero section looks good
   - All 3 category headers visible with emojis
   - All 12 features render correctly
   - Badges show on correct features (4 total)
   - Social proof section intact
   - Pricing section shows updated features
   - Final CTA section intact
   - Footer intact

**Step 2: Cross-browser test (optional)**

If possible, test in:
- Chrome/Edge (Chromium)
- Safari
- Firefox

Expected: Consistent rendering across browsers

**Step 3: Mobile device test (optional)**

If possible, test on real mobile device or use Chrome DevTools device emulation

Expected: Touch targets are large enough, text readable, layout clean

---

### Task 10: Final Commit and Summary

**Files:**
- Modify: `docs/FEATURE_TRACKER.md` (if exists)

**Step 1: Update feature tracker**

If `docs/FEATURE_TRACKER.md` exists, add entry:

```markdown
## 2026-02-13: Landing Page Complete Feature Set

- ✅ Expanded features section from 6 to 12 features
- ✅ Organized in 3 categories: Cotización, Seguimiento, Gestión
- ✅ Added "PRÓXIMAMENTE" badges for unimplemented features
- ✅ Updated pricing with new features per plan
- ✅ Responsive grid: 4 cols desktop, 2 cols tablet, 1 col mobile
```

**Step 2: Create final commit**

```bash
git add -A
git commit -m "docs: update feature tracker with landing page completion

Landing page now shows complete roadmap:
- 12 features in 3 categories
- Badges for features in development
- Updated pricing section
- Fully responsive layout

Closes brainstorming design doc 2026-02-13.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 3: Verify git status clean**

Run: `git status`
Expected: "nothing to commit, working tree clean"

---

## Acceptance Criteria

- [ ] 12 features visible on landing page
- [ ] 3 category headers with emojis (🎯 📅 💰)
- [ ] 4 features have "PRÓXIMAMENTE" badges (Recordatorios, Calendario, Link Pago, CFDI)
- [ ] Responsive grid: 4 cols desktop, 2 tablet, 1 mobile
- [ ] Pricing section shows new features (Pro: recordatorios + calendario, Empresa: link pago + CFDI)
- [ ] All links work (even if destinations don't exist)
- [ ] No TypeScript errors
- [ ] No build errors
- [ ] Visual consistency maintained with current design

---

## Testing Strategy

**Manual Testing:**
- Visual QA on 3 breakpoints (desktop, tablet, mobile)
- Click all CTAs and links
- Verify badge visibility
- Check hover states on feature cards

**Automated Testing (out of scope for this task):**
- E2E tests with Playwright (add later)
- Visual regression tests (add later)

---

## Notes

- No component extraction needed yet (inline is fine for now)
- No animations added (keep simple, add later if needed)
- No screenshots/mockups (add in future iteration)
- Feature icons use inline SVG paths (consistent with current approach)
- All features use existing TailwindCSS color utilities
- Badges use yellow color scheme for consistency

---

## Rollback Plan

If issues arise:

```bash
git log --oneline -5  # Find commit before changes
git revert <commit-hash>  # Revert specific commit
# OR
git reset --hard <commit-hash>  # Hard reset to before changes (use carefully)
```

---

## Future Enhancements (out of scope)

- Add feature screenshots/mockups
- Add video demo section
- Add FAQ section
- Extract features into reusable components
- Add micro-animations on scroll
- Add "Roadmap" page linked from footer
- A/B test different feature ordering
- Add feature comparison table

---

**Plan Complete**. Ready for implementation.
