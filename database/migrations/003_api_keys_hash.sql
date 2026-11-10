-- ============================================
-- Migración 003 — API keys guardadas con hash
-- EJECUTAR UNA SOLA VEZ y con copia de seguridad previa (mysqldump).
-- Las claves existentes siguen funcionando (el cliente sigue enviando la
-- clave en claro y el servidor compara su hash), pero a partir de ahora
-- ya no se pueden consultar: solo se muestran al crearlas.
-- ============================================
USE inventario_db;

-- 1) Prefijo visible para identificar cada clave en el panel (p. ej. "a1b2c3d4")
--    Si esta línea falla con "Duplicate column", la migración ya se ejecutó: no sigas.
ALTER TABLE api_keys ADD COLUMN key_prefix VARCHAR(12) NOT NULL DEFAULT '' AFTER nombre;

-- 2) Guardar el prefijo antes de perder la clave en claro
UPDATE api_keys SET key_prefix = LEFT(api_key, 8);

-- 3) Sustituir cada clave por su hash SHA-256 (64 caracteres hexadecimales)
UPDATE api_keys SET api_key = SHA2(api_key, 256);

-- 4) Renombrar la columna para que refleje lo que contiene
ALTER TABLE api_keys CHANGE api_key key_hash CHAR(64) NOT NULL;