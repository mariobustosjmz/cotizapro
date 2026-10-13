# Funciones con IA y créditos mensuales de IA — Diseño

- **Fecha:** 2026-10-13
- **Estado:** aprobado el 2026-10-13
- **Base:** [investigación](../../research/2026-10-13-ia-uso-y-funciones.md) y las decisiones del 2026-10-13.

## 0. Qué se busca

El negocio de oficios cotiza más rápido y cierra más ventas con IA útil dentro del flujo que ya usa. Cada empresa ve cuánto uso de IA le queda en el mes, con una tarjeta tipo Canva. CotizaPro puede limitar ese uso y venderlo.

**Ya decidido:**
- Modelo: `gemma3:4b` en el Ollama compartido del VPS. La app ya está en la red `tokenpass-deploy_default` y llega a `http://ollama:11434/v1`.
- Medición: "créditos de IA" con peso por función, bolsa mensual por empresa, avisos al 80 y 100 % y paquetes extra.
- Funciones de arranque, elegidas por el usuario: WhatsApp → borrador, descripción con IA, seguimiento de pendientes, reescribir y textos de la vitrina.

**Datos medidos en el servidor el 2026-10-13** (4 CPU, sin GPU):

| Modelo | Extracción de WhatsApp a JSON (caliente) | Descripción (frío, con carga del modelo) | Calidad |
|---|---|---|---|
| gemma3:4b | 9.7 s | 49 s (carga: unos 22 s) | El JSON salió correcto, con medidas convertidas. El texto traía relleno ("¡Claro! Aquí tienes…") que hay que quitar con el prompt |
| gemma3:12b | 37.7 s | 184 s | Un poco mejor, pero no es viable con esta CPU |

**Éxito:**
- Un WhatsApp real se vuelve un borrador revisable en menos de 20 s, con precios del catálogo.
- El medidor refleja cada uso.
- Al acabarse los créditos solo se bloquea la IA.

## 1. Reglas que no se negocian

1. **La IA nunca pone precios ni montos.** Extrae o redacta texto. Los precios salen del catálogo, las listas de precios o el motor `@cotizapro/quoting`.
2. **Todo lo que genera es borrador.** Nada se envía ni se publica sin que una persona lo revise y lo guarde.
3. **Solo se cobra lo que sale bien.** Los errores, tiempos agotados y respuestas inválidas no gastan créditos.
4. **No se guarda el contenido.** Solo función, créditos, tokens, latencia y estado. Ni los mensajes de clientes ni las respuestas quedan en la bitácora de uso.
5. **El texto del usuario va delimitado** dentro del prompt, como dato y no como instrucción. Las salidas se recortan a su largo máximo y se les quitan preámbulos y markdown.
6. **Si la IA no responde, la función se ve desactivada** ("La IA no está disponible por ahora"). Cotizar y enviar nunca dependen de la IA.

## 2. Arquitectura

```
UI (botón con costo) → POST /api/ai/<función>
  → requireOrgMember → reservar créditos (RPC, valida cupo y tope diario)
  → cola en proceso (1 llamada a la vez por servidor; 1 por empresa)
  → lib/ai/client.ts → Ollama /v1/chat/completions (stream o JSON)
  → validar y limpiar la salida (Zod / sanitizador)
  → cerrar uso (RPC): ok → cobra | error → reembolsa
  → respuesta (SSE para texto, JSON para extracción)
```

### 2.1 Módulos (`apps/web/lib/ai/`)

| Archivo | Responsabilidad |
|---|---|
| `config.ts` | `AI_BASE_URL` (por omisión `http://ollama:11434/v1`), `AI_MODEL` (`gemma3:4b`), `AI_TIMEOUT_MS` (45000), `AI_KEEP_ALIVE` (`30m`) y `AI_LIMITS_ENFORCED`. Todo se valida con Zod |
| `client.ts` | `chatText(messages, opts)`, que emite fragmentos en stream, y `chatJson(messages, schema)`. Maneja el tiempo límite y devuelve `usage` y latencia. Sin dependencias nuevas: usa `fetch` |
| `queue.ts` | Semáforo en memoria: 1 llamada concurrente global y 1 por empresa. Con más de 6 en espera responde "ocupada" |
| `features.ts` | Catálogo `AI_FEATURES` con id, créditos, etiqueta en español y largo máximo de salida |
| `prompts/*.ts` | Un constructor puro por función. Recibe datos tipados y regresa `messages` |
| `sanitize.ts` | Quita preámbulos ("¡Claro!", "Aquí tienes"), comillas envolventes y markdown, y recorta el largo |
| `usage.ts` | Envoltorio de las RPC `ai_reserve`, `ai_finish` y `ai_usage_summary` |
| `run.ts` | `runAiFeature(feature, input, ctx)`: reserva, cola, llamada, validación y cierre. Es el único camino a la IA |

### 2.2 Datos (migración 043)

- **`ai_usage_events`:**
  - columnas: `id`, `organization_id`, `user_id`, `feature`, `credits`, `status` (`reserved`, `ok`, `failed`), `prompt_tokens`, `completion_tokens`, `latency_ms`, `created_at`, `finished_at`;
  - índice `(organization_id, created_at)`;
  - RLS: los miembros de la empresa leen las filas de su empresa; nadie inserta directo.
- **`ai_credit_grants`, para paquetes y cortesías:**
  - columnas: `id`, `organization_id`, `credits`, `source` (`pack`, `courtesy`), `reference`, `granted_by`, `expires_at` y `created_at`;
  - solo las escribe la RPC de superadmin (D2).
- **`ai_monthly_allowance(plan text)`:**
  - free 25 · starter 150 · pro 400 · enterprise 1200;
  - es el espejo SQL de `aiCreditsMonthly` en `lib/plans/catalog.ts`;
  - una prueba unitaria compara los dos.
- **`ai_reserve(p_feature, p_credits)`**, SECURITY DEFINER, `search_path` fijo, solo para `authenticated`:
  - toma la empresa del perfil;
  - calcula lo usado en el periodo (reservado más ok);
  - calcula lo disponible: cupo del plan más paquetes vigentes;
  - aplica el tope diario de 40 créditos por usuario;
  - si no alcanza y `ai.limits_enforced` está activo, lanza `ai_quota_exceeded` o `ai_daily_cap`;
  - si alcanza, inserta un evento `reserved` y regresa su id;
  - un `pg_advisory_xact_lock` por empresa evita carreras.
- **`ai_finish(p_event, p_ok, p_prompt_tokens, p_completion_tokens, p_latency_ms)`:**
  - marca `ok` o `failed`; con `failed`, los créditos pasan a 0 (reembolso);
  - solo acepta eventos `reserved` del mismo usuario;
  - una reserva sin cerrar después de 5 minutos cuenta como `failed`, así un proceso caído no se come créditos.
- **`ai_usage_summary()`:** regresa `used`, `allowance`, `pack_credits`, `resets_on`, `percent` y el desglose por función. Es lo que pinta la tarjeta.
- **Periodo:** mes calendario en `America/Monterrey`, con reinicio el día 1 a las 00:00 (decisión 2).

### 2.3 Superadmin (integración con D2)

- En `/admin`, cada empresa muestra su uso de IA del mes.
- El botón "Dar créditos" registra un paquete o una cortesía en `ai_credit_grants` con la RPC `admin_grant_ai_credits`.
- La venta de paquetes es semi-manual, igual que los planes:
  - "Obtener más" abre la liga de Mercado Pago `MP_LINK_AI_PACK_200` o `MP_LINK_AI_PACK_1000`;
  - si no hay liga, abre WhatsApp a soporte;
  - el operador acredita los créditos en `/admin`.

## 3. Funciones

| # | Función | Dónde | Créditos | Salida |
|---|---|---|---|---|
| F1 | **WhatsApp → borrador** | Nueva cotización: panel "Pegar mensaje del cliente" | 3 | JSON |
| F2 | **Descripción con IA** | Cada partida: botón "Mejorar con IA" junto a la descripción | 2 | Texto en stream |
| F3 | **Seguimiento** | Detalle de cotizaciones `sent` o `viewed` con más de 2 días; acceso desde "Pendientes" en Inicio | 1 | Texto en stream |
| F4 | **Reescribir** | Notas y términos de la cotización, respuesta a reseñas (vitrina) y textos libres. Modos: pulir, más breve, más formal, inglés | 1 | Texto en stream |
| F5 | **Textos de la vitrina** | Vitrina: "Generar con IA" para `headline` (máx. 90) y `bio` (máx. 600) | 2 | JSON `{headline, bio}` |

### F1. WhatsApp → borrador (detalle)

1. **Esquema Zod de la extracción:**
   - `{ cliente: {nombre, telefono, correo, zona} | null, partidas: [{concepto, cantidad, ancho_m, alto_m, notas}] (máx. 15), notas }`;
   - las medidas se normalizan a metros en el código: "90" significa 0.90 cuando hay otra medida en metros en la misma partida, y "120 cm" son 1.20.
2. **Cliente:**
   - se busca por teléfono normalizado (últimos 10 dígitos) y luego por nombre exacto entre los clientes de la empresa;
   - si no aparece, se propone "Cliente nuevo" con los datos prellenados, sin crearlo hasta guardar.
3. **Partidas:**
   - cada `concepto` se compara con el catálogo activo de la empresa (`service_catalog` y listas de precios) por similitud de texto, con `pg_trgm` y un umbral de 0.3;
   - con coincidencia, la partida toma `service_id`, `unit_type` y `unit_price` del catálogo. En `per_sqm` la cantidad es ancho × alto × piezas, calculada por el motor existente;
   - sin coincidencia, la partida queda con precio 0, marcada "Sin precio: elige del catálogo" y no se puede guardar así.
4. **Interfaz:** el borrador llena el formulario actual de nueva cotización (cliente, partidas y notas) y muestra el aviso "Revisa cantidades y medidas antes de guardar". No se guarda nada solo.

### Prompts (criterios comunes)

- Sistema en español de México, con el giro del negocio (`organizations.trade`).
- Instrucción explícita: "No inventes precios, medidas, marcas ni garantías que no te den".
- Largo máximo por función. Temperatura 0.2 para extracción y 0.5 para redacción.
- Un conjunto de evaluación con 20 mensajes reales de WhatsApp (anonimizados) en `scripts/ai-eval/` mide la exactitud de F1 contra el modelo real. La meta es 90 % o más en cantidades y medidas.

## 4. Interfaz del medidor

- **Tarjeta "IA" en Configuración → Plan y uso** (o Facturación), al estilo Canva:
  - título "Uso de IA" y el botón "Obtener más";
  - "Tu uso del mes · Se reinicia el 1 de noviembre", "23 % usado" y una barra;
  - la liga "¿Qué funciones usan créditos?" abre la tabla de costos.
- **Desglose:** créditos por función en el mes, y paquetes vigentes con su vencimiento.
- **En cada botón de IA:** "Mejorar con IA · 2 créditos". Sin créditos, el botón se desactiva y muestra "Sin créditos este mes · Obtener más".
- **Avisos:**
  - al 80 %, un banner amarillo en Inicio para el propietario o administrador;
  - al 100 %, un banner con "Obtener más";
  - un solo correo al propietario por umbral y por mes (Resend).
- **Mientras genera:** el texto aparece en stream. En JSON se muestra "Leyendo el mensaje…" con un cronómetro. La IA nunca bloquea el formulario.

## 5. Capacidad y convivencia con TokenPass

- Ollama es compartido (`OLLAMA_MAX_LOADED_MODELS=1`) y TokenPass también usa `gemma3:4b`, así que el modelo no cambia de lugar.
- `keep_alive: 30m` en cada llamada evita los 22 s de carga en frío.
- **Capacidad estimada:** unas 300 generaciones cortas por hora en serie. La suma de cupos del piloto está muy por debajo. Si una empresa satura, la cola responde "ocupada" en lugar de degradar a todos.
- **Sin cambios de infraestructura:** no hay puertos nuevos ni modelos nuevos.

## 6. Errores

| Caso | Respuesta |
|---|---|
| Sin créditos | 402 `ai_quota_exceeded`: "Usaste tus créditos de IA de este mes. Se reinician el 1 de noviembre." con "Obtener más" |
| Tope diario | 429 `ai_daily_cap`: "Llegaste al límite diario de IA para tu usuario" |
| Cola llena o tiempo agotado | 503: "La IA está ocupada, intenta en un momento". No cobra |
| Salida inválida (JSON que no pasa Zod) | Un reintento con la instrucción de corregir; si vuelve a fallar, 502 sin cobro |
| Ollama caído | `GET /api/ai/status` regresa `available:false` y los botones se ocultan o desactivan |

## 7. Pruebas

- **Unitarias:**
  - constructores de prompts;
  - `sanitize`;
  - normalización de medidas ("90 x 1.80", "120x150 cm", "1,20 por 1,50");
  - coincidencia con el catálogo (función pura sobre una lista);
  - cálculo del periodo y de `resets_on`;
  - espejo de cupos TS/SQL.
- **SQL (con transacción y rollback):**
  - reservar más allá del cupo falla;
  - un `failed` reembolsa;
  - una empresa no ve el uso de otra;
  - la reserva vieja expira;
  - un paquete vigente suma y uno vencido no.
- **E2E local con un servidor de IA falso:** una ruta de prueba compatible con OpenAI, activada solo con `AI_BASE_URL` en local.
  - F1 llena el formulario con precios del catálogo;
  - F2 escribe la descripción;
  - el medidor sube;
  - al 100 % el botón se desactiva.
- **Contra el modelo real:** el script `pnpm --filter web ai:eval` corre el conjunto de 20 mensajes y reporta exactitud y latencia.

## 8. Fuera de alcance (próximamente)

- Nota de voz → cotización (Whisper).
- Foto de la obra → estimación (visión).
- Precio sugerido y "por qué pierdo cotizaciones".
- Resumen semanal del negocio.
- Clasificación de solicitudes.
- Cobro automático de paquetes.

## 9. Orden sugerido

1. Migración 043, `lib/ai` (cliente, cola, `run`, uso) y la tarjeta del medidor.
2. F2 (descripción) y F4 (reescribir): son texto simple y validan la cadena completa.
3. F1 (WhatsApp → borrador), con el conjunto de evaluación.
4. F3 (seguimiento) y F5 (vitrina).
5. Paquetes en `/admin`. Depende de D2.

## 10. Decisiones (aprobadas el 2026-10-13)

1. **Límites de IA activos en el piloto,** con los cupos de la tabla: Gratis 25 · Solo 150 · Taller 400 · Empresa 1,200. `AI_LIMITS_ENFORCED=true` por omisión.
2. **El periodo se reinicia el día 1 de cada mes** (`America/Monterrey`).
3. **Paquetes:** +200 créditos por $49 y +1,000 por $199 MXN. Vencen a fin de mes.
