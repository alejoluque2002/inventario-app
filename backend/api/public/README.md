# API REST - Gestor de Inventario

API pública para consultar y gestionar el inventario desde sistemas externos.

## Autenticación

Todas las peticiones requieren una API key. Se puede enviar de dos formas:

Header recomendado:
X-API-Key: tu_api_key

Query parameter:
?api_key=tu_api_key

## API Keys de ejemplo

| Key | Permisos |
|-----|----------|
| key_lectura_demo_inventario_2024 | Lectura (GET) |
| key_escritura_demo_inventario_2024 | Lectura y escritura |

## Base URL

http://inventario.local/backend/api/public/

## Endpoints

GET /productos.php — Obtener todos los productos
GET /productos.php?id=1 — Obtener un producto por ID
POST /productos.php — Crear un producto (escritura)
PUT /productos.php?id=1 — Actualizar un producto (escritura)
DELETE /productos.php?id=1 — Eliminar un producto (escritura)

## Códigos de respuesta

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado correctamente |
| 400 | Datos inválidos |
| 401 | API key requerida o inválida |
| 403 | Sin permisos de escritura |
| 404 | Producto no encontrado |
| 405 | Método no permitido |