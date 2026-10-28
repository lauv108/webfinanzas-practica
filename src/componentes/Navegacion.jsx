import { useSesion } from '../auth/SesionProvider'
import {
  IconoMarca, IconoResumen, IconoTransacciones, IconoPresupuesto, IconoPerfil, IconoSalir,
} from './Iconos'

/*
 * Navegación principal.
 * En escritorio es un riel vertical de iconos; por debajo de 768 px se
 * convierte en una barra inferior con rótulo, que es donde el pulgar alcanza
 * (RNF-05, operable desde 360 px).
 */

const SECCIONES = [
  { clave: 'resumen', texto: 'Resumen', Icono: IconoResumen },
  { clave: 'transacciones', texto: 'Movimientos', Icono: IconoTransacciones },
  { clave: 'presupuesto', texto: 'Presupuesto', Icono: IconoPresupuesto },
  { clave: 'perfil', texto: 'Perfil', Icono: IconoPerfil },
]

export default function Navegacion({ activa, onCambiar }) {
  const { cerrar } = useSesion()

  return (
    <nav className="riel" aria-label="Secciones">
      <span className="riel-marca" title="WebFinanzas"><IconoMarca /></span>

      <ul className="riel-lista">
        {SECCIONES.map(({ clave, texto, Icono }) => (
          <li key={clave}>
            <button
              className="riel-boton"
              aria-label={texto}
              title={texto}
              aria-current={activa === clave ? 'page' : undefined}
              onClick={() => onCambiar(clave)}
            >
              <Icono />
              <span className="riel-texto">{texto}</span>
            </button>
          </li>
        ))}
      </ul>

      <button className="riel-boton riel-salir" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={cerrar}>
        <IconoSalir />
        <span className="riel-texto">Salir</span>
      </button>
    </nav>
  )
}
