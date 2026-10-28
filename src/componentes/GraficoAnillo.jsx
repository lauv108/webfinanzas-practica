import { pesos } from '../lib/formato'

/*
 * RF-21. Gráfico de distribución del gasto por categoría.
 *
 * Se dibuja a mano en SVG en lugar de instalar una biblioteca de gráficos.
 * La razón es de seguridad además de peso: cada dependencia nueva amplía la
 * superficie de la cadena de suministro (OWASP A03:2025), y un anillo de seis
 * sectores no justifica esa superficie.
 *
 * RF-22 sigue cubierto por la tabla de desglose, que opera como respaldo si el
 * gráfico no se dibuja.
 */

const COLORES = ['#1d3f73', '#2f6b4f', '#9c4a35', '#8a6413', '#4a6b8a', '#6b6256']

const RADIO = 46
const CIRCUNFERENCIA = 2 * Math.PI * RADIO

export default function GraficoAnillo({ desglose, total }) {
  if (!desglose || desglose.length === 0) return null

  let acumulado = 0
  const sectores = desglose.map((d, i) => {
    const porcentaje = Number(d.porcentaje) || 0
    const largo = (porcentaje / 100) * CIRCUNFERENCIA
    const giro = -90 + acumulado * 3.6
    acumulado += porcentaje
    return {
      clave: d.categoria_id,
      nombre: d.categoria,
      monto: d.monto,
      porcentaje,
      color: COLORES[i % COLORES.length],
      largo,
      giro,
    }
  })

  const resumen = sectores
    .map((s) => `${s.nombre}, ${s.porcentaje.toFixed(1)} por ciento`)
    .join('. ')

  return (
    <div className="anillo">
      <svg viewBox="0 0 120 120" role="img" aria-label={`Distribución del gasto por categoría. ${resumen}`}>
        <circle cx="60" cy="60" r={RADIO} fill="none" stroke="var(--regla-suave)" strokeWidth="18" />
        {sectores.map((s) => (
          <circle
            key={s.clave}
            cx="60" cy="60" r={RADIO} fill="none"
            stroke={s.color} strokeWidth="18"
            strokeDasharray={`${s.largo} ${CIRCUNFERENCIA - s.largo}`}
            transform={`rotate(${s.giro} 60 60)`}
          />
        ))}
        <text x="60" y="57" textAnchor="middle" className="anillo-rotulo">GASTO</text>
        <text x="60" y="70" textAnchor="middle" className="anillo-total">{pesos(total)}</text>
      </svg>

      <ul className="leyenda">
        {sectores.map((s) => (
          <li key={s.clave}>
            <span className="nombre">
              <span className="muestra" style={{ background: s.color }} />
              {s.nombre}
            </span>
            <span className="porcion">{s.porcentaje.toFixed(1)} %</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
