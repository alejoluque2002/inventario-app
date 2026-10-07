// Configuración compartida del frontend (se carga antes que el resto de scripts)

const BASE_URL = "http://inventario.local";

/**
 * fetch con las opciones comunes de la app:
 *  - envía la cookie de sesión
 *  - añade X-Requested-With, que el backend exige en las peticiones que
 *    modifican datos (defensa CSRF)
 */
function apiFetch(url, options = {}) {

    const headers = Object.assign(
        { "X-Requested-With": "XMLHttpRequest" },
        options.headers || {}
    );

    return fetch(url, Object.assign({}, options, {
        headers,
        credentials: "include"
    }));
}
