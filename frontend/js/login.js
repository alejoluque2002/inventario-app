const formulario = document.getElementById("loginForm");
const botonLogin = formulario.querySelector("button[type='submit']");

formulario.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    botonLogin.disabled = true;

    try {

        const response = await apiFetch(`${BASE_URL}/backend/auth/login.php`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const resultado = await response.json();

        if (resultado.success) {
            window.location.replace(`${BASE_URL}/frontend/index.html`);
            return;
        }

        // Muestra el motivo real (credenciales incorrectas, demasiados intentos...)
        alert(resultado.message || "Credenciales incorrectas");

    } catch (err) {
        console.error("Error al iniciar sesión:", err);
        alert("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    }

    botonLogin.disabled = false;
});
