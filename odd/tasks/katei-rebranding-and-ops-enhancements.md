# Objective: Rebrand SGMT to KATEI, customize terminology/styles, add Item-Vehicle relation, and improve Quotation/Approval UX
Branch: main | Delivery: direct feature slices | Runner: npm run build (api & web)

## Specs
- **S1**: "1. Cambiar el nombre del sistema SGMT por KATEI"
- **S2**: "2. Cambiar término Kardex por Stock o inventario, podemos ver la opcion de manejar terminos o nombres que pudieran ser propios de cada proyecto , por ejemplo el nombre Faena no necesariamente sea un termino a todo cliente, podemos hacer una revision de los mas específicos claramente."
- **S3**: "3. Sacar Copilot o desactivar, a menos que podamos por perfiles"
- **S4**: "4. Revisar si hay un acceso directo a Emitir Cotización y al Estado de Cotizaciones"
- **S5**: "5. revisar si hay un cuadro con Cotizaciones pendientes"
- **S6**: "6. Cambiar texto Visado faena por otro más claro"
- **S7**: "7. Eliminar toda mencion a Homelab o informacion tecnica del sistema."
- **S8**: "8. Agregar una configuracion de colores o estilos de la plataforma."
- **S9**: "B.1. Reemplazar Material por Repuestos, ver si aplica la opción de términos del punto 1 anterior."
- **S10**: "B.2. Seria bueno tener una relación de Repuesto-Vehiculo, por que hay casos de repuestos que solo aplican a ciertas maquinas o modelos"
- **S11**: "B.3. Reemplazaría en Categorias DESGASTE por PIEZA DE DESGASTE"

## Tasks
- **T1** (S2, S9, S10, S11) | Route: delegated | Status: done | Commit: edb8807
- **T2** (S1, S4, S5, S6, S7) | Route: delegated | Status: done | Commit: edb8807
- **T3** (S2, S3, S8) | Route: delegated | Status: done | Commit: edb8807

## Log
- **L1 (2026-10-23)**: User requested rebrand to KATEI, terminology updates (Kardex -> Stock, Material -> Repuestos, DESGASTE -> PIEZA DE DESGASTE, Visado Faena -> Aprobación Jefatura), Copilot profile/global control, direct quotation access and pending quotation panel on dashboard, removal of technical/Homelab badges, color/style and custom terminology settings tab, Item-Vehicle compatibility relation, and answered 3 architecture queries (Audit log, Budget breakdown, Fraud/Integrity Radar).
- **L2 (2026-10-23)**: Verified builds, executed Jest test suite (18 suites, 96 tests passed), committed `edb8807`, and deployed to LXC 106 (`https://sgmt.capemaxchile.com`). Migration `20261023000000_item_vehicle_compatibility` applied.
