// Aplica el tema guardado antes de pintar la página (evita el parpadeo).
// Por defecto se usa el tema oscuro.
(function () {
    var tema = "dark";
    try {
        tema = localStorage.getItem("tema") === "light" ? "light" : "dark";
    } catch (e) { /* sin almacenamiento: tema por defecto */ }
    document.documentElement.setAttribute("data-bs-theme", tema);
})();
