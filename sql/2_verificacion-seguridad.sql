-- =============================================================================
-- WebFinanzas - Verificacion de seguridad de la base de datos (una sola tabla)
-- Version: 2.0 · Fecha: 04/11/2026
--
-- Una sola consulta de solo lectura. Devuelve una fila por comprobacion con lo
-- esperado, lo encontrado y PASA o REVISAR. Una captura del resultado es la
-- evidencia completa.
--
-- Supabase > SQL Editor > pegar todo > Run.
-- Ejecutar DESPUES de webfinanzas_eliminacion-cuenta_v1.sql.
-- =============================================================================

WITH
negocio AS (
    SELECT c.relname, c.relrowsecurity,
           (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS politicas
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relname IN ('categorias', 'transacciones', 'presupuestos')
),
vistas AS (
    SELECT c.relname,
           coalesce(array_to_string(c.reloptions, ','), '') LIKE '%security_invoker=on%' AS invoker
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'v'
),
fn AS (
    SELECT to_regprocedure('public.eliminar_cuenta()') AS oid
),
filas AS (
    -- 1 a 3: RLS y politicas por tabla
    SELECT 1 AS n,
           'RLS y politicas en ' || relname AS comprobacion,
           'RLS activo, 4 politicas' AS esperado,
           CASE WHEN relrowsecurity THEN 'RLS activo' ELSE 'RLS APAGADO' END
               || ', ' || politicas || ' politicas' AS encontrado,
           relrowsecurity AND politicas = 4 AS ok
    FROM negocio

    UNION ALL
    -- 4: ninguna tabla publica sin RLS
    SELECT 4, 'Tablas publicas sin RLS', '0',
           count(*)::text, count(*) = 0
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND NOT c.relrowsecurity

    UNION ALL
    -- 5: vistas bajo ejecucion del invocador
    SELECT 5, 'Vistas con security_invoker', '3 de 3',
           count(*) FILTER (WHERE invoker) || ' de ' || count(*),
           count(*) = 3 AND bool_and(invoker)
    FROM vistas

    UNION ALL
    -- 6: el rol anonimo no tiene permisos sobre tablas ni vistas
    SELECT 6, 'Permisos del rol anonimo sobre tablas y vistas', '0',
           count(*)::text, count(*) = 0
    FROM information_schema.role_table_grants g
    WHERE g.grantee = 'anon' AND g.table_schema = 'public'

    UNION ALL
    -- 7: funciones con permisos elevados sin search_path fijo
    SELECT 7, 'Funciones SECURITY DEFINER sin search_path fijo', '0',
           count(*)::text, count(*) = 0
    FROM pg_proc pr
    WHERE pr.pronamespace = 'public'::regnamespace
      AND pr.prosecdef
      AND coalesce(array_to_string(pr.proconfig, ','), '') NOT LIKE '%search_path%'

    UNION ALL
    -- 8 a 10: funcion de eliminacion de cuenta
    SELECT 8, 'Funcion eliminar_cuenta instalada', 'si',
           CASE WHEN fn.oid IS NULL THEN 'no' ELSE 'si' END, fn.oid IS NOT NULL
    FROM fn

    UNION ALL
    SELECT 9, 'El rol anonimo puede ejecutar eliminar_cuenta', 'no',
           CASE WHEN fn.oid IS NULL THEN 'no instalada'
                WHEN has_function_privilege('anon', fn.oid, 'EXECUTE') THEN 'si'
                ELSE 'no' END,
           fn.oid IS NOT NULL AND NOT has_function_privilege('anon', fn.oid, 'EXECUTE')
    FROM fn

    UNION ALL
    SELECT 10, 'Un usuario con sesion puede ejecutar eliminar_cuenta', 'si',
           CASE WHEN fn.oid IS NULL THEN 'no instalada'
                WHEN has_function_privilege('authenticated', fn.oid, 'EXECUTE') THEN 'si'
                ELSE 'no' END,
           fn.oid IS NOT NULL AND has_function_privilege('authenticated', fn.oid, 'EXECUTE')
    FROM fn
)
SELECT
    row_number() OVER (ORDER BY n, comprobacion) AS "N.",
    comprobacion                                 AS "Comprobacion",
    esperado                                     AS "Esperado",
    encontrado                                   AS "Encontrado",
    CASE WHEN ok THEN 'PASA' ELSE 'REVISAR' END  AS "Resultado",
    to_char(now() AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD HH24:MI') AS "Fecha"
FROM filas
ORDER BY n, comprobacion;
