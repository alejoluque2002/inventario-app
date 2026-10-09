<?php

class Producto
{
    private $conn;
    private $table = "productos";

    public function __construct($db)
    {
        $this->conn = $db;
    }

    public function obtenerTodos()
    {
        $query = "SELECT * FROM {$this->table} ORDER BY id DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Devuelve el producto como array asociativo o false si no existe */
    public function obtenerPorId($id)
    {
        $stmt = $this->conn->prepare("SELECT * FROM {$this->table} WHERE id = :id");
        $stmt->execute([':id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Valida los datos de un producto.
     * Devuelve null si son correctos o un mensaje de error en caso contrario.
     */
    public function validar($datos)
    {
        if (!is_array($datos)) {
            return 'Datos inválidos';
        }

        foreach (['nombre' => 150, 'categoria' => 100] as $campo => $max) {
            if (!isset($datos[$campo]) || !is_string($datos[$campo]) || trim($datos[$campo]) === '') {
                return "El campo {$campo} es obligatorio";
            }
            if (mb_strlen(trim($datos[$campo])) > $max) {
                return "El campo {$campo} no puede superar {$max} caracteres";
            }
        }

        if (isset($datos['descripcion'])) {
            if (!is_string($datos['descripcion']) || mb_strlen($datos['descripcion']) > 5000) {
                return 'La descripción no es válida (máx. 5000 caracteres)';
            }
        }

        if (
            !isset($datos['precio']) || !is_numeric($datos['precio']) ||
            $datos['precio'] < 0 || $datos['precio'] > 99999999.99
        ) {
            return 'El precio debe ser un número válido mayor o igual que 0';
        }

        $opcionesEntero = ['options' => ['min_range' => 0, 'max_range' => 2147483647]];

        foreach (['stock', 'stock_minimo'] as $campo) {
            if (
                !isset($datos[$campo]) ||
                filter_var($datos[$campo], FILTER_VALIDATE_INT, $opcionesEntero) === false
            ) {
                return "El campo {$campo} debe ser un entero mayor o igual que 0";
            }
        }

        if (isset($datos['codigo_barras'])) {
            if (!is_scalar($datos['codigo_barras']) || mb_strlen(trim((string) $datos['codigo_barras'])) > 50) {
                return 'El código de barras no es válido (máx. 50 caracteres)';
            }
        }

        return null;
    }

    /** Limpia y convierte los tipos de unos datos ya validados */
    private function normalizar($datos)
    {
        $codigo = isset($datos['codigo_barras']) ? trim((string) $datos['codigo_barras']) : '';

        return [
            ':nombre'        => trim($datos['nombre']),
            ':descripcion'   => $datos['descripcion'] ?? '',
            ':precio'        => round((float) $datos['precio'], 2),
            ':stock'         => (int) $datos['stock'],
            ':stock_minimo'  => (int) $datos['stock_minimo'],
            // Cadena vacía => NULL, para que el índice UNIQUE solo afecte a códigos reales
            ':codigo_barras' => $codigo === '' ? null : $codigo,
            ':categoria'     => trim($datos['categoria'])
        ];
    }

    public function crear($datos)
    {
        if ($this->validar($datos) !== null) {
            return false;
        }

        $query = "INSERT INTO productos
                  (nombre, descripcion, precio, stock, stock_minimo, codigo_barras, categoria)
                  VALUES
                  (:nombre, :descripcion, :precio, :stock, :stock_minimo, :codigo_barras, :categoria)";

        $stmt = $this->conn->prepare($query);

        return $stmt->execute($this->normalizar($datos));
    }

    public function actualizar($id, $datos)
    {
        if (!$id || $this->validar($datos) !== null) {
            return false;
        }

        $query = "UPDATE productos
                  SET nombre = :nombre,
                      descripcion = :descripcion,
                      precio = :precio,
                      stock = :stock,
                      stock_minimo = :stock_minimo,
                      codigo_barras = :codigo_barras,
                      categoria = :categoria
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);

        $parametros = $this->normalizar($datos);
        $parametros[':id'] = $id;

        return $stmt->execute($parametros);
    }

    /** Fija el stock a un valor exacto (solo toca la columna stock) */
    public function establecerStock($id, $stock)
    {
        $stmt = $this->conn->prepare("UPDATE productos SET stock = :stock WHERE id = :id");
        $stmt->bindValue(':stock', (int) $stock, PDO::PARAM_INT);
        $stmt->bindValue(':id', (int) $id, PDO::PARAM_INT);

        return $stmt->execute();
    }

    /**
     * Suma o resta unidades de forma atómica en la base de datos.
     * Devuelve false si el resultado dejaría el stock en negativo.
     */
    public function ajustarStock($id, $delta)
    {
        $stmt = $this->conn->prepare(
            "UPDATE productos SET stock = stock + :d1 WHERE id = :id AND stock + :d2 >= 0"
        );
        $stmt->bindValue(':d1', (int) $delta, PDO::PARAM_INT);
        $stmt->bindValue(':d2', (int) $delta, PDO::PARAM_INT);
        $stmt->bindValue(':id', (int) $id, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function eliminar($id)
    {
        if (!$id) {
            return false;
        }

        $query = "DELETE FROM productos
                  WHERE id = :id";

        $stmt = $this->conn->prepare($query);

        return $stmt->execute([
            ':id' => $id
        ]);
    }
}
