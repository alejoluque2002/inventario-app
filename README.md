# Gestor de Inventario

Aplicación web de gestión de inventario desarrollada con PHP, MySQL y JavaScript vanilla. Proyecto de portfolio desarrollado tras finalizar el Grado Superior de Desarrollo de Aplicaciones Web (DAW).

---

## Características

- Autenticación con sesiones PHP (login / logout)
- Roles de usuario — Admin y Empleado con permisos diferenciados en frontend y backend
- CRUD completo de productos con stock mínimo configurable por producto
- Alertas automáticas por email cuando el stock baja del mínimo (PHPMailer + Gmail SMTP)
- Dashboard con métricas en tiempo real (total productos, stock total, valor de inventario, productos sin stock)
- Indicadores visuales de stock (Agotado / Stock bajo / Disponible) basados en el stock mínimo de cada producto
- Gráficas de productos y valor por categoría (Chart.js)
- Buscador en tiempo real
- Filtros por categoría dinámicos
- Ordenación por columnas
- Paginación
- Lector de código de barras integrado con ajuste de stock (QuaggaJS — requiere HTTPS)
- API REST pública con autenticación por API key (permisos de lectura y escritura)
- Gestión de API keys desde la aplicación
- Registro de actividad — logs de creación, edición y eliminación con usuario y fecha
- Registro de nuevos usuarios desde la aplicación (solo administrador)
- Cambio de contraseña
- Exportación a Excel y PDF
- Modo oscuro
- Diseño responsive con sidebar lateral

---

## Tecnologías

**Frontend**
- HTML5, CSS3, JavaScript ES6+
- Bootstrap 5.3
- Chart.js
- SweetAlert2
- QuaggaJS

**Backend**
- PHP 8
- PDO
- Sesiones PHP
- PHPMailer

**Base de datos**
- MySQL / MariaDB

---

## Requisitos

- XAMPP con Apache y MySQL
- PHP 8 o superior

---

## Instalación

**1. Clonar el repositorio**

```bash
git clone https://github.com/alejoluque2002/inventario-app.git
```

**2. Mover a htdocs**

Copia la carpeta `inventario-app` dentro de `C:\xampp\htdocs\`.

**3. Crear la base de datos**

Abre phpMyAdmin, crea una base de datos llamada `inventario_db` y ejecuta el script incluido:

```
database/schema.sql
```

**4. Configurar el email**

Crea el archivo `backend/config/mail.php` con tus credenciales de Gmail:

```php
<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../libs/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/../libs/PHPMailer/src/SMTP.php';
require_once __DIR__ . '/../libs/PHPMailer/src/Exception.php';

function enviarEmail($destinatario, $asunto, $cuerpo)
{
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'TU_EMAIL@gmail.com';
        $mail->Password   = 'TU_APP_PASSWORD';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom('TU_EMAIL@gmail.com', 'Gestor de Inventario');
        $mail->addAddress($destinatario);

        $mail->isHTML(true);
        $mail->Subject = $asunto;
        $mail->Body    = $cuerpo;

        $mail->send();
        return true;

    } catch (Exception $e) {
        error_log("Error al enviar email: " . $mail->ErrorInfo);
        return false;
    }
}
```

Genera una contraseña de aplicación en: https://myaccount.google.com/apppasswords

**5. Configurar virtual host**

Añade en `C:\xampp\apache\conf\extra\httpd-vhosts.conf`:

```apache
<VirtualHost *:80>
    DocumentRoot "C:/xampp/htdocs/inventario-app/frontend"
    ServerName inventario.local
</VirtualHost>
```

Añade en `C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1 inventario.local
```

**6. Acceder a la aplicación**

```
http://inventario.local
```

---

## Usuarios de prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | admin@inventario.com | Proyecto@DAW2024 |
| Empleado | empleado@inventario.com | Proyecto@DAW2024 |

---

## API REST

La aplicación incluye una API pública accesible sin sesión, autenticada mediante API key.

**Base URL:**
```
http://inventario.local/backend/api/public/
```

**Autenticación por header:**
```
X-API-Key: tu_api_key
```

**O por query parameter:**
```
?api_key=tu_api_key
```

**API keys de ejemplo:**

| Key | Permisos |
|-----|----------|
| key_lectura_demo_inventario_2024 | Lectura (GET) |
| key_escritura_demo_inventario_2024 | Lectura y escritura |

**Endpoints disponibles:**

| Método | Endpoint | Descripción | Permisos |
|--------|----------|-------------|----------|
| GET | /productos.php | Listar todos los productos | Lectura |
| GET | /productos.php?id=1 | Obtener producto por ID | Lectura |
| POST | /productos.php | Crear producto | Escritura |
| PUT | /productos.php?id=1 | Actualizar producto | Escritura |
| DELETE | /productos.php?id=1 | Eliminar producto | Escritura |

---

## Estructura del proyecto

```
inventario-app/
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       ├── auth.js
│       ├── login.js
│       ├── logout.js
│       └── user.js
├── backend/
│   ├── api/
│   │   ├── public/
│   │   │   ├── productos.php
│   │   │   └── README.md
│   │   ├── productos.php
│   │   ├── usuarios.php
│   │   ├── logs.php
│   │   └── apikeys.php
│   ├── auth/
│   │   ├── login.php
│   │   ├── logout.php
│   │   ├── register.php
│   │   ├── check_auth.php
│   │   ├── protect.php
│   │   ├── api_auth.php
│   │   └── change_password.php
│   ├── config/
│   │   └── database.php
│   ├── models/
│   │   ├── producto.php
│   │   └── log.php
│   ├── services/
│   │   └── alertas.php
│   └── libs/
│       └── PHPMailer/
└── database/
    └── schema.sql
```

---

## Seguridad

- Protección contra XSS mediante escapado de HTML en el frontend
- Validación de inputs en el backend antes de ejecutar consultas
- Control de acceso por rol en frontend y backend
- Autenticación de API externa por token (API key)
- Sesiones PHP seguras con comprobación de `session_status()`
- Errores de base de datos no expuestos al cliente
- Contraseñas hasheadas con `password_hash()` (bcrypt)
- Credenciales de email excluidas del repositorio mediante `.gitignore`

---

## Autor

Alejandro Luque Núñez
Técnico Superior en Desarrollo de Aplicaciones Web
[github.com/alejoluque2002](https://github.com/alejoluque2002)