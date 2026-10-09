-- ============================================
-- Migración 001 — para bases de datos YA existentes
-- Hazle una copia de seguridad antes (mysqldump inventario_db > backup.sql)
-- ============================================
USE inventario_db;

-- 1) Los códigos de barras vacíos pasan a NULL (un UNIQUE no admite varios '')
UPDATE productos SET codigo_barras = NULL WHERE codigo_barras = '';

-- 2) Comprueba que no hay códigos duplicados. Debe devolver 0 filas;
--    si devuelve alguna, corrígelas a mano antes del paso 3.
SELECT codigo_barras, COUNT(*) AS veces
FROM productos
WHERE codigo_barras IS NOT NULL
GROUP BY codigo_barras
HAVING COUNT(*) > 1;

-- 3) Índice único: evita dos productos con el mismo código de barras
ALTER TABLE productos ADD UNIQUE KEY uq_productos_codigo_barras (codigo_barras);

-- 4) Índices de apoyo
ALTER TABLE productos ADD KEY idx_productos_categoria (categoria);
ALTER TABLE logs ADD KEY idx_logs_created_at (created_at);

-- 4b) El registro de actividad admite acciones hechas por API key (sin usuario)
ALTER TABLE logs MODIFY usuario_id INT(11) NULL;

-- 5) (Recomendado) Rotar las API keys de demostración que aparecían en el README
--    y generar claves aleatorias nuevas:
UPDATE api_keys
SET api_key = SUBSTRING(SHA2(CONCAT(UUID(), RAND()), 256), 1, 40)
WHERE api_key IN ('key_lectura_demo_inventario_2024', 'key_escritura_demo_inventario_2024');
SELECT nombre, api_key, permisos FROM api_keys;
