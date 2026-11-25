import { estiloCategoria } from '../lib/categorias'

/* Ícono redondo con el color de la categoría, para listas y leyendas */
export default function IconoCategoria({ nombre, tamano = 36 }) {
  const { color, Icono } = estiloCategoria(nombre)
  return (
    <span
      className="icono-categoria"
      style={{ width: tamano, height: tamano, color, background: `${color}1f` }}
      aria-hidden="true"
    >
      <Icono size={Math.round(tamano * 0.5)} strokeWidth={1.9} />
    </span>
  )
}
