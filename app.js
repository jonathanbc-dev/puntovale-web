/* PuntoVenta Web — prototipo.
   Misma lógica que la versión de escritorio, con datos en localStorage. */
"use strict";

const MONEDA = "BS";
const BILLETES = [10, 20, 50, 100, 200];
const LS_PRODUCTOS = "pv_productos";
const LS_VENTAS = "pv_ventas";

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
    if (boton.dataset.vista === "reportes") pintarReportes();
    if (boton.dataset.vista === "ventas") $("entrada-codigo").focus();
  });
});

/* ================= CARRITO ================= */
function buscarProducto(codigo) { return productos.find(p => p.codigo === codigo); }

function agregarPorCodigo(codigo) {
  const producto = buscarProducto(codigo);
  if (!producto) {
    mostrarAlerta(`Código ${codigo} no está registrado.`);
    return;
  }
  ocultarAlerta();
  const renglon = carrito.find(r => r.codigo === codigo);
  const enCarrito = renglon ? renglon.cantidad : 0;
  if (enCarrito + 1 > producto.stock) {
    mostrarAlerta(`Solo hay ${producto.stock} de '${producto.nombre}'.`);
    return;
  }
  if (renglon) renglon.cantidad++;
  else carrito.push({ codigo: producto.codigo, nombre: producto.nombre, precio: producto.precio, cantidad: 1 });
  pintarCarrito();
}

function mostrarAlerta(texto) { const a = $("alerta"); a.textContent = texto; a.classList.remove("oculto"); }
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
  const producto = buscarProducto(r.codigo);
  if (boton.dataset.accion === "mas") {
    if (r.cantidad + 1 > producto.stock) { mostrarAlerta(`Solo hay ${producto.stock} de '${r.nombre}'.`); return; }
    ocultarAlerta();
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
    if (recibido < total) { mostrarAlerta("El efectivo recibido es menor que el total."); return; }
    cambio = Math.round((recibido - total) * 100) / 100;
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

  /* Descontar stock */
  carrito.forEach(r => {
    const p = buscarProducto(r.codigo);
    if (p) p.stock -= r.cantidad;
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
function pintarProductos() {
  const texto = ($("buscador-productos").value || "").toLowerCase();
  const caja = $("lista-productos");
  caja.innerHTML = "";
  productos
    .filter(p => p.nombre.toLowerCase().includes(texto) || p.codigo.includes(texto))
    .forEach(p => {
      const bajo = p.stock <= p.minimo;
      const div = document.createElement("div");
      div.className = "producto";
      div.innerHTML = `
        <div>
          <div class="producto-nombre">${p.nombre}</div>
          <div class="producto-detalle">${p.codigo} · <span class="${bajo ? "stock-bajo" : ""}">stock: ${p.stock}</span></div>
        </div>
        <div class="producto-precio">${dinero(p.precio)}</div>`;
      caja.appendChild(div);
    });
}
$("buscador-productos").addEventListener("input", pintarProductos);

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
