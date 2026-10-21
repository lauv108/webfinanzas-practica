import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pesos, fechaCorta, rangoDelPeriodo } from '../lib/formato'
import SelectorMes from '../componentes/SelectorMes'
import FormularioTransaccion from '../componentes/FormularioTransaccion'
import ConfirmarBorrado from '../componentes/ConfirmarBorrado'

/*
 * Historial del mes seleccionado.
 * RF-13 listado cronológico descendente, RF-14 filtros.
 * Los filtros se aplican sobre las filas del mes ya cargadas: el volumen de un
 * mes es pequeño y así la respuesta es inmediata, sin una consulta por tecla.
 */

const FILTROS_VACIOS = { texto: '', categoriaId: '', desde: '', hasta: '' }

export default function Transacciones({ periodo, onCambiarPeriodo, categorias, onCategoriasCambiadas }) {
  const [filas, setFilas] = useState([])
  const [estado, setEstado] = useState('cargando')
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [modal, setModal] = useState(null)

  const cargar = useCallback(async () => {
    setEstado('cargando')
    const { desde, hasta } = rangoDelPeriodo(periodo)

    const { data, error } = await supabase
      .from('transacciones')
      .select('id, fecha, descripcion, monto, tipo, categoria_id, categorias(nombre)')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false })

    if (error) {
      setError(error.message)
      setEstado('error')
    } else {
      setFilas(data)
      setEstado('listo')
    }
  }, [periodo])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { setFiltros(FILTROS_VACIOS) }, [periodo])

  const visibles = useMemo(() => {
    const texto = filtros.texto.trim().toLowerCase()
    return filas.filter((f) => {
      if (texto && !f.descripcion.toLowerCase().includes(texto)) return false
      if (filtros.categoriaId && f.categoria_id !== filtros.categoriaId) return false
      if (filtros.desde && f.fecha < filtros.desde) return false
      if (filtros.hasta && f.fecha > filtros.hasta) return false
      return true
    })
  }, [filas, filtros])

  const hayFiltro = filtros.texto || filtros.categoriaId || filtros.desde || filtros.hasta

  function cerrarModal() { setModal(null) }

  async function trasGuardar() {
    setModal(null)
    await cargar()
    onCategoriasCambiadas()
  }

  return (
    <>
      <div className="encabezado-mes">
        <SelectorMes periodo={periodo} onCambiar={onCambiarPeriodo} />
        <button className="boton fantasma auto" onClick={() => setModal({ clase: 'nueva' })}>
          + Nueva transacción
        </button>
      </div>

      <section className="tarjeta ancha">
        <div className="filtros">
          <div className="campo">
            <label htmlFor="f-texto">Buscar en descripción</label>
            <input
              id="f-texto" value={filtros.texto}
              onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })}
            />
          </div>
          <div className="campo">
            <label htmlFor="f-categoria">Categoría</label>
            <select
              id="f-categoria" value={filtros.categoriaId}
              onChange={(e) => setFiltros({ ...filtros, categoriaId: e.target.value })}
            >
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-desde">Desde</label>
            <input
              id="f-desde" type="date" value={filtros.desde}
              onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
            />
          </div>
          <div className="campo">
            <label htmlFor="f-hasta">Hasta</label>
            <input
              id="f-hasta" type="date" value={filtros.hasta}
              onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
            />
          </div>
        </div>

        {hayFiltro && (
          <p className="pista">
            {visibles.length} de {filas.length} movimientos.{' '}
            <button className="enlace" onClick={() => setFiltros(FILTROS_VACIOS)}>Quitar filtros</button>
          </p>
        )}

        {estado === 'cargando' && <p className="pista">Cargando movimientos...</p>}
        {estado === 'error' && <p className="error bloque">No se pudo cargar el historial: {error}</p>}

        {estado === 'listo' && visibles.length === 0 && (
          <div className="vacio">
            {filas.length === 0 ? (
              <>
                <p className="fuerte">Todavía no hay movimientos en este mes.</p>
                <p>Registra el primero y el resumen se arma solo.</p>
                <button className="boton auto" onClick={() => setModal({ clase: 'nueva' })}>
                  Registrar mi primer movimiento
                </button>
              </>
            ) : (
              <p>Ningún movimiento coincide con los filtros.</p>
            )}
          </div>
        )}

        {estado === 'listo' && visibles.length > 0 && (
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th><th>Descripción</th><th>Categoría</th>
                  <th className="der">Monto</th><th></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id}>
                    <td className="nowrap">{fechaCorta(f.fecha)}</td>
                    <td>{f.descripcion}</td>
                    <td><span className="etiqueta">{f.categorias?.nombre}</span></td>
                    <td className={f.tipo === 'ingreso' ? 'der cifra entra' : 'der cifra'}>
                      {f.tipo === 'ingreso' ? '+' : '-'}{pesos(f.monto)}
                    </td>
                    <td className="der nowrap">
                      <button className="mini" onClick={() => setModal({ clase: 'editar', fila: f })}>editar</button>
                      <button className="mini borrar" onClick={() => setModal({ clase: 'borrar', fila: f })}>borrar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modal?.clase === 'nueva' && (
        <FormularioTransaccion
          categorias={categorias} onCerrar={cerrarModal} onGuardado={trasGuardar}
        />
      )}
      {modal?.clase === 'editar' && (
        <FormularioTransaccion
          transaccion={modal.fila} categorias={categorias}
          onCerrar={cerrarModal} onGuardado={trasGuardar}
        />
      )}
      {modal?.clase === 'borrar' && (
        <ConfirmarBorrado
          transaccion={modal.fila} onCerrar={cerrarModal}
          onEliminado={() => { setModal(null); cargar() }}
        />
      )}
    </>
  )
}
