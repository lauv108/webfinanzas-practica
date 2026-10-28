import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/SesionProvider'
import { traducirError, validarClave } from '../auth/mensajes'
import { fechaLarga } from '../lib/formato'
import EncabezadoPagina from '../componentes/EncabezadoPagina'

/*
 * Perfil y ajustes de la cuenta.
 *
 * Solo expone lo que el sistema sabe hacer hoy. El cambio de contraseña usa el
 * servicio de autenticación de la plataforma y es una operación real; no hay
 * controles de adorno para funciones que no existen.
 *
 * La exportación y la eliminación de la cuenta (RNF-13) no están construidas
 * todavía y por eso no aparecen aquí.
 */

export default function Perfil({ categorias }) {
  const { usuario, cerrar } = useSesion()

  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const gastos = categorias.filter((c) => c.tipo === 'gasto').length
  const ingresos = categorias.filter((c) => c.tipo === 'ingreso').length
  const creada = usuario?.created_at ? fechaLarga(usuario.created_at.slice(0, 10)) : null

  async function cambiarClave(evento) {
    evento.preventDefault()
    setAviso(null)

    const e = {}
    const errorClave = validarClave(clave)
    if (errorClave) e.clave = errorClave
    if (clave !== confirmacion) e.confirmacion = 'Las contraseñas no coinciden.'

    setErrores(e)
    if (Object.keys(e).length > 0) return

    setGuardando(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: clave })
      if (error) {
        console.error('[perfil]', error)
        setErrores({ general: traducirError(error) })
        return
      }
      setClave('')
      setConfirmacion('')
      setAviso('Contraseña actualizada. La próxima vez entra con la nueva.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <EncabezadoPagina
        rotulo="Perfil y ajustes"
        titulo="Tu cuenta"
        resumen={usuario?.email}
      />

      <div className="rejilla-dos">
        <section className="tarjeta ancha">
          <div className="tarjeta-encabezado">
            <h2>Datos de la cuenta</h2>
          </div>

          <dl className="definiciones">
            <div>
              <dt>Correo</dt>
              <dd>{usuario?.email}</dd>
            </div>
            {creada && (
              <div>
                <dt>Cuenta creada</dt>
                <dd>{creada}</dd>
              </div>
            )}
            <div>
              <dt>Categorías</dt>
              <dd>{gastos} de gasto y {ingresos} de ingreso</dd>
            </div>
            <div>
              <dt>Aislamiento de datos</dt>
              <dd>
                Tus movimientos solo son visibles desde esta cuenta. El filtro vive
                en la base de datos, no en esta pantalla.
              </dd>
            </div>
          </dl>

          <div className="par par-fin">
            <button className="boton fantasma auto" onClick={cerrar}>Cerrar sesión</button>
          </div>
        </section>

        <section className="tarjeta ancha">
          <div className="tarjeta-encabezado">
            <h2>Cambiar contraseña</h2>
          </div>

          <form onSubmit={cambiarClave} noValidate>
            <div className="campo">
              <label htmlFor="nueva">Contraseña nueva</label>
              <input
                id="nueva" type="password" autoComplete="new-password"
                value={clave} onChange={(e) => setClave(e.target.value)}
              />
              {!errores.clave && <p className="pista">Mínimo 8 caracteres.</p>}
              {errores.clave && <p className="error">{errores.clave}</p>}
            </div>

            <div className="campo">
              <label htmlFor="confirmar">Confirmar contraseña</label>
              <input
                id="confirmar" type="password" autoComplete="new-password"
                value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)}
              />
              {errores.confirmacion && <p className="error">{errores.confirmacion}</p>}
            </div>

            {errores.general && <p className="error bloque">{errores.general}</p>}
            {aviso && <p className="aviso">{aviso}</p>}

            <button className="boton" type="submit" disabled={guardando}>
              {guardando ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>

          <p className="pista">
            El cambio se hace contra el servicio de autenticación. La contraseña no
            pasa por la base de datos de la aplicación ni queda registrada en ella.
          </p>
        </section>
      </div>

      <section className="tarjeta ancha">
        <div className="tarjeta-encabezado">
          <h2>Pendiente de construir</h2>
        </div>
        <p className="sub" style={{ marginBottom: 0 }}>
          La exportación y la eliminación de los datos personales (RNF-13) están
          previstas y todavía no se han implementado. Se anuncian aquí para no
          mostrar controles que no funcionan.
        </p>
      </section>
    </>
  )
}
