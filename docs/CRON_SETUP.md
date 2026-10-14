# Cron Job Setup Guide

## Overview

CotizaPro includes an automated cron job system that runs daily to check for due reminders and send notifications automatically.

## Cron Job: Reminder Notifications

**Endpoint**: `GET /api/cron/reminders-check`
**Schedule**: Daily at 9:00 AM (UTC)
**Purpose**: Check for due reminders and send email/WhatsApp notifications automatically

### How It Works

1. **Daily Execution**: Runs every day at 9:00 AM
2. **Organization Loop**: Processes all organizations in the system
3. **Due Reminders**: Finds reminders scheduled for today or tomorrow
4. **Auto-Send**: Sends notifications via configured channels (email/WhatsApp)
5. **Status Update**: Marks reminders as "sent" after successful delivery
6. **Logging**: Returns summary of processed/sent/failed reminders

### Security

The cron endpoint is protected by a secret token to prevent unauthorized access.

**Required Environment Variable**:
```bash
CRON_SECRET=your-random-secret-here-min-32-chars
```

Generate a secure secret:
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Deployment Options

#### Option 1: Vercel Cron (Recommended)

Vercel provides built-in cron job support with zero configuration.

**File**: `vercel.json` (already included)
```json
{
  "crons": [
    {
      "path": "/api/cron/reminders-check",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Setup Steps**:
1. Deploy to Vercel
2. Add `CRON_SECRET` to environment variables in Vercel dashboard
3. Cron will automatically run at 9:00 AM UTC daily

**Note**: Vercel Cron requires a Pro plan ($20/month)

#### Option 2: GitHub Actions (Free)

Use GitHub Actions to trigger the cron endpoint.

**File**: `.github/workflows/cron-reminders.yml`
```yaml
name: Check Reminders Daily

on:
  schedule:
    # Runs at 9:00 AM UTC daily
    - cron: '0 9 * * *'
  workflow_dispatch: # Allows manual triggering

jobs:
  check-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cron Endpoint
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.vercel.app/api/cron/reminders-check
```

**Setup Steps**:
1. Create `.github/workflows/` directory
2. Add the YAML file above
3. Add `CRON_SECRET` to GitHub repository secrets
4. Update `your-domain.vercel.app` with your actual domain

#### Option 3: External Cron Service

Use services like cron-job.org, EasyCron, or Render Cron Jobs.

**Setup**:
1. Sign up for a cron service
2. Create a new cron job with:
   - URL: `https://your-domain.com/api/cron/reminders-check`
   - Method: `GET`
   - Schedule: `0 9 * * *` (daily at 9:00 AM)
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`

#### Option 4: Self-Hosted Cron (Linux)

Add to your server's crontab:

```bash
# Edit crontab
crontab -e

# Add this line (replace with your domain and secret)
0 9 * * * curl -X GET -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/reminders-check
```

## Testing the Cron Job

### Manual Testing

You can manually trigger the cron endpoint to test it:

```bash
# Replace with your domain and secret
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/reminders-check
```

**Expected Response**:
```json
{
  "success": true,
  "processed": 5,
  "sent": 4,
  "failed": 1,
  "results": [
    {
      "reminder_id": "uuid",
      "client_name": "Juan Pérez",
      "title": "Mantenimiento anual de minisplit",
      "email_sent": true,
      "whatsapp_sent": true
    }
  ],
  "timestamp": "2026-02-13T09:00:00.000Z"
}
```

### Test Reminders

Create test reminders with `auto_send_notification: true`:

```bash
POST /api/reminders
{
  "client_id": "uuid",
  "title": "Test reminder",
  "reminder_type": "maintenance",
  "scheduled_date": "2026-02-14", # Tomorrow
  "priority": "high",
  "auto_send_notification": true,
  "notification_channels": ["email", "whatsapp"]
}
```

Then run the cron manually to see if it sends notifications.

## Monitoring

### Logs

The cron job logs all activity to console:

```
✅ Processed: 10 reminders
✅ Sent: 8 notifications
❌ Failed: 2 notifications
```

### Vercel Logs

View cron execution logs in Vercel dashboard:
1. Go to your project
2. Click "Functions" tab
3. Find `/api/cron/reminders-check`
4. View execution logs

### Error Handling

The cron job handles errors gracefully:
- **Organization fetch fails**: Skips and continues
- **Reminder fetch fails**: Logs error, continues to next org
- **Email/WhatsApp fails**: Marks as failed, doesn't update status
- **Entire cron fails**: Returns 500 error, will retry next day

## Notification Content

### Email Template

Professional HTML email with:
- Header with "Recordatorio de Seguimiento"
- Reminder title and description
- Client details (name, phone)
- Priority indicator (🔴🟠🟡🟢)
- Service category
- CotizaPro branding

### WhatsApp Message

Plain text message with:
```
Hola,

Recordatorio: Mantenimiento anual de minisplit

[Description]

Cliente: Juan Pérez
Fecha programada: 14/02/2026
Prioridad: high

Tipo: maintenance

Por favor, contacta al cliente para dar seguimiento.

---
CotizaPro - Sistema de Gestión de Cotizaciones
```

## Customization

### Schedule

To change the cron schedule, edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders-check",
      "schedule": "0 8 * * *"  // 8:00 AM instead of 9:00 AM
    }
  ]
}
```

**Cron syntax**: `minute hour day month weekday`

Examples:
- `0 9 * * *` - Every day at 9:00 AM
- `0 9 * * 1` - Every Monday at 9:00 AM
- `0 9,15 * * *` - Every day at 9:00 AM and 3:00 PM
- `0 */6 * * *` - Every 6 hours

### Days Ahead

By default, the cron checks reminders for today and tomorrow (`days_ahead: 1`).

To change this, edit `app/api/cron/reminders-check/route.ts`:

```typescript
const { data: dueReminders, error: remindersError } = await supabase
  .rpc('get_due_reminders', {
    org_id: org.id,
    days_ahead: 3, // Check 3 days ahead instead of 1
  })
```

### Notification Templates

Customize email/WhatsApp templates in:
- Email: `app/api/cron/reminders-check/route.ts` (line ~90)
- WhatsApp: `app/api/cron/reminders-check/route.ts` (line ~60)

## Troubleshooting

### Cron not running

1. **Check CRON_SECRET**: Ensure it's set in environment variables
2. **Check deployment**: Cron only works on deployed apps, not localhost
3. **Check Vercel plan**: Vercel Cron requires Pro plan
4. **Check logs**: View execution logs in Vercel dashboard

### Notifications not sending

1. **Check auto_send_notification**: Must be `true`
2. **Check notification_channels**: Must include "email" or "whatsapp"
3. **Check client data**: Email/phone must be present
4. **Check Twilio/Resend**: API keys must be configured
5. **Check notification_sent_at**: Cron skips already-sent reminders

### Testing locally

The cron endpoint cannot be tested on `localhost` with Vercel Cron. Use manual POST request instead:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/reminders-check
```

## Best Practices

1. **Test first**: Create test reminders and manually trigger cron before going live
2. **Monitor logs**: Check cron execution logs regularly
3. **Set alerts**: Use monitoring tools to alert on cron failures
4. **Backup plan**: Have alternative notification method if cron fails
5. **User preferences**: Allow users to configure notification times per organization

## Related Documentation

- [Reminder API Documentation](../README.md#reminders-api)
- [Twilio Integration](./TWILIO_SETUP.md)
- [Resend Email Setup](./EMAIL_SETUP.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

---

## Cron: avisos de vencimiento del plan (D2)

**Endpoint:** `POST /api/cron/billing-notices` (también acepta `GET`)
**Horario:** diario a las 14:00 UTC (08:00 en Monterrey)
**Qué hace:** busca planes pagados que vencen en los próximos 7 días o vencieron en los últimos 3, y manda al propietario el aviso que toca (7, 3 o 1 días antes, o el día del vencimiento). Cada aviso sale una sola vez por periodo; si Resend falla, se reintenta en la siguiente corrida.
**Tope:** la función `billing_notices_due` devuelve como máximo 500 cuentas por corrida. Si se alcanza, la ruta registra una advertencia en el log y el resto se procesa en la corrida siguiente.

### Autenticación y secreto

Ambos crons (`/api/cron/billing-notices` y `/api/cron/reminders-check`) se llaman con `Authorization: Bearer <CRON_SECRET>`. No requieren service role: el contenedor web de producción no tiene `SUPABASE_SERVICE_ROLE_KEY`. La base valida el mismo secreto contra `platform_settings.cron_key_sha256`.

- `CRON_SECRET` debe tener **32 caracteres o más**.
- Alta o rotación del hash (una vez por entorno). El secreto se pasa como variable de psql, nunca escrito en el comando, para que no quede en el historial del shell ni se imprima:

```bash
psql "$DB" -v key="$CRON_SECRET" <<'SQL'
INSERT INTO platform_settings (key, value)
VALUES ('cron_key_sha256', encode(extensions.digest(:'key', 'sha256'), 'hex'))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
SQL
```

Si se rota `CRON_SECRET`, repetir este paso con el valor nuevo.

### Cron de recordatorios (`/api/cron/reminders-check`)

Desde la Task 12b ya no necesita service role. Activarlo en producción requiere **aprobación explícita y propia** del usuario, independiente de la del cron de avisos.

Los recordatorios con más de 3 días de atraso respecto al límite de la corrida (mañana, hora de Monterrey; en la práctica, con fecha anterior a antier) no se envían automáticamente: se quedan pendientes y visibles en el panel. Tampoco se envían los de cuentas vencidas mientras no se renueven.

### VPS (`/etc/cron.d/cotizapro`)

```
0 14 * * * root /opt/bin/cotizapro-billing-notices.sh >> /var/log/cotizapro-billing-notices.log 2>&1
```

El script `/opt/bin/cotizapro-billing-notices.sh` (permisos 700) sigue la forma de `/opt/bin/cotizapro-reminders.sh`:

```sh
#!/bin/sh
set -eu
CRON_SECRET=$(grep '^CRON_SECRET=' /opt/cotizapro-deploy/.env | cut -d= -f2-)
curl -fsS -m 120 -X POST -H "Authorization: Bearer ${CRON_SECRET}" https://cotizapro.mariobustos.io/api/cron/billing-notices
echo
```

---

## Cobro D2: variables y superadmin

| Variable | Efecto |
|---|---|
| `MP_LINK_STARTER`, `MP_LINK_PRO`, `MP_LINK_ENTERPRISE` | Liga de suscripción de Mercado Pago por plan. Debe ser `https`; cualquier otro valor se ignora y el plan se muestra como "Próximamente". |
| `SUPPORT_WHATSAPP_PHONE` | WhatsApp de soporte para cuentas con más usuarios que los incluidos (10 dígitos o con 52). |
| `PLAN_LIMITS_ENFORCED` | Solo el valor `true` enciende los límites por plan. Durante el piloto queda en `false`. |

### Alta y baja del superadmin

Sustituir `<correo>` por el correo del operador (solo con aprobación del usuario):

```sql
INSERT INTO platform_admins (user_id) SELECT id FROM auth.users WHERE email = '<correo>';
DELETE FROM platform_admins WHERE user_id = (SELECT id FROM auth.users WHERE email = '<correo>');
```

La primera sentencia da de alta; la segunda revoca.

---

## Puesta en producción de D2 (guía, no ejecutada)

> **Cada paso de esta sección se ejecuta solo con aprobación explícita del usuario, paso por paso.** El servidor es compartido: seguir la skill `hostinger-vps` §0 (coexistencia) y el inventario del VPS. Leer el estado real, editar solo lo propio, conservar el inode, aplicar con reload y nunca subir una copia del repo encima de archivos compartidos. Los valores reales (secretos, ligas) los da el usuario; en este repo, que es público, solo hay marcadores.

1. **Antes de tocar nada** (solo con aprobación explícita del usuario): smoke de todos los dominios de todos los proyectos del VPS y anotar el resultado.
2. **Respaldos con fecha** (solo con aprobación explícita del usuario): `pg_dump` de esquema y datos de `cotizapro-db` (`/opt/backups/cotizapro-schema-<fecha>-pre042.sql.gz` y `cotizapro-data-<fecha>-pre042.sql.gz`), respaldo del código y etiqueta de imagen de reversa `cotizapro-web-rollback:<fecha>`.
3. **Revisión previa, solo lectura** (solo con aprobación explícita del usuario). No cambia nada: los límites siguen apagados.

```sql
SELECT o.plan, count(*) AS orgs,
       count(*) FILTER (WHERE m.users > CASE o.plan WHEN 'pro' THEN 3 WHEN 'enterprise' THEN 10 ELSE 1 END) AS exceden_usuarios,
       count(*) FILTER (WHERE o.plan = 'free' AND q.this_month > 5) AS exceden_cotizaciones
FROM organizations o
CROSS JOIN LATERAL (SELECT count(*) AS users FROM profiles p WHERE p.organization_id = o.id) m
CROSS JOIN LATERAL (SELECT count(*) AS this_month FROM quotes x WHERE x.organization_id = o.id
                    AND x.created_at >= date_trunc('month', now() AT TIME ZONE 'America/Monterrey') AT TIME ZONE 'America/Monterrey') q
GROUP BY o.plan ORDER BY o.plan;
```

   Confirmar también que las cuentas pagadas tienen `current_period_end` vacío (siguen escribiendo).
4. **Migración 042** (solo con aprobación explícita del usuario; si D1/041 está lista, aplicar 041 antes). Se aplica dentro del contenedor `cotizapro-deploy-cotizapro-db-1`, en una transacción, registrando la versión:

```bash
(echo 'BEGIN;'
 cat apps/web/supabase/migrations/042_billing_superadmin.sql
 echo "INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('042', '042_billing_superadmin');"
 echo 'COMMIT;'
 echo "NOTIFY pgrst, 'reload schema';") \
 | ssh <usuario>@<servidor> 'docker exec -i cotizapro-deploy-cotizapro-db-1 psql -U postgres -v ON_ERROR_STOP=1'
```

5. **Pruebas SQL en producción** (solo con aprobación explícita del usuario): correr `apps/web/supabase/tests/billing_superadmin.sql` y `billing_notices.sql` (terminan en `ROLLBACK`; usan las cuentas demo `00c0`). Esperado: `failed = 0`.
6. **Alta del superadmin** (solo con aprobación explícita del usuario): preguntar el correo del operador y ejecutar el `INSERT INTO platform_admins` de la sección anterior. Anotarlo en el inventario.
7. **Hash del cron** (solo con aprobación explícita del usuario): leer `CRON_SECRET` de `/opt/cotizapro-deploy/.env` sin imprimirlo y registrar `cron_key_sha256` con el bloque de "Autenticación y secreto" (variable de psql, nunca en el historial).
8. **Variables de `cotizapro-web`** (solo con aprobación explícita del usuario): agregar `MP_LINK_*` (las ligas reales las da el usuario), `SUPPORT_WHATSAPP_PHONE` y `PLAN_LIMITS_ENFORCED=false` a `/opt/cotizapro-deploy/.env` y al bloque `environment` de `cotizapro-web` en el compose, con respaldo `.bak-<fecha>-d2` y conservando el inode.
9. **Deploy de la app** (solo con aprobación explícita del usuario): `git archive HEAD` y `rsync --delete` a `/opt/cotizapro`; luego `docker compose build cotizapro-web && docker compose up -d --no-deps cotizapro-web` (con `setsid nohup`), como indica el inventario.
10. **Script y crons** (solo con aprobación explícita del usuario): crear `/opt/bin/cotizapro-billing-notices.sh`, respaldar `/etc/cron.d/cotizapro` con fecha y agregar la línea de la sección "VPS". Descomentar la de recordatorios (`0 15 * * * root /opt/bin/cotizapro-reminders.sh`) requiere **su propia aprobación explícita**.
11. **Después** (solo con aprobación explícita del usuario): smoke de todos los dominios (idéntico al del punto 1); `curl` al cron con secreto incorrecto (debe dar 401); una corrida manual del script (JSON con `success: true`); con la cuenta del operador, abrir `/admin` y confirmar la lista. Si cualquier dominio de otro proyecto cambia, revertir de inmediato y avisar.
12. **Inventario** (solo con aprobación explícita del usuario): agregar la entrada fechada al inventario del VPS (migración, respaldos, imagen de reversa, cron nuevo, superadmin dado de alta).
