# Gestor de Inventario

Aplicación web de gestión de inventario desarrollada con PHP, MySQL y JavaScript vanilla. Proyecto de portfolio desarrollado tras finalizar el Grado Superior de Desarrollo de Aplicaciones Web (DAW).

---

## Características

- Autenticación con sesiones PHP (login / logout)
- Roles de usuario — Admin y Empleado con permisos diferenciados en frontend y backend
- CRUD completo de productos
- Dashboard con métricas en tiempo real (total productos, stock total, valor de inventario, productos sin stock)
- Gráficas de productos y valor por categoría (Chart.js)
- Buscador en tiempo real
- Filtros por categoría dinámicos
- Ordenación por columnas
- Paginación
- Indicadores visuales de stock (Agotado / Stock bajo / Disponible)
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

**Backend**
- PHP 8
- PDO
- Sesiones PHP

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

**4. Configurar virtual host**

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

**5. Acceder a la aplicación**

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
│   │   ├── productos.php
│   │   ├── usuarios.php
│   │   └── logs.php
│   ├── auth/
│   │   ├── login.php
│   │   ├── logout.php
│   │   ├── register.php
│   │   ├── check_auth.php
│   │   ├── protect.php
│   │   └── change_password.php
│   ├── config/
│   │   └── database.php
│   └── models/
│       ├── producto.php
│       └── log.php
└── database/
    └── schema.sql
```

---

## Seguridad

- Protección contra XSS mediante escapado de HTML en el frontend
- Validación de inputs en el backend antes de ejecutar consultas
- Control de acceso por rol en frontend y backend
- Sesiones PHP seguras con comprobación de `session_status()`
- Errores de base de datos no expuestos al cliente
- Contraseñas hasheadas con `password_hash()` (bcrypt)

---

## Autor

Alejandro Luque Núñez  
Técnico Superior en Desarrollo de Aplicaciones Web  
[github.com/alejoluque2002](https://github.com/alejoluque2002)
