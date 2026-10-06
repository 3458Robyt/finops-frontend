# FinOps Inteligente — aplicación web

Interfaz React para clientes, técnicos FinOps y administración maestra. Presenta costos, presupuestos, inventario, métricas técnicas, recomendaciones gobernadas, trazabilidad y chat contextual.

> El proyecto sigue en desarrollo. El build correcto no sustituye pruebas autenticadas por rol, UAT del cliente ni aceptación de producción.

## Requisitos y arranque

- Node.js 22 LTS y npm.
- API backend local disponible en `http://localhost:3000/api/v1` por defecto cuando la app corre en `localhost`.

```powershell
npm ci
npm run dev
```

Abra `http://localhost:5173`. Para usar otro backend, cree `.env.local` con `VITE_API_BASE_URL` apuntando al prefijo `/api/v1` correspondiente. No incluya claves de proveedor IA, credenciales cloud ni secretos del backend en variables `VITE_*`: Vite las incorpora al bundle público.

## Verificación

```powershell
npm run lint
npm run build
npm run test:e2e
```

`npm run test:e2e:full` ejecuta el conjunto integrado y requiere el backend y fixtures de prueba aislados. No apunte pruebas E2E a una cuenta empresarial o al sitio público sin autorización.

## Seguridad de entrega

El navegador solo recibe credenciales de sesión de alcance limitado; la ingesta, cifrado de credenciales cloud y llamadas al proveedor IA ocurren en el backend. No comparta capturas, HAR, local storage ni trazas que puedan contener datos de una sesión.

El backend asociado contiene las migraciones, API y guías técnicas. La documentación con datos reales de cuentas cloud se distribuye por separado y con acceso autorizado. La visibilidad pública del repositorio no otorga una licencia de reutilización.

Release test scope and known limitations are recorded in [RELEASE_CHECKS.md](RELEASE_CHECKS.md).
