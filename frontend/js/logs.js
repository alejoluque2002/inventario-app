// Logs

async function cargarLogs() {

    try {

        const response = await apiFetch(
            `${BASE_URL}/backend/api/logs.php`,
            {}
        );

        if (!response.ok) return;

        const logs = await response.json();

        const tbody = document.getElementById("logsBody");
        tbody.innerHTML = "";

        tbody.innerHTML = logs.map(log => {
            const fecha = new Date(log.created_at).toLocaleString('es-ES');
            const colorAccion = {
                'CREAR':    'text-success',
                'EDITAR':   'text-warning',
                'ELIMINAR': 'text-danger'
            }[log.accion] || '';

            return `
                <tr>
                    <td>${esc(fecha)}</td>
                    <td>${esc(log.usuario_nombre)}</td>
                    <td class="${colorAccion} fw-bold">${esc(log.accion)}</td>
                    <td>${esc(log.detalle)}</td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error("Error al cargar logs:", err);
    }
}

// Movimientos de stock

let movimientosCache = [];

function pintarMovimientos() {

    const texto = document.getElementById("buscadorMovimientos").value.toLowerCase();

    const lista = movimientosCache.filter(m =>
        texto === "" ||
        (m.producto_nombre || "").toLowerCase().includes(texto) ||
        (m.usuario_nombre || "").toLowerCase().includes(texto)
    );

    document.getElementById("contadorMovimientos").textContent =
        `Mostrando ${lista.length} de ${movimientosCache.length} movimientos`;

    const colorTipo = {
        alta:    'bg-primary',
        entrada: 'bg-success',
        salida:  'bg-warning text-dark',
        baja:    'bg-danger'
    };

    document.getElementById("movimientosBody").innerHTML = lista.map(m => {
        const fecha = new Date(m.created_at).toLocaleString('es-ES');
        const dif = Number(m.diferencia);
        const textoDif = (dif > 0 ? "+" : "") + dif;
        const colorDif = dif > 0 ? "text-success" : "text-danger";

        return `
            <tr>
                <td>${esc(fecha)}</td>
                <td>${esc(m.producto_nombre)}</td>
                <td>${esc(m.usuario_nombre)}</td>
                <td><span class="badge ${colorTipo[m.tipo] || 'bg-secondary'}">${esc(m.tipo)}</span></td>
                <td>${esc(m.origen)}</td>
                <td>${esc(m.stock_anterior)}</td>
                <td>${esc(m.stock_nuevo)}</td>
                <td class="${colorDif} fw-bold">${esc(textoDif)}</td>
            </tr>
        `;
    }).join("");
}

async function cargarMovimientos() {

    try {

        const response = await apiFetch(`${BASE_URL}/backend/api/movimientos.php`);

        if (!response.ok) return;

        movimientosCache = await response.json();

        pintarMovimientos();

    } catch (err) {
        console.error("Error al cargar movimientos:", err);
    }
}

document.getElementById("buscadorMovimientos").addEventListener("input", pintarMovimientos);

