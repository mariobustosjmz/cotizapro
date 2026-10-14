# ai:eval

Evalúa la extracción de borradores de WhatsApp (F1) contra el modelo configurado en `AI_BASE_URL` / `AI_MODEL`. Meta: promedio >= 90 %.

- `messages.json` contiene 20 mensajes SINTETICOS con teléfonos obviamente falsos (`81111122xx`) y nombres genéricos. Reemplazarlos por mensajes reales anonimizados antes de la evaluación en el servidor.
- La salida solo imprime id, banderas, puntaje y latencia; nunca el mensaje ni la respuesta del modelo.
- Llama al modelo directo: no usa las RPC de créditos ni escribe en la base.
- Termina con código 1 si el promedio queda bajo 90 %.
- Se niega a correr con `NODE_ENV=production` salvo que se pase `--allow-production`: `pnpm ai:eval --allow-production`.

Local contra la IA falsa (la meta no se alcanza a propósito):

    AI_BASE_URL=http://localhost:3100/api/dev/fake-ai/v1 pnpm ai:eval

La evaluación real contra Ollama en el servidor requiere aprobación explícita (ver el plan, tarea 20, paso 7).
