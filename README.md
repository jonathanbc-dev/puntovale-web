# PuntoVenta Web (prototipo)

Versión web del sistema de punto de venta, pensada para usarse desde un
**teléfono celular** (o cualquier navegador). Es un prototipo: los datos se
guardan en el propio dispositivo (`localStorage`), sin servidor.

## Funciones

- **Vender**: escaneo con la cámara del teléfono (con linterna en
  Chrome/Edge Android), carrito con cantidades, métodos de pago
  (Efectivo / QR / Transferencia), cambio automático, billetes rápidos
  (BS 10/20/50/100/200) y recibo imprimible (58 mm).
- **Productos**: catálogo con búsqueda y alerta de stock bajo.
- **Reportes**: ventas y total del día, últimas 20 ventas.
- Se puede **instalar como app** (PWA) desde el navegador: "Agregar a
  inicio". Funciona sin internet una vez cargada.

## Uso local

Cualquier servidor estático sirve. Por ejemplo:

```bash
python -m http.server 8000
```

y abrir `http://localhost:8000`.

> La cámara exige HTTPS o localhost.

## Datos de ejemplo

Los productos iniciales fueron exportados de la base de datos del sistema
de escritorio. Se pueden editar en `app.js` (`PRODUCTOS_INICIALES`).
Para reiniciar los datos del navegador: borrar el almacenamiento del sitio.
