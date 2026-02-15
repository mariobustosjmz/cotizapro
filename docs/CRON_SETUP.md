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
