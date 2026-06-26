<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/mail.php';

function verificarStockYAlertar($db, $adminEmail)
{
    $stmt = $db->prepare("
        SELECT nombre, stock, stock_minimo, categoria
        FROM productos
        WHERE stock <= stock_minimo AND stock > 0
        ORDER BY stock ASC
    ");
    $stmt->execute();
    $productosAlerta = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt2 = $db->prepare("
        SELECT nombre, categoria
        FROM productos
        WHERE stock = 0
    ");
    $stmt2->execute();
    $productosAgotados = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    if (empty($productosAlerta) && empty($productosAgotados)) {
        return false;
    }

    $cuerpo = "
    <html>
    <body style='font-family: Arial, sans-serif; color: #333;'>
        <h2 style='color:#1e1e2d;'>Alerta de Stock - Gestor de Inventario</h2>
    ";

    if (!empty($productosAgotados)) {
        $cuerpo .= "
        <h3 style='color:#e53e3e;'>Productos agotados</h3>
        <table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse; width:100%;'>
            <thead style='background:#e53e3e; color:#fff;'>
                <tr>
                    <th>Producto</th>
                    <th>Categoria</th>
                </tr>
            </thead>
            <tbody>
        ";
        foreach ($productosAgotados as $p) {
            $cuerpo .= "
                <tr>
                    <td>{$p['nombre']}</td>
                    <td>{$p['categoria']}</td>
                </tr>
            ";
        }
        $cuerpo .= "</tbody></table><br>";
    }

    if (!empty($productosAlerta)) {
        $cuerpo .= "
        <h3 style='color:#d69e2e;'>Productos con stock bajo</h3>
        <table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse; width:100%;'>
            <thead style='background:#d69e2e; color:#fff;'>
                <tr>
                    <th>Producto</th>
                    <th>Categoria</th>
                    <th>Stock actual</th>
                    <th>Stock minimo</th>
                </tr>
            </thead>
            <tbody>
        ";
        foreach ($productosAlerta as $p) {
            $cuerpo .= "
                <tr>
                    <td>{$p['nombre']}</td>
                    <td>{$p['categoria']}</td>
                    <td>{$p['stock']}</td>
                    <td>{$p['stock_minimo']}</td>
                </tr>
            ";
        }
        $cuerpo .= "</tbody></table>";
    }

    $cuerpo .= "
        <br>
        <p style='color:#888; font-size:12px;'>Este mensaje ha sido generado automaticamente por el Gestor de Inventario.</p>
    </body>
    </html>
    ";

    return enviarEmail(
        $adminEmail,
        'Alerta de stock - Gestor de Inventario',
        $cuerpo
    );
}