// Usuarios

let usuariosCache = [];

async function cargarUsuarios() {

    try {

        const response = await apiFetch(
            `${BASE_URL}/backend/api/usuarios.php`,
            {}
        );

        const usuarios = await response.json();

        if (!response.ok || !Array.isArray(usuarios)) return;

        usuariosCache = usuarios;

        document.getElementById("usuariosBody").innerHTML = usuarios.map(u => {
            const badgeRol = u.rol === 'admin'
                ? '<span class="badge bg-primary">Admin</span>'
                : '<span class="badge bg-secondary">Empleado</span>';

            return `
                <tr>
                    <td>${esc(u.nombre)}</td>
                    <td>${esc(u.email)}</td>
                    <td>${badgeRol}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary"
                                data-accion="editarUsuario" data-id="${Number(u.id)}">
                            Editar
                        </button>
                        <button class="btn btn-sm btn-outline-warning"
                                data-accion="restablecerPassword" data-id="${Number(u.id)}">
                            Restablecer contraseña
                        </button>
                    </td>
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


// Editar usuario

function editarUsuario(id) {

    const u = usuariosCache.find(x => Number(x.id) === id);
    if (!u) return;

    document.getElementById("editarUsuarioId").value = u.id;
    document.getElementById("editarNombre").value = u.nombre;
    document.getElementById("editarEmail").value = u.email;
    document.getElementById("editarRol").value = u.rol;

    new bootstrap.Modal(document.getElementById("usuarioEditarModal")).show();
}

document.getElementById("usuarioEditarForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const id = Number(document.getElementById("editarUsuarioId").value);

    const datos = {
        nombre: document.getElementById("editarNombre").value.trim(),
        email: document.getElementById("editarEmail").value.trim(),
        rol: document.getElementById("editarRol").value
    };

    try {

        const response = await apiFetch(
            `${BASE_URL}/backend/api/usuarios.php?id=${id}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            }
        );

        await leerRespuesta(response);

        bootstrap.Modal
            .getInstance(document.getElementById("usuarioEditarModal"))
            ?.hide();

        cargarUsuarios();

        Swal.fire({
            icon: "success",
            title: "Usuario actualizado",
            showConfirmButton: false,
            timer: 1500
        });

    } catch (err) {
        console.error("Error al editar usuario:", err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: err.mensajeServidor || "No se pudo actualizar el usuario."
        });
    }
});

// Restablecer contraseña: el servidor genera una temporal que se muestra una sola vez

async function restablecerPassword(id) {

    const u = usuariosCache.find(x => Number(x.id) === id);
    if (!u) return;

    const confirmacion = await Swal.fire({
        icon: "warning",
        title: "¿Restablecer contraseña?",
        text: `Se generará una contraseña temporal para ${u.nombre}. La actual dejará de funcionar.`,
        showCancelButton: true,
        confirmButtonText: "Sí, restablecer",
        cancelButtonText: "Cancelar"
    });

    if (!confirmacion.isConfirmed) return;

    try {

        const response = await apiFetch(
            `${BASE_URL}/backend/api/usuarios.php?id=${id}&accion=restablecer_password`,
            { method: "POST" }
        );

        const resultado = await leerRespuesta(response);

        await Swal.fire({
            icon: "success",
            title: "Contraseña restablecida",
            html: `
                <p>Entrégasela a <b>${esc(u.nombre)}</b>. <b>No se volverá a mostrar.</b></p>
                <code style="font-size:1.2rem;user-select:all">${esc(resultado.password_temporal)}</code>
                <div class="mt-3">
                    <button type="button" id="copiarPassTemporal" class="btn btn-outline-secondary btn-sm">Copiar</button>
                </div>
            `,
            confirmButtonText: "Ya la he copiado",
            didOpen: (popup) => {
                popup.querySelector("#copiarPassTemporal").addEventListener("click", async (ev) => {
                    try {
                        await navigator.clipboard.writeText(resultado.password_temporal);
                        ev.target.textContent = "Copiada";
                    } catch (err) {
                        ev.target.textContent = "Selecciónala y copia con Ctrl+C";
                    }
                });
            }
        });

    } catch (err) {
        console.error("Error al restablecer contraseña:", err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: err.mensajeServidor || "No se pudo restablecer la contraseña."
        });
    }
}