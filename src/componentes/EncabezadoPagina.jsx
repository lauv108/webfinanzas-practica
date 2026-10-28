/*
 * Encabezado común de las pantallas: un rótulo contextual arriba, el título
 * en serif y una línea de cifras debajo. La acción principal vive a la derecha.
 */

export default function EncabezadoPagina({ rotulo, titulo, resumen, acciones }) {
  return (
    <header className="pagina-encabezado">
      <div className="pagina-fila">
        <p className="pagina-rotulo">{rotulo}</p>
        {acciones && <div className="pagina-acciones">{acciones}</div>}
      </div>
      <h1 className="pagina-titulo">{titulo}</h1>
      {resumen && <p className="pagina-resumen">{resumen}</p>}
    </header>
  )
}
