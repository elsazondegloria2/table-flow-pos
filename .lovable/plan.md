## Sistema POS — Restaurante físico (un solo local)

POS realista para tablet, optimizado para mesas con cuenta abierta, look "Toast Dark" (oscuro, contrastes fuertes, acento naranja #e85d3a). Sistema abierto sin login de meseros. Backend en Lovable Cloud.

---

### Pantallas

1. **Mesas (home)** — grid grande tipo tablet
   - Tarjetas grandes con número, estado (color), tiempo abierta, total acumulado, # personas
   - Estados: verde (libre) / rojo (ocupada) / amarillo (esperando cuenta) / azul (reservada)
   - Botones rápidos: "Para llevar", "Caja rápida", "Dashboard", "Productos"

2. **Mesa abierta** (al tocar una mesa)
   - Izquierda: cuenta acumulada con items, cantidades, extras, observaciones, total
   - Derecha: categorías + grid de productos grandes con imagen
   - Tap producto → se agrega instantáneamente (sin modal)
   - Sobre cada item: +/- cantidad, agregar extra, observación, eliminar
   - Botones inferiores: "Pedir cuenta" (mesa → amarillo) y "Cobrar" (abre modal pago)

3. **Cobro** (modal)
   - Total, método de pago (efectivo / tarjeta / transferencia), monto recibido / cambio
   - Confirmar → genera factura, cierra mesa (vuelve a verde), libera

4. **Para llevar** — misma UI de mesa pero como orden sin número de mesa (nombre cliente opcional)

5. **Caja rápida** — productos a la izquierda, ticket a la derecha, cobro inmediato

6. **Dashboard**
   - Ventas hoy / semana / mes, ganancia, # mesas activas
   - Top productos, top bebidas, métodos de pago, horas pico

7. **Reportes** — diario, semanal, mensual, productos más vendidos, local vs para llevar

8. **Gestión productos/categorías** (admin)
   - CRUD productos (nombre, precio, categoría, imagen, disponible sí/no)
   - CRUD categorías
   - CRUD extras (con precio)
   - CRUD mesas (número, capacidad)

---

### Modelo de datos (Lovable Cloud)

- `categories` (id, name, sort_order, icon)
- `products` (id, name, price, category_id, image_url, available)
- `extras` (id, name, price)
- `tables` (id, number, capacity, status, opened_at, guests)
- `orders` — una orden por cuenta abierta (id, table_id nullable para "para llevar", type: 'dine_in'|'takeaway'|'quick', status: 'open'|'awaiting_payment'|'paid'|'cancelled', customer_name, opened_at, closed_at, subtotal, total, payment_method, amount_received)
- `order_items` (id, order_id, product_id, name_snapshot, price_snapshot, quantity, notes)
- `order_item_extras` (id, order_item_id, extra_id, name_snapshot, price_snapshot, quantity)
- `expenses` (id, date, concept, amount) — para ganancia en dashboard

Regla clave: **una orden permanece `open` y acumula items hasta cobro**. Solo al cobrar se marca `paid`, se setea `closed_at` y la mesa vuelve a libre.

RLS abierto (sistema sin login). Server functions con `supabaseAdmin` para todas las operaciones (proteger con un PIN admin solo en sección admin más adelante si quieres).

---

### Stack técnico

- TanStack Start (ya configurado)
- Rutas: `/` (mesas), `/mesa/$id`, `/llevar/$id`, `/caja-rapida`, `/dashboard`, `/reportes`, `/admin/productos`, `/admin/mesas`
- TanStack Query + `createServerFn` para datos
- Realtime de Supabase en la pantalla de mesas para que cambios se vean en otras tablets al instante
- shadcn/ui adaptado a tema oscuro
- Tokens en `src/styles.css`: fondo `#1a1a1a`, surface `#2d2d2d`, borde `#4a4a4a`, primario `#e85d3a`, tipografía sans grande, radius generoso, botones táctiles min 64px

---

### Alcance v1 (esta entrega)

- Esquema completo en Cloud + datos seed (categorías, ~12 productos, 5 extras, 12 mesas)
- Pantalla de mesas con estados + timer en vivo
- Pantalla de mesa con cuenta acumulada, agregar productos/extras, editar, observaciones
- Flujo "Pedir cuenta" → "Cobrar" → cierre de mesa
- Para llevar + Caja rápida
- Dashboard con KPIs y top productos
- Reportes (diario/semanal/mensual + filtros)
- Admin de productos, categorías, extras, mesas
- Impresión de ticket (vista print-friendly del navegador, sin integración hardware)

**Fuera de v1** (mencionar si lo quieres después): KDS para cocina, separar cuenta, propinas, descuentos, login PIN meseros, integración impresora térmica nativa, multi-impresora cocina/bar.

¿Confirmas para construir?
