import { nombrePeriodo, periodoVecino, periodoActual } from '../lib/formato'

/* RF-20. Cambiar el mes recalcula todas las cifras de la pantalla. */

export default function SelectorMes({ periodo, onCambiar }) {
  const esMesActual = periodo >= periodoActual()

  return (
    <div className="selector-mes">
      <button
        className="flecha"
        onClick={() => onCambiar(periodoVecino(periodo, -1))}
        aria-label="Mes anterior"
      >
        &#9664;
      </button>
      <span className="mes">{nombrePeriodo(periodo)}</span>
      <button
        className="flecha"
        onClick={() => onCambiar(periodoVecino(periodo, 1))}
        disabled={esMesActual}
        aria-label="Mes siguiente"
      >
        &#9654;
      </button>
    </div>
  )
}
