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

