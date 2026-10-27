# Feature: Arquitectura Multi-Tenant, Planes Flexibles y Control de Consumos KATEI
Branch: develop | Delivery: Reviewable Slices | Test Runner: Jest (API) & Vitest (Web)

## Specs
- S1: "esta plataforma debe ser multicliente, es decir podamos ofrecer a varias empresas diferentes"
- S2: "los modelos o planes, debieran configurarse, es decir podria armar un plan particular con ciertas herramientas a cada cliente. Eso debe ser felxible y configurable."
- S3: "Cada plan no debe tener o ver herramientas que no haya contratado, pero si es bueno sepa existen disponibles o bajo planes diferentes."
- S4: "Es importante que el backend tenga el manejo de todo eso, y la auditorias de uso de los clientes, y por ejemplo tambien de poder llevar control de envio de correos, mensajes, o lo que implique costo, para ir visualizando y controlando, sobre todo si se van a gestionar cuentas separadas. Considerar que se debe cobrar por el servicio a cada cliente."
- S5: "me gustaria tener una rama de desarrollo, para que cualquier cambio no afecte a futuro al sistema en produccion."
- S6: "Poder tener el portal maestro, con la creacion de los planes, clientes, administracion, gestion etc. Cada cliente debe mostrar su nombre en la plataforma cliente."
- S7: "Ademas debo tener visual de poder acceder a cada cliente para monitorear."
- S8: "Poder tener la opcion de al crear un cliente, enviar un mail con las instrucciones de acceso y funcionamiento inicial. Crear el primer usuario de acceso a cada cliente."
- S9: "EL modo oscuro del panel no se ve del todo bien al editar empresas, debe mejorarse y tener modo claro tambien."
- S10: "Debo tener la opcion de crear o administrar los planes comerciales"
- S11: "Debo tener la opcion de eliminar y desactivar empresas en caso de no pago o de termino. Aqui hay que validar como se hace cuando ya tienen informacion cargada"
- S12: "Seria bueno tener una opcion de backup o exportador de datos de las empresas, en caso de auditoria o requerimientos comerciales."
- S13: "Me gustaria tener un instructivo de creacion y configuracion de nuevas empresas, en el mismo planel Saas que permita ir paso a paso para dar el alta, por ultimo un checklist."

## Tasks
- [x] T1 (S5): Crear y publicar rama `develop` aislada de producción. (Route: inline, Commit: 2eb9798 / develop)
- [x] T2 (S1): Diseñar modelo Prisma para `Tenant`, `TenantPlan`, `TenantSubscription` y `TenantUsageMetric` con migración retrocompatible que asigne el tenant por defecto a todos los registros existentes. (Route: inline)
- [x] T3 (S1, S4): Implementar middleware/interceptor de contexto multi-tenant en NestJS (`TenantContext`, `AsyncLocalStorage`) y extracción de tenant vía JWT/Header. (Route: inline)
- [x] T4 (S2, S3): Implementar `TenantModuleGuard` para control de acceso por plan/módulos contratados y respuesta con metadatos de upgrade. (Route: inline)
- [x] T5 (S4): Implementar servicio de auditoría de consumo y métricas (`TenantUsageService`) para contabilizar emails (Brevo), mensajes (Telegram), tokens (Copilot AI) y cuotas de activos. (Route: inline)
- [x] T6 (S2, S3): Actualizar store de frontend (`auth.store.ts`, `theme.store.ts`) y Sidebar/UI para reflejar módulos contratados y badges de "Disponible en Plan Superior". (Route: inline)
- [x] T7 (S1-S5): Batería de pruebas automatizadas multi-tenant (aislamiento entre Tenant A y Tenant B, bloqueo de módulos no contratados, registro de métricas de consumo). (Route: inline)
- [x] T8 (S8): Aprovisionamiento del primer usuario administrador y despacho de correo de bienvenida con credenciales vía Brevo en `TenantsService.create`. (Route: inline)
- [x] T9 (S7): Implementar endpoint y lógica de impersonación/monitoreo `POST /tenants/:id/impersonate` para Super Usuarios. (Route: inline)
- [x] T10 (S6, S7): Construir Portal Maestro SaaS KATEI (`/super-admin` / `MasterPortalPage.tsx`) con gestión de empresas, métricas globales y acceso a monitoreo. (Route: inline)
- [x] T11 (S6, S7): Limpiar `AdminPage.tsx` del cliente y agregar barra superior de "Modo Monitoreo" con botón de retorno al Portal Maestro. (Route: inline)
- [x] T12 (S9): Soporte completo para Modo Claro / Modo Oscuro con selector en cabecera y corrección de contraste en modales, formularios y tablas del Portal Maestro. (Route: inline)
- [x] T13 (S11): Implementación de ciclo de vida de clientes (`ACTIVO`, `SUSPENDIDO`, `CANCELADO`, `EN_PRUEBA`) con bloqueo automático en login y llamadas API por morosidad sin borrar datos históricos. (Route: inline)
- [x] T14 (S12): Endpoint y botón de descarga directa de copia de seguridad integral (`GET /tenants/:id/export` -> `backup-[slug]-[date].json`) con resumen y todas las entidades del cliente. (Route: inline)
- [x] T15 (S10, S13): Pestaña de Planes Comerciales (matriz comparativa y botón de aprovisionamiento directo) y Checklist interactivo de Onboarding de 5 pasos para el operador. (Route: inline)

## Log
- L1 (2026-10-26): "Creo que los modelos o planes, debieran configurarse, es decir podria armar un plan particular con ciertas herramientas a cada cliente. Eso debe ser felxible y configurable. Cada plan no debe tener o ver herramientas que no haya contratado, pero si es bueno sepa existen disponibles o bajo planes diferentes. Por lo pronto, los 3 que me sugieres me parecen bien. COmienza, andame indicando dudas o revisiones. Un punto importante que te iba a mencionar, es que me gustaria tener una rama de desarrollo, para que cualquier cambio no afecte a futuro al sistema en produccion.}"
- L2 (2026-10-26): Implementación completa en rama `develop`: modelos multi-tenant Prisma retrocompatibles, `TenantsModule`, `TenantUsageService`, `TenantModuleGuard`, decoradores `@RequireTenantModule`, control de cuotas y consumo para emails/Telegram/IA, UI con badges de plan en Sidebar, modal de upgrade para módulos no contratados y panel de administración "Empresas & Planes" para Super Usuarios. 19 test suites y 102 tests unitarios pasando al 100%. Build de API y Web Frontend validados exitosamente.
- L3 (2026-10-26): Despliegue de entorno de desarrollo aislado en LXC 106 ejecutando rama `develop`: base de datos dedicada `sgmt_dev` con migración multi-tenant, contenedores `sgmt-dev-api` (puerto 3001) y `sgmt-dev-web` (puerto 8080). Producción (`main`) en puertos 80/3000 contra base `sgmt` permanece 100% intacta. Verificación en vivo de login, creación de nuevos tenants (`Constructora Andes SpA`) y consulta de planes superada.
- L4 (2026-10-26): "perfecto, entiendo lo que hiciste. Creo que seria bueno separemos los ambientes ya, poder tener el portal maestro, con la creacion de los planes, clientes, administracion, gestion etc. Ademas debo tener visual de poder acceder a cada cliente para monitorear. Lo otro es que pueda tener la opcion de al crear un cliente, enviar un mail con las instrucciones de acceso y funcionamiento inicial. COmo creo por ejemplo el primer usuario de acceso a cada cliente?. Avancemos con eso, para poder ir probando diferentes ambientes de clientes diferentes. Ademas cada cliente debe mostrar su nombre en la plataforma cliente."
- L5 (2026-10-26): Implementación de la separación completa entre Control Plane (Portal Maestro SaaS `/super-admin`) y Data Plane (Workspace de clientes). Aprovisionamiento atómico del primer usuario administrador por empresa con hash seguro y despacho de correo transaccional de bienvenida e instrucciones de acceso vía Brevo. Endpoint `POST /tenants/:id/impersonate` con token de auditoría temporal para Super Usuarios. Eliminación de pestañas de empresas del panel de administración del cliente (`AdminPage.tsx`). Barra persistente de "Modo Monitoreo Activo" en `AppLayout.tsx` con restauración inmediata de sesión del Super Admin hacia el Portal Maestro. 19 test suites y 105 tests unitarios pasando al 100% en backend; frontend compilado limpiamente.
- L6 (2026-10-27): Entrega de ciclo de vida con suspensión de clientes por falta de pago (bloqueo automático e informativo sin pérdida de datos referenciales), exportador de backups en JSON descargable con un clic, matriz de planes comerciales (Básico, Pro, Enterprise), checklist interactivo de onboarding de 5 pasos, y pulido de modo claro / modo oscuro con toggle dedicado y contraste validado en modales y formularios. Actualización exitosa en el contenedor dev LXC 106.
