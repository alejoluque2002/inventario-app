-- ============================================
-- Sistema de Gestión de Inventario
-- Schema de base de datos
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
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio      DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock       INT NOT NULL DEFAULT 0,
    categoria   VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Usuario de prueba
-- Contraseña: admin1234
-- ============================================

INSERT INTO usuarios (nombre, email, password, rol)
VALUES (
    'Administrador',
    'admin@inventario.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin'
);

-- ============================================
-- Productos de ejemplo
-- ============================================

INSERT INTO productos (nombre, descripcion, precio, stock, categoria) VALUES
('Teclado mecánico',   'Teclado con switches Cherry MX Red', 89.99,  15, 'Periféricos'),
('Ratón inalámbrico',  'Ratón ergonómico con batería de larga duración', 34.50, 30, 'Periféricos'),
('Monitor 24"',        'Monitor Full HD IPS 75Hz',          179.00,  8, 'Monitores'),
('Cable HDMI 2m',      'Cable HDMI 2.0 4K compatible',        7.99,  50, 'Cables'),
('Hub USB-C',          'Hub 7 en 1 con HDMI y USB 3.0',      24.99,   4, 'Accesorios');
