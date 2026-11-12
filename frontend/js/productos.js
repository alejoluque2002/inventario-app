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
                        label: (item) => ` ${item.label}: ${euros(item.raw)}`
                    }
                }
            }
        }
    });
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
                <td>${esc(euros(producto.precio))}</td>
                <td>${badgeStock(producto.stock, producto.stock_minimo)}</td>
                <td>${esc(producto.categoria)}</td>
                <td class="admin-only">
                    <button
                        class="btn btn-warning btn-sm me-2"
                        data-accion="editarProducto" data-id="${Number(producto.id)}">
                        Editar
                    </button>
                    <button
                        class="btn btn-danger btn-sm"
                        data-accion="eliminarProducto" data-id="${Number(producto.id)}">
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
            euros(valorInventario);

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
            `${producto.id} | ${producto.nombre} | ${producto.categoria} | Stock: ${producto.stock} | ${euros(producto.precio)}`,
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

