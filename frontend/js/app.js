const API_URL =
    "http://inventario.local/backend/api/productos.php";

let productoEditando = null;
let productosCache = [];
let campoOrden = null;
let ordenAscendente = true;
let grafica = null;
let graficaValor = null;
let paginaActual = 1;
let productosPorPagina = 10;

/* ==========================
   NAVEGACIÓN
========================== */

const titulos = {
    dashboard:  'Dashboard',
    productos:  'Productos',
    usuarios:   'Usuarios',
    actividad:  'Registro de actividad',
    apikeys:    'API Keys'
};

function mostrarSeccion(nombre) {

    document.querySelectorAll('.seccion').forEach(s => s.classList.add('d-none'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById('seccion-' + nombre).classList.remove('d-none');
    document.getElementById('tituloSeccion').textContent = titulos[nombre];

    document.querySelectorAll('.nav-item').forEach(n => {
        if (n.getAttribute('onclick') === `mostrarSeccion('${nombre}')`) {
            n.classList.add('active');
        }
    });

    if (nombre === 'actividad') cargarLogs();
    if (nombre === 'usuarios') cargarUsuarios();
    if (nombre === 'apikeys') cargarApiKeys();
}

/* ==========================
   GRÁFICA
========================== */

function actualizarGrafica(productos) {

    const categorias = {};

    productos.forEach(producto => {
        categorias[producto.categoria] =
            (categorias[producto.categoria] || 0) + 1;
    });

    const labels = Object.keys(categorias);
    const datos = Object.values(categorias);

    if (grafica) grafica.destroy();

    const ctx = document
        .getElementById("graficaCategorias")
        .getContext("2d");

    grafica = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Productos por categoría",
                data: datos
            }]
        },
        options: {
            responsive: true,

        }
    });

    // Gráfico de valor por categoría
    const valoresPorCategoria = {};

    productos.forEach(p => {
        valoresPorCategoria[p.categoria] =
            (valoresPorCategoria[p.categoria] || 0) +
            (Number(p.precio) * Number(p.stock));
    });

    if (graficaValor) graficaValor.destroy();

    const ctxValor = document
        .getElementById("graficaValor")
        .getContext("2d");

    graficaValor = new Chart(ctxValor, {
        type: "doughnut",
        data: {
            labels: Object.keys(valoresPorCategoria),
            datasets: [{
                label: "Valor (€)",
                data: Object.values(valoresPorCategoria).map(v => v.toFixed(2))
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: { display: false },
                tooltip: {
                    callbacks: {
                        label: (item) => ` ${item.label}: ${item.raw} €`
                    }
                }
            }
        }
    });
}

/* ==========================
   UTILIDADES
========================== */

function esc(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
}

/* ==========================
   TABLA
========================== */

function badgeStock(stock, minimo) {
    stock = Number(stock);
    minimo = Number(minimo);
    if (stock === 0) {
        return `<span class="badge bg-danger">Agotado</span>`;
    } else if (stock <= minimo) {
        return `<span class="badge bg-warning text-dark">Stock bajo (${stock})</span>`;
    } else {
        return `<span class="badge bg-success">Disponible (${stock})</span>`;
    }
}

function mostrarProductos(productos) {

    document.getElementById("contadorResultados").textContent =
        `Mostrando ${productos.length} de ${productosCache.length} productos`;

    const tbody = document.getElementById("productosBody");
    tbody.innerHTML = "";

    const totalPaginas = Math.ceil(productos.length / productosPorPagina);
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const productosPagina = productos.slice(inicio, fin);

    productosPagina.forEach(producto => {

        tbody.innerHTML += `
            <tr>
                <td>${esc(producto.id)}</td>
                <td>${esc(producto.nombre)}</td>
                <td>${esc(producto.precio)}</td>
                <td>${badgeStock(producto.stock, producto.stock_minimo)}</td>
                <td>${esc(producto.categoria)}</td>
                <td>
                    <button
                        class="btn btn-warning btn-sm me-2"
                        onclick="editarProducto(${Number(producto.id)})">
                        Editar
                    </button>
                    <button
                        class="btn btn-danger btn-sm"
                        onclick="eliminarProducto(${Number(producto.id)})">
                        Eliminar
                    </button>
                </td>
            </tr>
        `;
    });

    renderPaginacion(productos, totalPaginas);
    
aplicarPermisos();
}

function renderPaginacion(productos, totalPaginas) {

    const contenedor = document.getElementById("paginacion");
    contenedor.innerHTML = "";

    if (totalPaginas <= 1) return;

    for (let i = 1; i <= totalPaginas; i++) {
        const btn = document.createElement("button");
        btn.className = `btn btn-sm me-1 ${i === paginaActual ? "btn-primary" : "btn-outline-secondary"}`;
        btn.textContent = i;
        btn.onclick = () => {
            paginaActual = i;
            mostrarProductos(productos);
        };
        contenedor.appendChild(btn);
    }
}

/* ==========================
   CARGAR PRODUCTOS
========================== */

async function cargarProductos() {

    try {

        const response = await fetch(API_URL, {
            credentials: "include"
        });

        if (!response.ok) throw new Error("Error " + response.status);

        const productos = await response.json();

        document.getElementById("totalProductos").textContent = productos.length;

        const stockTotal = productos.reduce(
            (total, p) => total + Number(p.stock), 0
        );
        document.getElementById("stockTotal").textContent = stockTotal;

        const valorInventario = productos.reduce(
            (total, p) => total + (Number(p.precio) * Number(p.stock)), 0
        );
        document.getElementById("valorInventario").textContent =
            valorInventario.toFixed(2) + " €";

        const sinStock = productos.filter(p => Number(p.stock) === 0).length;
        document.getElementById("sinStock").textContent = sinStock;

        productosCache = productos;

        mostrarProductos(productos);
        actualizarGrafica(productos);
        generarBotonesCategorias(productos);

    } catch (err) {
        console.error("Error al cargar productos:", err);
        Swal.fire({
            icon: "error",
            title: "Error al cargar productos",
            text: "Comprueba tu conexión o vuelve a iniciar sesión."
        });
    }
}

cargarProductos();

/* ==========================
   CREAR / ACTUALIZAR
========================== */

const formulario = document.getElementById("productoForm");

formulario.addEventListener("submit", async (e) => {

    e.preventDefault();

    const producto = {
        nombre:      document.getElementById("nombre").value,
        descripcion: document.getElementById("descripcion").value,
        precio:      parseFloat(document.getElementById("precio").value),
        stock:       parseInt(document.getElementById("stock").value),
        stock_minimo:  parseInt(document.getElementById("stockMinimo").value),
        codigo_barras: document.getElementById("codigoBarras").value || null,
        categoria:   document.getElementById("categoria").value
    };

    const metodo = productoEditando ? "PUT" : "POST";

    try {

        const response = await fetch(
            productoEditando ? `${API_URL}?id=${productoEditando}` : API_URL,
            {
                method: metodo,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(producto)
            }
        );

        if (!response.ok) throw new Error("Error " + response.status);

        const resultado = await response.json();

        if (resultado.success) {

            formulario.reset();
            productoEditando = null;

            bootstrap.Modal
                .getInstance(document.getElementById("productoModal"))
                ?.hide();

            document.querySelector("#productoForm button").textContent = "Guardar";

            cargarProductos();

            Swal.fire({
                icon: "success",
                title: metodo === "POST" ? "Producto creado" : "Producto actualizado",
                showConfirmButton: false,
                timer: 1500
            });
        }

    } catch (err) {
        console.error("Error al guardar producto:", err);
        Swal.fire({
            icon: "error",
            title: "Error al guardar",
            text: "No se pudo guardar el producto. Inténtalo de nuevo."
        });
    }
});

/* ==========================
   ELIMINAR
========================== */

async function eliminarProducto(id) {

    const confirmacion = await Swal.fire({
        title: "¿Eliminar producto?",
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar"
    });

    if (!confirmacion.isConfirmed) return;

    try {

        const response = await fetch(`${API_URL}?id=${id}`, {
            method: "DELETE",
            credentials: "include"
        });

        if (!response.ok) throw new Error("Error " + response.status);

        const resultado = await response.json();

        if (resultado.success) {
            cargarProductos();
            Swal.fire({
                icon: "success",
                title: "Producto eliminado",
                showConfirmButton: false,
                timer: 1500
            });
        }

    } catch (err) {
        console.error("Error al eliminar producto:", err);
        Swal.fire({
            icon: "error",
            title: "Error al eliminar",
            text: "No se pudo eliminar el producto. Inténtalo de nuevo."
        });
    }
}

/* ==========================
   EDITAR
========================== */

function editarProducto(id) {

    const producto = productosCache.find(p => p.id == id);
    if (!producto) return;

    document.getElementById("modalTitulo").textContent = "Editar producto";
    document.getElementById("nombre").value      = producto.nombre;
    document.getElementById("descripcion").value = producto.descripcion;
    document.getElementById("precio").value      = producto.precio;
    document.getElementById("stock").value       = producto.stock;
    document.getElementById("stockMinimo").value = producto.stock_minimo;
    document.getElementById("categoria").value   = producto.categoria;
    document.getElementById("codigoBarras").value = producto.codigo_barras || "";

    productoEditando = id;

    document.querySelector("#productoForm button").textContent = "Actualizar";

    new bootstrap.Modal(document.getElementById("productoModal")).show();
}

/* ==========================
   BUSCADOR
========================== */

const buscador = document.getElementById("buscador");

buscador.addEventListener("input", () => {

    const texto = buscador.value.toLowerCase();

    const filtrados = productosCache.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        p.categoria.toLowerCase().includes(texto) ||
        p.descripcion.toLowerCase().includes(texto)
    );

    mostrarProductos(filtrados);
});

/* ==========================
   ORDENAR
========================== */

function ordenarPor(campo) {

    if (campoOrden === campo) {
        ordenAscendente = !ordenAscendente;
    } else {
        campoOrden = campo;
        ordenAscendente = true;
    }

    const productosOrdenados = [...productosCache];

    productosOrdenados.sort((a, b) => {
        let valorA = a[campo];
        let valorB = b[campo];

        if (campo === "precio" || campo === "stock") {
            valorA = Number(valorA);
            valorB = Number(valorB);
        }

        if (valorA < valorB) return ordenAscendente ? -1 : 1;
        if (valorA > valorB) return ordenAscendente ? 1 : -1;
        return 0;
    });

    mostrarProductos(productosOrdenados);
}

/* ==========================
   EXPORTAR
========================== */

document.getElementById("btnExcel").addEventListener("click", exportarExcel);
document.getElementById("btnPDF").addEventListener("click", exportarPDF);

function exportarExcel() {

    const datos = productosCache.map(p => ({
        ID:          p.id,
        Nombre:      p.nombre,
        Descripcion: p.descripcion,
        Precio:      p.precio,
        Stock:       p.stock,
        Categoria:   p.categoria
    }));

    const hoja  = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
    XLSX.writeFile(libro, "inventario.xlsx");
}

function exportarPDF() {

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Inventario", 14, 20);

    let y = 35;

    productosCache.forEach(producto => {
        doc.setFontSize(10);
        doc.text(
            `${producto.id} | ${producto.nombre} | ${producto.categoria} | Stock: ${producto.stock} | ${producto.precio}€`,
            14, y
        );
        y += 8;
        if (y > 270) { doc.addPage(); y = 20; }
    });

    doc.save("inventario.pdf");
}

/* ==========================
   NUEVO PRODUCTO
========================== */

function nuevoProducto() {

    productoEditando = null;
    formulario.reset();

    document.getElementById("modalTitulo").textContent = "Nuevo producto";
    document.querySelector("#productoForm button").textContent = "Guardar";

    new bootstrap.Modal(document.getElementById("productoModal")).show();
}

/* ==========================
   TEMA
========================== */

const themeBtn = document.getElementById("themeBtn");
const temaGuardado = localStorage.getItem("tema");

if (temaGuardado === "dark") {
    document.body.classList.add("dark-mode");
    themeBtn.textContent = "☀️";
}

themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark-mode");

    const oscuro = document.body.classList.contains("dark-mode");

    localStorage.setItem("tema", oscuro ? "dark" : "light");
    themeBtn.textContent = oscuro ? "☀️" : "🌙";
});

/* ==========================
   FILTROS POR CATEGORÍA
========================== */

function generarBotonesCategorias(productos) {

    const categorias = [...new Set(productos.map(p => p.categoria))];
    const contenedor = document.getElementById("filtrosCategorias");

    contenedor.querySelectorAll(".btn-categoria").forEach(b => b.remove());

    categorias.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-outline-secondary me-1 btn-categoria";
        btn.textContent = cat;
        btn.onclick = () => filtrarCategoria(cat);
        contenedor.appendChild(btn);
    });
}

function filtrarCategoria(categoria) {

    document.querySelectorAll("#filtrosCategorias .btn").forEach(b => {
        b.classList.remove("btn-primary", "btn-secondary", "activo");
        b.classList.add("btn-outline-secondary");
    });

    event.target.classList.remove("btn-outline-secondary");
    event.target.classList.add("btn-secondary", "activo");

    if (categoria === "todas") {
        mostrarProductos(productosCache);
    } else {
        const filtrados = productosCache.filter(p => p.categoria === categoria);
        mostrarProductos(filtrados);
    }
}

function aplicarPermisos() {
    if (rolUsuario === 'empleado') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}

/* ==========================
   USUARIOS
========================== */

async function cargarUsuarios() {

    try {

        const response = await fetch(
            "http://inventario.local/backend/api/usuarios.php",
            { credentials: "include" }
        );

        const usuarios = await response.json();
        const tbody = document.getElementById("usuariosBody");
        tbody.innerHTML = "";

        usuarios.forEach(u => {
            const badgeRol = u.rol === 'admin'
                ? '<span class="badge bg-primary">Admin</span>'
                : '<span class="badge bg-secondary">Empleado</span>';

            tbody.innerHTML += `
                <tr>
                    <td>${esc(u.nombre)}</td>
                    <td>${esc(u.email)}</td>
                    <td>${badgeRol}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error al cargar usuarios:", err);
    }
}

function abrirModalUsuario() {
    document.getElementById("usuarioForm").reset();
    new bootstrap.Modal(document.getElementById("usuarioModal")).show();
}

document.getElementById("usuarioForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const usuario = {
        nombre:   document.getElementById("nuevoNombre").value,
        email:    document.getElementById("nuevoEmail").value,
        password: document.getElementById("nuevoPassword").value,
        rol:      document.getElementById("nuevoRol").value
    };

    try {

        const response = await fetch(
            "http://inventario.local/backend/auth/register.php",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(usuario)
            }
        );

        const resultado = await response.json();

        if (resultado.success) {

            bootstrap.Modal
                .getInstance(document.getElementById("usuarioModal"))
                ?.hide();

            Swal.fire({
                icon: "success",
                title: "Usuario registrado",
                showConfirmButton: false,
                timer: 1500
            });

        } else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: resultado.message
            });
        }

    } catch (err) {
        console.error("Error al registrar usuario:", err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo registrar el usuario."
        });
    }
});

/* ==========================
   CAMBIO DE CONTRASEÑA
========================== */

function abrirModalPassword() {
    document.getElementById("passwordForm").reset();
    new bootstrap.Modal(document.getElementById("passwordModal")).show();
}

document.getElementById("passwordForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const passwordNuevo    = document.getElementById("passwordNuevo").value;
    const passwordConfirmar = document.getElementById("passwordConfirmar").value;

    if (passwordNuevo !== passwordConfirmar) {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Las contraseñas nuevas no coinciden"
        });
        return;
    }

    try {

        const response = await fetch(
            "http://inventario.local/backend/auth/change_password.php",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    password_actual: document.getElementById("passwordActual").value,
                    password_nuevo:  passwordNuevo
                })
            }
        );

        const resultado = await response.json();

        if (resultado.success) {

            bootstrap.Modal
                .getInstance(document.getElementById("passwordModal"))
                ?.hide();

            Swal.fire({
                icon: "success",
                title: "Contraseña actualizada",
                showConfirmButton: false,
                timer: 1500
            });

        } else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: resultado.message
            });
        }

    } catch (err) {
        console.error("Error al cambiar contraseña:", err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cambiar la contraseña."
        });
    }
});

/* ==========================
   LOGS
========================== */

async function cargarLogs() {

    try {

        const response = await fetch(
            "http://inventario.local/backend/api/logs.php",
            { credentials: "include" }
        );

        if (!response.ok) return;

        const logs = await response.json();

        const tbody = document.getElementById("logsBody");
        tbody.innerHTML = "";

        logs.forEach(log => {
            const fecha = new Date(log.created_at).toLocaleString('es-ES');
            const colorAccion = {
                'CREAR':    'text-success',
                'EDITAR':   'text-warning',
                'ELIMINAR': 'text-danger'
            }[log.accion] || '';

            tbody.innerHTML += `
                <tr>
                    <td>${esc(fecha)}</td>
                    <td>${esc(log.usuario_nombre)}</td>
                    <td class="${colorAccion} fw-bold">${esc(log.accion)}</td>
                    <td>${esc(log.detalle)}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error al cargar logs:", err);
    }
}

cargarLogs();

/* ==========================
   SCANNER
========================== */

let productoScaneado = null;
let scannerActivo = false;

function iniciarScanner() {

    if (scannerActivo) return;

    document.getElementById("scanner-resultado").classList.add("d-none");
    document.getElementById("scanner-no-encontrado").classList.add("d-none");

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.getElementById("interactive"),
            constraints: {
                facingMode: "environment"
            }
        },
        decoder: {
            readers: [
                "ean_reader",
                "ean_8_reader",
                "code_128_reader",
                "code_39_reader",
                "upc_reader"
            ]
        }
    }, (err) => {
        if (err) {
            console.error("Error al iniciar scanner:", err);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo acceder a la cámara."
            });
            return;
        }
        Quagga.start();
        scannerActivo = true;
    });

    Quagga.onDetected((result) => {
        const codigo = result.codeResult.code;
        detenerScanner();
        buscarProductoPorCodigo(codigo);
    });
}

function detenerScanner() {
    if (!scannerActivo) return;
    Quagga.stop();
    scannerActivo = false;
    document.getElementById("interactive").innerHTML = "";
}

function buscarProductoPorCodigo(codigo) {

    const producto = productosCache.find(p =>
        p.codigo_barras === codigo
    );

    if (!producto) {
        document.getElementById("scanner-no-encontrado").classList.remove("d-none");
        document.getElementById("scanner-resultado").classList.add("d-none");

        Swal.fire({
            icon: "warning",
            title: "Producto no encontrado",
            text: `Código: ${codigo}`
        });
        return;
    }

    productoScaneado = producto;
    mostrarResultadoScanner(producto);
}

function mostrarResultadoScanner(producto) {
    document.getElementById("scanner-resultado").classList.remove("d-none");
    document.getElementById("scanner-no-encontrado").classList.add("d-none");
    document.getElementById("scanner-producto-nombre").textContent = producto.nombre;
    document.getElementById("scanner-stock-actual").textContent = producto.stock;
    document.getElementById("scanner-stock-minimo").textContent = producto.stock_minimo;
}

async function ajustarStock(cantidad) {

    if (!productoScaneado) return;

    const nuevoStock = Number(productoScaneado.stock) + cantidad;

    if (nuevoStock < 0) {
        Swal.fire({ icon: "warning", title: "El stock no puede ser negativo" });
        return;
    }

    await actualizarStockProducto(productoScaneado, nuevoStock);
}

async function aplicarCantidad() {

    if (!productoScaneado) return;

    const cantidad = parseInt(document.getElementById("scanner-cantidad").value);

    if (isNaN(cantidad) || cantidad < 0) {
        Swal.fire({ icon: "warning", title: "Introduce una cantidad válida" });
        return;
    }

    await actualizarStockProducto(productoScaneado, cantidad);
    document.getElementById("scanner-cantidad").value = "";
}

async function actualizarStockProducto(producto, nuevoStock) {

    try {

        const response = await fetch(
            `${API_URL}?id=${producto.id}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    nombre:        producto.nombre,
                    descripcion:   producto.descripcion,
                    precio:        producto.precio,
                    stock:         nuevoStock,
                    stock_minimo:  producto.stock_minimo,
                    categoria:     producto.categoria
                })
            }
        );

        const resultado = await response.json();

        if (resultado.success) {
            productoScaneado.stock = nuevoStock;
            document.getElementById("scanner-stock-actual").textContent = nuevoStock;

            await cargarProductos();

            Swal.fire({
                icon: "success",
                title: "Stock actualizado",
                text: `${producto.nombre}: ${nuevoStock} unidades`,
                showConfirmButton: false,
                timer: 1500
            });
        }

    } catch (err) {
        console.error("Error al actualizar stock:", err);
        Swal.fire({ icon: "error", title: "Error al actualizar el stock" });
    }
}

async function cargarApiKeys() {

    try {

        const response = await fetch(
            "http://inventario.local/backend/api/apikeys.php",
            { credentials: "include" }
        );

        const keys = await response.json();
        const tbody = document.getElementById("apikeysBody");
        tbody.innerHTML = "";

        keys.forEach(k => {
            const badgePermisos = k.permisos === 'escritura'
                ? '<span class="badge bg-danger">Escritura</span>'
                : '<span class="badge bg-info">Lectura</span>';

            const badgeEstado = k.activa == 1
                ? '<span class="badge bg-success">Activa</span>'
                : '<span class="badge bg-secondary">Inactiva</span>';

            tbody.innerHTML += `
                <tr>
                    <td>${esc(k.nombre)}</td>
                    <td><code>${esc(k.api_key)}</code></td>
                    <td>${badgePermisos}</td>
                    <td>${badgeEstado}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error al cargar API keys:", err);
    }
}