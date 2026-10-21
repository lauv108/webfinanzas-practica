import { useSesion } from '../auth/SesionProvider'

/* Barra superior. RF-03: cerrar sesión disponible desde cualquier pantalla. */

const PESTANAS = [
  { clave: 'resumen', texto: 'Resumen' },
  { clave: 'transacciones', texto: 'Transacciones' },
  { clave: 'presupuesto', texto: 'Presupuesto', pendiente: true },
]

export default function Barra({ activa, onCambiar }) {
  const { cerrar } = useSesion()

  return (
    <header className="barra">
      <span className="marca">WebFinanzas</span>
      <nav className="pestanas">
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            className="pestana"
            aria-current={activa === p.clave ? 'true' : undefined}
            disabled={p.pendiente}
            title={p.pendiente ? 'Fase 3' : undefined}
            onClick={() => onCambiar(p.clave)}
          >
            {p.texto}
          </button>
        ))}
        <button className="pestana salir" onClick={cerrar}>Cerrar sesión</button>
      </nav>
    </header>
  )
}
