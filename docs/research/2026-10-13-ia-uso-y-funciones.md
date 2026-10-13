# IA en CotizaPro: cómo miden el uso otros SaaS y qué funciones construir

Investigación del 2026-10-13. Las cifras de Canva, Notion, Miro e Intercom vienen de terceros; hay que confirmarlas antes de citarlas.

## 1. Cómo lo miden otros

| Producto | Unidad | Cupo y reinicio | Paquetes extra | Al llegar al límite | Cómo lo muestra |
|---|---|---|---|---|---|
| Canva | Usos con peso por herramienta (Standard, Premium, Ultra) | Mensual, en la fecha de cobro; por persona | Recarga en Business, vence en 30 días | Pausa corta (Standard y Premium); bloqueo hasta el reinicio (Ultra) | Tarjeta "AI usage" con % usado y fecha de reinicio |
| HubSpot | Credits (solo agentes) | Mensual, no se acumulan; Starter 500, Pro 3k–5k | USD 10 por 1,000, o excedente con tope | Pausa | Avisos al 75, 85, 90 y 100 %; desglose por función |
| Figma | Créditos por asiento | 500 a 4,250 al mes; tope diario en Starter | Bolsa compartida, pago por uso con tope | Bloqueo y botón "pedir más" | El admin ve quién llegó al límite |
| Zapier / Make | Tareas / créditos | Mensual | Pago por uso o compra automática | Retiene o pausa | Alertas al 75–80 % y al 100 % |
| Grammarly | Prompts | Gratis 100, Pro 2,000 al mes | — | Bloqueo | Contador |
| Jobber, Housecall Pro, ServiceTitan | Sin medidor | IA incluida en el plan | — | — | Funciones "Rewrite", seguimientos y borradores de cotización |

Lo que se repite: una unidad abstracta con peso por acción, reinicio mensual, avisos al 75–80 % y al 100 %, paquetes extra que vencen y desglose por función.

## 2. Modelo recomendado para CotizaPro

- **Unidad: "créditos de IA", no tokens.** Los tokens se registran por dentro para medir el costo, pero no se muestran.
- **Peso por función:**
  - 1 crédito: reescribir, traducir, seguimiento, respuesta a reseña;
  - 2 créditos: descripción, resumen de cliente, textos de la vitrina, términos;
  - 3 créditos: WhatsApp → borrador.
- **Bolsa por empresa con tope diario por usuario.** El tope protege la CPU compartida.
- **Cupos sugeridos al mes:** Gratis 25 · Solo 150 · Taller 400 · Empresa 1,200.
- **Paquetes extra:** +200 por $49 y +1,000 por $199 MXN. Vencen al cierre del ciclo.
- **Al llegar al límite:** solo se bloquea la IA, con el botón "Obtener más". Cotizar y enviar nunca se bloquean.
- **Avisos** al 80 y al 100 %.
- **Solo se cobran las generaciones exitosas.**
- **Interfaz:**
  - tarjeta "IA · Uso mensual · Se reinicia el … · N % usado · Obtener más", con desglose por función;
  - cada botón muestra su costo ("Redactar con IA · 1 crédito");
  - respuestas en streaming.

## 3. Regla de seguridad del modelo

El modelo **nunca escribe precios**:
1. Primero extrae datos a JSON validado con Zod.
2. El código busca cada partida en el catálogo y pone el precio del catálogo.
3. Una persona revisa todo antes de enviar.

Las medidas y los materiales se calculan con código.

## 4. Funciones candidatas

| Función | Créditos | Estado |
|---|---|---|
| WhatsApp del cliente → borrador de cotización (cliente, teléfono, partidas, medidas; precios del catálogo) | 3 | Ahora |
| Descripción o alcance de una partida a partir de unas palabras | 2 | Ahora |
| Mensaje de seguimiento para cotizaciones pendientes | 1 | Ahora |
| Reescribir: pulir texto, traducir al inglés, responder reseñas | 1 | Ahora |
| Textos de la vitrina: "Sobre nosotros" y descripción de servicios | 2 | Ahora |
| Sugerir partidas del catálogo | 2 | Ahora |
| Resumen del historial de un cliente (cifras calculadas en SQL) | 2 | Ahora |
| Borrador de términos y condiciones por oficio | 2 | Ahora |
| Clasificar solicitudes de "pedir cotización" | 1 | Ahora |
| Resumen semanal del negocio | 2 | Ahora |
| Nota de voz → cotización (Whisper) | 4 | Próximamente |
| Foto de la obra → estimación (visión) | 5 | Próximamente |
| Precio sugerido, "por qué pierdo cotizaciones" | — | Próximamente |

## Fuentes

- https://www.canva.com/help/ai-access/
- https://www.eesel.ai/en/blog/canva-ai-pricing
- https://knowledge.hubspot.com/account-management/understand-hubspot-credits-and-billing
- https://help.figma.com/hc/en-us/articles/35865276858647-Manage-AI-credits
- https://zapier.com/blog/what-is-a-task-in-zapier/
- https://help.make.com/credits
- https://www.grammarly.com/plans
- https://getjobber.com/features/ai/
- https://help.servicetitan.com/docs/atlas.md
- https://www.eesel.ai/blog/fin-ai-pricing
