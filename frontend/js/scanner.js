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

