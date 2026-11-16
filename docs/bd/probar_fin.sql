SET PAGESIZE 100 LINESIZE 120 FEEDBACK OFF
PROMPT === Objetos creados ===
SELECT object_type, COUNT(*) AS cantidad FROM user_objects GROUP BY object_type ORDER BY object_type;
SELECT 'FK: ' || COUNT(*) AS llaves_foraneas FROM user_constraints WHERE constraint_type = 'R';
SELECT 'Objetos con error: ' || COUNT(*) AS estado FROM user_objects WHERE status <> 'VALID';
CONNECT system/oracle_local_2026@FREEPDB1
DROP USER prueba_bd CASCADE;
PROMPT === Prueba terminada; usuario temporal eliminado ===
EXIT
