let rolUsuario = 'empleado';

async function verificarSesion() {

    try {

        const response = await fetch(
            "http://inventario.local/backend/auth/check_auth.php",
            { credentials: "include" }
        );

        if (!response.ok) {
            window.location.href = "login.html";
            return;
        }

        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = "login.html";
            return;
        }

        document.getElementById("usuarioNombre").textContent =
            `Hola, ${data.usuario.nombre}`;

        rolUsuario = data.usuario.rol;
        aplicarPermisos();

    } catch (err) {
        console.error("Error al verificar sesión:", err);
        window.location.href = "login.html";
    }
}

verificarSesion();