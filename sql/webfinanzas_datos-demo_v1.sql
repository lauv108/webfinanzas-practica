-- =============================================================================
-- WebFinanzas - Datos de demostracion
-- Motor:   PostgreSQL 15+ (Supabase)
-- Version: 1.0
-- Fecha:   21/10/2026
--
-- PROPOSITO
--   Carga diecisiete movimientos del mes en curso en la cuenta de demostracion,
--   para que el resumen y el historial tengan contenido durante la sustentacion.
--
-- REQUISITO PREVIO
--   La cuenta demo@webfinanzas.test debe existir. Se crea desde la propia
--   aplicacion, en la pantalla de registro. Al crearla, el disparador
--   fn_sembrar_categorias deja listas las ocho categorias iniciales.
--
-- EJECUCION
--   Supabase > SQL Editor > pegar y ejecutar.
--   El script no hace nada si la cuenta ya tiene movimientos, de modo que
--   puede correrse dos veces sin duplicar datos.
-- =============================================================================


-- =============================================================================
-- 1. CARGA DE MOVIMIENTOS
-- =============================================================================
-- Las fechas se calculan sobre el mes en curso, no se escriben fijas, para que
-- el script siga sirviendo si se ejecuta otro dia. LEAST evita que una fecha
-- caiga despues de hoy, lo que violaria la restriccion
-- transacciones_fecha_no_futura.

WITH usuario AS (
    SELECT id
    FROM auth.users
    WHERE email = 'demo@webfinanzas.test'
),
movimientos (categoria, tipo, monto, dia, descripcion) AS (
    VALUES
        -- Ingresos
        ('Salario',         'ingreso', 1925000, 15, 'Salario primera quincena'),
        ('Otros ingresos',  'ingreso',  650000, 11, 'Trabajo independiente'),
        ('Otros ingresos',  'ingreso',  180000,  8, 'Venta de cosas que no uso'),

        -- Vivienda
        ('Vivienda',        'gasto',    870000,  5, 'Arriendo'),
        ('Vivienda',        'gasto',    185000,  9, 'Servicios publicos'),

        -- Alimentacion
        ('Alimentación',    'gasto',    312400,  3, 'Mercado quincenal'),
        ('Alimentación',    'gasto',    291100, 18, 'Mercado quincenal'),
        ('Alimentación',    'gasto',     96000, 12, 'Almuerzos de la semana'),

        -- Transporte
        ('Transporte',      'gasto',    140000, 13, 'Gasolina'),
        ('Transporte',      'gasto',     60000,  2, 'Recarga de Transmilenio'),
        ('Transporte',      'gasto',     38000, 19, 'Carro por aplicacion'),

        -- Entretenimiento
        ('Entretenimiento', 'gasto',    135000, 17, 'Salida del sabado'),
        ('Entretenimiento', 'gasto',     48000,  6, 'Cine'),
        ('Entretenimiento', 'gasto',     26900, 10, 'Suscripcion de musica'),

        -- Otros y salud
        ('Otros',           'gasto',     90000, 20, 'Regalo de cumpleanos'),
        ('Salud',           'gasto',     54300, 14, 'Drogueria'),
        ('Salud',           'gasto',     72000,  7, 'Consulta odontologica')
)
INSERT INTO public.transacciones
    (usuario_id, categoria_id, tipo, monto, fecha, descripcion)
SELECT
    u.id,
    c.id,
    m.tipo::tipo_movimiento,
    m.monto,
    date_trunc('month', CURRENT_DATE)::date
        + LEAST(m.dia - 1, EXTRACT(DAY FROM CURRENT_DATE)::int - 1),
    m.descripcion
FROM movimientos m
CROSS JOIN usuario u
JOIN public.categorias c
    ON  c.usuario_id = u.id
    AND c.nombre     = m.categoria
    AND c.tipo       = m.tipo::tipo_movimiento
-- Solo carga si la cuenta esta vacia
WHERE NOT EXISTS (
    SELECT 1
    FROM public.transacciones t
    WHERE t.usuario_id = u.id
);


-- =============================================================================
-- 2. COMPROBACION
-- =============================================================================
-- Totales del mes, leidos de la misma vista que consume la aplicacion.

SELECT
    r.periodo,
    r.num_transacciones,
    r.total_ingresos,
    r.total_gastos,
    r.balance
FROM public.v_resumen_mensual r
JOIN auth.users au ON au.id = r.usuario_id
WHERE au.email = 'demo@webfinanzas.test'
  AND r.periodo = date_trunc('month', CURRENT_DATE)::date;

-- Resultado esperado: 17 movimientos, ingresos 2.755.000, gastos 2.418.700,
-- balance 336.300.


-- Desglose por categoria, el mismo que muestra la pantalla de resumen.

SELECT
    g.categoria,
    g.monto,
    g.porcentaje
FROM public.v_gasto_por_categoria g
JOIN auth.users au ON au.id = g.usuario_id
WHERE au.email = 'demo@webfinanzas.test'
  AND g.periodo = date_trunc('month', CURRENT_DATE)::date
ORDER BY g.monto DESC;
