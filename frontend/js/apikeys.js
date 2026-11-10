async function cargarApiKeys() {
    try {
        const response = await apiFetch(`${BASE_URL}/backend/api/apikeys.php`, {});
        const keys = await response.json();
        const tbody = document.getElementById("apikeysBody");

        tbody.innerHTML = keys.map(k => {
            const activa = k.activa == 1;
            const badgePermisos = k.permisos === 'escritura'
                ? '<span class="badge bg-danger">Escritura</span>'
                : '<span class="badge bg-info">Lectura</span>';
            const badgeEstado = activa
                ? '<span class="badge bg-success">Activa</span>'
                : '<span class="badge bg-secondary">Inactiva</span>';

            return `
                <tr>
                    <td>${esc(k.nombre)}</td>
                    <td><code>${esc(k.key_prefix)}…</code></td>
                    <td>${badgePermisos}</td>
                    <td>${badgeEstado}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-warning"
                                onclick="cambiarEstadoApiKey(${Number(k.id)}, ${activa ? 'false' : 'true'})">
                            ${activa ? 'Revocar' : 'Reactivar'}
                        </button>
                        <button class="btn btn-sm btn-outline-danger"
                                onclick="eliminarApiKey(${Number(k.id)})">
                            Eliminar
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    } catch (err) {
        console.error("Error al cargar API keys:", err);
    }
}

function abrirModalApiKey() {
    document.getElementById("apikeyForm").reset();
    new bootstrap.Modal(document.getElementById("apikeyModal")).show();
}

document.getElementById("apikeyForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const datos = {
        nombre: document.getElementById("apikeyNombre").value.trim(),
        permisos: document.getElementById("apikeyPermisos").value
    };

    try {
        const response = await apiFetch(`${BASE_URL}/backend/api/apikeys.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        const resultado = await leerRespuesta(response);

        bootstrap.Modal.getInstance(document.getElementById("apikeyModal")).hide();
        await cargarApiKeys();

        await Swal.fire({
            icon: "success",
            title: "API key creada",
            html: `
                <p>Cópiala ahora: <b>no se volverá a mostrar</b>.</p>
                <code id="claveNueva" style="word-break:break-all;user-select:all">${esc(resultado.api_key)}</code>
            `,
            confirmButtonText: "Ya la he copiado",
            showDenyButton: true,
            denyButtonText: "Copiar",
            preDeny: () => {
                navigator.clipboard.writeText(resultado.api_key);
                Swal.showValidationMessage("Copiada al portapapeles");
                return false;
            }
        });
    } catch (err) {
        Swal.fire("Error", err.mensajeServidor || "No se pudo crear la API key", "error");
    }
});

async function cambiarEstadoApiKey(id, activa) {
    try {
        const response = await apiFetch(`${BASE_URL}/backend/api/apikeys.php?id=${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ activa })
        });
        await leerRespuesta(response);
        cargarApiKeys();
    } catch (err) {
        Swal.fire("Error", err.mensajeServidor || "No se pudo cambiar el estado", "error");
    }
}

async function eliminarApiKey(id) {
    const confirmacion = await Swal.fire({
        icon: "warning",
        title: "¿Eliminar esta API key?",
        text: "Las aplicaciones que la usen dejarán de funcionar. No se puede deshacer.",
        showCancelButton: true,
        confirmButtonText: "Eliminar",
        cancelButtonText: "Cancelar"
    });
    if (!confirmacion.isConfirmed) return;

    try {
        const response = await apiFetch(`${BASE_URL}/backend/api/apikeys.php?id=${id}`, {
            method: "DELETE"
        });
        await leerRespuesta(response);
        cargarApiKeys();
    } catch (err) {
        Swal.fire("Error", err.mensajeServidor || "No se pudo eliminar", "error");
    }
}
