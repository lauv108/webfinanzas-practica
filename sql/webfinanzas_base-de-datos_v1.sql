-- =============================================================================
--
--   W E B F I N A N Z A S
--   Base de datos completa: esquema, calculos y control de acceso
--
--   Motor:    PostgreSQL 15+ (Supabase)
--   Version:  1.0
--   Fecha:    07/10/2026
--   Autora:   Laura Daniela Velasquez Marin
--
--   Reune las actividades 1.2 (modelo de datos y esquema) y 1.3 (politicas de
--   acceso por usuario) del cronograma del proyecto.
--
-- -----------------------------------------------------------------------------
--   CONTENIDO
--     1. Tipos
--     2. Tablas
--     3. Indices
--     4. Vistas de calculo
--     5. Automatizaciones
--     6. Row Level Security
--     7. Permisos por rol
--     8. Politicas de acceso
--     9. Comprobacion final
--
-- -----------------------------------------------------------------------------
--   EJECUCION
--     Supabase > SQL Editor > pegar el archivo completo y ejecutar.
--     El script es idempotente: puede correrse varias veces sin error.
--
--   PRINCIPIO DE DISENO
--     Las reglas de integridad y de acceso residen en la base de datos, no en
--     la interfaz. Una restriccion declarada en el esquema se cumple con
--     independencia de por donde llegue la operacion; una validacion escrita
--     solo en el cliente se puede evadir con una peticion directa.
--
-- =============================================================================


-- #############################################################################
-- 1. TIPOS
-- #############################################################################

-- Clasifica tanto categorias como transacciones. Un tipo enumerado evita
-- cadenas libres como 'Ingreso', 'INGRESO' o 'ingresos' en la misma columna.
-- CREATE TYPE no admite IF NOT EXISTS, de ahi el bloque condicional.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento') THEN
    CREATE TYPE tipo_movimiento AS ENUM ('ingreso', 'gasto');
  END IF;
END$$;


-- #############################################################################
-- 2. TABLAS
-- #############################################################################

-- -----------------------------------------------------------------------------
-- categorias
--
-- Clasifica los movimientos. Cada usuario tiene su propio juego: al crearse la
-- cuenta se copian las predefinidas (seccion 5) y el usuario puede agregar las
-- suyas. Esto mantiene usuario_id NOT NULL en toda la tabla, lo que simplifica
-- las politicas de acceso y la restriccion de unicidad.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categorias (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      uuid            NOT NULL
                                    REFERENCES auth.users (id) ON DELETE CASCADE,
    nombre          text            NOT NULL,
    tipo            tipo_movimiento NOT NULL,
    es_predefinida  boolean         NOT NULL DEFAULT false,
    creado_en       timestamptz     NOT NULL DEFAULT now(),

    -- btrim quita espacios al inicio y al final: rechaza el nombre vacio y el
    -- que trae solo espacios
    CONSTRAINT categorias_nombre_no_vacio
        CHECK (length(btrim(nombre)) > 0),

    -- Un usuario no puede tener dos categorias con el mismo nombre y tipo.
    -- Si puede tener "Otros" como ingreso y "Otros" como gasto.
    CONSTRAINT categorias_nombre_unico_por_usuario
        UNIQUE (usuario_id, nombre, tipo),

    -- Clave candidata requerida por la llave foranea compuesta de
    -- transacciones y presupuestos. Ver la nota de diseno mas abajo.
    CONSTRAINT categorias_id_tipo_unico
        UNIQUE (id, tipo)
);

COMMENT ON TABLE  public.categorias IS
    'Categorias de ingreso y gasto. Cada usuario tiene su propio juego.';
COMMENT ON COLUMN public.categorias.es_predefinida IS
    'true si proviene del juego inicial creado con la cuenta.';


-- -----------------------------------------------------------------------------
-- transacciones
--
-- Tabla central del sistema. Alimenta los acumulados del presupuesto y los
-- totales del resumen.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transacciones (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      uuid            NOT NULL
                                    REFERENCES auth.users (id) ON DELETE CASCADE,
    categoria_id    uuid            NOT NULL,
    tipo            tipo_movimiento NOT NULL,
    monto           numeric(14,2)   NOT NULL,
    fecha           date            NOT NULL,
    descripcion     text            NOT NULL,
    creado_en       timestamptz     NOT NULL DEFAULT now(),
    actualizado_en  timestamptz     NOT NULL DEFAULT now(),

    -- RF-09. El monto es siempre positivo: el signo lo determina el tipo, no el
    -- valor, de modo que las sumas por tipo son directas. numeric y no float
    -- porque los flotantes acumulan error de redondeo sobre cientos de filas.
    CONSTRAINT transacciones_monto_positivo
        CHECK (monto > 0),

    -- RF-09. No se registran movimientos con fecha futura
    CONSTRAINT transacciones_fecha_no_futura
        CHECK (fecha <= CURRENT_DATE),

    CONSTRAINT transacciones_descripcion_no_vacia
        CHECK (length(btrim(descripcion)) > 0),

    -- LLAVE FORANEA COMPUESTA
    -- Garantiza que el tipo de la transaccion coincida con el tipo de su
    -- categoria. Sin esto seria posible registrar un ingreso con categoria
    -- "Transporte", dato que corrompe los totales del resumen. La integridad
    -- queda declarada en el esquema y no depende de que la interfaz la respete.
    CONSTRAINT transacciones_categoria_tipo_coherente
        FOREIGN KEY (categoria_id, tipo)
        REFERENCES public.categorias (id, tipo)
        ON DELETE RESTRICT
);

COMMENT ON TABLE public.transacciones IS
    'Movimientos de dinero registrados por el usuario.';
COMMENT ON CONSTRAINT transacciones_categoria_tipo_coherente
    ON public.transacciones IS
    'Impide que un ingreso use una categoria de gasto y viceversa.';


-- -----------------------------------------------------------------------------
-- presupuestos
--
-- Tope de gasto que el usuario fija para una categoria en un mes.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.presupuestos (
    id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      uuid            NOT NULL
                                    REFERENCES auth.users (id) ON DELETE CASCADE,
    categoria_id    uuid            NOT NULL,
    tipo            tipo_movimiento NOT NULL DEFAULT 'gasto',
    periodo         date            NOT NULL,
    monto_tope      numeric(14,2)   NOT NULL,
    creado_en       timestamptz     NOT NULL DEFAULT now(),
    actualizado_en  timestamptz     NOT NULL DEFAULT now(),

    CONSTRAINT presupuestos_monto_positivo
        CHECK (monto_tope > 0),

    -- El periodo se almacena siempre como el primer dia del mes. Sin
    -- normalizar, dos topes creados en dias distintos del mismo mes se
    -- trataran como periodos diferentes y la unicidad no serviria de nada.
    CONSTRAINT presupuestos_periodo_primer_dia
        CHECK (periodo = date_trunc('month', periodo)::date),

    -- Solo se presupuestan gastos
    CONSTRAINT presupuestos_solo_gastos
        CHECK (tipo = 'gasto'),

    -- RF-15. Un solo tope por categoria y mes
    CONSTRAINT presupuestos_unico_por_categoria_periodo
        UNIQUE (usuario_id, categoria_id, periodo),

    -- Misma llave compuesta: como tipo esta fijo en 'gasto', solo se pueden
    -- presupuestar categorias de gasto
    CONSTRAINT presupuestos_categoria_tipo_coherente
        FOREIGN KEY (categoria_id, tipo)
        REFERENCES public.categorias (id, tipo)
        ON DELETE CASCADE
);

COMMENT ON TABLE public.presupuestos IS
    'Topes mensuales de gasto por categoria.';
COMMENT ON COLUMN public.presupuestos.periodo IS
    'Primer dia del mes presupuestado. Normalizado por restriccion CHECK.';


-- #############################################################################
-- 3. INDICES
-- #############################################################################
-- Responden a los patrones de consulta reales y al requerimiento RNF-07, que
-- exige resolver el resumen mensual en menos de un segundo con 500
-- transacciones. Todos empiezan por usuario_id, de modo que el predicado de
-- las politicas de la seccion 8 tambien se resuelve por indice.

CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_fecha
    ON public.transacciones (usuario_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_categoria
    ON public.transacciones (usuario_id, categoria_id);

CREATE INDEX IF NOT EXISTS idx_presupuestos_usuario_periodo
    ON public.presupuestos (usuario_id, periodo);

CREATE INDEX IF NOT EXISTS idx_categorias_usuario_tipo
    ON public.categorias (usuario_id, tipo);


-- #############################################################################
-- 4. VISTAS DE CALCULO
-- #############################################################################
-- Centralizan la logica del resumen y del presupuesto, de modo que exista en un
-- solo lugar y de el mismo resultado desde cualquier pantalla.
--
-- security_invoker = on hace que la vista se ejecute con los permisos de quien
-- consulta y no con los del propietario. Sin esta opcion las vistas omitirian
-- las politicas de la seccion 8 y un usuario podria ver datos de otro a traves
-- de ellas, aunque las tablas estuvieran protegidas.

-- -----------------------------------------------------------------------------
-- v_estado_presupuesto
-- RF-16 y RF-17: acumulado, porcentaje consumido y semaforo de cada tope.
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_estado_presupuesto;
CREATE VIEW public.v_estado_presupuesto
WITH (security_invoker = on) AS
SELECT
    p.id                AS presupuesto_id,
    p.usuario_id,
    p.categoria_id,
    c.nombre            AS categoria,
    p.periodo,
    p.monto_tope,
    COALESCE(g.gastado, 0)                                   AS gasto_acumulado,
    GREATEST(p.monto_tope - COALESCE(g.gastado, 0), 0)       AS disponible,
    ROUND(COALESCE(g.gastado, 0) * 100.0 / p.monto_tope, 1)  AS porcentaje_consumido,
    -- El orden importa: CASE se queda con la primera condicion verdadera, asi
    -- que el 100% se evalua antes que el 90%. Al reves, un 115% diria 'alerta'.
    CASE
        WHEN COALESCE(g.gastado, 0) >= p.monto_tope             THEN 'excedido'
        WHEN COALESCE(g.gastado, 0) >= p.monto_tope * 0.90      THEN 'alerta'
        ELSE 'seguro'
    END                                                      AS estado
FROM public.presupuestos p
JOIN public.categorias c
    ON c.id = p.categoria_id
-- LATERAL permite que la subconsulta lea columnas de la fila de afuera (p),
-- de modo que suma los gastos de esa categoria en ese mes.
-- LEFT JOIN ... ON true hace que el tope aparezca aunque no haya gastos.
LEFT JOIN LATERAL (
    SELECT SUM(t.monto) AS gastado
    FROM public.transacciones t
    WHERE t.usuario_id   = p.usuario_id
      AND t.categoria_id = p.categoria_id
      AND t.tipo         = 'gasto'
      AND date_trunc('month', t.fecha)::date = p.periodo
) g ON true;

COMMENT ON VIEW public.v_estado_presupuesto IS
    'Estado de cada tope: acumulado, porcentaje y semaforo (seguro/alerta/excedido).';


-- -----------------------------------------------------------------------------
-- v_resumen_mensual
-- RF-19: totales de ingresos, gastos y balance por usuario y mes.
-- FILTER aplica una condicion a una agregacion concreta dentro del mismo
-- GROUP BY. Equivale a SUM(CASE WHEN ... THEN monto ELSE 0 END) pero se lee mejor.
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_resumen_mensual;
CREATE VIEW public.v_resumen_mensual
WITH (security_invoker = on) AS
SELECT
    t.usuario_id,
    date_trunc('month', t.fecha)::date                                   AS periodo,
    COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'ingreso'), 0)          AS total_ingresos,
    COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'gasto'), 0)            AS total_gastos,
    COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'ingreso'), 0)
      - COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'gasto'), 0)        AS balance,
    COUNT(*)                                                             AS num_transacciones
FROM public.transacciones t
GROUP BY t.usuario_id, date_trunc('month', t.fecha)::date;

COMMENT ON VIEW public.v_resumen_mensual IS
    'Totales de ingresos, gastos y balance por usuario y mes calendario.';


-- -----------------------------------------------------------------------------
-- v_gasto_por_categoria
-- RF-21 y RF-22: insumo del grafico de distribucion y de la tabla de desglose.
-- La funcion de ventana calcula el total del mes para sacar el porcentaje de
-- cada categoria sin necesidad de una segunda consulta.
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_gasto_por_categoria;
CREATE VIEW public.v_gasto_por_categoria
WITH (security_invoker = on) AS
SELECT
    t.usuario_id,
    date_trunc('month', t.fecha)::date  AS periodo,
    t.categoria_id,
    c.nombre                            AS categoria,
    SUM(t.monto)                        AS monto,
    ROUND(
        SUM(t.monto) * 100.0
        / NULLIF(SUM(SUM(t.monto)) OVER (
              PARTITION BY t.usuario_id, date_trunc('month', t.fecha)
          ), 0)
    , 1)                                AS porcentaje
FROM public.transacciones t
JOIN public.categorias c
    ON c.id = t.categoria_id
WHERE t.tipo = 'gasto'
GROUP BY t.usuario_id, date_trunc('month', t.fecha), t.categoria_id, c.nombre;

COMMENT ON VIEW public.v_gasto_por_categoria IS
    'Gasto y participacion porcentual por categoria, por usuario y mes.';


-- #############################################################################
-- 5. AUTOMATIZACIONES
-- #############################################################################

-- -----------------------------------------------------------------------------
-- Mantiene actualizado_en al dia en cada UPDATE
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_actualizar_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transacciones_actualizado ON public.transacciones;
CREATE TRIGGER trg_transacciones_actualizado
    BEFORE UPDATE ON public.transacciones
    FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp();

DROP TRIGGER IF EXISTS trg_presupuestos_actualizado ON public.presupuestos;
CREATE TRIGGER trg_presupuestos_actualizado
    BEFORE UPDATE ON public.presupuestos
    FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_timestamp();


-- -----------------------------------------------------------------------------
-- RF-06. Al crearse una cuenta se copian las categorias predefinidas, de modo
-- que el usuario pueda registrar desde el primer uso sin configurar nada.
--
-- SECURITY DEFINER hace que la funcion corra con los permisos de quien la creo
-- y no de quien la dispara. Es necesario porque en el instante del registro
-- todavia no hay una sesion con permiso para escribir en categorias.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sembrar_categorias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.categorias (usuario_id, nombre, tipo, es_predefinida)
    VALUES
        (NEW.id, 'Alimentación',    'gasto',   true),
        (NEW.id, 'Transporte',      'gasto',   true),
        (NEW.id, 'Vivienda',        'gasto',   true),
        (NEW.id, 'Salud',           'gasto',   true),
        (NEW.id, 'Entretenimiento', 'gasto',   true),
        (NEW.id, 'Otros',           'gasto',   true),
        (NEW.id, 'Salario',         'ingreso', true),
        (NEW.id, 'Otros ingresos',  'ingreso', true)
    -- Seguro por si el disparador llegara a ejecutarse dos veces
    ON CONFLICT (usuario_id, nombre, tipo) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sembrar_categorias ON auth.users;
CREATE TRIGGER trg_sembrar_categorias
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_sembrar_categorias();


-- #############################################################################
-- 6. ROW LEVEL SECURITY
-- #############################################################################
-- Mientras RLS esta deshabilitado, cualquier usuario autenticado del proyecto
-- lee todas las filas. Habilitarlo invierte el comportamiento: sin una politica
-- que lo permita explicitamente, nadie ve nada.

ALTER TABLE public.categorias    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos  ENABLE ROW LEVEL SECURITY;

-- NOTA SOBRE FORCE ROW LEVEL SECURITY
--   No se activa de forma deliberada. El propietario de la tabla omite RLS, y
--   esa excepcion es la que permite que fn_sembrar_categorias (SECURITY
--   DEFINER) inserte las categorias iniciales en el momento del registro,
--   cuando todavia no existe una sesion de usuario. Activar FORCE bloquearia
--   esa siembra y romperia el registro de usuarios nuevos.


-- #############################################################################
-- 7. PERMISOS POR ROL
-- #############################################################################
-- RLS filtra filas; los permisos definen quien puede intentar la operacion.
-- Son dos capas distintas y se necesitan ambas.

-- El rol anonimo (visitante sin sesion) no accede a nada
REVOKE ALL ON public.categorias    FROM anon;
REVOKE ALL ON public.transacciones FROM anon;
REVOKE ALL ON public.presupuestos  FROM anon;
REVOKE ALL ON public.v_estado_presupuesto  FROM anon;
REVOKE ALL ON public.v_resumen_mensual     FROM anon;
REVOKE ALL ON public.v_gasto_por_categoria FROM anon;

-- El rol autenticado puede intentar las cuatro operaciones; que alcancen o no
-- una fila concreta lo deciden las politicas de la seccion 8
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transacciones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presupuestos  TO authenticated;

-- Las vistas son de solo lectura
GRANT SELECT ON public.v_estado_presupuesto  TO authenticated;
GRANT SELECT ON public.v_resumen_mensual     TO authenticated;
GRANT SELECT ON public.v_gasto_por_categoria TO authenticated;


-- #############################################################################
-- 8. POLITICAS DE ACCESO
-- #############################################################################
-- Cuatro politicas por tabla, una por operacion. Doce en total.
--
-- USING      filtra que filas existentes alcanza la operacion.
--            Aplica a SELECT, UPDATE y DELETE.
-- WITH CHECK valida la fila resultante de una escritura.
--            Aplica a INSERT y UPDATE.
--
-- UPDATE necesita las dos: USING impide tocar filas ajenas y WITH CHECK impide
-- que el usuario reasigne una fila propia a otra cuenta. Sin WITH CHECK el
-- sistema seria vulnerable aunque la lectura estuviera bien protegida.

-- -----------------------------------------------------------------------------
-- categorias
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS categorias_select_propias ON public.categorias;
CREATE POLICY categorias_select_propias
    ON public.categorias FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS categorias_insert_propias ON public.categorias;
CREATE POLICY categorias_insert_propias
    ON public.categorias FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS categorias_update_propias ON public.categorias;
CREATE POLICY categorias_update_propias
    ON public.categorias FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS categorias_delete_propias ON public.categorias;
CREATE POLICY categorias_delete_propias
    ON public.categorias FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- -----------------------------------------------------------------------------
-- transacciones
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS transacciones_select_propias ON public.transacciones;
CREATE POLICY transacciones_select_propias
    ON public.transacciones FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS transacciones_insert_propias ON public.transacciones;
CREATE POLICY transacciones_insert_propias
    ON public.transacciones FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS transacciones_update_propias ON public.transacciones;
CREATE POLICY transacciones_update_propias
    ON public.transacciones FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS transacciones_delete_propias ON public.transacciones;
CREATE POLICY transacciones_delete_propias
    ON public.transacciones FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- -----------------------------------------------------------------------------
-- presupuestos
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS presupuestos_select_propios ON public.presupuestos;
CREATE POLICY presupuestos_select_propios
    ON public.presupuestos FOR SELECT TO authenticated
    USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS presupuestos_insert_propios ON public.presupuestos;
CREATE POLICY presupuestos_insert_propios
    ON public.presupuestos FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS presupuestos_update_propios ON public.presupuestos;
CREATE POLICY presupuestos_update_propios
    ON public.presupuestos FOR UPDATE TO authenticated
    USING (auth.uid() = usuario_id)
    WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS presupuestos_delete_propios ON public.presupuestos;
CREATE POLICY presupuestos_delete_propios
    ON public.presupuestos FOR DELETE TO authenticated
    USING (auth.uid() = usuario_id);

-- NOTA SOBRE LAS VISTAS
--   Una vista no admite politicas propias. Las tres se declararon en la
--   seccion 4 con security_invoker = on, de modo que heredan las politicas de
--   las tablas base.


-- #############################################################################
-- 9. COMPROBACION FINAL
-- #############################################################################
-- Resultado esperado: tres filas, rls_activo = t, politicas = 4 en cada una.

SELECT c.relname        AS tabla,
       c.relrowsecurity AS rls_activo,
       count(p.polname) AS politicas
FROM pg_class c
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relname IN ('categorias', 'transacciones', 'presupuestos')
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

-- =============================================================================
-- FIN DEL SCRIPT
--
-- Siguiente paso del cronograma: actividad 1.4 (flujos de interfaz) y 1.5
-- (repositorio, entorno y proyecto base). El desarrollo de la aplicacion
-- comienza el 12 de octubre de 2026 con la Fase 2.
-- =============================================================================
