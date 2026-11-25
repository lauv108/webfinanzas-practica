/* Bloque gris animado que ocupa el lugar del contenido mientras carga */
export default function Esqueleto({ alto = 16, ancho = '100%', redondeo = 8, className = '' }) {
  return (
    <span
      className={`esqueleto ${className}`}
      style={{ height: alto, width: ancho, borderRadius: redondeo }}
      aria-hidden="true"
    />
  )
}
