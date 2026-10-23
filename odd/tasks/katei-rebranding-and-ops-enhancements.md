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
- **T1** (S2, S9, S10, S11) | Route: delegated (parallel writer 1 - disjoint surface: prisma/items/bodega) | Status: in_progress | Evidence: pending
- **T2** (S1, S4, S5, S6, S7) | Route: delegated (parallel writer 2 - disjoint surface: branding/dashboard/layout/pages) | Status: in_progress | Evidence: pending
- **T3** (S2, S3, S8) | Route: delegated (parallel writer 3 - disjoint surface: theme.store/auth.store/admin) | Status: in_progress | Evidence: pending

## Log
- **L1 (2026-10-23)**:
Te voy a pasar varios puntos que me pasaron para revisar o cambiar, puedes revisarlos, y los que no queden claros, me respondes para revisar. Los que puedas aplicar, hagamoslo. Luego continuare con las pruebas.
A. GENERALES 
1. Cambiar el nombre del sistema SGMT por KATEI 
2. Cambiar término Kardex por Stock o inventario, podemos ver la opcion de manejar terminos o nombres que pudieran ser propios de cada proyecto , por ejemplo el nombre Faena no necesariamente sea un termino a todo cliente, podemos hacer una revision de los mas específicos claramente. 
3. Sacar Copilot o desactivar, a menos que podamos por perfiles 
4. Revisar si hay un acceso directo a Emitir Cotización y al Estado de Cotizaciones 
5. revisar si hay un cuadro con Cotizaciones pendientes  
6. Cambiar texto Visado faena por otro más claro 
7. Eliminar toda mencion a Homelab o informacion tecnica del sistema. 
8. Agregar una configuracion de colores o estilos de la plataforma. 
B.- GESTIÓN OPERATIVA 
1. Reemplazar Material por Repuestos, ver si aplica la opción de términos del punto 1 anterior. 
2. Seria bueno tener una relación de Repuesto-Vehiculo, por que hay casos de repuestos que solo aplican a ciertas maquinas o modelos 
3. Reemplazaría en Categorias DESGASTE por PIEZA DE DESGASTE 
C. CONSULTAS 
1. Se está guardando un log con el historial de transacciones realizadas por usuario? 
2. El presupuesto es un número total para toda la faena y luego puedo asignar otro monto a un centro de costos en particular? 
3. Qué es radar de integridad?
