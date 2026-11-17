function fechaCorta(texto) {
    if (!texto) return null;
    // Las fechas llegan como "2026-11-30" o "2026-11-17 11:30:00"
    const fecha = new Date(texto.replace(' ', 'T'));
    return isNaN(fecha) ? null : fecha;
}

async function cargarApiKeys() {
    try {
        const response = await apiFetch(`${BASE_URL}/backend/api/apikeys.php`, {});
        const keys = await response.json();

        if (!response.ok || !Array.isArray(keys)) return;

        const tbody = document.getElementById("apikeysBody");

        tbody.innerHTML = keys.map(k => {
            const activa = k.activa == 1;
            const caducada = k.caducada == 1;

            const badgePermisos = {
                lectura:   '<span class="badge bg-info">Lectura</span>',
                escritura: '<span class="badge bg-warning text-dark">Escritura</span>',
                completo:  '<span class="badge bg-danger">Completo</span>'
            }[k.permisos] || esc(k.permisos);

            let badgeEstado;
            if (caducada) {
                badgeEstado = '<span class="badge bg-dark">Caducada</span>';
            } else if (activa) {
                badgeEstado = '<span class="badge bg-success">Activa</span>';
            } else {
                badgeEstado = '<span class="badge bg-secondary">Inactiva</span>';
            }

            const caduca = fechaCorta(k.expires_at);
            const ultimoUso = fechaCorta(k.last_used_at);

            return `
                <tr>
                    <td>${esc(k.nombre)}</td>
                    <td><code>${esc(k.key_prefix)}…</code></td>
                    <td>${badgePermisos}</td>
                    <td>${caduca ? esc(caduca.toLocaleDateString('es-ES')) : '<span class="text-muted">Sin caducidad</span>'}</td>
                    <td>${ultimoUso ? esc(ultimoUso.toLocaleString('es-ES')) : '<span class="text-muted">Nunca</span>'}</td>
                    <td>${esc(k.limite_minuto)}/min</td>
                    <td>${badgeEstado}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-warning"
                                data-accion="cambiarEstadoApiKey" data-id="${Number(k.id)}" data-activa="${activa ? 'false' : 'true'}">
                            ${activa ? 'Revocar' : 'Reactivar'}
                        </button>
                        <button class="btn btn-sm btn-outline-danger"
                                data-accion="eliminarApiKey" data-id="${Number(k.id)}">
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
    // La caducidad no puede ser anterior a hoy (formato AAAA-MM-DD, hora local)
    document.getElementById("apikeyExpira").min = new Date().toLocaleDateString("sv-SE");
    new bootstrap.Modal(document.getElementById("apikeyModal")).show();
}

document.getElementById("apikeyForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const datos = {
        nombre: document.getElementById("apikeyNombre").value.trim(),
        permisos: document.getElementById("apikeyPermisos").value,
        limite_minuto: Number(document.getElementById("apikeyLimite").value)
    };

    const expira = document.getElementById("apikeyExpira").value;
    if (expira) datos.expira = expira;

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
                <code style="word-break:break-all;user-select:all">${esc(resultado.api_key)}</code>
                <div class="mt-3">
                    <button type="button" id="copiarApiKey" class="btn btn-outline-secondary btn-sm">Copiar</button>
                </div>
            `,
            confirmButtonText: "Ya la he copiado",
            didOpen: (popup) => {
                popup.querySelector("#copiarApiKey").addEventListener("click", async (ev) => {
                    try {
                        await navigator.clipboard.writeText(resultado.api_key);
                        ev.target.textContent = "Copiada";
                    } catch (err) {
                        ev.target.textContent = "Selecciónala y copia con Ctrl+C";
                    }
                });
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