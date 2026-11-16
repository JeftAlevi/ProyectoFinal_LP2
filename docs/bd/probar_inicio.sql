-- Prueba los scripts en un usuario temporal PRUEBA_BD (no toca BOMERP).
-- Uso (PowerShell, desde docs\bd):
--   'probar_inicio.sql','01_esquema.sql','02_indices_y_vistas.sql','probar_fin.sql' |
--     ForEach-Object { Get-Content $_ -Encoding UTF8 } |
--     docker compose -f ..\..\compose.yml exec -T oracle sqlplus -s system/oracle_local_2026@FREEPDB1
SET FEEDBACK OFF
WHENEVER SQLERROR CONTINUE
BEGIN EXECUTE IMMEDIATE 'DROP USER prueba_bd CASCADE'; EXCEPTION WHEN OTHERS THEN NULL; END;
/
CREATE USER prueba_bd IDENTIFIED BY "Prueba2026" QUOTA UNLIMITED ON users;
GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE VIEW TO prueba_bd;
CONNECT prueba_bd/"Prueba2026"@FREEPDB1
SET FEEDBACK OFF
PROMPT === Ejecutando scripts (cualquier error aparecerá como ORA-xxxxx) ===
