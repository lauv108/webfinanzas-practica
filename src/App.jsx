import { useState } from 'react'
import { supabase } from './lib/supabase'

const CORREO = 'prueba.a@webfinanzas.test'
const CLAVE = 'Prueba123!'

export default function App() {
  const [estado, setEstado] = useState('inicial')
  const [mensaje, setMensaje] = useState('')
  const [categorias, setCategorias] = useState([])

  async function probarConexion() {
    setEstado('cargando')
    setMensaje('')
    setCategorias([])

    const { error: errorSesion } = await supabase.auth.signInWithPassword({
      email: CORREO,
      password: CLAVE,
    })

    if (errorSesion) {
      setEstado('error')
      setMensaje('No se pudo iniciar sesion: ' + errorSesion.message)
      return
    }

    const { data, error: errorDatos } = await supabase
      .from('categorias')
      .select('nombre, tipo')
      .order('tipo')
      .order('nombre')

    if (errorDatos) {
      setEstado('error')
      setMensaje('Sesion abierta, pero la consulta fallo: ' + errorDatos.message)
      return
    }

    setCategorias(data)
    setEstado('listo')
    setMensaje('Conexion correcta. ' + data.length + ' categorias recuperadas.')
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    setEstado('inicial')
    setCategorias([])
    setMensaje('Sesion cerrada.')
  }

  const color = estado === 'listo' ? '#1C7544' : estado === 'error' ? '#A82F2F' : '#4D5B6B'

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '3rem auto', padding: '0 1rem', lineHeight: 1.6 }}>
      <h1 style={{ marginBottom: '0.25rem' }}>WebFinanzas</h1>
      <p style={{ color: '#4D5B6B', marginTop: 0 }}>Prueba de conexion con la base de datos</p>

      <div style={{ display: 'flex', gap: '0.6rem', margin: '1.5rem 0' }}>
        <button onClick={probarConexion} disabled={estado === 'cargando'} style={{ padding: '0.6rem 1.1rem', fontSize: '1rem', cursor: 'pointer' }}>
          {estado === 'cargando' ? 'Conectando...' : 'Probar conexion'}
        </button>
        {estado === 'listo' && (
          <button onClick={cerrarSesion} style={{ padding: '0.6rem 1.1rem', fontSize: '1rem', cursor: 'pointer' }}>
            Cerrar sesion
          </button>
        )}
      </div>

      {mensaje && <p style={{ color: color, fontWeight: 600 }}>{mensaje}</p>}

      {categorias.length > 0 && (
        <ul>
          {categorias.map((c) => (
            <li key={c.nombre + c.tipo}>
              {c.nombre} <small style={{ color: '#76838F' }}>({c.tipo})</small>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
