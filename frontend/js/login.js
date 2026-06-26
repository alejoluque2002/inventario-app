const formulario =
    document.getElementById("loginForm");

formulario.addEventListener(
    "submit",
    async (e) => {

        e.preventDefault();

        const email =
            document.getElementById("email").value;

        const password =
            document.getElementById("password").value;

        const response =
            await fetch(
                "http://inventario.local/backend/auth/login.php",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

        const resultado =
            await response.json();

        if (resultado.success) {

            window.location.replace("http://inventario.local/frontend/index.html");

        } else {

            alert(
                "Credenciales incorrectas"
            );
        }
    }
);