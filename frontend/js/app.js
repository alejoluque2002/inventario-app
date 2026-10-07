const API_URL = `${BASE_URL}/backend/api/productos.php`;

let productoEditando = null;
let productosCache = [];
let campoOrden = null;
let ordenAscendente = true;
let grafica = null;
let graficaValor = null;
let paginaActual = 1;
let productosPorPagina = 10;
let textoBusqueda = "";
let categoriaActiva = "todas";

// Navegación

const titulos = {
    dashboard:  'Dashboard',
    productos:  'Productos',
    scanner:    'Scanner',
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
        if (n.dataset.seccion === nombre) {
            n.classList.add('active');
        }
    });

    // La cámara no debe seguir encendida al salir de la sección
    if (nombre !== 'scanner') detenerScanner();

    if (nombre === 'actividad') cargarLogs();
    if (nombre === 'usuarios') cargarUsuarios();
    if (nombre === 'apikeys') cargarApiKeys();
}

// Gráfica

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
            responsive: true
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

// Utilidades

function esc(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
}

// Tabla

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
    if (paginaActual > totalPaginas) paginaActual = Math.max(1, totalPaginas);
    const inicio = (paginaActual - 1) * productosPorPagina;
    const fin = inicio + productosPorPagina;
    const productosPagina = productos.slice(inicio, fin);

    tbody.innerHTML = productosPagina.map(producto => `
            <tr>
                <td>${esc(producto.id)}</td>
                <td>${esc(producto.nombre)}</td>
                <td>${esc(producto.precio)}</td>
                <td>${badgeStock(producto.stock, producto.stock_minimo)}</td>
                <td>${esc(producto.categoria)}</td>
                <td class="admin-only">
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
        `).join("");

    renderPaginacion(productos, totalPaginas);
    aplicarPermisos();
}

// Vista: combina búsqueda, categoría y orden sobre la caché de productos
function aplicarVista() {

    const texto = textoBusqueda.toLowerCase();

    const lista = productosCache.filter(p =>
        (categoriaActiva === "todas" || p.categoria === categoriaActiva) &&
        (
            texto === "" ||
            (p.nombre || "").toLowerCase().includes(texto) ||
            (p.categoria || "").toLowerCase().includes(texto) ||
            (p.descripcion || "").toLowerCase().includes(texto)
        )
    );

    if (campoOrden) {
        lista.sort((a, b) => {
            const numerico = campoOrden === "precio" || campoOrden === "stock";

            const comparacion = numerico
                ? Number(a[campoOrden]) - Number(b[campoOrden])
                : String(a[campoOrden] ?? "").localeCompare(
                    String(b[campoOrden] ?? ""), "es", { sensitivity: "base" }
                );

            return ordenAscendente ? comparacion : -comparacion;
        });
    }

    mostrarProductos(lista);
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

// Productos

// Lee la respuesta JSON y lanza un error (con el mensaje del servidor) si falla
async function leerRespuesta(response) {

    const resultado = await response.json().catch(() => ({}));

    if (!response.ok || resultado.success === false) {
        const error = new Error("Error " + response.status);
        error.mensajeServidor = resultado.message;
        throw error;
    }

    return resultado;
}

async function cargarProductos() {

    try {

        const response = await apiFetch(API_URL);

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

        generarBotonesCategorias(productos);
        aplicarVista();
        actualizarGrafica(productos);

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

// Crear / Actualizar

const formulario = document.getElementById("productoForm");

formulario.addEventListener("submit", async (e) => {

    e.preventDefault();

    const producto = {
        nombre: document.getElementById("nombre").value,
        descripcion: document.getElementById("descripcion").value,
        precio: parseFloat(document.getElementById("precio").value),
        stock: parseInt(document.getElementById("stock").value),
        stock_minimo: parseInt(document.getElementById("stockMinimo").value),
        codigo_barras: document.getElementById("codigoBarras").value || null,
        categoria: document.getElementById("categoria").value
    };

    const metodo = productoEditando ? "PUT" : "POST";

    try {

        const response = await apiFetch(
            productoEditando ? `${API_URL}?id=${productoEditando}` : API_URL,
            {
                method: metodo,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(producto)
            }
        );

        const resultado = await leerRespuesta(response);

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
            text: err.mensajeServidor || "No se pudo guardar el producto. Inténtalo de nuevo."
        });
    }
});

// Eliminar

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

        const response = await apiFetch(`${API_URL}?id=${id}`, {
            method: "DELETE"
        });

        const resultado = await leerRespuesta(response);

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
            text: err.mensajeServidor || "No se pudo eliminar el producto. Inténtalo de nuevo."
        });
    }
}

// Editar

function editarProducto(id) {

    const producto = productosCache.find(p => p.id == id);
    if (!producto) return;

    document.getElementById("modalTitulo").textContent = "Editar producto";
    document.getElementById("nombre").value = producto.nombre;
    document.getElementById("descripcion").value = producto.descripcion;
    document.getElementById("precio").value = producto.precio;
    document.getElementById("stock").value = producto.stock;
    document.getElementById("stockMinimo").value = producto.stock_minimo;
    document.getElementById("categoria").value = producto.categoria;
    document.getElementById("codigoBarras").value = producto.codigo_barras || "";

    productoEditando = id;

    document.querySelector("#productoForm button").textContent = "Actualizar";

    new bootstrap.Modal(document.getElementById("productoModal")).show();
}

// Buscador

const buscador = document.getElementById("buscador");

buscador.addEventListener("input", () => {

    textoBusqueda = buscador.value;
    paginaActual = 1;
    aplicarVista();
});

// Ordenar

function ordenarPor(campo) {

    if (campoOrden === campo) {
        ordenAscendente = !ordenAscendente;
    } else {
        campoOrden = campo;
        ordenAscendente = true;
    }

    paginaActual = 1;
    aplicarVista();
}

// Exportar

document.getElementById("btnExcel").addEventListener("click", exportarExcel);
document.getElementById("btnPDF").addEventListener("click", exportarPDF);

function exportarExcel() {

    const datos = productosCache.map(p => ({
        ID: p.id,
        Nombre: p.nombre,
        Descripcion: p.descripcion,
        Precio: p.precio,
        Stock: p.stock,
        Stock_minimo: p.stock_minimo,
        Codigo_barras: p.codigo_barras || "",
        Categoria: p.categoria
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

// Nuevo producto

function nuevoProducto() {

    productoEditando = null;
    formulario.reset();

    document.getElementById("modalTitulo").textContent = "Nuevo producto";
    document.querySelector("#productoForm button").textContent = "Guardar";

    new bootstrap.Modal(document.getElementById("productoModal")).show();
}

// Tema

const themeBtn = document.getElementById("themeBtn");
const themeBtnIcon = document.getElementById("themeBtnIcon");
const temaGuardado = localStorage.getItem("tema");

if (temaGuardado === "dark") {
    document.body.classList.add("dark-mode");
    themeBtnIcon.className = "ti ti-sun";
}

themeBtn.addEventListener("click", () => {

    document.body.classList.toggle("dark-mode");

    const oscuro = document.body.classList.contains("dark-mode");

    localStorage.setItem("tema", oscuro ? "dark" : "light");
    themeBtnIcon.className = oscuro ? "ti ti-sun" : "ti ti-moon";
});

// Filtros por categoría

function marcarBotonCategoria(btn) {

    document.querySelectorAll("#filtrosCategorias .btn").forEach(b => {
        b.classList.remove("btn-primary", "btn-secondary", "activo");
        b.classList.add("btn-outline-secondary");
    });

    btn.classList.remove("btn-outline-secondary");
    btn.classList.add("btn-secondary", "activo");
}

function generarBotonesCategorias(productos) {

    const categorias = [...new Set(productos.map(p => p.categoria))];
    const contenedor = document.getElementById("filtrosCategorias");

    contenedor.querySelectorAll(".btn-categoria").forEach(b => b.remove());

    categorias.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-outline-secondary me-1 btn-categoria";
        btn.textContent = cat;
        btn.onclick = function() { filtrarCategoria(cat, this); };
        contenedor.appendChild(btn);
    });

    // Mantener la categoría seleccionada tras recargar (o volver a "Todas" si ya no existe)
    if (categoriaActiva !== "todas") {
        const btnActivo = [...contenedor.querySelectorAll(".btn-categoria")]
            .find(b => b.textContent === categoriaActiva);

        if (btnActivo) {
            marcarBotonCategoria(btnActivo);
        } else {
            categoriaActiva = "todas";
            marcarBotonCategoria(contenedor.querySelector(".btn:not(.btn-categoria)"));
        }
    }
}

function filtrarCategoria(categoria, btn) {

    marcarBotonCategoria(btn);

    categoriaActiva = categoria;
    paginaActual = 1;
    aplicarVista();
}

function aplicarPermisos() {
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = rolUsuario === 'empleado' ? 'none' : '';
    });
}

// Usuarios

async function cargarUsuarios() {

    try {

        const response = await apiFetch(
            `${BASE_URL}/backend/api/usuarios.php`,
            {}
        );

        const usuarios = await response.json();
        const tbody = document.getElementById("usuariosBody");
        tbody.innerHTML = "";

        tbody.innerHTML = usuarios.map(u => {
            const badgeRol = u.rol === 'admin'
                ? '<span class="badge bg-primary">Admin</span>'
                : '<span class="badge bg-secondary">Empleado</span>';

            return `
                <tr>
                    <td>${esc(u.nombre)}</td>
                    <td>${esc(u.email)}</td>
                    <td>${badgeRol}</td>
                </tr>
            `;
        }).join("");

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
        nombre: document.getElementById("nuevoNombre").value,
        email: document.getElementById("nuevoEmail").value,
        password: document.getElementById("nuevoPassword").value,
        rol: document.getElementById("nuevoRol").value
    };

    try {

        const response = await apiFetch(
            `${BASE_URL}/backend/auth/register.php`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

// Cambio de contraseña

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

        const response = await apiFetch(
            `${BASE_URL}/backend/auth/change_password.php`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

// Logs

async function cargarLogs() {

    try {

        const response = await apiFetch(
            `${BASE_URL}/backend/api/logs.php`,
            {}
        );

        if (!response.ok) return;

        const logs = await response.json();

        const tbody = document.getElementById("logsBody");
        tbody.innerHTML = "";

        tbody.innerHTML = logs.map(log => {
            const fecha = new Date(log.created_at).toLocaleString('es-ES');
            const colorAccion = {
                'CREAR':    'text-success',
                'EDITAR':   'text-warning',
                'ELIMINAR': 'text-danger'
            }[log.accion] || '';

            return `
                <tr>
                    <td>${esc(fecha)}</td>
                    <td>${esc(log.usuario_nombre)}</td>
                    <td class="${colorAccion} fw-bold">${esc(log.accion)}</td>
                    <td>${esc(log.detalle)}</td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Error al cargar logs:", err);
    }
}

// Scanner

let productoScaneado = null;
let scannerActivo = false;

function iniciarScanner() {

    if (scannerActivo) return;

    document.getElementById("scanner-resultado").classList.add("d-none");
    document.getElementById("scanner-no-encontrado").classList.add("d-none");

    // Evitar acumular manejadores si se activa la cámara varias veces
    if (typeof Quagga.offDetected === "function") Quagga.offDetected(onCodigoDetectado);
    Quagga.onDetected(onCodigoDetectado);

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
}

function onCodigoDetectado(result) {
    const codigo = result.codeResult.code;
    detenerScanner();
    buscarProductoPorCodigo(codigo);
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

    if (Number(productoScaneado.stock) + cantidad < 0) {
        Swal.fire({ icon: "warning", title: "El stock no puede ser negativo" });
        return;
    }

    await actualizarStockProducto(productoScaneado, { delta: cantidad });
}

async function aplicarCantidad() {

    if (!productoScaneado) return;

    const cantidad = parseInt(document.getElementById("scanner-cantidad").value);

    if (isNaN(cantidad) || cantidad < 0) {
        Swal.fire({ icon: "warning", title: "Introduce una cantidad válida" });
        return;
    }

    await actualizarStockProducto(productoScaneado, { stock: cantidad });
    document.getElementById("scanner-cantidad").value = "";
}

// Solo se envía el cambio de stock (delta o valor exacto): el resto del producto
// (incluido el código de barras) no se toca. El servidor devuelve el stock final.
async function actualizarStockProducto(producto, cambio) {

    try {

        const response = await apiFetch(
            `${API_URL}?id=${producto.id}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cambio)
            }
        );

        const resultado = await leerRespuesta(response);

        if (resultado.success) {
            productoScaneado.stock = resultado.stock;
            document.getElementById("scanner-stock-actual").textContent = resultado.stock;

            await cargarProductos();

            Swal.fire({
                icon: "success",
                title: "Stock actualizado",
                text: `${producto.nombre}: ${resultado.stock} unidades`,
                showConfirmButton: false,
                timer: 1500
            });
        }

    } catch (err) {
        console.error("Error al actualizar stock:", err);
        Swal.fire({
            icon: "error",
            title: "Error al actualizar el stock",
            text: err.mensajeServidor || ""
        });
    }
}

async function cargarApiKeys() {

    try {

        const response = await apiFetch(
            `${BASE_URL}/backend/api/apikeys.php`,
            {}
        );

        const keys = await response.json();
        const tbody = document.getElementById("apikeysBody");
        tbody.innerHTML = "";

        tbody.innerHTML = keys.map(k => {
            const badgePermisos = k.permisos === 'escritura'
                ? '<span class="badge bg-danger">Escritura</span>'
                : '<span class="badge bg-info">Lectura</span>';

            const badgeEstado = k.activa == 1
                ? '<span class="badge bg-success">Activa</span>'
                : '<span class="badge bg-secondary">Inactiva</span>';

            return `
                <tr>
                    <td>${esc(k.nombre)}</td>
                    <td><code>${esc(k.api_key)}</code></td>
                    <td>${badgePermisos}</td>
                    <td>${badgeEstado}</td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Error al cargar API keys:", err);
    }
}