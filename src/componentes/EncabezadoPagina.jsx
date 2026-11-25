/*
 * Encabezado común de las pantallas: un rótulo contextual, el título en serif
 * y una línea de resumen. Las acciones de la pantalla van a la derecha.
 */

export default function EncabezadoPagina({ rotulo, titulo, resumen, acciones }) {
  return (
    <header className="pagina-encabezado">
      <div className="pagina-textos">
        {rotulo && <p className="pagina-rotulo">{rotulo}</p>}
        <h1 className="pagina-titulo">{titulo}</h1>
        {resumen && <p className="pagina-resumen">{resumen}</p>}
      </div>
      {acciones && <div className="pagina-acciones">{acciones}</div>}
    </header>
  )
}
