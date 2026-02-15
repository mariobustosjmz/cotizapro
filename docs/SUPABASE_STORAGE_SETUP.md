# Configuración de Supabase Storage para CotizaPro

**Fecha**: 2026-02-14
**Módulo**: Integraciones (Tasks 13-16)

---

## 📦 Bucket "documents" - Configuración Manual

### Paso 1: Crear el Bucket

1. Ir a Supabase Dashboard: https://app.supabase.com
2. Seleccionar tu proyecto
3. Navegar a **Storage** en el menú lateral
4. Hacer clic en **Create a new bucket**
5. Configurar:
   - **Name**: `documents`
   - **Public bucket**: ✅ **Activar** (para que los PDFs sean accesibles vía URL pública)
   - **File size limit**: 50 MB (suficiente para PDFs)
   - **Allowed MIME types**: `application/pdf` (opcional, por seguridad)

### Paso 2: Configurar RLS (Row Level Security)

Crear las siguientes políticas en el bucket `documents`:

#### Política 1: SELECT (Lectura Pública)
```sql
-- Permitir lectura pública de PDFs
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' );
```

#### Política 2: INSERT (Upload por Organización)
```sql
-- Permitir upload solo a usuarios autenticados de su propia organización
CREATE POLICY "Users can upload to their organization folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'quotes'
  AND (storage.foldername(name))[2] IN (
    SELECT organization_id::text
    FROM profiles
    WHERE id = auth.uid()
  )
);
```

#### Política 3: UPDATE (Actualización por Organización)
```sql
-- Permitir actualizar archivos de su organización
CREATE POLICY "Users can update their organization files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'quotes'
  AND (storage.foldername(name))[2] IN (
    SELECT organization_id::text
    FROM profiles
    WHERE id = auth.uid()
  )
);
```

#### Política 4: DELETE (Eliminación por Organización)
```sql
-- Permitir eliminar archivos de su organización
CREATE POLICY "Users can delete their organization files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'quotes'
  AND (storage.foldername(name))[2] IN (
    SELECT organization_id::text
    FROM profiles
    WHERE id = auth.uid()
  )
);
```

### Paso 3: Verificar Configuración

1. En el dashboard de Supabase Storage, verificar que el bucket `documents` aparece
2. Verificar que **Public** está activado (icono de candado abierto)
3. Ir a **Policies** y verificar que las 4 políticas están activas

---

## 📂 Estructura de Archivos

Los PDFs se guardan con esta estructura:

```
documents/
└── quotes/
    └── {organization_id}/
        ├── COT-2026-001.pdf
        ├── COT-2026-002.pdf
        └── COT-2026-003.pdf
```

**Ejemplo**:
- `documents/quotes/123e4567-e89b-12d3-a456-426614174000/COT-2026-001.pdf`

---

## 🧪 Probar el Endpoint

### 1. Obtener un Token de Autenticación

```bash
# Login y obtener access_token
curl -X POST https://YOUR_SUPABASE_URL/auth/v1/token?grant_type=password \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 2. Enviar Cotización

```bash
# Reemplazar {quote_id} con un ID real de tu base de datos
curl -X POST http://localhost:3000/api/quotes/{quote_id}/send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "send_via": ["email", "whatsapp"],
    "email_override": "test@example.com",
    "whatsapp_override": "+5215512345678"
  }'
```

### 3. Respuesta Esperada

```json
{
  "success": true,
  "results": {
    "email": {
      "success": true,
      "messageId": "re_abc123..."
    },
    "whatsapp": {
      "success": true,
      "messageId": "SM123...",
      "status": "queued"
    }
  },
  "pdf_url": "https://YOUR_SUPABASE_URL/storage/v1/object/public/documents/quotes/org-id/COT-2026-001.pdf"
}
```

---

## ⚠️ Errores Comunes

### Error: "Bucket not found"
- **Causa**: El bucket "documents" no existe
- **Solución**: Crear el bucket manualmente en Supabase Dashboard

### Error: "new row violates row-level security policy"
- **Causa**: Las políticas RLS no están configuradas correctamente
- **Solución**: Verificar que las 4 políticas están creadas y activas

### Error: "Failed to upload PDF"
- **Causa**: El bucket no es público o las políticas no permiten INSERT
- **Solución**: Activar "Public bucket" y verificar política de INSERT

### Error: "Client has no email and no override provided"
- **Causa**: El cliente no tiene email y no se envió email_override
- **Solución**: Proporcionar email_override en el body del request

### Error: "TWILIO_ACCOUNT_SID is not defined"
- **Causa**: Variables de entorno no configuradas
- **Solución**: Copiar .env.example a .env y configurar las credenciales

---

## 📋 Checklist de Configuración

Antes de usar el endpoint `/api/quotes/[id]/send`, verificar:

- [ ] Bucket "documents" creado y público
- [ ] 4 políticas RLS configuradas (SELECT, INSERT, UPDATE, DELETE)
- [ ] Variables de entorno configuradas en `.env`:
  - [ ] `TWILIO_ACCOUNT_SID`
  - [ ] `TWILIO_AUTH_TOKEN`
  - [ ] `TWILIO_WHATSAPP_FROM`
  - [ ] `RESEND_API_KEY`
  - [ ] `EMAIL_FROM`
- [ ] Cuenta Twilio configurada con WhatsApp Business API
- [ ] Cuenta Resend configurada y API key generada
- [ ] Migración 002_cotizapro_schema.sql aplicada (tablas quotes, clients, quote_items, quote_notifications)

---

## 🔗 Referencias

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [Resend API Docs](https://resend.com/docs)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)

---

**Última actualización**: 2026-02-14
