/* PuntoVenta Web — prototipo.
   Misma lógica que la versión de escritorio, con datos en localStorage. */
"use strict";

const MONEDA = "BS";
const BILLETES = [10, 20, 50, 100, 200];
const LS_PRODUCTOS = "pv_productos";
const LS_VENTAS = "pv_ventas";
const LS_MOVIMIENTOS = "pv_movimientos";

/* Productos iniciales (exportados de la base de datos de escritorio). */
const PRODUCTOS_INICIALES = [
  { codigo: "7771611000149", nombre: "Agua Villasanta 20 LT", categoria: "Bebidas", precio: 20, compra: 18, stock: 39, minimo: 5 },
  { codigo: "7771611000392", nombre: "Agua Villasanta3", categoria: "Bebidas", precio: 20, compra: 10, stock: 48, minimo: 1 },
  { codigo: "7891118026500", nombre: "Caramelo de Chocolate", categoria: "Dulces", precio: 31, compra: 22, stock: 210, minimo: 2 },
  { codigo: "6941812792155", nombre: "Cargador Power Bannk", categoria: "Electrónica", precio: 213, compra: 23, stock: 205, minimo: 23 },
  { codigo: "7779970435503", nombre: "Cuaderno Celeste", categoria: "Otros", precio: 10, compra: 6, stock: 50, minimo: 1 },
  { codigo: "7898652007118", nombre: "Hub Multifuncional", categoria: "Electrónica", precio: 42, compra: 24, stock: 983, minimo: 12 },
  { codigo: "7908552002585", nombre: "Lector de Codigo de barra", categoria: "Electrónica", precio: 324, compra: 200, stock: 85, minimo: 10 },
  { codigo: "4710268251477", nombre: "Mouse", categoria: "Electrónica", precio: 213, compra: 21, stock: 324, minimo: 4 },
];

/* ---------------- Estado ---------------- */
let productos = cargar(LS_PRODUCTOS, PRODUCTOS_INICIALES);
let ventas = cargar(LS_VENTAS, []);
let movimientos = cargar(LS_MOVIMIENTOS, []);
let carrito = [];
let metodoPago = "efectivo";
let escaner = null;
let flashEncendido = false;

function cargar(clave, inicial) {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? JSON.parse(texto) : JSON.parse(JSON.stringify(inicial));
  } catch { return JSON.parse(JSON.stringify(inicial)); }
}
function guardar(clave, valor) { localStorage.setItem(clave, JSON.stringify(valor)); }

function $(id) { return document.getElementById(id); }
function dinero(n) { return `${MONEDA} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function numero(n) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* ================= NAVEGACIÓN ================= */
document.querySelectorAll(".pestana").forEach(boton => {
  boton.addEventListener("click", () => {
    document.querySelectorAll(".pestana").forEach(b => b.classList.remove("activa"));
    boton.classList.add("activa");
    document.querySelectorAll(".vista").forEach(v => v.classList.remove("activa"));
    $("vista-" + boton.dataset.vista).classList.add("activa");
    if (boton.dataset.vista === "productos") pintarProductos();
    if (boton.dataset.vista === "inventario") pintarInventario();
    if (boton.dataset.vista === "reportes") pintarReportes();
    if (boton.dataset.vista === "ventas") $("entrada-codigo").focus();
  });
});

/* ================= CARRITO ================= */
function buscarProducto(codigo) { return productos.find(p => p.codigo === codigo); }

function agregarPorCodigo(codigo) {
  const producto = buscarProducto(codigo);
  if (!producto) {
    mostrarAlerta(`Código ${codigo} no está registrado.`, codigo);
    return;
  }
  ocultarAlerta();
  const renglon = carrito.find(r => r.codigo === codigo);
  if (renglon) renglon.cantidad++;
  else carrito.push({ codigo: producto.codigo, nombre: producto.nombre, precio: producto.precio, cantidad: 1 });
  pintarCarrito();
}

function mostrarAlerta(texto, codigoPendiente) {
  const a = $("alerta");
  a.innerHTML = "";
  const span = document.createElement("span");
  span.textContent = texto;
  a.appendChild(span);
  if (codigoPendiente) {
    const boton = document.createElement("button");
    boton.className = "btn btn-primario btn-mini";
    boton.textContent = "Crear producto";
    boton.addEventListener("click", () => abrirProducto(null, codigoPendiente));
    a.appendChild(boton);
  }
  a.classList.remove("oculto");
}
function ocultarAlerta() { $("alerta").classList.add("oculto"); }

function pintarCarrito() {
  const caja = $("carrito");
  caja.innerHTML = "";
  if (carrito.length === 0) {
    caja.innerHTML = '<div class="carrito-vacio">Escanea un producto para comenzar</div>';
  }
  carrito.forEach((r, i) => {
    const subtotal = r.precio * r.cantidad;
    const div = document.createElement("div");
    div.className = "renglon";
    div.innerHTML = `
      <div class="renglon-info">
        <div class="renglon-nombre">${r.nombre}</div>
        <div class="renglon-detalle">${r.cantidad} x ${numero(r.precio)}</div>
      </div>
      <div class="renglon-cantidad">
        <button data-accion="menos" data-i="${i}">−</button>
        <span>${r.cantidad}</span>
        <button data-accion="mas" data-i="${i}">+</button>
      </div>
      <div class="renglon-subtotal">${numero(subtotal)}</div>`;
    caja.appendChild(div);
  });

  const total = carrito.reduce((s, r) => s + r.precio * r.cantidad, 0);
  const articulos = carrito.reduce((s, r) => s + r.cantidad, 0);
  $("total").textContent = dinero(total);
  $("contador-articulos").textContent = `${articulos} artículos`;
  actualizarCambio();
}

$("carrito").addEventListener("click", e => {
  const boton = e.target.closest("button[data-accion]");
  if (!boton) return;
  const i = Number(boton.dataset.i);
  const r = carrito[i];
  if (boton.dataset.accion === "mas") {
    r.cantidad++;
  } else {
    r.cantidad--;
    if (r.cantidad <= 0) carrito.splice(i, 1);
  }
  pintarCarrito();
});

/* ================= ENTRADA DE CÓDIGO ================= */
$("entrada-codigo").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const codigo = e.target.value.trim();
    e.target.value = "";
    if (codigo) agregarPorCodigo(codigo);
  }
});

/* ================= BÚSQUEDA POR NOMBRE ================= */
$("entrada-nombre").addEventListener("input", () => {
  const texto = $("entrada-nombre").value.trim().toLowerCase();
  const caja = $("resultados-nombre");
  if (!texto) { caja.classList.add("oculto"); caja.innerHTML = ""; return; }
  const coincidencias = productos
    .filter(p => p.nombre.toLowerCase().includes(texto) || p.codigo.includes(texto))
    .slice(0, 8);
  caja.innerHTML = "";
  if (coincidencias.length === 0) {
    caja.classList.add("oculto");
    return;
  }
  coincidencias.forEach(p => {
    const div = document.createElement("div");
    div.className = "resultado-nombre";
    div.innerHTML = `
      <span>${p.nombre}</span>
      <span class="resultado-precio">${dinero(p.precio)}</span>`;
    div.addEventListener("click", () => {
      ocultarAlerta();
      const renglon = carrito.find(r => r.codigo === p.codigo);
      if (renglon) renglon.cantidad++;
      else carrito.push({ codigo: p.codigo, nombre: p.nombre, precio: p.precio, cantidad: 1 });
      $("entrada-nombre").value = "";
      caja.classList.add("oculto");
      caja.innerHTML = "";
      pintarCarrito();
    });
    caja.appendChild(div);
  });
  caja.classList.remove("oculto");
});

$("entrada-nombre").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const primero = document.querySelector("#resultados-nombre .resultado-nombre");
  if (primero) primero.click();
});

/* ================= PAGO ================= */
document.querySelectorAll(".btn-metodo").forEach(boton => {
  boton.addEventListener("click", () => {
    document.querySelectorAll(".btn-metodo").forEach(b => b.classList.remove("activo"));
    boton.classList.add("activo");
    metodoPago = boton.dataset.metodo;
    $("bloque-efectivo").classList.toggle("oculto", metodoPago !== "efectivo");
    actualizarCambio();
  });
});

function montoRecibido() {
  const v = parseFloat($("entrada-recibido").value);
  return isNaN(v) ? 0 : v;
}

function actualizarCambio() {
  const total = carrito.reduce((s, r) => s + r.precio * r.cantidad, 0);
  const caja = $("cambio");
  if (metodoPago !== "efectivo" || carrito.length === 0) {
    caja.textContent = dinero(0);
    caja.classList.remove("falta");
    return;
  }
  const cambio = Math.round((montoRecibido() - total) * 100) / 100;
  if (cambio >= 0) {
    caja.textContent = dinero(cambio);
    caja.classList.remove("falta");
  } else {
    caja.textContent = `Falta ${dinero(Math.abs(cambio))}`;
    caja.classList.add("falta");
  }
}

$("entrada-recibido").addEventListener("input", actualizarCambio);

document.querySelectorAll(".btn-billete").forEach(boton => {
  boton.addEventListener("click", () => {
    const total = carrito.reduce((s, r) => s + r.precio * r.cantidad, 0);
    if (boton.dataset.billete === "exacto") {
      $("entrada-recibido").value = total.toFixed(2);
    } else {
      const actual = montoRecibido();
      $("entrada-recibido").value = (actual + Number(boton.dataset.billete)).toFixed(2);
    }
    actualizarCambio();
  });
});

/* ================= COBRAR ================= */
$("btn-cobrar").addEventListener("click", () => {
  if (carrito.length === 0) { mostrarAlerta("El carrito está vacío."); return; }
  const total = Math.round(carrito.reduce((s, r) => s + r.precio * r.cantidad, 0) * 100) / 100;
  let recibido = 0, cambio = 0;
  if (metodoPago === "efectivo") {
    recibido = montoRecibido() || total;
    cambio = Math.round((recibido - total) * 100) / 100;
    if (recibido < total && !confirm(
        `El cliente entregó ${dinero(recibido)} y el total es ${dinero(total)}. ¿Cobrar de todos modos?`)) {
      return;
    }
  }
  ocultarAlerta();

  const venta = {
    id: ventas.length ? ventas[ventas.length - 1].id + 1 : 1,
    fecha: new Date().toISOString(),
    items: carrito.map(r => ({ ...r, subtotal: Math.round(r.precio * r.cantidad * 100) / 100 })),
    total, metodo: metodoPago, recibido, cambio,
  };
  ventas.push(venta);
  guardar(LS_VENTAS, ventas);

  /* Descontar stock y registrar movimientos de inventario */
  carrito.forEach(r => {
    const p = buscarProducto(r.codigo);
    if (p) {
      p.stock -= r.cantidad;
      registrarMov(p, "venta", -r.cantidad, p.stock, `Venta Nro. ${venta.id}`);
    }
  });
  guardar(LS_PRODUCTOS, productos);

  const carritoCobrado = carrito;
  carrito = [];
  $("entrada-recibido").value = "";
  pintarCarrito();

  $("recibo").textContent = textoRecibo(venta);
  $("modal-recibo").classList.remove("oculto");
  $("btn-cerrar-recibo").onclick = () => $("modal-recibo").classList.add("oculto");
});

/* Recibo de 32 columnas, igual al de la impresora térmica. */
function textoRecibo(venta) {
  const ANCHO = 32;
  const centro = t => {
    t = t.slice(0, ANCHO);
    const esp = Math.max(0, Math.floor((ANCHO - t.length) / 2));
    return " ".repeat(esp) + t;
  };
  const lineas = [];
  const fecha = new Date(venta.fecha);
  lineas.push(centro("TIENDA BARRIO"));
  lineas.push(centro("RECIBO DE VENTA"));
  lineas.push("=".repeat(ANCHO));
  lineas.push(`N° ${venta.id}  ${fecha.toLocaleDateString("es-VE")} ${fecha.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}`);
  lineas.push("-".repeat(ANCHO));
  venta.items.forEach(it => {
    let nombre = it.nombre;
    if (nombre.length > ANCHO) nombre = nombre.slice(0, ANCHO - 1);
    lineas.push(nombre);
    const detalle = `${it.cantidad} x ${numero(it.precio)} = ${numero(it.subtotal)}`;
    lineas.push(detalle.length > ANCHO ? detalle.slice(0, ANCHO) : detalle);
  });
  lineas.push("=".repeat(ANCHO));
  lineas.push(centro(`TOTAL: ${dinero(venta.total)}`));
  lineas.push(`Método: ${venta.metodo.toUpperCase()}`);
  if (venta.metodo === "efectivo") {
    lineas.push(`Recibido: ${dinero(venta.recibido)}`);
    lineas.push(`Cambio:   ${dinero(venta.cambio)}`);
  }
  lineas.push("-".repeat(ANCHO));
  lineas.push(centro("¡Gracias por su compra!"));
  return lineas.join("\n");
}

$("btn-imprimir").addEventListener("click", () => window.print());

/* ================= CÁMARA ================= */
$("btn-camara").addEventListener("click", async () => {
  $("modal-camara").classList.remove("oculto");
  flashEncendido = false;
  $("btn-flash").classList.add("oculto");
  try {
    escaner = new Html5Qrcode("lector");
    await escaner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 160 } },
      codigo => {
        cerrarCamara();
        agregarPorCodigo(codigo);
        $("entrada-codigo").focus();
      },
      () => {}
    );
    /* Linterna: solo Chrome/Edge Android con cámara trasera */
    try {
      const caps = escaner.getRunningTrackCapabilities();
      if (caps && caps.torch) $("btn-flash").classList.remove("oculto");
    } catch { /* sin linterna */ }
  } catch (err) {
    cerrarCamara();
    mostrarAlerta("No se pudo abrir la cámara: " + err);
  }
});

$("btn-flash").addEventListener("click", async () => {
  if (!escaner) return;
  try {
    flashEncendido = !flashEncendido;
    await escaner.applyVideoConstraints({ advanced: [{ torch: flashEncendido }] });
    $("btn-flash").style.background = flashEncendido ? "var(--acento)" : "var(--borde)";
    $("btn-flash").style.color = flashEncendido ? "#fff" : "var(--texto)";
  } catch { /* el dispositivo no soporta linterna */ }
});

function cerrarCamara() {
  $("modal-camara").classList.add("oculto");
  if (escaner) {
    escaner.stop().then(() => escaner.clear()).catch(() => {});
    escaner = null;
  }
}
$("btn-cerrar-camara").addEventListener("click", cerrarCamara);

/* ================= PRODUCTOS ================= */
let productoEditando = null;   // índice del producto en edición (o null = nuevo)

function pintarProductos() {
  const texto = ($("buscador-productos").value || "").toLowerCase();
  const caja = $("lista-productos");
  caja.innerHTML = "";
  const filtrados = productos
    .filter(p => p.nombre.toLowerCase().includes(texto) || p.codigo.includes(texto));
  if (filtrados.length === 0) {
    caja.innerHTML = '<div class="carrito-vacio">No hay productos que coincidan</div>';
    return;
  }
  filtrados.forEach(p => {
    const div = document.createElement("div");
    div.className = "producto";
    div.innerHTML = `
      <div>
        <div class="producto-nombre">${p.nombre}</div>
        <div class="producto-detalle">${p.codigo} · costo: ${numero(p.compra || 0)}</div>
      </div>
      <div class="producto-precio">${dinero(p.precio)}</div>`;
    div.addEventListener("click", () => abrirProducto(p));
    caja.appendChild(div);
  });
}
$("buscador-productos").addEventListener("input", pintarProductos);

function abrirProducto(producto, codigoPrellenado) {
  productoEditando = producto ? productos.indexOf(producto) : null;
  $("titulo-producto").textContent = producto ? "Editar producto" : "Nuevo producto";
  $("campo-codigo").value = producto ? producto.codigo : (codigoPrellenado || "");
  $("campo-nombre").value = producto ? producto.nombre : "";
  $("campo-precio").value = producto ? producto.precio : "";
  $("campo-costo").value = producto ? (producto.compra || "") : "";
  $("btn-eliminar-producto").classList.toggle("oculto", !producto);
  $("modal-producto").classList.remove("oculto");
  $("campo-codigo").focus();
}

function cerrarProducto() { $("modal-producto").classList.add("oculto"); }

$("btn-nuevo-producto").addEventListener("click", () => abrirProducto(null));
$("btn-cancelar-producto").addEventListener("click", cerrarProducto);

$("btn-guardar-producto").addEventListener("click", () => {
  const codigo = $("campo-codigo").value.trim();
  const nombre = $("campo-nombre").value.trim();
  const precio = parseFloat($("campo-precio").value);
  const compra = parseFloat($("campo-costo").value) || 0;
  if (!codigo) { alert("El código de barras es obligatorio."); return; }
  if (!nombre) { alert("El nombre del producto es obligatorio."); return; }
  if (isNaN(precio) || precio < 0) { alert("El precio de venta debe ser un número válido."); return; }
  const duplicado = productos.find(p => p.codigo === codigo && productos.indexOf(p) !== productoEditando);
  if (duplicado) { alert("Ya existe un producto con ese código de barras."); return; }

  if (productoEditando === null) {
    productos.push({ codigo, nombre, precio, compra, stock: 0, minimo: 0 });
  } else {
    const p = productos[productoEditando];
    p.codigo = codigo; p.nombre = nombre; p.precio = precio; p.compra = compra;
  }
  guardar(LS_PRODUCTOS, productos);
  cerrarProducto();
  pintarProductos();

  /* Si el producto se creó desde una venta con código pendiente, se agrega al carrito */
  if (productoEditando === null && !$("alerta").classList.contains("oculto")) {
    ocultarAlerta();
    agregarPorCodigo(codigo);
  }
  $("entrada-codigo").focus();
});

$("btn-eliminar-producto").addEventListener("click", () => {
  if (productoEditando === null) return;
  const p = productos[productoEditando];
  if (!confirm(`¿Eliminar '${p.nombre}' del catálogo?`)) return;
  productos.splice(productoEditando, 1);
  guardar(LS_PRODUCTOS, productos);
  cerrarProducto();
  pintarProductos();
});

/* ================= INVENTARIO ================= */
function registrarMov(producto, tipo, cantidad, resultante, motivo) {
  movimientos.push({
    fecha: new Date().toISOString(),
    codigo: producto.codigo,
    nombre: producto.nombre,
    tipo,                       // "entrada" | "ajuste" | "venta"
    cantidad,
    resultante,
    motivo: motivo || "",
  });
  guardar(LS_MOVIMIENTOS, movimientos);
}

let accionInventario = null;    // "entrada" | "ajuste"
let productoInventario = null;

function pintarInventario() {
  $("inv-productos").textContent = productos.length;
  const unidades = productos.reduce((s, p) => s + (p.stock || 0), 0);
  $("inv-unidades").textContent = Math.round(unidades * 1000) / 1000;
  const valor = productos.reduce((s, p) => s + (p.stock || 0) * (p.compra || 0), 0);
  $("inv-valor").textContent = dinero(Math.round(valor * 100) / 100);

  const caja = $("lista-inventario");
  caja.innerHTML = "";
  [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(p => {
    const stock = p.stock || 0;
    const estado = stock <= 0 ? "AGOTADO" : (p.minimo && stock <= p.minimo ? "BAJO" : "OK");
    const div = document.createElement("div");
    div.className = "producto fila-inventario";
    div.innerHTML = `
      <div>
        <div class="producto-nombre">${p.nombre}</div>
        <div class="producto-detalle">${p.codigo} · costo: ${numero(p.compra || 0)} ·
          <span class="${estado === "OK" ? "" : "stock-bajo"}">stock: ${stock} ${estado !== "OK" ? `(${estado})` : ""}</span></div>
      </div>
      <div class="inv-acciones">
        <button class="btn btn-primario btn-mini" data-inv="entrada">+ Entrada</button>
        <button class="btn btn-secundario btn-mini" data-inv="ajuste">Ajuste</button>
      </div>`;
    div.querySelector('[data-inv="entrada"]').addEventListener("click", e => {
      e.stopPropagation();
      abrirInventario(p, "entrada");
    });
    div.querySelector('[data-inv="ajuste"]').addEventListener("click", e => {
      e.stopPropagation();
      abrirInventario(p, "ajuste");
    });
    caja.appendChild(div);
  });

  const historial = $("lista-movimientos");
  historial.innerHTML = "";
  [...movimientos].reverse().slice(0, 30).forEach(m => {
    const fecha = new Date(m.fecha);
    const div = document.createElement("div");
    div.className = "venta-fila";
    const firmado = m.cantidad > 0 ? `+${m.cantidad}` : `${m.cantidad}`;
    div.innerHTML = `
      <span><span class="mov-tipo mov-${m.tipo}">${m.tipo.toUpperCase()}</span> ${m.nombre}</span>
      <span class="hora">${fecha.toLocaleDateString("es-VE")} ${fecha.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</span>
      <span class="monto">${firmado} → ${m.resultante}</span>`;
    historial.appendChild(div);
  });
  if (movimientos.length === 0) {
    historial.innerHTML = '<div class="carrito-vacio">Aún no hay movimientos</div>';
  }
}

function abrirInventario(producto, modo) {
  accionInventario = modo;
  productoInventario = producto;
  const esEntrada = modo === "entrada";
  $("titulo-inventario").textContent = esEntrada ? "Ingreso de mercadería" : "Ajuste de stock";
  $("info-inventario").textContent = `${producto.nombre} (${producto.codigo}) · stock actual: ${producto.stock || 0}`;
  $("etiqueta-inv-cantidad").textContent = esEntrada ? "CANTIDAD A INGRESAR" : "STOCK RESULTANTE";
  $("bloque-inv-costo").classList.toggle("oculto", !esEntrada);
  $("campo-inv-cantidad").value = "";
  $("campo-inv-costo").value = "";
  $("campo-inv-motivo").value = esEntrada ? "Ingreso de mercadería" : "Ajuste manual";
  $("modal-inventario").classList.remove("oculto");
  $("campo-inv-cantidad").focus();
}

$("btn-cancelar-inv").addEventListener("click", () => $("modal-inventario").classList.add("oculto"));

$("btn-guardar-inv").addEventListener("click", () => {
  if (!productoInventario) return;
  const cantidad = parseFloat($("campo-inv-cantidad").value);
  const motivo = $("campo-inv-motivo").value.trim() || (accionInventario === "entrada" ? "Ingreso de mercadería" : "Ajuste manual");
  if (isNaN(cantidad) || (accionInventario === "entrada" ? cantidad <= 0 : cantidad < 0)) {
    alert(accionInventario === "entrada"
      ? "La cantidad debe ser mayor a 0."
      : "El stock resultante debe ser 0 o más.");
    return;
  }
  if (accionInventario === "entrada") {
    productoInventario.stock = Math.round(((productoInventario.stock || 0) + cantidad) * 1000) / 1000;
    const costo = parseFloat($("campo-inv-costo").value);
    if (!isNaN(costo) && costo >= 0) productoInventario.compra = costo;
    registrarMov(productoInventario, "entrada", cantidad, productoInventario.stock, motivo);
  } else {
    const nuevo = Math.round(cantidad * 1000) / 1000;
    const delta = Math.round((nuevo - (productoInventario.stock || 0)) * 1000) / 1000;
    if (delta === 0) { $("modal-inventario").classList.add("oculto"); return; }
    productoInventario.stock = nuevo;
    registrarMov(productoInventario, "ajuste", delta, nuevo, motivo);
  }
  guardar(LS_PRODUCTOS, productos);
  $("modal-inventario").classList.add("oculto");
  pintarInventario();
});

/* ================= REPORTES ================= */
function pintarReportes() {
  const hoy = new Date().toDateString();
  const deHoy = ventas.filter(v => new Date(v.fecha).toDateString() === hoy);
  const totalHoy = deHoy.reduce((s, v) => s + v.total, 0);
  $("rep-ventas-hoy").textContent = deHoy.length;
  $("rep-total-hoy").textContent = dinero(Math.round(totalHoy * 100) / 100);

  const caja = $("lista-ventas");
  caja.innerHTML = "";
  [...ventas].reverse().slice(0, 20).forEach(v => {
    const fecha = new Date(v.fecha);
    const div = document.createElement("div");
    div.className = "venta-fila";
    div.innerHTML = `
      <span>#${v.id} · ${v.metodo}</span>
      <span class="hora">${fecha.toLocaleDateString("es-VE")} ${fecha.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</span>
      <span class="monto">${dinero(v.total)}</span>`;
    caja.appendChild(div);
  });
  if (ventas.length === 0) caja.innerHTML = '<div class="carrito-vacio">Aún no hay ventas</div>';
}

/* ================= INICIO ================= */
pintarCarrito();
$("entrada-codigo").focus();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
