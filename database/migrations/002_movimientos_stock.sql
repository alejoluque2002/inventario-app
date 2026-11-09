-- ============================================
-- Migración 002 — historial de movimientos de stock
-- Hazle una copia de seguridad antes (mysqldump)
-- ============================================
USE inventario_db;

CREATE TABLE IF NOT EXISTS movimientos_stock (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    producto_id     INT NULL,
    producto_nombre VARCHAR(150) NOT NULL,
    usuario_id      INT NULL,
    usuario_nombre  VARCHAR(100) NOT NULL,
    tipo            ENUM('alta', 'entrada', 'salida', 'baja') NOT NULL,
    origen          ENUM('web', 'scanner', 'api') NOT NULL DEFAULT 'web',
    stock_anterior  INT NOT NULL,
    stock_nuevo     INT NOT NULL,
    diferencia      INT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_mov_producto (producto_id, created_at),
    KEY idx_mov_created (created_at)
);