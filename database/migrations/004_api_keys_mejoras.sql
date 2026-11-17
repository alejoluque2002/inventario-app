-- ============================================
-- Migración 004 — API keys: caducidad, último uso, límite por minuto
--                 y permiso "completo" (incluye eliminar)
-- EJECUTAR UNA SOLA VEZ y con copia de seguridad previa (mysqldump).
-- Las claves existentes siguen funcionando. Las de "escritura" pueden crear y
-- editar productos pero ya NO eliminarlos: para eso hace falta una de "completo".
-- ============================================
USE inventario_db;

-- Si la primera línea falla con "Duplicate column", la migración ya se ejecutó: no sigas.
ALTER TABLE api_keys ADD COLUMN expires_at DATE NULL AFTER activa;
ALTER TABLE api_keys ADD COLUMN last_used_at DATETIME NULL AFTER expires_at;
ALTER TABLE api_keys ADD COLUMN limite_minuto INT NOT NULL DEFAULT 60 AFTER last_used_at;
ALTER TABLE api_keys MODIFY permisos ENUM('lectura', 'escritura', 'completo') NOT NULL DEFAULT 'lectura';