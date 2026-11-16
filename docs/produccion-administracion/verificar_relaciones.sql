-- Solo lectura. Cada consulta de inconsistencias debe devolver cero filas.
-- Insumos que no existen en el catálogo de artículos:
SELECT d.id, d.formula_id, d.codigo_articulo
FROM bomerp.formula_detalle d
LEFT JOIN bomerp.articulo a ON a.codigo = d.codigo_articulo
WHERE a.id IS NULL;

-- Artículos repetidos dentro de una misma fórmula:
SELECT formula_id, codigo_articulo, COUNT(*) repeticiones
FROM bomerp.formula_detalle
GROUP BY formula_id, codigo_articulo
HAVING COUNT(*) > 1;

-- Fórmulas compartiendo un insumo (evidencia de muchos a muchos):
SELECT codigo_articulo, COUNT(DISTINCT formula_id) cantidad_formulas
FROM bomerp.formula_detalle
GROUP BY codigo_articulo
HAVING COUNT(DISTINCT formula_id) > 1;

-- Roles y permisos persistidos (ADMIN conserva además acceso global en el servicio):
SELECT r.nombre rol, p.nombre permiso, p.modulo
FROM bomerp.rol r
JOIN bomerp.rol_permiso rp ON rp.rol_id = r.id
JOIN bomerp.permiso p ON p.id = rp.permiso_id
ORDER BY r.nombre, p.modulo;
