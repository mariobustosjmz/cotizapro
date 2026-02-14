# CotizaPro Landing Page - Diseño Completo con Alcance Futuro

**Fecha**: 2026-02-13
**Autor**: Mario Bustos
**Estado**: Aprobado
**Objetivo**: Mostrar el alcance completo del SaaS incluyendo features proyectados

---

## Visión

Actualizar la landing page actual para mostrar TODOS los features del roadmap de CotizaPro, no solo los implementados actualmente. La landing debe comunicar la visión completa del producto para atraer clientes con el valor total de la plataforma.

---

## Contexto

**Landing Actual** (`app/(marketing)/page.tsx`):
- 6 features básicos
- Faltan features críticos como recordatorios automáticos, calendario, pagos, facturación
- No comunica el alcance completo del producto

**Problema Identificado**:
El usuario notó que faltan features importantes mencionados en `COTIZAPRO_PLAN_EJECUCION.md`:
- Recordatorios WhatsApp automatizados (pain point principal)
- Calendario de servicios
- Cobro con link de pago (Stripe)
- Facturación CFDI 4.0

**Decisión**: Incluir TODOS los features proyectados en la landing, incluso si no están implementados aún.

---

## Diseño Aprobado

### Estructura General

```
┌─────────────────────────────────────┐
│   NAVIGATION (sin cambios)          │
├─────────────────────────────────────┤
│   HERO SECTION (sin cambios)        │
├─────────────────────────────────────┤
│   FEATURES SECTION (EXPANDIR)       │
│   - 12 features en 3 categorías     │
│   - Grid responsive 4 cols desktop  │
│   - Grid 2 cols tablet              │
│   - Grid 1 col mobile               │
├─────────────────────────────────────┤
│   SOCIAL PROOF (sin cambios)        │
├─────────────────────────────────────┤
│   PRICING (actualizar límites)      │
├─────────────────────────────────────┤
│   FINAL CTA (sin cambios)           │
├─────────────────────────────────────┤
│   FOOTER (sin cambios)              │
└─────────────────────────────────────┘
```

---

## Features Section - Diseño Detallado

### Categoría 1: Cotización Inteligente 🎯

**Feature 1: Cotizaciones en 30 Segundos**
- Icono: Document con reloj
- Color: Blue (bg-blue-100, text-blue-600)
- Descripción: "Catálogo pre-cargado de servicios con precios. Crea cotizaciones profesionales en menos de 30 segundos."

**Feature 2: PDF Profesional**
- Icono: File PDF
- Color: Red (bg-red-100, text-red-600)
- Descripción: "PDF con tu logo personalizado, términos y condiciones. Impresiona a tus clientes desde la primera impresión."

**Feature 3: Cálculo Automático**
- Icono: Calculator
- Color: Orange (bg-orange-100, text-orange-600)
- Descripción: "IVA, descuentos y totales calculados automáticamente. Precios en pesos mexicanos (MXN). Sin errores."

**Feature 4: Plantillas Personalizables**
- Icono: Template
- Color: Purple (bg-purple-100, text-purple-600)
- Descripción: "Configura términos de pago, garantías y condiciones una vez. Reutiliza en todas tus cotizaciones."

---

### Categoría 2: Seguimiento & Automatización 📅

**Feature 5: Envío por WhatsApp/Email**
- Icono: WhatsApp + Email
- Color: Green (bg-green-100, text-green-600)
- Descripción: "Envía cotizaciones directo al WhatsApp o Email de tus clientes. Rápido, conveniente y profesional."

**Feature 6: Recordatorios Automáticos**
- Icono: Bell con notificación
- Color: Yellow (bg-yellow-100, text-yellow-600)
- Descripción: "WhatsApp automático para mantenimientos anuales. Nunca vuelvas a perder un cliente por olvido."
- Badge: "PRÓXIMAMENTE"

**Feature 7: Calendario de Servicios**
- Icono: Calendar
- Color: Indigo (bg-indigo-100, text-indigo-600)
- Descripción: "Agenda citas, visualiza tu semana y organiza tus servicios. Sincroniza con Google Calendar."
- Badge: "PRÓXIMAMENTE"

**Feature 8: Historial Completo**
- Icono: History/Clock rotate
- Color: Teal (bg-teal-100, text-teal-600)
- Descripción: "Todas las cotizaciones, servicios y pagos por cliente. Acceso instantáneo al historial completo."

---

### Categoría 3: Gestión & Pagos 💰

**Feature 9: CRM Integrado**
- Icono: Users group
- Color: Purple (bg-purple-100, text-purple-600)
- Descripción: "Gestión de clientes con tags, notas y seguimiento. Organiza tu negocio como un profesional."

**Feature 10: Link de Pago**
- Icono: Credit card
- Color: Blue (bg-blue-100, text-blue-600)
- Descripción: "Cobra con Stripe (tarjeta o transferencia). Envía link de pago y recibe confirmación automática."
- Badge: "PRÓXIMAMENTE"

**Feature 11: Facturación CFDI 4.0**
- Icono: Receipt tax
- Color: Green (bg-green-100, text-green-600)
- Descripción: "Facturas electrónicas automáticas cumpliendo con SAT. Integración con PAC certificado."
- Badge: "PRÓXIMAMENTE"

**Feature 12: Dashboard de Ventas**
- Icono: Chart bar
- Color: Red (bg-red-100, text-red-600)
- Descripción: "Métricas en tiempo real: conversión, ingresos, tendencias. Toma decisiones basadas en datos."

---

## Cambios en Pricing

### Plan Gratis
- ✅ 10 cotizaciones/mes
- ✅ 5 clientes
- ✅ Envío por email
- ✅ PDF profesional

### Plan Pro ($299/mes) - MÁS POPULAR
- ✅ Cotizaciones ilimitadas
- ✅ Clientes ilimitados
- ✅ WhatsApp + Email
- ✅ **Recordatorios automáticos** (nuevo)
- ✅ **Calendario de servicios** (nuevo)
- ✅ Dashboard completo
- ✅ Soporte prioritario

### Plan Empresa ($799/mes)
- ✅ Todo en Pro +
- ✅ Múltiples usuarios
- ✅ **Link de pago (Stripe)** (nuevo)
- ✅ **Facturación CFDI 4.0** (nuevo)
- ✅ API de acceso
- ✅ Logo personalizado
- ✅ Soporte dedicado 24/7

---

## Badges de Estado

Para features no implementados, agregar badge visual:

```tsx
<span className="inline-block px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
  PRÓXIMAMENTE
</span>
```

**Features con badge**:
- Recordatorios Automáticos
- Calendario de Servicios
- Link de Pago
- Facturación CFDI 4.0

---

## Layout Responsive

### Desktop (>= 1024px)
```
┌────────┬────────┬────────┬────────┐
│ Feat 1 │ Feat 2 │ Feat 3 │ Feat 4 │
├────────┼────────┼────────┼────────┤
│ Feat 5 │ Feat 6 │ Feat 7 │ Feat 8 │
├────────┼────────┼────────┼────────┤
│ Feat 9 │ Feat10 │ Feat11 │ Feat12 │
└────────┴────────┴────────┴────────┘
```

### Tablet (768px - 1023px)
```
┌────────┬────────┐
│ Feat 1 │ Feat 2 │
├────────┼────────┤
│ Feat 3 │ Feat 4 │
└────────┴────────┘
(etc...)
```

### Mobile (< 768px)
```
┌────────┐
│ Feat 1 │
├────────┤
│ Feat 2 │
├────────┤
│ Feat 3 │
└────────┘
(etc...)
```

---

## Categorías Visuales

Cada categoría tendrá un header separado:

```tsx
<div className="mb-8">
  <h3 className="text-2xl font-bold mb-4 flex items-center">
    <span className="text-blue-600 mr-2">🎯</span>
    Cotización Inteligente
  </h3>
  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
    {/* Features 1-4 */}
  </div>
</div>
```

---

## Íconos SVG

Usar Heroicons inline (ya en uso actual):
- Document: path d="M9 12h6m-6 4h6..."
- WhatsApp: Custom o lucide-react
- Bell: path d="M15 17h5l-1.405..."
- Calendar: path d="M8 7V3m8 4V3m-9..."
- Users: path d="M17 20h5v-2a3..."
- CreditCard: path d="M3 10h18M7 15h1..."
- Receipt: path d="M9 14l6-6m-5.5..."
- ChartBar: path d="M9 19v-6a2 2..."

---

## SEO Metadata (sin cambios)

Ya está optimizado en `app/(marketing)/layout.tsx`:
- title: "CotizaPro - Cotizaciones Profesionales en Minutos"
- description: "La herramienta perfecta para técnicos de mantenimiento en México..."
- keywords: "cotizaciones, técnicos, mantenimiento, HVAC, plomería, pintura, WhatsApp, México"
- openGraph configurado para es_MX

---

## Arquitectura de Componentes

```
app/(marketing)/page.tsx
├─ <Navigation /> (sin cambios)
├─ <HeroSection /> (sin cambios)
├─ <FeaturesSection />
│   ├─ <CategoryHeader title="Cotización Inteligente" icon="🎯" />
│   ├─ <FeatureGrid>
│   │   ├─ <FeatureCard feature={feature1} badge={null} />
│   │   ├─ <FeatureCard feature={feature2} badge={null} />
│   │   └─ ...
│   ├─ <CategoryHeader title="Seguimiento & Automatización" icon="📅" />
│   ├─ <FeatureGrid>
│   │   ├─ <FeatureCard feature={feature5} badge={null} />
│   │   ├─ <FeatureCard feature={feature6} badge="PRÓXIMAMENTE" />
│   │   └─ ...
│   └─ <CategoryHeader title="Gestión & Pagos" icon="💰" />
│       └─ <FeatureGrid>
│           └─ ...
├─ <SocialProof /> (sin cambios)
├─ <Pricing /> (actualizar features en planes)
├─ <FinalCTA /> (sin cambios)
└─ <Footer /> (sin cambios)
```

**Nota**: Por ahora mantener todo inline en page.tsx (no extraer componentes). Cuando la landing crezca más, considerar componentizar.

---

## Criterios de Aceptación

- [ ] 12 features visibles en la landing
- [ ] 3 categorías claramente diferenciadas
- [ ] Badges "PRÓXIMAMENTE" en features no implementados
- [ ] Grid responsive (4 cols desktop, 2 cols tablet, 1 col mobile)
- [ ] Pricing actualizado con nuevos features
- [ ] Sin cambios en Hero, Social Proof, CTA, Footer
- [ ] Mantener el mismo estilo visual (TailwindCSS, colores actuales)
- [ ] Todos los links funcionando (aunque apunten a /signup placeholder)

---

## Out of Scope

- Video demo (mencionado en plan pero no crítico para esta iteración)
- Screenshots/mockups de features (agregar después)
- Chat widget (Crisp/Tawk.to)
- FAQ section (agregar en siguiente iteración)
- Sección "Próximamente" en footer (opcional)

---

## Notas de Implementación

1. **Mantener inmutabilidad**: Crear nuevo array de features, no mutar existente
2. **Accesibilidad**: aria-labels en íconos, alt text descriptivo
3. **Performance**: Lazy load no necesario (landing es pequeña)
4. **SEO**: Metadata ya optimizada, no tocar
5. **Mobile-first**: Diseñar primero para mobile, luego desktop

---

## Referencias

- Execution Plan: `COTIZAPRO_PLAN_EJECUCION.md` (líneas 37-44, 198-206)
- Current Landing: `app/(marketing)/page.tsx`
- shadcn/ui Button: `components/ui/button.tsx`
- TailwindCSS colors: Already using blue, green, purple, orange, red, indigo

---

## Aprobación

**Usuario**: Aprobado - "esta bien"
**Fecha**: 2026-02-13
**Próximo paso**: Crear implementation plan con writing-plans skill
