import { useState } from 'react'
import { useSesion } from '../auth/SesionProvider'
import { traducirError, validarCorreo, validarClave } from '../auth/mensajes'
import PoliticaDatos from '../componentes/PoliticaDatos'

/*
 * Pantallas de acceso: registro (RF-01), inicio de sesión (RF-02)
 * y recuperación de contraseña (RF-05).
 * Las tres comparten la misma tarjeta y cambian de modo sin recargar la página.
 */

const TITULOS = {
  login: { titulo: 'Iniciar sesión', sub: 'WebFinanzas: tu dinero, tu control.', boton: 'Entrar' },
  registro: { titulo: 'Crear cuenta', sub: 'Tus datos quedan asociados solo a tu correo.', boton: 'Crear cuenta' },
  recuperar: { titulo: 'Recuperar contraseña', sub: 'Te enviamos un enlace para definir una nueva.', boton: 'Enviar enlace' },
}

export default function Acceso() {
  const { registrar, iniciar, recuperar } = useSesion()

  const [modo, setModo] = useState('login')
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
    const errorCorreo = validarCorreo(correo)
    if (errorCorreo) nuevos.correo = errorCorreo

    if (modo !== 'recuperar') {
      const errorClave = validarClave(clave)
      if (errorClave) nuevos.clave = errorClave
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
        const { data, error } = await registrar(correo.trim(), clave)
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

  return (
    <main className="acceso">
      <form className="tarjeta" onSubmit={enviar} noValidate>
        <h1>{texto.titulo}</h1>
        <p className="sub">{texto.sub}</p>

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
            {modo === 'registro' && !errores.clave && <p className="pista">Mínimo 8 caracteres.</p>}
            {errores.clave && <p className="error">{errores.clave}</p>}
          </div>
        )}

        {modo === 'registro' && (
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
              <p><button type="button" className="enlace" onClick={() => cambiarModo('recuperar')}>Olvidé mi contraseña</button></p>
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
