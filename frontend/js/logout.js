const logoutBtn =
    document.getElementById("logoutBtn");

logoutBtn.addEventListener(
    "click",
    async () => {

        await fetch(
            "http://inventario.local/backend/auth/logout.php",
            {
                credentials: "include"
            }
        );

        window.location.href =
            "login.html";
    }
);