// Navegación

const titulos = {
    dashboard:  'Dashboard',
    productos:  'Productos',
    scanner:    'Scanner',
    usuarios:   'Usuarios',
    actividad:  'Registro de actividad',
    movimientos: 'Movimientos de stock',
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
    if (nombre === 'movimientos') cargarMovimientos();
    if (nombre === 'usuarios') cargarUsuarios();
    if (nombre === 'apikeys') cargarApiKeys();
}

// Utilidades

function esc(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
}

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
// Tema (el valor inicial lo aplica tema.js antes de pintar la página)

const themeBtn = document.getElementById("themeBtn");
const themeBtnIcon = document.getElementById("themeBtnIcon");

function temaOscuro() {
    return document.documentElement.getAttribute("data-bs-theme") === "dark";
}

function pintarBotonTema() {
    const oscuro = temaOscuro();
    themeBtnIcon.className = oscuro ? "ti ti-sun" : "ti ti-moon";
    themeBtn.setAttribute("aria-label", oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
}

// Lee un token de color del CSS (por ejemplo "--text")
function colorCss(nombre) {
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

pintarBotonTema();

themeBtn.addEventListener("click", () => {

    const nuevo = temaOscuro() ? "light" : "dark";

    document.documentElement.setAttribute("data-bs-theme", nuevo);

    try {
        localStorage.setItem("tema", nuevo);
    } catch (e) { /* sin almacenamiento: el tema solo dura esta sesión */ }

    pintarBotonTema();

    // Las gráficas usan los colores del tema: se vuelven a dibujar
    if (typeof productosCache !== "undefined" && productosCache.length) {
        actualizarGrafica(productosCache);
    }
});

function aplicarPermisos() {
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = rolUsuario === 'empleado' ? 'none' : '';
    });
}


// Formato de importes: 8.921,35 € (punto en los miles, coma en los decimales)
const formatoEuro = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    useGrouping: "always"   // sin esto, el español no agrupa los miles de 4 cifras (1000,00)
});

function euros(valor) {
    return formatoEuro.format(Number(valor) || 0);
}