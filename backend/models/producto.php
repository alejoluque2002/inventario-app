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

    public function crear($datos)
    {
        if (
            empty($datos['nombre']) ||
            empty($datos['categoria']) ||
            !isset($datos['precio']) ||
            !isset($datos['stock']) ||
            !isset($datos['stock_minimo'])
        ) {
            return false;
        }

        $query = "INSERT INTO productos
                  (nombre, descripcion, precio, stock, stock_minimo, codigo_barras, categoria)
                  VALUES
                  (:nombre, :descripcion, :precio, :stock, :stock_minimo, :codigo_barras, :categoria)";

        $stmt = $this->conn->prepare($query);

        return $stmt->execute([
            ':nombre'        => $datos['nombre'],
            ':descripcion'   => $datos['descripcion'] ?? '',
            ':precio'        => $datos['precio'],
            ':stock'         => $datos['stock'],
            ':stock_minimo'  => $datos['stock_minimo'],
            ':codigo_barras' => $datos['codigo_barras'] ?? null,
            ':categoria'     => $datos['categoria']
        ]);
    }

    public function actualizar($id, $datos)
    {
        if (
            !$id ||
            empty($datos['nombre']) ||
            empty($datos['categoria']) ||
            !isset($datos['precio']) ||
            !isset($datos['stock']) ||
            !isset($datos['stock_minimo'])
        ) {
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

        return $stmt->execute([
            ':id'            => $id,
            ':nombre'        => $datos['nombre'],
            ':descripcion'   => $datos['descripcion'] ?? '',
            ':precio'        => $datos['precio'],
            ':stock'         => $datos['stock'],
            ':stock_minimo'  => $datos['stock_minimo'],
            ':codigo_barras' => $datos['codigo_barras'] ?? null,
            ':categoria'     => $datos['categoria']
        ]);
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