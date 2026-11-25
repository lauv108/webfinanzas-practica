import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from 'recharts'
import { ArrowUpRight, ArrowDownRight, ChartColumn } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { pesos, rangoDelPeriodo, nombrePeriodo, periodoVecino } from '../lib/formato'
import { estiloCategoria } from '../lib/categorias'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import SelectorMes from '../componentes/SelectorMes'
import Esqueleto from '../componentes/Esqueleto'
import IconoCategoria from '../componentes/IconoCategoria'

/*
 * Análisis: el detalle detrás de las gráficas del resumen.
 * Ingresos, gastos y ahorro mes a mes, y el gasto por categoría del mes
 * elegido comparado con el mes anterior. Todo sale de las vistas del esquema.
 */

const COMPACTO = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 })
const MES_CORTO = new Intl.DateTimeFormat('es-CO', { month: 'short' })
const PORCENTAJE = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const n = (v) => Number(v) || 0
const VACIO = { total_ingresos: 0, total_gastos: 0, balance: 0, num_transacciones: 0 }

function mesCorto(periodo) {
  const [a, m] = periodo.split('-').map(Number)
  const t = MES_CORTO.format(new Date(a, m - 1, 1)).replace('.', '')
  return `${t} ${String(a).slice(2)}`
}

function TooltipMes({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="grafica-tooltip">
      <p className="grafica-tooltip-titulo">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey}><i style={{ background: p.color }} />{p.name}: <b>{pesos(p.value)}</b></p>
      ))}
    </div>
  )
}

export default function Analisis({ periodo, onCambiarPeriodo, recarga }) {
  const [meses, setMeses] = useState([])
  const [categorias, setCategorias] = useState([])
  const [previas, setPrevias] = useState([])
  const [rango, setRango] = useState(6)
  const [estado, setEstado] = useState('cargando')

  useEffect(() => {
    let activo = true
    const { desde } = rangoDelPeriodo(periodo)
    const desdePrevio = rangoDelPeriodo(periodoVecino(periodo, -1)).desde

    async function traer() {
      setEstado('cargando')
      const [historial, actual, anterior] = await Promise.all([
        supabase.from('v_resumen_mensual')
          .select('periodo, total_ingresos, total_gastos, balance, num_transacciones')
          .lte('periodo', desde).order('periodo', { ascending: true }),
        supabase.from('v_gasto_por_categoria')
          .select('categoria_id, categoria, monto, porcentaje')
          .eq('periodo', desde).order('monto', { ascending: false }),
        supabase.from('v_gasto_por_categoria')
          .select('categoria_id, categoria, monto, porcentaje')
          .eq('periodo', desdePrevio),
      ])
      if (!activo) return
      const fallo = historial.error || actual.error || anterior.error
      if (fallo) {
        console.error('[analisis]', fallo)
        setEstado('error')
        return
      }
      setMeses(historial.data ?? [])
      setCategorias(actual.data ?? [])
      setPrevias(anterior.data ?? [])
      setEstado('listo')
    }

    traer()
    return () => { activo = false }
  }, [periodo, recarga])

  const porMes = new Map(meses.map((m) => [String(m.periodo).slice(0, 7), m]))
  const serie = Array.from({ length: rango }, (_, i) => {
    const p = periodoVecino(periodo, i - (rango - 1))
    const m = porMes.get(p) ?? VACIO
    const ingresos = n(m.total_ingresos)
    const gastos = n(m.total_gastos)
    return { periodo: p, mes: mesCorto(p), Ingresos: ingresos, Gastos: gastos, Ahorro: ingresos - gastos }
  })

  const totalIngresos = serie.reduce((s, m) => s + m.Ingresos, 0)
  const totalGastos = serie.reduce((s, m) => s + m.Gastos, 0)
  const conDatos = serie.filter((m) => m.Ingresos || m.Gastos).length
  const promedioGasto = conDatos ? totalGastos / conDatos : 0
  const tasa = totalIngresos ? ((totalIngresos - totalGastos) / totalIngresos) * 100 : 0

  const previoPor = new Map(previas.map((c) => [c.categoria_id, n(c.monto)]))
  const totalMes = categorias.reduce((s, c) => s + n(c.monto), 0)
  const mayor = categorias.reduce((m, c) => Math.max(m, n(c.monto)), 0)
  const cargando = estado === 'cargando'

  return (
    <div className="pantalla">
      <EncabezadoPagina
        rotulo="Análisis"
        titulo="Tus números, mes a mes"
        resumen="Cómo han cambiado tus ingresos, tus gastos y en qué se va el dinero."
        acciones={
          <>
            <div className="segmentado" role="group" aria-label="Rango de meses">
              {[6, 12].map((r) => (
                <button key={r} className="segmento" aria-pressed={rango === r} onClick={() => setRango(r)}>
                  {r} meses
                </button>
              ))}
            </div>
            <SelectorMes periodo={periodo} onCambiar={onCambiarPeriodo} />
          </>
        }
      />

      {estado === 'error' && <p className="error bloque">No se pudo cargar el análisis. Recarga la página.</p>}

      <div className="mini-kpis">
        {[
          ['Ingresos del periodo', totalIngresos, 'entra'],
          ['Gastos del periodo', totalGastos, 'sale'],
          ['Ahorro del periodo', totalIngresos - totalGastos, totalIngresos - totalGastos < 0 ? 'sale' : ''],
          ['Gasto promedio al mes', promedioGasto, ''],
        ].map(([rotulo, valor, tono], i) => (
          <motion.div key={rotulo} className="mini-kpi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <span>{rotulo}</span>
            {cargando ? <Esqueleto alto={26} ancho="70%" /> : <b className={tono}>{pesos(valor)}</b>}
          </motion.div>
        ))}
      </div>

      <section className="tarjeta-t">
        <div className="tarjeta-t-cabeza">
          <div>
            <h2>Ingresos, gastos y ahorro</h2>
            <p className="tarjeta-t-sub">
              Últimos {rango} meses hasta {nombrePeriodo(periodo).toLowerCase()}
              {totalIngresos > 0 && ` · ahorraste el ${PORCENTAJE.format(tasa)} % de lo que entró`}
            </p>
          </div>
          <div className="leyenda-mini">
            <span><i style={{ background: 'var(--verde-vivo)' }} />Ingresos</span>
            <span><i style={{ background: 'var(--terracota-viva)' }} />Gastos</span>
            <span><i className="linea" style={{ background: 'var(--acento)' }} />Ahorro</span>
          </div>
        </div>
        {cargando ? <Esqueleto alto={280} redondeo={12} /> : (
          <div className="grafica-caja">
            <ResponsiveContainer width="100%" height={290}>
              <ComposedChart data={serie} margin={{ top: 10, right: 6, left: -6, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="#efece3" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: '#8a96a8', fontSize: 12, fontFamily: 'IBM Plex Mono' }} />
                <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `$${COMPACTO.format(v)}`} tick={{ fill: '#8a96a8', fontSize: 12, fontFamily: 'IBM Plex Mono' }} />
                <Tooltip content={<TooltipMes />} cursor={{ fill: 'rgb(29 63 115 / 0.05)' }} />
                <Bar dataKey="Ingresos" fill="#4f9e78" radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={800} />
                <Bar dataKey="Gastos" fill="#d4785c" radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={800} />
                <Line dataKey="Ahorro" type="monotone" stroke="#1d3f73" strokeWidth={2.5} dot={{ r: 3, fill: '#1d3f73' }} animationDuration={900} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="fila-analisis">
        <section className="tarjeta-t">
          <div className="tarjeta-t-cabeza">
            <div>
              <h2>Mes a mes</h2>
              <p className="tarjeta-t-sub">Toca un mes para ver su detalle por categoría</p>
            </div>
          </div>
          {cargando ? [0, 1, 2, 3, 4].map((k) => <Esqueleto key={k} alto={34} className="separado" />) : (
            <div className="tabla-scroll">
              <table className="tabla-t">
                <thead>
                  <tr><th>Mes</th><th className="der">Ingresos</th><th className="der">Gastos</th><th className="der">Ahorro</th><th className="der">Tasa</th></tr>
                </thead>
                <tbody>
                  {[...serie].reverse().map((m) => {
                    const t = m.Ingresos ? (m.Ahorro / m.Ingresos) * 100 : null
                    return (
                      <tr key={m.periodo} className={m.periodo === periodo ? 'activa' : ''}
                        onClick={() => onCambiarPeriodo(m.periodo)} tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') onCambiarPeriodo(m.periodo) }}>
                        <td>{nombrePeriodo(m.periodo)}</td>
                        <td className="der cifra entra">{pesos(m.Ingresos)}</td>
                        <td className="der cifra sale">{pesos(m.Gastos)}</td>
                        <td className={'der cifra' + (m.Ahorro < 0 ? ' sale' : '')}>{pesos(m.Ahorro)}</td>
                        <td className="der cifra">{t === null ? '—' : `${PORCENTAJE.format(t)} %`}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="tarjeta-t">
          <div className="tarjeta-t-cabeza">
            <div>
              <h2>Gastos por categoría</h2>
              <p className="tarjeta-t-sub">{nombrePeriodo(periodo)} comparado con el mes anterior</p>
            </div>
          </div>
          {cargando && <Esqueleto alto={260} redondeo={12} />}
          {!cargando && categorias.length === 0 && (
            <div className="vacio-mini">
              <span className="vacio-icono pequeno"><ChartColumn size={24} /></span>
              <p>No hay gastos registrados en {nombrePeriodo(periodo).toLowerCase()}.</p>
            </div>
          )}
          {!cargando && categorias.length > 0 && (
            <>
              <div className="dona-grafica dona-analisis">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={categorias} dataKey="monto" nameKey="categoria" innerRadius={58} outerRadius={82} paddingAngle={2} stroke="none" animationDuration={800}>
                      {categorias.map((c) => <Cell key={c.categoria_id} fill={estiloCategoria(c.categoria).color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => pesos(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dona-centro"><span>Total</span><b>{pesos(totalMes)}</b></div>
              </div>
              <ul className="categorias-detalle">
                {categorias.map((c, i) => {
                  const previo = previoPor.get(c.categoria_id)
                  const cambio = previo ? ((n(c.monto) - previo) / previo) * 100 : null
                  const { color } = estiloCategoria(c.categoria)
                  return (
                    <li key={c.categoria_id}>
                      <IconoCategoria nombre={c.categoria} tamano={34} />
                      <div className="cat-cuerpo">
                        <div className="cat-linea">
                          <span className="cat-nombre">{c.categoria}</span>
                          <span className="cat-monto">{pesos(c.monto)}</span>
                        </div>
                        <div className="barra-progreso">
                          <motion.i style={{ background: color }} initial={{ width: 0 }}
                            animate={{ width: `${mayor ? (n(c.monto) / mayor) * 100 : 0}%` }}
                            transition={{ duration: 0.8, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }} />
                        </div>
                        <div className="cat-linea pie">
                          <span>{PORCENTAJE.format(n(c.porcentaje))} % del gasto</span>
                          {cambio === null ? <span className="cat-nuevo">Nuevo este mes</span> : Math.round(cambio) === 0 ? <span>Igual que el mes anterior</span> : (
                            <span className={cambio > 0 ? 'cat-cambio sube' : 'cat-cambio baja'}>
                              {cambio > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                              {PORCENTAJE.format(Math.abs(cambio))} % vs. mes anterior
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
