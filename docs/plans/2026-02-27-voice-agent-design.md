# CotizaPro Voice Agent - Design Document

**Date:** 2026-02-27
**Status:** DEPRECATED — Replaced by custom library implementation (2026-02-28)
**Feature:** "Asistente CotizaPro" - Voice-powered AI assistant for hands-free operation

---

## 1. Overview

Voice AI assistant that lets busy technicians (HVAC, plumbing, electrical, painting) manage their business hands-free via natural language voice commands in Spanish.

**Stack:**
- **STT:** Deepgram Nova-3 (streaming WebSocket, Spanish)
- **AI Agent:** Mastra.ai + Claude (tool calling)
- **Package:** Internal NPM package in monorepo (`packages/voice-agent/`)
- **UX:** Floating FAB microphone button on dashboard

**Core principle:** Auto-execute actions and notify with undo option. Zero confirmation dialogs.

---

## 2. Architecture

### 2.1 Package Structure

```
packages/voice-agent/
├── src/
│   ├── agent/
│   │   ├── index.ts              # Mastra Agent (Claude model, tools, system prompt)
│   │   ├── tools/
│   │   │   ├── clients.ts        # create_client, search_clients, update_client
│   │   │   ├── services.ts       # create_service, list_services
│   │   │   ├── quotes.ts         # create_quote, send_quote, list_quotes, get_quote
│   │   │   ├── reminders.ts      # create_reminder, complete_reminder, list_reminders
│   │   │   ├── calendar.ts       # create_event, list_events
│   │   │   └── analytics.ts      # get_dashboard, get_income
│   │   └── prompts.ts            # System prompt (Spanish, CotizaPro context)
│   ├── transcription/
│   │   ├── deepgram.ts           # Deepgram client wrapper (server-side)
│   │   └── types.ts              # TranscriptionEvent, TranscriptionConfig
│   ├── hooks/
│   │   ├── use-voice-agent.ts    # Main hook: record -> transcribe -> execute -> result
│   │   └── use-microphone.ts     # MediaRecorder wrapper with audio chunks
│   ├── api/
│   │   ├── process.ts            # POST handler: text input -> agent -> action result
│   │   └── transcribe.ts         # WebSocket proxy: audio chunks -> Deepgram -> text
│   ├── types.ts                  # Shared types (VoiceCommand, AgentResult, etc.)
│   └── index.ts                  # Public API exports
├── package.json
├── tsconfig.json
└── README.md                     # Flutter integration guide
```

### 2.2 Data Flow

```
Browser                          Next.js Server                    External
───────                          ──────────────                    ────────

[Microphone]
    │ audio chunks (250ms intervals)
    ▼
[MediaRecorder] ──WebSocket──► [/api/voice/transcribe] ──WS──► [Deepgram Nova-3]
                                       │                              │
                                       │◄──── transcript events ──────┘
                                       │
                               [Accumulate final transcript]
                                       │
                                       ▼
[FAB shows transcript] ◄─SSE── [/api/voice/process]
                                       │
                                       ▼
                               [Mastra Agent + Claude]
                                       │ tool calling
                                       ▼
                               [CotizaPro REST APIs]
                               (with user's JWT token)
                                       │
                                       ▼
[Toast: result + undo] ◄────── [AgentResult response]
```

### 2.3 Integration with Next.js App

The package exports:
- **React hooks** (`useVoiceAgent`, `useMicrophone`) - imported by dashboard layout
- **API route handlers** (`processHandler`, `transcribeHandler`) - mounted at `/api/voice/*`
- **FAB component** (`VoiceAgentFAB`) - added to dashboard layout

```typescript
// app/(dashboard)/layout.tsx
import { VoiceAgentFAB } from '@cotizapro/voice-agent'

export default function DashboardLayout({ children }) {
  return (
    <>
      {children}
      <VoiceAgentFAB />
    </>
  )
}
```

```typescript
// app/api/voice/process/route.ts
import { processHandler } from '@cotizapro/voice-agent/api'
export const POST = processHandler

// app/api/voice/transcribe/route.ts
import { transcribeHandler } from '@cotizapro/voice-agent/api'
export const GET = transcribeHandler // WebSocket upgrade
```

---

## 3. Mastra Agent Configuration

### 3.1 Agent Definition

```typescript
import { Agent } from '@mastra/core/agent'
import { clientTools } from './tools/clients'
import { serviceTools } from './tools/services'
import { quoteTools } from './tools/quotes'
import { reminderTools } from './tools/reminders'
import { calendarTools } from './tools/calendar'
import { analyticsTools } from './tools/analytics'
import { SYSTEM_PROMPT } from './prompts'

export const voiceAgent = new Agent({
  id: 'cotizapro-voice-agent',
  name: 'Asistente CotizaPro',
  instructions: SYSTEM_PROMPT,
  model: 'anthropic/claude-sonnet-4-5-20250514',
  tools: {
    ...clientTools,
    ...serviceTools,
    ...quoteTools,
    ...reminderTools,
    ...calendarTools,
    ...analyticsTools,
  },
})
```

### 3.2 System Prompt

```
Eres el asistente de voz de CotizaPro, una plataforma de cotizaciones para tecnicos
de HVAC, plomeria, pintura y electricidad en Mexico.

REGLAS:
1. SIEMPRE ejecuta la accion mas probable. Nunca pidas confirmacion.
2. Si falta informacion no critica, usa defaults razonables:
   - Estado/ciudad: omitir si no se menciona
   - Fecha de recordatorio: manana a las 9am si no se especifica
   - Validez de cotizacion: 15 dias si no se menciona
   - Tasa de impuesto: 16% (IVA Mexico) si no se especifica
3. Responde en espanol, maximo 1-2 oraciones confirmando la accion.
4. Si falta informacion CRITICA (ej: nombre del cliente para crear uno), indica que falta.
5. Formatos: telefono MX 10 digitos, precios en MXN, fechas en formato ISO.
6. Para cotizaciones complejas con multiples items, crea la cotizacion con los items mencionados.
7. Si el usuario pide algo que no puedes hacer, dilo claramente.

CONTEXTO DEL NEGOCIO:
- Categorias de servicio: hvac, plombing, electrical, painting, other
- Tipos de precio: fixed (fijo), per_hour (por hora), per_sqm (por m2), per_unit (por unidad)
- Estados de cotizacion: draft, sent, viewed, accepted, rejected, expired,
  en_instalacion, completado, cobrado
- Roles de equipo: owner, admin, member, viewer
```

### 3.3 Tool Definitions

Each tool wraps an existing CotizaPro API endpoint:

```typescript
// Example: clients.ts
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const createClient = createTool({
  id: 'create_client',
  description: 'Create a new client in the CRM. Use when the user mentions adding a client, customer, or prospect.',
  inputSchema: z.object({
    name: z.string().describe('Full name of the client'),
    email: z.string().email().optional().describe('Email address'),
    phone: z.string().optional().describe('Phone number (10 digits MX)'),
    whatsapp_phone: z.string().optional().describe('WhatsApp number'),
    company_name: z.string().optional().describe('Company or business name'),
    address: z.string().optional().describe('Street address'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    client_id: z.string().optional(),
  }),
  execute: async (input, { context }) => {
    const response = await fetch(`${context.apiBase}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.authToken}`,
      },
      body: JSON.stringify(input),
    })
    const data = await response.json()
    if (data.success) {
      return { success: true, message: `Cliente ${input.name} creado`, client_id: data.data.id }
    }
    return { success: false, message: `Error: ${data.error}` }
  },
})

export const searchClients = createTool({
  id: 'search_clients',
  description: 'Search for clients by name, email, or phone.',
  inputSchema: z.object({
    query: z.string().describe('Search term'),
  }),
  outputSchema: z.object({
    clients: z.array(z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
    })),
    count: z.number(),
  }),
  execute: async (input, { context }) => {
    const response = await fetch(
      `${context.apiBase}/api/clients?search=${encodeURIComponent(input.query)}&limit=5`,
      { headers: { 'Authorization': `Bearer ${context.authToken}` } }
    )
    const data = await response.json()
    return { clients: data.clients || [], count: data.clients?.length || 0 }
  },
})

export const clientTools = { createClient, searchClients }
```

### 3.4 Full Tool Inventory

| Tool ID | HTTP Method | Endpoint | Voice Trigger Examples |
|---------|-------------|----------|----------------------|
| `create_client` | POST | /api/clients | "Agrega cliente Maria Lopez, tel 5512345678" |
| `search_clients` | GET | /api/clients?search= | "Busca al cliente Gonzalez" |
| `update_client` | PUT | /api/clients/[id] | "Actualiza el telefono de Juan a 5587654321" |
| `create_service` | POST | /api/services | "Agrega servicio instalacion minisplit a 3500 pesos" |
| `list_services` | GET | /api/services | "Que servicios tengo?" |
| `create_quote` | POST | /api/quotes | "Cotiza 2 minisplits para Juan Perez" |
| `list_quotes` | GET | /api/quotes?status= | "Cuantas cotizaciones pendientes tengo?" |
| `get_quote` | GET | /api/quotes/[id] | "Dame los detalles de la cotizacion Q-2026-045" |
| `send_quote` | POST | /api/quotes/[id]/send | "Envia la ultima cotizacion por WhatsApp" |
| `create_reminder` | POST | /api/reminders | "Recordarme llamar a Pedro manana" |
| `complete_reminder` | POST | /api/reminders/[id]/complete | "Completa el recordatorio de Pedro" |
| `create_event` | POST | /api/calendar/events | "Agenda instalacion con Maria el viernes a las 10" |
| `list_events` | GET | /api/calendar/events | "Que tengo agendado esta semana?" |
| `get_dashboard` | GET | /api/analytics/dashboard | "Como van las ventas?" |
| `get_income` | GET | /api/analytics/income | "Cuanto facture este mes?" |

---

## 4. Deepgram Integration

### 4.1 Server-Side Proxy

Audio never touches the client-side Deepgram SDK. A Next.js API route proxies WebSocket:

```typescript
// packages/voice-agent/src/transcription/deepgram.ts
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'

export function createDeepgramConnection(options: {
  apiKey: string
  language?: string
  onTranscript: (text: string, isFinal: boolean) => void
  onError: (error: Error) => void
}) {
  const deepgram = createClient(options.apiKey)

  const connection = deepgram.listen.live({
    model: 'nova-3',
    language: options.language || 'es',
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 1500,
    vad_events: true,
    endpointing: 400,
  })

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel.alternatives[0]?.transcript
    if (transcript) {
      options.onTranscript(transcript, data.is_final)
    }
  })

  connection.on(LiveTranscriptionEvents.Error, (error) => {
    options.onError(new Error(String(error)))
  })

  return connection
}
```

### 4.2 Configuration

- **Model:** nova-3 (best accuracy for Spanish)
- **Language:** es (Spanish)
- **Interim results:** enabled (real-time visual feedback)
- **Utterance end:** 1500ms silence = end of command
- **VAD:** enabled (voice activity detection)
- **Endpointing:** 400ms (balance between speed and accuracy)

---

## 5. UX Design

### 5.1 FAB States

```
State        Icon              Color           Animation        Extra
─────        ────              ─────           ─────────        ─────
idle         Mic               neutral/gray    none             -
listening    Mic               primary/blue    pulse ring       Transcript text below
processing   Loader            primary/blue    spin             "Procesando..."
success      Check             green           fade 2s          Toast with result
error        X                 red             fade 2s          Toast with error
```

### 5.2 FAB Component

```typescript
// Positioning: fixed bottom-right, above existing QuickActions FAB
// Z-index: above everything except modals
// Mobile: full-width bottom bar when listening (better UX for transcript display)
// Desktop: fixed circle button, transcript in popover above
```

### 5.3 Toast Notifications

On success:
```
┌──────────────────────────────────────┐
│ ✓ Cliente Juan Perez creado          │
│                          [Deshacer]  │
└──────────────────────────────────────┘
```

On error:
```
┌──────────────────────────────────────┐
│ ✗ No se pudo crear el cliente:       │
│   Falta el nombre                    │
└──────────────────────────────────────┘
```

### 5.4 Undo Mechanism

- Each action returns an `undo` descriptor (e.g., `{ action: 'DELETE', endpoint: '/api/clients/abc123' }`)
- Undo button triggers the reverse API call
- Undo available for 10 seconds after action
- Only create/update actions are undoable (sends, analytics queries are not)

---

## 6. Security

| Concern | Mitigation |
|---------|------------|
| Audio privacy | Streaming only, never stored. Deepgram processes and discards. |
| API key exposure | Deepgram key server-side only (env var `DEEPGRAM_API_KEY`) |
| Auth bypass | User's JWT token passed to agent tools. All API calls go through existing RLS. |
| Rate limiting | 20 voice commands/min per user. Reuse existing `createRateLimiter`. |
| Injection | Agent tools use same Zod validation as regular API routes. |
| Cost control | Max 60s recording per command. Auto-stop on silence. |

---

## 7. Environment Variables

```bash
# Voice Agent (add to .env.local)
DEEPGRAM_API_KEY=your_deepgram_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key  # For Claude via Mastra
```

---

## 8. Flutter Integration Guide

### 8.1 Architecture (Mobile)

Flutter app uses the same backend APIs:

```
[Flutter App]
    │
    ├── Option A: speech_to_text package (on-device STT)
    │   └── Send text to POST /api/voice/process
    │
    └── Option B: Deepgram Flutter SDK
        └── Stream audio to WebSocket /api/voice/transcribe
```

### 8.2 API Contract

**POST /api/voice/process**

Request:
```json
{
  "text": "Crea un cliente llamado Juan Perez telefono 5512345678",
  "language": "es"
}
```

Response:
```json
{
  "success": true,
  "action": "create_client",
  "message": "Cliente Juan Perez creado",
  "data": {
    "id": "uuid-here",
    "name": "Juan Perez",
    "phone": "5512345678"
  },
  "undo": {
    "action": "DELETE",
    "endpoint": "/api/clients/uuid-here"
  }
}
```

**WebSocket /api/voice/transcribe**

Connect with Bearer token in query param or header.
Send: audio chunks (binary, 250ms intervals)
Receive: JSON messages `{ "transcript": "...", "is_final": true/false }`

### 8.3 Flutter Implementation Notes

1. Use `permission_handler` for microphone access
2. Use `web_socket_channel` for WebSocket connection
3. Store auth token from Supabase session
4. Display same FAB UI pattern (floating mic button)
5. Haptic feedback on state transitions
6. Keep audio recording under 60s

---

## 9. Dependencies

```json
{
  "dependencies": {
    "@mastra/core": "^0.x",
    "@deepgram/sdk": "^3.x",
    "@anthropic-ai/sdk": "^0.x",
    "zod": "^4.x"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "next": "^15.0.0 || ^16.0.0"
  }
}
```

---

## 10. Implementation Phases

### Phase 1: Core Agent (MVP)
- Mastra agent with Claude + 6 tool groups
- POST /api/voice/process endpoint (text-only, no audio yet)
- Test with curl/Postman

### Phase 2: Deepgram STT
- WebSocket proxy route
- Deepgram streaming integration
- Audio chunk handling

### Phase 3: Web UI
- FAB component with all states
- useVoiceAgent hook
- useMicrophone hook
- Toast notifications with undo
- Integration into dashboard layout

### Phase 4: Polish
- Error handling edge cases
- Rate limiting
- Loading states
- Mobile responsive FAB
- Documentation for Flutter

---

## 11. Cost Estimates

| Service | Cost | Volume (est. per user/month) |
|---------|------|------------------------------|
| Deepgram Nova-3 | $0.0043/min | ~100 commands x 15s avg = 25 min = $0.11 |
| Claude Sonnet | $3/$15 per 1M tokens | ~100 commands x 500 tokens = 50K tokens = $0.15 input + $0.75 output |
| **Total per user/month** | | **~$1.00** |

---

*Approved: 2026-02-27*
