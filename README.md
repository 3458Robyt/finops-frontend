# FinOps Inteligente — aplicación web

Interfaz React para clientes, técnicos FinOps y administración maestra. Presenta costos, presupuestos, inventario, métricas técnicas, recomendaciones gobernadas, trazabilidad y chat contextual.

> La aplicación requiere un backend FinOps compatible. El build del frontend no sustituye la validación integral de la API, la base de datos y los servicios externos.

## Requisitos y arranque

- Node.js 22 LTS y npm.
- API backend local disponible en `http://localhost:3000/api/v1` por defecto cuando la app corre en `localhost`.

```powershell
npm ci
npm run dev
```

Abra `http://localhost:5173`. Para usar otro backend, cree `.env.local` con `VITE_API_BASE_URL` apuntando al prefijo `/api/v1` correspondiente. No incluya claves de proveedor IA, credenciales cloud ni secretos del backend en variables `VITE_*`: Vite las incorpora al bundle público.

## Áreas de la aplicación

La navegación y las acciones disponibles dependen del rol y del tenant activo. La aplicación reúne el dashboard, inventario cloud, métricas técnicas, presupuestos y asignación de costos, recomendaciones y sus planes, historial, chat, configuración del agente y administración maestra. La API y las reglas de autorización viven en el repositorio backend; la interfaz no concede permisos por sí sola.

## Verificación

```powershell
npm run lint
npm run build
npm run test:e2e
```

`npm run test:e2e:full` ejecuta el conjunto integrado y requiere el backend y fixtures de prueba aislados. No apunte pruebas E2E a una cuenta empresarial o al sitio público sin autorización.

## Seguridad

El navegador solo recibe credenciales de sesión de alcance limitado; la ingesta, cifrado de credenciales cloud y llamadas al proveedor IA ocurren en el backend. No comparta capturas, HAR, local storage ni trazas que puedan contener datos de una sesión.

El [backend asociado](https://github.com/3458Robyt/finops-backend) contiene la API, migraciones y [guías operativas](https://github.com/3458Robyt/finops-backend/blob/main/docs/README.md). La documentación con datos reales de cuentas cloud se distribuye por separado y con acceso autorizado. La visibilidad pública del repositorio no otorga por sí sola una licencia de reutilización.
