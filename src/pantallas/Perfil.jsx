import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/SesionProvider'
import { traducirError, validarClave } from '../auth/mensajes'
import { fechaLarga, hoyISO } from '../lib/formato'
import { exportarDatos, descargarJSON } from '../lib/exportar'
import { motion } from 'framer-motion'
import { UserRound, KeyRound, Download, ShieldAlert, LogOut, FileText, Check } from 'lucide-react'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import { nombreDe, validarNombre } from '../lib/perfil'

/*
 * Perfil y ajustes de la cuenta.
 * Cambio de contraseña contra el servicio de autenticación.
 * RNF-13: exportación de todos los datos y eliminación de la cuenta.
 * Solo expone operaciones que el sistema ejecuta de verdad.
 */

export default function Perfil({ categorias, onIrAPrivacidad }) {
  const { usuario, cerrar, actualizarPerfil } = useSesion()

  const [nombre, setNombre] = useState(nombreDe(usuario) ?? '')
  const [erroresPerfil, setErroresPerfil] = useState({})
  const [avisoPerfil, setAvisoPerfil] = useState(null)
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

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

  async function guardarPerfil(evento) {
    evento.preventDefault()
    setAvisoPerfil(null)
    const e = {}
    const errorNombre = validarNombre(nombre)
    if (errorNombre) e.nombre = errorNombre
    setErroresPerfil(e)
    if (Object.keys(e).length > 0) return

    setGuardandoPerfil(true)
    const { error } = await actualizarPerfil({ nombre: nombre.trim() })
    setGuardandoPerfil(false)
    if (error) {
      console.error('[perfil]', error)
      setErroresPerfil({ general: 'No se pudo guardar. Intenta de nuevo.' })
      return
    }
    setAvisoPerfil('Listo, guardamos tus cambios.')
  }

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

  const inicial = (nombreDe(usuario) ?? usuario?.email ?? '?').charAt(0).toUpperCase()
  const aparecer = (i) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05 } })

  return (
    <div className="pantalla">
      <EncabezadoPagina
        rotulo="Perfil"
        titulo="Tu cuenta"
        resumen="Tus datos, tu seguridad y el control sobre tu información."
      />

      <motion.section className="tarjeta-t perfil-cabeza" {...aparecer(0)}>
        <span className="avatar" aria-hidden="true">{inicial}</span>
        <div className="perfil-cabeza-texto">
          <h2>{nombreDe(usuario) ?? 'Sin nombre todavía'}</h2>
          <p>{usuario?.email}</p>
          {creada && <p className="perfil-desde">En WebFinanzas desde el {creada} · {gastos} categorías de gasto y {ingresos} de ingreso</p>}
        </div>
        <button className="boton fantasma auto con-icono" onClick={cerrar}><LogOut size={17} /> Cerrar sesión</button>
      </motion.section>

      <div className="perfil-rejilla">
        <motion.section className="tarjeta-t" {...aparecer(1)}>
          <div className="seccion-cabeza">
            <span className="kpi-icono"><UserRound size={20} /></span>
            <div><h2>Datos personales</h2><p className="tarjeta-t-sub">Así te saludamos cada vez que entras</p></div>
          </div>
          <form onSubmit={guardarPerfil} noValidate>
            <div className="campo">
              <label htmlFor="perfil-nombre">Tu nombre</label>
              <input id="perfil-nombre" autoComplete="given-name" maxLength={40}
                value={nombre} onChange={(e) => setNombre(e.target.value)} />
              {erroresPerfil.nombre && <p className="error">{erroresPerfil.nombre}</p>}
            </div>
            <div className="campo">
              <label htmlFor="perfil-correo">Correo electrónico</label>
              <input id="perfil-correo" type="email" value={usuario?.email ?? ''} readOnly />
              <p className="pista">Es el correo con el que entras. No se puede cambiar desde aquí.</p>
            </div>
            {erroresPerfil.general && <p className="error bloque">{erroresPerfil.general}</p>}
            {avisoPerfil && <p className="aviso con-icono"><Check size={16} /> {avisoPerfil}</p>}
            <button className="boton auto" type="submit" disabled={guardandoPerfil}>
              {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </motion.section>

        <motion.section className="tarjeta-t" {...aparecer(2)}>
          <div className="seccion-cabeza">
            <span className="kpi-icono"><KeyRound size={20} /></span>
            <div><h2>Contraseña</h2><p className="tarjeta-t-sub">Cámbiala cuando quieras</p></div>
          </div>
          <form onSubmit={cambiarClave} noValidate>
            <div className="campo">
              <label htmlFor="nueva">Contraseña nueva</label>
              <input id="nueva" type="password" autoComplete="new-password"
                value={clave} onChange={(e) => setClave(e.target.value)} />
              {clave && !errores.clave && validarClave(clave) && <p className="pista">Mínimo 8 caracteres, con letras y números.</p>}
              {errores.clave && <p className="error">{errores.clave}</p>}
            </div>
            <div className="campo">
              <label htmlFor="confirmar">Confirmar contraseña</label>
              <input id="confirmar" type="password" autoComplete="new-password"
                value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
              {errores.confirmacion && <p className="error">{errores.confirmacion}</p>}
            </div>
            {errores.general && <p className="error bloque">{errores.general}</p>}
            {aviso && <p className="aviso con-icono"><Check size={16} /> {aviso}</p>}
            <button className="boton auto" type="submit" disabled={guardando}>
              {guardando ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </motion.section>

        <motion.section className="tarjeta-t" {...aparecer(3)}>
          <div className="seccion-cabeza">
            <span className="kpi-icono verde"><Download size={20} /></span>
            <div><h2>Tus datos</h2><p className="tarjeta-t-sub">Una copia completa cuando la necesites</p></div>
          </div>
          <p className="texto-seccion">
            Descarga tus categorías, movimientos y topes en un archivo JSON. Es tu derecho a conocer tus datos (Ley 1581 de 2012).
          </p>
          {avisoDatos && <p className="aviso con-icono"><Check size={16} /> {avisoDatos}</p>}
          {errorDatos && <p className="error bloque">{errorDatos}</p>}
          <div className="acciones-seccion">
            <button className="boton auto con-icono" onClick={exportar} disabled={exportando}>
              <Download size={17} /> {exportando ? 'Generando...' : 'Exportar mis datos'}
            </button>
            <button className="boton fantasma auto con-icono" onClick={onIrAPrivacidad}><FileText size={17} /> Política de datos</button>
          </div>
        </motion.section>

        <motion.section className="tarjeta-t zona-cuidado" {...aparecer(4)}>
          <div className="seccion-cabeza">
            <span className="kpi-icono terracota"><ShieldAlert size={20} /></span>
            <div><h2>Eliminar la cuenta</h2><p className="tarjeta-t-sub">Esta acción no se puede deshacer</p></div>
          </div>
          <p className="texto-seccion">
            Borra la cuenta y todos sus datos de inmediato. Es tu derecho a suprimir tus datos y revocar la autorización. Te recomendamos exportar antes.
          </p>
          <div className="acciones-seccion">
            <button className="boton peligro auto" onClick={() => { setModalBorrar(true); setCorreoEscrito(''); setErrorBorrar(null) }}>
              Eliminar mi cuenta
            </button>
          </div>
        </motion.section>
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
    </div>
  )
}
