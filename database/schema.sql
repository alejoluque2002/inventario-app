-- ============================================
-- Sistema de Gestión de Inventario
-- Schema de base de datos (instalación desde cero)
-- ============================================
-- Si ya tienes una base de datos creada con una versión anterior,
-- NO ejecutes este archivo: usa database/migrations/.
--
-- Después de importarlo, crea el primer administrador desde la terminal:
--   php database/crear_admin.php "Nombre" email@dominio.com
-- (te pedirá la contraseña; no se guarda ninguna contraseña por defecto)
-- ============================================

CREATE DATABASE IF NOT EXISTS inventario_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE inventario_db;

-- ============================================
-- Tabla: usuarios
-- ============================================

CREATE TABLE IF NOT EXISTS usuarios (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    rol        ENUM('admin', 'empleado') NOT NULL DEFAULT 'empleado',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabla: productos
-- ============================================

CREATE TABLE IF NOT EXISTS productos (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    nombre        VARCHAR(150) NOT NULL,
    descripcion   TEXT,
    precio        DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock         INT NOT NULL DEFAULT 0,
    stock_minimo  INT NOT NULL DEFAULT 5,
    codigo_barras VARCHAR(50) NULL,
    categoria     VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_productos_codigo_barras (codigo_barras),
    KEY idx_productos_categoria (categoria)
);

-- ============================================
-- Tabla: logs (registro de actividad)
-- usuario_id es NULL cuando la acción la hace una API key
-- ============================================

CREATE TABLE IF NOT EXISTS logs (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id     INT NULL,
    usuario_nombre VARCHAR(100) NOT NULL,
    accion         VARCHAR(50) NOT NULL,
    detalle        TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_logs_created_at (created_at)
);

-- ============================================
-- Tabla: api_keys
-- Para crear una clave (genera una aleatoria de 40 caracteres):
--   INSERT INTO api_keys (nombre, api_key, permisos)
--   VALUES ('Mi integración', SUBSTRING(SHA2(CONCAT(UUID(), RAND()), 256), 1, 40), 'lectura');
--   SELECT nombre, api_key FROM api_keys ORDER BY id DESC LIMIT 1;
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    api_key    VARCHAR(64) NOT NULL UNIQUE,
    permisos   ENUM('lectura', 'escritura') NOT NULL DEFAULT 'lectura',
    activa     TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Productos de ejemplo
-- ============================================

INSERT INTO productos (nombre, descripcion, precio, stock, stock_minimo, categoria) VALUES
('Teclado mecánico',   'Teclado con switches Cherry MX Red',            89.99, 15, 5, 'Periféricos'),
('Ratón inalámbrico',  'Ratón ergonómico con batería de larga duración', 34.50, 30, 5, 'Periféricos'),
('Monitor 24"',        'Monitor Full HD IPS 75Hz',                      179.00,  8, 3, 'Monitores'),
('Cable HDMI 2m',      'Cable HDMI 2.0 4K compatible',                    7.99, 50, 10, 'Cables'),
('Hub USB-C',          'Hub 7 en 1 con HDMI y USB 3.0',                  24.99,  4, 5, 'Accesorios');
