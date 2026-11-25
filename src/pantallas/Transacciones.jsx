import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, Download, Pencil, Trash2, Inbox, CalendarDays, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { pesos, rangoDelPeriodo, nombrePeriodo, hoyISO } from '../lib/formato'
import { estiloCategoria } from '../lib/categorias'
import { transaccionesACSV, descargarCSV } from '../lib/exportar'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import SelectorMes from '../componentes/SelectorMes'
import FormularioTransaccion from '../componentes/FormularioTransaccion'
import ConfirmarBorrado from '../componentes/ConfirmarBorrado'
import IconoCategoria from '../componentes/IconoCategoria'
import Esqueleto from '../componentes/Esqueleto'

/*
 * Historial del mes.
 * RF-13 listado cronológico descendente, RF-14 filtros, RF-23 exportación a CSV.
 * Los filtros se aplican sobre las filas del mes ya cargadas: el volumen de un
 * mes es pequeño y así la respuesta es inmediata, sin una consulta por tecla.
 */

const FILTROS_VACIOS = { texto: '', tipo: 'todos', categoriaId: '', desde: '', hasta: '' }
const DIA = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })

function aFecha(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

function rotuloDia(iso) {
  const hoy = hoyISO()
  const ayer = new Date(aFecha(hoy).getTime() - 86400000)
  const ayerIso = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`
  const texto = DIA.format(aFecha(iso)).replace('.', '')
  if (iso === hoy) return `Hoy · ${texto}`
  if (iso === ayerIso) return `Ayer · ${texto}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

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
      if (filtros.desde && f.fecha < filtros.desde) return false
      if (filtros.hasta && f.fecha > filtros.hasta) return false
      return true
    })
  }, [filas, filtros])

  const entradas = visibles.filter((f) => f.tipo === 'ingreso').reduce((s, f) => s + Number(f.monto), 0)
  const salidas = visibles.filter((f) => f.tipo === 'gasto').reduce((s, f) => s + Number(f.monto), 0)

  // Agrupadas por día, con el neto de cada día
  const dias = useMemo(() => {
    const grupos = new Map()
    for (const f of visibles) {
      if (!grupos.has(f.fecha)) grupos.set(f.fecha, [])
      grupos.get(f.fecha).push(f)
    }
    return [...grupos.entries()].map(([fecha, lista]) => ({
      fecha,
      lista,
      neto: lista.reduce((s, f) => s + (f.tipo === 'ingreso' ? 1 : -1) * Number(f.monto), 0),
    }))
  }, [visibles])

  // Solo las categorías que aparecen en el mes: una lista de chips con
  // categorías vacías no ayuda a filtrar
  const usadas = useMemo(() => {
    const ids = new Set(filas.map((f) => f.categoria_id))
    return categorias.filter((c) => ids.has(c.id))
  }, [filas, categorias])

  const hayFiltro = filtros.texto || filtros.tipo !== 'todos' || filtros.categoriaId || filtros.desde || filtros.hasta
  const { desde: inicioMes, hasta: finMes } = rangoDelPeriodo(periodo)

  // RF-23. Exporta lo que se ve: el mes elegido con los filtros aplicados
  function exportarCSV() {
    const sufijo = hayFiltro ? '_filtrado' : ''
    descargarCSV(transaccionesACSV(visibles), `webfinanzas_movimientos_${periodo}${sufijo}.csv`)
  }

  async function trasGuardar() {
    setModal(null)
    await cargar()
    onCategoriasCambiadas()
  }

  return (
    <div className="pantalla">
      <EncabezadoPagina
        rotulo={`Movimientos · ${nombrePeriodo(periodo)}`}
        titulo="Movimientos"
        resumen="Todo lo que entró y salió en el mes. Busca, filtra y exporta."
        acciones={
          <>
            <SelectorMes periodo={periodo} onCambiar={onCambiarPeriodo} />
            <button
              className="boton auto fantasma con-icono" onClick={exportarCSV}
              disabled={estado !== 'listo' || visibles.length === 0}
              title="Descarga los movimientos que se ven en pantalla"
            ><Download size={17} /> Exportar CSV</button>
            <button className="boton auto con-icono" onClick={onNuevaTransaccion}><Plus size={18} strokeWidth={2.2} /> Nueva transacción</button>
          </>
        }
      />

      <div className="mini-kpis tres">
        <div className="mini-kpi"><span>Entraron</span>{estado === 'cargando' ? <Esqueleto alto={26} ancho="60%" /> : <b className="entra">{pesos(entradas)}</b>}</div>
        <div className="mini-kpi"><span>Salieron</span>{estado === 'cargando' ? <Esqueleto alto={26} ancho="60%" /> : <b className="sale">{pesos(salidas)}</b>}</div>
        <div className="mini-kpi"><span>Balance</span>{estado === 'cargando' ? <Esqueleto alto={26} ancho="60%" /> : <b className={entradas - salidas < 0 ? 'sale' : ''}>{pesos(entradas - salidas)}</b>}</div>
      </div>

      <section className="tarjeta-t filtros-t">
        <div className="barra-filtros">
          <div className="buscador">
            <Search size={17} aria-hidden="true" />
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

          <div className="rango-fechas">
            <CalendarDays size={17} aria-hidden="true" />
            <label className="oculto" htmlFor="f-desde">Desde</label>
            <input id="f-desde" type="date" min={inicioMes} max={filtros.hasta || finMes}
              value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
            <span aria-hidden="true">a</span>
            <label className="oculto" htmlFor="f-hasta">Hasta</label>
            <input id="f-hasta" type="date" min={filtros.desde || inicioMes} max={finMes}
              value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
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
              ><i style={{ background: estiloCategoria(c.nombre).color }} />{c.nombre}</button>
            ))}
          </div>
        )}

        {hayFiltro && estado === 'listo' && filas.length > 0 && (
          <p className="filtros-resumen">
            Mostrando {visibles.length} de {filas.length} movimientos del mes
            <button className="boton-texto" onClick={() => setFiltros(FILTROS_VACIOS)}><X size={14} /> Quitar filtros</button>
          </p>
        )}
      </section>

      {estado === 'error' && <p className="error bloque">{error}</p>}

      {estado === 'cargando' && (
        <section className="tarjeta-t">
          {[0, 1, 2, 3, 4].map((k) => (
            <div className="fila-esqueleto" key={k}>
              <Esqueleto alto={40} ancho={40} redondeo={12} />
              <div><Esqueleto alto={14} ancho="45%" /><Esqueleto alto={11} ancho="25%" className="separado-chico" /></div>
              <Esqueleto alto={14} ancho={90} />
            </div>
          ))}
        </section>
      )}

      {estado === 'listo' && visibles.length === 0 && (
        <section className="tarjeta-t vacio-t">
          <span className="vacio-icono"><Inbox size={30} strokeWidth={1.6} /></span>
          {filas.length === 0 ? (
            <>
              <h2>Todavía no hay movimientos en este mes</h2>
              <p>Registra el primero y el resumen se arma solo.</p>
              <button className="boton auto con-icono" onClick={onNuevaTransaccion}>
                <Plus size={18} strokeWidth={2.2} /> Agregar mi primer movimiento
              </button>
            </>
          ) : (
            <>
              <h2>Nada coincide con tus filtros</h2>
              <p>Prueba con otra palabra, otro tipo u otras fechas.</p>
              <button className="boton auto fantasma" onClick={() => setFiltros(FILTROS_VACIOS)}>Quitar filtros</button>
            </>
          )}
        </section>
      )}

      {estado === 'listo' && dias.length > 0 && (
        <section className="tarjeta-t lista-dias">
          {dias.map((d, i) => (
            <motion.div className="dia-t" key={d.fecha}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
              <header className="dia-cabeza">
                <h2>{rotuloDia(d.fecha)}</h2>
                <span className={d.neto < 0 ? 'monto sale' : 'monto entra'}>{d.neto < 0 ? '−' : '+'}{pesos(Math.abs(d.neto))}</span>
              </header>
              <ul className="movimientos-t">
                {d.lista.map((f) => (
                  <li key={f.id}>
                    <IconoCategoria nombre={f.categorias?.nombre} tamano={40} />
                    <span className="reciente-texto">
                      <span className="reciente-titulo">{f.descripcion}</span>
                      <span className="reciente-meta">{f.categorias?.nombre} · {f.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}</span>
                    </span>
                    <span className={f.tipo === 'ingreso' ? 'monto entra' : 'monto sale'}>
                      {f.tipo === 'ingreso' ? '+' : '−'}{pesos(f.monto)}
                    </span>
                    <span className="acciones-fila">
                      <button className="boton-icono" onClick={() => setModal({ clase: 'editar', fila: f })} aria-label={`Editar ${f.descripcion}`} title="Editar"><Pencil size={16} /></button>
                      <button className="boton-icono peligro" onClick={() => setModal({ clase: 'borrar', fila: f })} aria-label={`Borrar ${f.descripcion}`} title="Borrar"><Trash2 size={16} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </section>
      )}

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
    </div>
  )
}
