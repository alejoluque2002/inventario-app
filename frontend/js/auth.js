let rolUsuario = 'empleado';

function volverAlLogin(motivo) {
    console.warn("Volviendo al login. Motivo:", motivo);
    window.location.href = "login.html";
}

async function verificarSesion() {

    let response;
    let data;

    try {
        response = await apiFetch(`${BASE_URL}/backend/auth/check_auth.php`);
        console.log("check_auth status:", response.status);
        data = await response.json();
    } catch (err) {
        console.error("Error al verificar sesión:", err);
        volverAlLogin("fallo de red o respuesta no válida");
        return;
    }

    if (!response.ok || !data.authenticated) {
        volverAlLogin("sesión no válida (HTTP " + response.status + ")");
        return;
    }

    document.getElementById("usuarioNombre").textContent =
        `Hola, ${data.usuario.nombre}`;

    rolUsuario = data.usuario.rol;

    try {
        aplicarPermisos();
    } catch (err) {
        console.error("Error al aplicar permisos:", err);
    }
}

// Esperar a que todos los scripts (app.js y las librerías) estén cargados
window.addEventListener("load", verificarSesion);