<?php
/* ============================================================
   MedCore HMS — Database connection (XAMPP / MySQL defaults)
   ============================================================ */

function medcore_db()
{
    static $pdo = null;
    if ($pdo) return $pdo;

    $host = '127.0.0.1';
    $db   = 'medcore_db';   // normalised schema (see sql/medcore_schema.sql)
    $user = 'root';
    $pass = '';      // default XAMPP MySQL password is empty

    $pdo = new PDO(
        "mysql:host=$host;dbname=$db;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    return $pdo;
}
