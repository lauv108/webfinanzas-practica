-- =============================================================================
-- WebFinanzas - Eliminacion de la cuenta propia (RNF-13, Ley 1581 de 2012)
-- Motor:   PostgreSQL 15+ (Supabase)
-- Version: 1.0
-- Fecha:   04/11/2026
--
-- PROPOSITO
--   Permitir que un usuario autenticado elimine su propia cuenta y, con ella,
--   todos sus datos. El cliente de la aplicacion no puede borrar filas de
--   auth.users; esta funcion lo hace en su nombre, y solo para la cuenta con
--   la que se llama.
--
-- COMO FUNCIONA
--   SECURITY DEFINER hace que la funcion corra con los permisos de quien la
--   creo (el propietario del esquema) y no de quien la invoca. Dentro, la unica
--   fila que se toca es la de auth.uid(), el usuario de la sesion actual: no
--   recibe parametros, de modo que no hay forma de pasarle otro identificador.
--
--   Las tablas categorias, transacciones y presupuestos tienen ON DELETE
--   CASCADE sobre auth.users, asi que borrar la cuenta borra sus datos en la
--   misma transaccion.
--
-- EJECUCION
--   Supabase > SQL Editor > pegar y ejecutar. Idempotente.
--
-- USO DESDE LA APLICACION
--   supabase.rpc('eliminar_cuenta')  con una sesion activa.
-- =============================================================================


CREATE OR REPLACE FUNCTION public.eliminar_cuenta()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_usuario uuid := auth.uid();
BEGIN
    -- Sin sesion no hay nada que borrar. Se rechaza en vez de hacer nada en
    -- silencio, para que el cliente reciba un error y no un falso exito.
    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'No hay una sesion activa'
            USING ERRCODE = '28000';
    END IF;

    -- El CASCADE de las tres tablas de negocio se encarga del resto.
    DELETE FROM auth.users WHERE id = v_usuario;
END;
$$;

COMMENT ON FUNCTION public.eliminar_cuenta() IS
    'Elimina la cuenta del usuario autenticado y todos sus datos (RNF-13).';

-- Solo un usuario con sesion puede invocarla. Ni el rol anonimo ni nadie mas.
REVOKE ALL ON FUNCTION public.eliminar_cuenta() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.eliminar_cuenta() FROM anon;
GRANT EXECUTE ON FUNCTION public.eliminar_cuenta() TO authenticated;


-- =============================================================================
-- COMPROBACION
-- =============================================================================
-- Esperado: una fila, permisos_elevados = true, search_path fijado,
-- y en la columna de permisos solo authenticated con EXECUTE.

SELECT
    pr.proname                                       AS funcion,
    pr.prosecdef                                     AS permisos_elevados,
    array_to_string(pr.proconfig, ', ')              AS configuracion,
    pg_get_function_identity_arguments(pr.oid)       AS argumentos
FROM pg_proc pr
WHERE pr.pronamespace = 'public'::regnamespace
  AND pr.proname = 'eliminar_cuenta';

SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE specific_schema = 'public'
  AND routine_name = 'eliminar_cuenta'
ORDER BY grantee;
