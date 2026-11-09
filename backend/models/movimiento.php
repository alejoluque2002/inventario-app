<?php

class MovimientoStock
{
    private $conn;

    public function __construct($db)
    {
        $this->conn = $db;
    }

    /**
     * Registra un cambio de stock.
     * - No guarda nada si el stock no cambia.
     * - $tipoForzado permite marcar 'alta' (producto nuevo) o 'baja' (producto eliminado).
     *   Si es null, el tipo se deduce del signo: entrada (suma) o salida (resta).
     */
    public function registrar(
        $productoId,
        $productoNombre,
        $usuarioId,
        $usuarioNombre,
        $origen,
        $stockAnterior,
        $stockNuevo,
        $tipoForzado = null
    ) {
        $stockAnterior = (int) $stockAnterior;
        $stockNuevo    = (int) $stockNuevo;
        $diferencia    = $stockNuevo - $stockAnterior;

        if ($diferencia === 0) {
            return false;
        }

        if (!in_array($origen, ['web', 'scanner', 'api'], true)) {
            $origen = 'web';
        }

        if (in_array($tipoForzado, ['alta', 'baja'], true)) {
            $tipo = $tipoForzado;
        } else {
            $tipo = $diferencia > 0 ? 'entrada' : 'salida';
        }

        $stmt = $this->conn->prepare("
            INSERT INTO movimientos_stock
                (producto_id, producto_nombre, usuario_id, usuario_nombre,
                 tipo, origen, stock_anterior, stock_nuevo, diferencia)
            VALUES
                (:producto_id, :producto_nombre, :usuario_id, :usuario_nombre,
                 :tipo, :origen, :stock_anterior, :stock_nuevo, :diferencia)
        ");

        return $stmt->execute([
            ':producto_id'     => $productoId,
            ':producto_nombre' => mb_substr((string) $productoNombre, 0, 150),
            ':usuario_id'      => $usuarioId,
            ':usuario_nombre'  => mb_substr((string) $usuarioNombre, 0, 100),
            ':tipo'            => $tipo,
            ':origen'          => $origen,
            ':stock_anterior'  => $stockAnterior,
            ':stock_nuevo'     => $stockNuevo,
            ':diferencia'      => $diferencia
        ]);
    }

    /**
     * Ultimos movimientos, del mas reciente al mas antiguo.
     * Si se indica $productoId, solo los de ese producto.
     */
    public function obtener($productoId = null, $limite = 200)
    {
        $limite = max(1, min((int) $limite, 500));

        $sql = "SELECT * FROM movimientos_stock";

        if ($productoId !== null) {
            $sql .= " WHERE producto_id = :producto_id";
        }

        $sql .= " ORDER BY created_at DESC, id DESC LIMIT :limite";

        $stmt = $this->conn->prepare($sql);

        if ($productoId !== null) {
            $stmt->bindValue(':producto_id', (int) $productoId, PDO::PARAM_INT);
        }

        $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}