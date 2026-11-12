// Manejo centralizado de clics: sustituye a los onclick en línea del HTML
// (necesario para poder activar una Content-Security-Policy estricta).

document.addEventListener("click", (e) => {

    const el = e.target.closest("[data-accion]");
    if (!el) return;

    const arg = el.dataset.arg;
    const id = Number(el.dataset.id);

    switch (el.dataset.accion) {
        case "seccion":             mostrarSeccion(el.dataset.seccion); break;
        case "abrirModalPassword":  abrirModalPassword(); break;
        case "filtrarTodas":        filtrarCategoria("todas", el); break;
        case "nuevoProducto":       nuevoProducto(); break;
        case "ordenarPor":          ordenarPor(arg); break;
        case "editarProducto":      editarProducto(id); break;
        case "eliminarProducto":    eliminarProducto(id); break;
        case "iniciarScanner":      iniciarScanner(); break;
        case "detenerScanner":      detenerScanner(); break;
        case "ajustarStock":        ajustarStock(Number(arg)); break;
        case "aplicarCantidad":     aplicarCantidad(); break;
        case "abrirModalUsuario":   abrirModalUsuario(); break;
        case "abrirModalApiKey":    abrirModalApiKey(); break;
        case "cambiarEstadoApiKey": cambiarEstadoApiKey(id, el.dataset.activa === "true"); break;
        case "eliminarApiKey":      eliminarApiKey(id); break;
    }
});