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

function aplicarPermisos() {
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = rolUsuario === 'empleado' ? 'none' : '';
    });
}

