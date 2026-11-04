import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/SesionProvider'
import { traducirError, validarClave } from '../auth/mensajes'
import { fechaLarga, hoyISO } from '../lib/formato'
import { exportarDatos, descargarJSON } from '../lib/exportar'
import EncabezadoPagina from '../componentes/EncabezadoPagina'

/*
 * Perfil y ajustes de la cuenta.
 * Cambio de contraseña contra el servicio de autenticación.
 * RNF-13: exportación de todos los datos y eliminación de la cuenta.
 * Solo expone operaciones que el sistema ejecuta de verdad.
 */

export default function Perfil({ categorias, onIrAPrivacidad }) {
  const { usuario, cerrar } = useSesion()

  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const [exportando, setExportando] = useState(false)
  const [avisoDatos, setAvisoDatos] = useState(null)
  const [errorDatos, setErrorDatos] = useState(null)

  const [modalBorrar, setModalBorrar] = useState(false)
  const [correoEscrito, setCorreoEscrito] = useState('')
  const [borrando, setBorrando] = useState(false)
  const [errorBorrar, setErrorBorrar] = useState(null)

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

  async function exportar() {
    setExportando(true)
    setAvisoDatos(null)
    setErrorDatos(null)
    try {
      const datos = await exportarDatos(usuario)
      descargarJSON(datos, `webfinanzas_datos_${hoyISO()}.json`)
      setAvisoDatos(
        `Archivo generado con ${datos.transacciones.length} movimientos, ` +
        `${datos.categorias.length} categorías y ${datos.presupuestos.length} topes.`,
      )
    } catch (error) {
      console.error('[exportar]', error)
      setErrorDatos('No se pudo generar el archivo. Intenta de nuevo.')
    } finally {
      setExportando(false)
    }
  }

  async function eliminarCuenta() {
    setBorrando(true)
    setErrorBorrar(null)
    const { error } = await supabase.rpc('eliminar_cuenta')
    if (error) {
      console.error('[eliminar_cuenta]', error)
      setBorrando(false)
      setErrorBorrar(
        error.code === 'PGRST202' || error.code === '42883'
          ? 'La eliminación de cuenta no está habilitada en el servidor todavía.'
          : 'No se pudo eliminar la cuenta. Intenta de nuevo.',
      )
      return
    }
    await cerrar()
  }

  const puedeBorrar = correoEscrito.trim().toLowerCase() === (usuario?.email ?? '').toLowerCase()

  return (
    <>
      <EncabezadoPagina
        rotulo="Perfil y ajustes"
        titulo="Tu cuenta"
        resumen={usuario?.email}
      />

      <div className="rejilla-dos">
        <section className="tarjeta ancha">
          <div className="tarjeta-encabezado"><h2>Datos de la cuenta</h2></div>
          <dl className="definiciones">
            <div><dt>Correo</dt><dd>{usuario?.email}</dd></div>
            {creada && <div><dt>Cuenta creada</dt><dd>{creada}</dd></div>}
            <div><dt>Categorías</dt><dd>{gastos} de gasto y {ingresos} de ingreso</dd></div>
            <div>
              <dt>Aislamiento de datos</dt>
              <dd>Tus movimientos solo son visibles desde esta cuenta. El filtro vive en la base de datos, no en esta pantalla.</dd>
            </div>
          </dl>
          <div className="par par-fin">
            <button className="boton fantasma auto" onClick={cerrar}>Cerrar sesión</button>
          </div>
        </section>

        <section className="tarjeta ancha">
          <div className="tarjeta-encabezado"><h2>Cambiar contraseña</h2></div>
          <form onSubmit={cambiarClave} noValidate>
            <div className="campo">
              <label htmlFor="nueva">Contraseña nueva</label>
              <input id="nueva" type="password" autoComplete="new-password"
                value={clave} onChange={(e) => setClave(e.target.value)} />
              {!errores.clave && <p className="pista">Mínimo 8 caracteres, con letras y números.</p>}
              {errores.clave && <p className="error">{errores.clave}</p>}
            </div>
            <div className="campo">
              <label htmlFor="confirmar">Confirmar contraseña</label>
              <input id="confirmar" type="password" autoComplete="new-password"
                value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
              {errores.confirmacion && <p className="error">{errores.confirmacion}</p>}
            </div>
            {errores.general && <p className="error bloque">{errores.general}</p>}
            {aviso && <p className="aviso">{aviso}</p>}
            <button className="boton" type="submit" disabled={guardando}>
              {guardando ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </section>
      </div>

      <div className="rejilla-dos">
        <section className="tarjeta ancha">
          <div className="tarjeta-encabezado"><h2>Tus datos</h2></div>
          <p className="sub">
            Descarga una copia completa de tu cuenta: categorías, movimientos y topes, en un archivo
            JSON legible. Es tu derecho a conocer tus datos (Ley 1581 de 2012).
          </p>
          {avisoDatos && <p className="aviso">{avisoDatos}</p>}
          {errorDatos && <p className="error bloque">{errorDatos}</p>}
          <div className="par par-fin" style={{ marginTop: 0 }}>
            <button className="boton auto" onClick={exportar} disabled={exportando}>
              {exportando ? 'Generando...' : 'Exportar mis datos'}
            </button>
            <button className="enlace" onClick={onIrAPrivacidad}>Leer la política de tratamiento de datos</button>
          </div>
        </section>

        <section className="tarjeta ancha peligrosa">
          <div className="tarjeta-encabezado"><h2>Eliminar la cuenta</h2></div>
          <p className="sub">
            Borra la cuenta y todos sus datos de forma inmediata e irreversible. Es tu derecho a
            suprimir tus datos y revocar la autorización. Conviene exportar antes.
          </p>
          <div className="par par-fin" style={{ marginTop: 0 }}>
            <button className="boton peligro auto" onClick={() => { setModalBorrar(true); setCorreoEscrito(''); setErrorBorrar(null) }}>
              Eliminar mi cuenta
            </button>
          </div>
        </section>
      </div>

      {modalBorrar && (
        <div className="velo" role="dialog" aria-modal="true" aria-label="Confirmar eliminación de la cuenta">
          <div className="modal">
            <h2>¿Eliminar tu cuenta?</h2>
            <p className="sub">
              Se borran la cuenta, {gastos + ingresos} categorías y todos tus movimientos y topes.
              No hay forma de recuperarlos después.
            </p>
            <div className="campo">
              <label htmlFor="confirmar-correo">Escribe tu correo para confirmar</label>
              <input id="confirmar-correo" type="email" autoComplete="off"
                value={correoEscrito} onChange={(e) => setCorreoEscrito(e.target.value)}
                placeholder={usuario?.email} />
            </div>
            {errorBorrar && <p className="error bloque">{errorBorrar}</p>}
            <div className="par">
              <button className="boton fantasma" onClick={() => setModalBorrar(false)} disabled={borrando}>Cancelar</button>
              <button className="boton peligro" onClick={eliminarCuenta} disabled={!puedeBorrar || borrando}>
                {borrando ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
