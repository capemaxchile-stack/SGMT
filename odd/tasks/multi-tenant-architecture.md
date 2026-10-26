# Feature: Arquitectura Multi-Tenant, Planes Flexibles y Control de Consumos KATEI
Branch: develop | Delivery: Reviewable Slices | Test Runner: Jest (API) & Vitest (Web)

## Specs
- S1: "esta plataforma debe ser multicliente, es decir podamos ofrecer a varias empresas diferentes"
- S2: "los modelos o planes, debieran configurarse, es decir podria armar un plan particular con ciertas herramientas a cada cliente. Eso debe ser felxible y configurable."
- S3: "Cada plan no debe tener o ver herramientas que no haya contratado, pero si es bueno sepa existen disponibles o bajo planes diferentes."
- S4: "Es importante que el backend tenga el manejo de todo eso, y la auditorias de uso de los clientes, y por ejemplo tambien de poder llevar control de envio de correos, mensajes, o lo que implique costo, para ir visualizando y controlando, sobre todo si se van a gestionar cuentas separadas. Considerar que se debe cobrar por el servicio a cada cliente."
- S5: "me gustaria tener una rama de desarrollo, para que cualquier cambio no afecte a futuro al sistema en produccion."

## Tasks
- [x] T1 (S5): Crear y publicar rama `develop` aislada de producción. (Route: inline, Commit: 2eb9798 / develop)
- [x] T2 (S1): Diseñar modelo Prisma para `Tenant`, `TenantPlan`, `TenantSubscription` y `TenantUsageMetric` con migración retrocompatible que asigne el tenant por defecto a todos los registros existentes. (Route: inline)
- [x] T3 (S1, S4): Implementar middleware/interceptor de contexto multi-tenant en NestJS (`TenantContext`, `AsyncLocalStorage`) y extracción de tenant vía JWT/Header. (Route: inline)
- [x] T4 (S2, S3): Implementar `TenantModuleGuard` para control de acceso por plan/módulos contratados y respuesta con metadatos de upgrade. (Route: inline)
- [x] T5 (S4): Implementar servicio de auditoría de consumo y métricas (`TenantUsageService`) para contabilizar emails (Brevo), mensajes (Telegram), tokens (Copilot AI) y cuotas de activos. (Route: inline)
- [x] T6 (S2, S3): Actualizar store de frontend (`auth.store.ts`, `theme.store.ts`) y Sidebar/UI para reflejar módulos contratados y badges de "Disponible en Plan Superior". (Route: inline)
- [x] T7 (S1-S5): Batería de pruebas automatizadas multi-tenant (aislamiento entre Tenant A y Tenant B, bloqueo de módulos no contratados, registro de métricas de consumo). (Route: inline)

## Log
- L1 (2026-10-26): "Creo que los modelos o planes, debieran configurarse, es decir podria armar un plan particular con ciertas herramientas a cada cliente. Eso debe ser felxible y configurable. Cada plan no debe tener o ver herramientas que no haya contratado, pero si es bueno sepa existen disponibles o bajo planes diferentes. Por lo pronto, los 3 que me sugieres me parecen bien. COmienza, andame indicando dudas o revisiones. Un punto importante que te iba a mencionar, es que me gustaria tener una rama de desarrollo, para que cualquier cambio no afecte a futuro al sistema en produccion.}"
- L2 (2026-10-26): Implementación completa en rama `develop`: modelos multi-tenant Prisma retrocompatibles, `TenantsModule`, `TenantUsageService`, `TenantModuleGuard`, decoradores `@RequireTenantModule`, control de cuotas y consumo para emails/Telegram/IA, UI con badges de plan en Sidebar, modal de upgrade para módulos no contratados y panel de administración "Empresas & Planes" para Super Usuarios. 19 test suites y 102 tests unitarios pasando al 100%. Build de API y Web Frontend validados exitosamente.
- L3 (2026-10-26): Despliegue de entorno de desarrollo aislado en LXC 106 ejecutando rama `develop`: base de datos dedicada `sgmt_dev` con migración multi-tenant, contenedores `sgmt-dev-api` (puerto 3001) y `sgmt-dev-web` (puerto 8080). Producción (`main`) en puertos 80/3000 contra base `sgmt` permanece 100% intacta. Verificación en vivo de login, creación de nuevos tenants (`Constructora Andes SpA`) y consulta de planes superada.
