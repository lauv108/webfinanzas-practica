import { LayoutDashboard, ChartColumn, ArrowLeftRight, ChartPie, User, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useSesion } from '../auth/SesionProvider'
import { LogoCompleto, LogoIcono } from './Logo'

/*
 * Navegación principal.
 * En escritorio es una barra lateral con el logo y los rótulos, que se puede
 * colapsar para dejar solo los íconos. Por debajo de 768 px se convierte en
 * una barra inferior, que es donde el pulgar alcanza (RNF-05).
 */

const SECCIONES = [
  { clave: 'resumen', texto: 'Resumen', Icono: LayoutDashboard },
  { clave: 'analisis', texto: 'Análisis', Icono: ChartColumn },
  { clave: 'transacciones', texto: 'Movimientos', Icono: ArrowLeftRight },
  { clave: 'presupuesto', texto: 'Presupuesto', Icono: ChartPie },
  { clave: 'perfil', texto: 'Perfil', Icono: User },
]

export default function Navegacion({ activa, onCambiar, colapsada, onAlternar }) {
  const { cerrar } = useSesion()

  return (
    <nav className="barra" aria-label="Secciones">
      <div className="barra-marca" title="WebFinanzas">
        {colapsada ? <LogoIcono tamano={38} /> : <LogoCompleto tono="claro" />}
      </div>

      <ul className="barra-lista">
        {SECCIONES.map(({ clave, texto, Icono }) => (
          <li key={clave}>
            <button
              className="barra-boton"
              aria-label={texto}
              title={colapsada ? texto : undefined}
              aria-current={activa === clave ? 'page' : undefined}
              onClick={() => onCambiar(clave)}
            >
              <Icono size={20} strokeWidth={1.8} />
              <span className="barra-texto">{texto}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="barra-pie">
        <button
          className="barra-boton barra-colapsar"
          onClick={onAlternar}
          aria-label={colapsada ? 'Expandir menú' : 'Colapsar menú'}
          title={colapsada ? 'Expandir menú' : 'Colapsar menú'}
        >
          {colapsada ? <PanelLeftOpen size={20} strokeWidth={1.8} /> : <PanelLeftClose size={20} strokeWidth={1.8} />}
          <span className="barra-texto">Colapsar</span>
        </button>
        <button className="barra-boton barra-salir" aria-label="Cerrar sesión" title={colapsada ? 'Cerrar sesión' : undefined} onClick={cerrar}>
          <LogOut size={20} strokeWidth={1.8} />
          <span className="barra-texto">Salir</span>
        </button>
      </div>
    </nav>
  )
}
