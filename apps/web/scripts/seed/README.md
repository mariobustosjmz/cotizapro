# Seed demo multi-cuenta

Crea cuatro cuentas demo (empresa de vidrio, grupo de electricistas, plomero y costurera) y publica la vitrina de ClimaSol.
Es idempotente: borra y recrea las organizaciones con prefijo `00000000-0000-0000-00c0-`.

```bash
SEED_DEMO_PASSWORD='CotizaDemo-Local-2026' pnpm --filter web seed
SEED_DEMO_PASSWORD='CotizaDemo-Local-2026' pnpm --filter web seed --only=megaglass-demo
```

- Local: la contraseña de arriba aplica a todos los usuarios demo (`direccion@megaglass.demo.cotizapro.mx`, `hector@voltaje.demo.cotizapro.mx`, `beto@plomeria.demo.cotizapro.mx`, `lupita@costuras.demo.cotizapro.mx`, etc., ver `data/accounts.ts`).
- Producción: la contraseña se genera en el servidor y vive solo en `/opt/cotizapro-deploy/.env` (`SEED_DEMO_PASSWORD`). Usar `SEED_ENV_FILE` para apuntar al `.env` del servidor.
- Las fotos son marcadores generados (gradientes). Las fotos reales las sube cada taller desde la cotización.
