import { useState } from 'react'
import { useSesion } from '../auth/SesionProvider'
import { traducirError, validarCorreo, validarClave } from '../auth/mensajes'
import { validarNombre } from '../lib/perfil'
import PoliticaDatos from '../componentes/PoliticaDatos'
import { LogoCompleto } from '../componentes/Logo'
import { IconoLlave } from '../componentes/Iconos'
import { ChartPie, ShieldCheck, Sparkles } from 'lucide-react'

/*
 * Pantallas de acceso: registro (RF-01), inicio de sesión (RF-02)
 * y recuperación de contraseña (RF-05).
 * Las tres comparten la misma tarjeta y cambian de modo sin recargar la página.
 */

const TITULOS = {
  login: { titulo: 'Iniciar sesión', sub: null, boton: 'Entrar' },
  registro: { titulo: 'Crear cuenta', sub: null, boton: 'Crear cuenta' },
  recuperar: { titulo: 'Recuperar contraseña', sub: 'Te enviamos un enlace para definir una nueva.', boton: 'Enviar enlace' },
}

export default function Acceso() {
  const { registrar, iniciar, recuperar } = useSesion()

  const [modo, setModo] = useState('login')
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [autoriza, setAutoriza] = useState(false)
  const [verPolitica, setVerPolitica] = useState(false)

  function cambiarModo(nuevo) {
    setModo(nuevo)
    setErrores({})
    setAviso(null)
    setClave('')
    setConfirmacion('')
  }

  async function enviar(evento) {
    evento.preventDefault()
    setAviso(null)

    // Validación en el cliente antes de llamar al servicio
    const nuevos = {}
    if (modo === 'registro') {
      const errorNombre = validarNombre(nombre)
      if (errorNombre) nuevos.nombre = errorNombre
    }
    const errorCorreo = validarCorreo(correo)
    if (errorCorreo) nuevos.correo = errorCorreo

    // La política de complejidad aplica al crear la contraseña, no al entrar:
    // una contraseña antigua válida no debe quedar bloqueada en el cliente
    if (modo === 'registro') {
      const errorClave = validarClave(clave)
      if (errorClave) nuevos.clave = errorClave
    }
    if (modo === 'login' && !clave) {
      nuevos.clave = 'Escribe tu contraseña.'
    }
    if (modo === 'registro' && clave !== confirmacion) {
      nuevos.confirmacion = 'Las contraseñas no coinciden.'
    }
    // RNF-12. Autorización previa, expresa e informada
    if (modo === 'registro' && !autoriza) {
      nuevos.autoriza = 'Para crear la cuenta debes aceptar la política de tratamiento de datos.'
    }

    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return

    setEnviando(true)
    try {
      if (modo === 'registro') {
        const { data, error } = await registrar(correo.trim(), clave, nombre.trim())
        if (error) {
          setErrores({ general: traducirError(error) })
        } else if (!data.session) {
          // El proyecto exige confirmación por correo
          setModo('login')
          setClave('')
          setConfirmacion('')
          setAviso('Cuenta creada. Confirma tu correo y vuelve a entrar.')
        }
        // Con confirmación desactivada la sesión queda abierta y App cambia sola de pantalla
      } else if (modo === 'login') {
        const { error } = await iniciar(correo.trim(), clave)
        if (error) setErrores({ general: traducirError(error) })
      } else {
        const { error } = await recuperar(correo.trim())
        if (error) {
          setErrores({ general: traducirError(error) })
        } else {
          setAviso('Si el correo está registrado, recibirás el enlace en unos minutos.')
        }
      }
    } finally {
      setEnviando(false)
    }
  }

  const texto = TITULOS[modo]

  // Registro paso a paso: la pista aparece al empezar a escribir la contraseña
  // y se va cuando ya cumple; la confirmación aparece cuando la contraseña es válida.
  const claveValida = validarClave(clave) === null
  const verPista = modo === 'registro' && clave.length > 0 && !claveValida && !errores.clave
  const verConfirmacion = modo === 'registro' && (claveValida || confirmacion.length > 0)

  return (
    <main className="acceso">
      <aside className="acceso-panel" aria-hidden="true">
        <LogoCompleto tono="oscuro" />
        <div className="acceso-panel-centro">
          <IlustracionPanel />
          <p className="acceso-lema">Tu dinero, tu control.</p>
          <p className="acceso-panel-texto">Registra lo que entra y lo que sale, ponle topes a tus gastos y entiende tu mes de un vistazo.</p>
          <ul className="acceso-beneficios">
            <li><ChartPie size={18} /> Resumen visual de tu mes</li>
            <li><Sparkles size={18} /> Un movimiento en segundos, sin vincular tu banco</li>
            <li><ShieldCheck size={18} /> Tus datos solo los ves tú</li>
          </ul>
        </div>
      </aside>

      <div className="acceso-lado">
      <form className="tarjeta acceso-tarjeta" onSubmit={enviar} noValidate>
        <div className="acceso-logo-movil"><LogoCompleto tono="claro" /></div>
        <h1>{texto.titulo}</h1>
        {texto.sub && <p className="sub">{texto.sub}</p>}

        {modo === 'registro' && (
          <div className="campo">
            <label htmlFor="nombre">¿Cómo te llamas?</label>
            <input
              id="nombre"
              autoComplete="given-name"
              maxLength={40}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            {errores.nombre && <p className="error">{errores.nombre}</p>}
          </div>
        )}

        <div className="campo">
          <label htmlFor="correo">Correo electrónico</label>
          <input
            id="correo"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
          {errores.correo && <p className="error">{errores.correo}</p>}
        </div>

        {modo !== 'recuperar' && (
          <div className="campo">
            <label htmlFor="clave">Contraseña</label>
            <input
              id="clave"
              type="password"
              autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
            {verPista && <p className="pista">Mínimo 8 caracteres, con letras y números.</p>}
            {errores.clave && <p className="error">{errores.clave}</p>}
          </div>
        )}

        {verConfirmacion && (
          <div className="campo">
            <label htmlFor="confirmacion">Confirmar contraseña</label>
            <input
              id="confirmacion"
              type="password"
              autoComplete="new-password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />
            {errores.confirmacion && <p className="error">{errores.confirmacion}</p>}
          </div>
        )}

        {modo === 'registro' && (
          <div className="campo casilla">
            <label htmlFor="autoriza">
              <input id="autoriza" type="checkbox" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} />
              <span>
                Autorizo el tratamiento de mis datos según la{' '}
                <button type="button" className="enlace" onClick={() => setVerPolitica(true)}>política de tratamiento de datos</button>.
              </span>
            </label>
            {errores.autoriza && <p className="error">{errores.autoriza}</p>}
          </div>
        )}

        {errores.general && <p className="error bloque">{errores.general}</p>}
        {aviso && <p className="aviso">{aviso}</p>}

        <button className="boton" type="submit" disabled={enviando}>
          {enviando ? 'Un momento...' : texto.boton}
        </button>

        <div className="enlaces">
          {modo === 'login' && (
            <>
              <p><button type="button" className="enlace con-icono" onClick={() => cambiarModo('recuperar')}><IconoLlave />Olvidé mi contraseña</button></p>
              <p>¿Primera vez? <button type="button" className="enlace" onClick={() => cambiarModo('registro')}>Crea tu cuenta</button></p>
            </>
          )}
          {modo === 'registro' && (
            <p>¿Ya tienes cuenta? <button type="button" className="enlace" onClick={() => cambiarModo('login')}>Inicia sesión</button></p>
          )}
          {modo === 'recuperar' && (
            <p><button type="button" className="enlace" onClick={() => cambiarModo('login')}>Volver al inicio de sesión</button></p>
          )}
        </div>
      </form>
      </div>

      {verPolitica && (
        <div className="velo" role="dialog" aria-modal="true" aria-label="Política de tratamiento de datos">
          <div className="modal amplio">
            <h2>Tratamiento de datos personales</h2>
            <PoliticaDatos />
            <div className="par" style={{ marginTop: 16 }}>
              <button className="boton" onClick={() => setVerPolitica(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

/* Ilustración decorativa del panel: una tarjeta de resumen con barras y un anillo */
function IlustracionPanel() {
  return (
    <svg className="acceso-ilustracion" viewBox="0 0 320 190" role="presentation">
      <rect x="0" y="0" width="320" height="190" rx="22" fill="rgb(255 255 255 / 0.08)" stroke="rgb(255 255 255 / 0.16)" />
      <rect x="22" y="22" width="92" height="10" rx="5" fill="rgb(255 255 255 / 0.35)" />
      <rect x="22" y="40" width="140" height="18" rx="6" fill="#ffffff" />
      <g>
        {[
          [26, 70, '#4f9e78'], [52, 52, '#d4785c'], [78, 88, '#4f9e78'], [104, 60, '#d4785c'],
          [130, 100, '#4f9e78'], [156, 48, '#d4785c'], [182, 110, '#4f9e78'], [208, 66, '#d4785c'],
        ].map(([x, h, c], i) => (
          <rect key={i} x={x} y={172 - h} width="18" height={h} rx="5" fill={c} opacity="0.9" />
        ))}
      </g>
      <circle cx="270" cy="62" r="30" fill="none" stroke="rgb(255 255 255 / 0.16)" strokeWidth="12" />
      <circle cx="270" cy="62" r="30" fill="none" stroke="#d9a33a" strokeWidth="12" strokeDasharray="120 189" transform="rotate(-90 270 62)" strokeLinecap="round" />
      <circle cx="270" cy="62" r="30" fill="none" stroke="#8fb3e0" strokeWidth="12" strokeDasharray="40 189" strokeDashoffset="-126" transform="rotate(-90 270 62)" strokeLinecap="round" />
      <rect x="244" y="118" width="54" height="8" rx="4" fill="rgb(255 255 255 / 0.3)" />
      <rect x="244" y="134" width="40" height="8" rx="4" fill="rgb(255 255 255 / 0.2)" />
    </svg>
  )
}

