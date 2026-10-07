const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", async () => {

    try {
        await apiFetch(`${BASE_URL}/backend/auth/logout.php`, { method: "POST" });
    } catch (err) {
        console.error("Error al cerrar sesión:", err);
    }

    window.location.href = "login.html";
});
