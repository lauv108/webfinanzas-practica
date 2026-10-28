import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pesos, fechaCorta, rangoDelPeriodo, nombrePeriodo } from '../lib/formato'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import SelectorMes from '../componentes/SelectorMes'
import FormularioTransaccion from '../componentes/FormularioTransaccion'
import ConfirmarBorrado from '../componentes/ConfirmarBorrado'

/*
 * Historial del mes.
 * RF-13 listado cronológico descendente, RF-14 filtros.
 * Los filtros se aplican sobre las filas del mes ya cargadas: el volumen de un
 * mes es pequeño y así la respuesta es inmediata, sin una consulta por tecla.
 */

const FILTROS_VACIOS = { texto: '', tipo: 'todos', categoriaId: '' }

export default function Transacciones({
  periodo, onCambiarPeriodo, recarga, categorias, onNuevaTransaccion, onCategoriasCambiadas,
}) {
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
      console.error('[transacciones]', error)
      setError('No se pudo cargar el historial. Recarga la página.')
      setEstado('error')
    } else {
      setFilas(data)
      setEstado('listo')
    }
  }, [periodo])

  useEffect(() => { cargar() }, [cargar, recarga])
  useEffect(() => { setFiltros(FILTROS_VACIOS) }, [periodo])

  const visibles = useMemo(() => {
    const texto = filtros.texto.trim().toLowerCase()
    return filas.filter((f) => {
      if (texto && !f.descripcion.toLowerCase().includes(texto)) return false
      if (filtros.tipo !== 'todos' && f.tipo !== filtros.tipo) return false
      if (filtros.categoriaId && f.categoria_id !== filtros.categoriaId) return false
      return true
    })
  }, [filas, filtros])

  const entradas = visibles.filter((f) => f.tipo === 'ingreso').reduce((s, f) => s + Number(f.monto), 0)
  const salidas = visibles.filter((f) => f.tipo === 'gasto').reduce((s, f) => s + Number(f.monto), 0)

  // Solo las categorías que aparecen en el mes: una lista de chips con
  // categorías vacías no ayuda a filtrar
  const usadas = useMemo(() => {
    const ids = new Set(filas.map((f) => f.categoria_id))
    return categorias.filter((c) => ids.has(c.id))
  }, [filas, categorias])

  const hayFiltro = filtros.texto || filtros.tipo !== 'todos' || filtros.categoriaId

  async function trasGuardar() {
    setModal(null)
    await cargar()
    onCategoriasCambiadas()
  }

  return (
    <>
      <EncabezadoPagina
        rotulo={`Movimientos — ${nombrePeriodo(periodo)}`}
        titulo="Movimientos"
        resumen={
          estado === 'listo'
            ? `${visibles.length} de ${filas.length} · ${pesos(entradas)} entraron · ${pesos(salidas)} salieron`
            : null
        }
        acciones={
          <>
            <SelectorMes periodo={periodo} onCambiar={onCambiarPeriodo} />
            <button className="boton auto" onClick={onNuevaTransaccion}>+ Nueva transacción</button>
          </>
        }
      />

      <section className="tarjeta ancha">
        <div className="barra-filtros">
          <div className="buscador">
            <label className="oculto" htmlFor="f-texto">Buscar en la descripción</label>
            <input
              id="f-texto" type="search" placeholder="Buscar en la descripción"
              value={filtros.texto}
              onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })}
            />
          </div>

          <div className="segmentado" role="group" aria-label="Tipo de movimiento">
            {[['todos', 'Todos'], ['ingreso', 'Ingresos'], ['gasto', 'Gastos']].map(([valor, texto]) => (
              <button
                key={valor}
                className="segmento"
                aria-pressed={filtros.tipo === valor}
                onClick={() => setFiltros({ ...filtros, tipo: valor })}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>

        {usadas.length > 0 && (
          <div className="fichas" role="group" aria-label="Filtrar por categoría">
            <button
              className="ficha" aria-pressed={filtros.categoriaId === ''}
              onClick={() => setFiltros({ ...filtros, categoriaId: '' })}
            >Todas</button>
            {usadas.map((c) => (
              <button
                key={c.id} className="ficha"
                aria-pressed={filtros.categoriaId === c.id}
                onClick={() => setFiltros({ ...filtros, categoriaId: c.id })}
              >{c.nombre}</button>
            ))}
          </div>
        )}

        {estado === 'cargando' && <p className="pista">Cargando movimientos...</p>}
        {estado === 'error' && <p className="error bloque">{error}</p>}

        {estado === 'listo' && visibles.length === 0 && (
          <div className="vacio">
            {filas.length === 0 ? (
              <>
                <p className="fuerte">Todavía no hay movimientos en este mes.</p>
                <p>Registra el primero y el resumen se arma solo.</p>
                <button className="boton auto" onClick={onNuevaTransaccion}>
                  Registrar mi primer movimiento
                </button>
              </>
            ) : (
              <>
                <p>Ningún movimiento coincide con los filtros.</p>
                <button className="boton auto fantasma" onClick={() => setFiltros(FILTROS_VACIOS)}>
                  Quitar filtros
                </button>
              </>
            )}
          </div>
        )}

        {estado === 'listo' && visibles.length > 0 && (
          <ul className="lista-detallada">
            {visibles.map((f) => (
              <li key={f.id}>
                <span className="mov-texto">
                  <span className="mov-titulo">{f.descripcion}</span>
                  <span className="mov-meta">{f.categorias?.nombre} · {fechaCorta(f.fecha)}</span>
                </span>
                <span className={f.tipo === 'ingreso' ? 'cifra entra' : 'cifra'}>
                  {f.tipo === 'ingreso' ? '+' : '-'}{pesos(f.monto)}
                </span>
                <span className="mov-acciones">
                  <button className="mini" onClick={() => setModal({ clase: 'editar', fila: f })}>editar</button>
                  <button className="mini borrar" onClick={() => setModal({ clase: 'borrar', fila: f })}>borrar</button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {hayFiltro && estado === 'listo' && filas.length > 0 && (
          <p className="pista">
            Mostrando {visibles.length} de {filas.length} movimientos del mes.{' '}
            <button className="enlace" onClick={() => setFiltros(FILTROS_VACIOS)}>Quitar filtros</button>
          </p>
        )}
      </section>

      {modal?.clase === 'editar' && (
        <FormularioTransaccion
          transaccion={modal.fila} categorias={categorias}
          onCerrar={() => setModal(null)} onGuardado={trasGuardar}
        />
      )}
      {modal?.clase === 'borrar' && (
        <ConfirmarBorrado
          transaccion={modal.fila} onCerrar={() => setModal(null)}
          onEliminado={() => { setModal(null); cargar() }}
        />
      )}
    </>
  )
}
