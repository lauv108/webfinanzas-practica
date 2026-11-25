import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from 'recharts'
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ArrowDownRight, Plus,
  Target, Lightbulb, Receipt, CircleCheck, TriangleAlert, ChevronRight, Pencil, Smile,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSesion } from '../auth/SesionProvider'
import { pesos, rangoDelPeriodo, hoyLargo, fechaCorta, periodoVecino } from '../lib/formato'
import { estiloCategoria } from '../lib/categorias'
import { consejoDelDia } from '../lib/consejos'
import { primerNombre, metaAhorroDe, validarNombre } from '../lib/perfil'
import SelectorMes from '../componentes/SelectorMes'
import CifraAnimada from '../componentes/CifraAnimada'
import Esqueleto from '../componentes/Esqueleto'
import IconoCategoria from '../componentes/IconoCategoria'

/*
 * Resumen del mes (tablero).
 * RF-19 totales, RF-20 selector de mes, RF-21 gráfico de distribución,
 * RF-22 desglose por categoría.
 *
 * Los totales y el desglose los calculan las vistas del esquema. La interfaz
 * solo suma los balances mensuales para el saldo acumulado y compara el mes
 * con el anterior.
 */

const VACIO = { total_ingresos: 0, total_gastos: 0, balance: 0, num_transacciones: 0 }

const COMPACTO = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 })
const MES_CORTO = new Intl.DateTimeFormat('es-CO', { month: 'short' })
const PORCENTAJE = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const n = (v) => Number(v) || 0

function variacion(actual, previo) {
  if (!previo) return null
  return ((actual - previo) / Math.abs(previo)) * 100
}

function nombreMesCorto(periodo) {
  const [a, m] = periodo.split('-').map(Number)
  return MES_CORTO.format(new Date(a, m - 1, 1)).replace('.', '')
}

function fraseDelMes(ingresos, gastos, hayDatos) {
  if (!hayDatos) return 'Registra tu primer movimiento y aquí verás cómo va tu mes.'
  if (gastos > ingresos) return 'Este mes ha salido más de lo que ha entrado. Revisa tus topes con calma.'
  const tasa = ingresos ? ((ingresos - gastos) / ingresos) * 100 : 0
  if (tasa >= 20) return `Vas muy bien: estás ahorrando el ${tasa.toFixed(0)} % de lo que entra.`
  return `Vas ahorrando el ${tasa.toFixed(0)} % de tus ingresos. Un poco más y llegas a la meta.`
}

/* Color del progreso de un tope: verde normal, ocre desde 80 %, terracota al pasarse */
function tonoTope(pct) {
  if (pct > 100) return 'excedido'
  if (pct >= 80) return 'alerta'
  return 'bien'
}

const aparecer = {
  oculto: { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] } }),
}

function Tarjeta({ i, className = '', children }) {
  return (
    <motion.section className={`tarjeta-t ${className}`} variants={aparecer} initial="oculto" animate="visible" custom={i}>
      {children}
    </motion.section>
  )
}

/* Título de tarjeta que lleva a la pantalla con el detalle */
function TituloEnlace({ children, onClick, etiqueta }) {
  return (
    <button className="titulo-enlace" onClick={onClick} aria-label={etiqueta}>
      <h2>{children}</h2>
      <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}

/* Para cuentas sin nombre: se pide una sola vez y queda guardado */
function TarjetaNombre({ onGuardar }) {
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    const fallo = validarNombre(nombre)
    if (fallo) { setError(fallo); return }
    setGuardando(true)
    const { error: errorGuardar } = await onGuardar({ nombre: nombre.trim() })
    setGuardando(false)
    if (errorGuardar) setError('No se pudo guardar. Intenta de nuevo.')
  }

  return (
    <motion.form className="tarjeta-nombre" onSubmit={guardar} noValidate
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <span className="kpi-icono ocre"><Smile size={20} /></span>
      <div className="tarjeta-nombre-texto">
        <p className="fuerte">¿Cómo quieres que te llamemos?</p>
        <p>Así te saludamos por tu nombre cada vez que entres.</p>
      </div>
      <div className="tarjeta-nombre-campo">
        <label className="oculto" htmlFor="nombre-saludo">Tu nombre</label>
        <input id="nombre-saludo" placeholder="Tu nombre" value={nombre} maxLength={40}
          onChange={(e) => { setNombre(e.target.value); setError(null) }} />
        <button className="boton auto" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
      </div>
      {error && <p className="error">{error}</p>}
    </motion.form>
  )
}

function Variacion({ valor, invertir = false, texto }) {
  if (texto) return <span className="kpi-variacion neutra">{texto}</span>
  if (valor === null) return <span className="kpi-variacion neutra">Sin datos del mes anterior</span>
  const sube = valor >= 0
  const bueno = invertir ? !sube : sube
  const Flecha = sube ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`kpi-variacion ${bueno ? 'buena' : 'mala'}`}>
      <Flecha size={14} strokeWidth={2.2} />
      {PORCENTAJE.format(Math.abs(valor))} % vs. mes anterior
    </span>
  )
}

function TooltipDinero({ active, payload, label }) {
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

export default function Resumen({ periodo, onCambiarPeriodo, recarga, onNuevaTransaccion, onIrA }) {
  const { usuario, actualizarPerfil } = useSesion()
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [metaEscrita, setMetaEscrita] = useState('')
  const [meses, setMeses] = useState([])
  const [desglose, setDesglose] = useState([])
  const [recientes, setRecientes] = useState([])
  const [topes, setTopes] = useState([])
  const [estado, setEstado] = useState('cargando')
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true
    const { desde, hasta } = rangoDelPeriodo(periodo)

    async function traer() {
      setEstado('cargando')

      const [historial, categorias, ultimos, presupuesto] = await Promise.all([
        supabase.from('v_resumen_mensual')
          .select('periodo, total_ingresos, total_gastos, balance, num_transacciones')
          .lte('periodo', desde).order('periodo', { ascending: true }),
        supabase.from('v_gasto_por_categoria')
          .select('categoria_id, categoria, monto, porcentaje')
          .eq('periodo', desde).order('monto', { ascending: false }),
        supabase.from('transacciones')
          .select('id, fecha, descripcion, monto, tipo, categorias(nombre)')
          .gte('fecha', desde).lte('fecha', hasta)
          .order('fecha', { ascending: false })
          .order('creado_en', { ascending: false })
          .limit(5),
        supabase.from('v_estado_presupuesto')
          .select('presupuesto_id, categoria, monto_tope, gasto_acumulado, disponible, porcentaje_consumido, estado')
          .eq('periodo', desde).order('porcentaje_consumido', { ascending: false }).limit(4),
      ])

      if (!activo) return

      const fallo = historial.error || categorias.error || ultimos.error || presupuesto.error
      if (fallo) {
        console.error('[resumen]', fallo)
        setError('No se pudo cargar el resumen. Recarga la página.')
        setEstado('error')
        return
      }

      setMeses(historial.data ?? [])
      setDesglose(categorias.data ?? [])
      setRecientes(ultimos.data ?? [])
      setTopes(presupuesto.data ?? [])
      setEstado('listo')
    }

    traer()
    return () => { activo = false }
  }, [periodo, recarga])

  // ---- cifras derivadas
  const clave = (p) => String(p).slice(0, 7)
  const porMes = new Map(meses.map((m) => [clave(m.periodo), m]))
  const actual = porMes.get(periodo) ?? VACIO
  const anterior = porMes.get(periodoVecino(periodo, -1)) ?? VACIO
  const ingresos = n(actual.total_ingresos)
  const gastos = n(actual.total_gastos)
  const ahorro = ingresos - gastos
  const ahorroPrevio = n(anterior.total_ingresos) - n(anterior.total_gastos)
  const saldo = meses.reduce((s, m) => s + n(m.balance), 0)
  const hayDatos = n(actual.num_transacciones) > 0
  const tasaAhorro = ingresos ? (ahorro / ingresos) * 100 : 0

  const serie = Array.from({ length: 6 }, (_, i) => {
    const p = periodoVecino(periodo, i - 5)
    const m = porMes.get(p) ?? VACIO
    return { mes: nombreMesCorto(p), Ingresos: n(m.total_ingresos), Gastos: n(m.total_gastos) }
  })

  const metaPct = metaAhorroDe(usuario)
  const meta = ingresos * (metaPct / 100)
  const avanceMeta = meta ? Math.max(0, Math.min((ahorro / meta) * 100, 100)) : 0

  const nombre = primerNombre(usuario)
  const saludo = nombre ? `Hola, ${nombre}` : 'Hola'

  async function guardarMeta(e) {
    e.preventDefault()
    const valor = Math.round(Number(metaEscrita))
    if (!(valor >= 1 && valor <= 90)) return
    const { error: fallo } = await actualizarPerfil({ meta_ahorro: valor })
    if (!fallo) setEditandoMeta(false)
  }

  const peorTope = topes[0]
  let mensajeTopes = null
  if (peorTope) {
    const pct = n(peorTope.porcentaje_consumido)
    if (pct > 100) {
      mensajeTopes = { tono: 'excedido', texto: `Te pasaste ${pesos(n(peorTope.gasto_acumulado) - n(peorTope.monto_tope))} en ${peorTope.categoria}. Puedes ajustar el tope o compensar en otra categoría.` }
    } else if (pct >= 80) {
      mensajeTopes = { tono: 'alerta', texto: `Ya usaste el ${pct.toFixed(0)} % de ${peorTope.categoria}. Te quedan ${pesos(peorTope.disponible)} para el resto del mes.` }
    } else {
      mensajeTopes = { tono: 'bien', texto: 'Todo en orden: tus topes van bien este mes.' }
    }
  }

  const cargando = estado === 'cargando'
  const consejo = consejoDelDia()

  return (
    <div className="tablero">
      <header className="tablero-encabezado">
        <div>
          <p className="tablero-fecha">{hoyLargo()}</p>
          <h1 className="tablero-saludo">{saludo} <span aria-hidden="true">👋</span></h1>
          <p className="tablero-frase">
            {cargando ? <Esqueleto alto={16} ancho={320} /> : fraseDelMes(ingresos, gastos, hayDatos)}
          </p>
        </div>
        <div className="tablero-acciones">
          <SelectorMes periodo={periodo} onCambiar={onCambiarPeriodo} />
          <button className="boton auto con-icono" onClick={onNuevaTransaccion}>
            <Plus size={18} strokeWidth={2.2} /> Nueva transacción
          </button>
        </div>
      </header>

      {!nombre && <TarjetaNombre onGuardar={actualizarPerfil} />}

      {estado === 'error' && <p className="error bloque">{error}</p>}

      {/* ---------------------------------------------------------- KPI */}
      <div className="kpis">
        <Tarjeta i={0} className="kpi kpi-saldo">
          <div className="kpi-cabeza">
            <span className="kpi-icono"><Wallet size={20} /></span>
            <span className="kpi-rotulo">Saldo total</span>
          </div>
          {cargando ? <Esqueleto alto={40} ancho="70%" className="claro" /> : (
            <p className="kpi-cifra"><CifraAnimada valor={saldo} formato={pesos} /></p>
          )}
          <Variacion texto={cargando ? ' ' : `${ahorro >= 0 ? '+' : '−'}${pesos(Math.abs(ahorro))} este mes`} />
        </Tarjeta>

        <Tarjeta i={1} className="kpi">
          <div className="kpi-cabeza">
            <span className="kpi-icono verde"><TrendingUp size={20} /></span>
            <span className="kpi-rotulo">Ingresos del mes</span>
          </div>
          {cargando ? <Esqueleto alto={34} ancho="65%" /> : (
            <p className="kpi-cifra"><CifraAnimada valor={ingresos} formato={pesos} /></p>
          )}
          {!cargando && <Variacion valor={variacion(ingresos, n(anterior.total_ingresos))} />}
        </Tarjeta>

        <Tarjeta i={2} className="kpi">
          <div className="kpi-cabeza">
            <span className="kpi-icono terracota"><TrendingDown size={20} /></span>
            <span className="kpi-rotulo">Gastos del mes</span>
          </div>
          {cargando ? <Esqueleto alto={34} ancho="65%" /> : (
            <p className="kpi-cifra"><CifraAnimada valor={gastos} formato={pesos} /></p>
          )}
          {!cargando && <Variacion valor={variacion(gastos, n(anterior.total_gastos))} invertir />}
        </Tarjeta>

        <Tarjeta i={3} className="kpi">
          <div className="kpi-cabeza">
            <span className="kpi-icono ocre"><PiggyBank size={20} /></span>
            <span className="kpi-rotulo">Ahorro del mes</span>
          </div>
          {cargando ? <Esqueleto alto={34} ancho="65%" /> : (
            <p className={'kpi-cifra' + (ahorro < 0 ? ' negativa' : '')}><CifraAnimada valor={ahorro} formato={pesos} /></p>
          )}
          {!cargando && (ingresos
            ? <Variacion valor={variacion(ahorro, ahorroPrevio)} />
            : <Variacion texto="Aún sin ingresos este mes" />)}
        </Tarjeta>
      </div>

      {/* ---------------------------------------------------- estado vacío */}
      {estado === 'listo' && !hayDatos && (
        <Tarjeta i={4} className="vacio-t">
          <span className="vacio-icono"><Receipt size={30} strokeWidth={1.6} /></span>
          <h2>Tu mes está en blanco</h2>
          <p>Registra tu primer ingreso o gasto y aquí aparecerán tus gráficas, tus topes y tus movimientos.</p>
          <button className="boton auto con-icono" onClick={onNuevaTransaccion}>
            <Plus size={18} strokeWidth={2.2} /> Agregar mi primer movimiento
          </button>
        </Tarjeta>
      )}

      {/* ------------------------------------------------------- gráficas */}
      {(cargando || hayDatos) && (
        <div className="fila-graficas">
          <Tarjeta i={4} className="grafica-area">
            <div className="tarjeta-t-cabeza">
              <div>
                <TituloEnlace onClick={() => onIrA('analisis')} etiqueta="Ver el análisis de ingresos y gastos">Ingresos y gastos</TituloEnlace>
                <p className="tarjeta-t-sub">Últimos 6 meses</p>
              </div>
              <div className="leyenda-mini">
                <span><i style={{ background: 'var(--verde-vivo)' }} />Ingresos</span>
                <span><i style={{ background: 'var(--terracota-viva)' }} />Gastos</span>
              </div>
            </div>
            {cargando ? <Esqueleto alto={240} redondeo={12} /> : (
              <div className="grafica-caja">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={serie} margin={{ top: 10, right: 6, left: -6, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f9e78" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#4f9e78" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d4785c" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#d4785c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#efece3" />
                    <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: '#8a96a8', fontSize: 12, fontFamily: 'IBM Plex Mono' }} />
                    <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => `$${COMPACTO.format(v)}`} tick={{ fill: '#8a96a8', fontSize: 12, fontFamily: 'IBM Plex Mono' }} />
                    <Tooltip content={<TooltipDinero />} cursor={{ stroke: '#d9e2ef', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="Ingresos" stroke="#4f9e78" strokeWidth={2.5} fill="url(#gIngresos)" animationDuration={900} />
                    <Area type="monotone" dataKey="Gastos" stroke="#d4785c" strokeWidth={2.5} fill="url(#gGastos)" animationDuration={900} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Tarjeta>

          <Tarjeta i={5} className="grafica-dona">
            <div className="tarjeta-t-cabeza">
              <div>
                <TituloEnlace onClick={() => onIrA('analisis')} etiqueta="Ver el detalle de gastos por categoría">Gastos por categoría</TituloEnlace>
                <p className="tarjeta-t-sub">En qué se fue el dinero</p>
              </div>
            </div>
            {cargando ? <Esqueleto alto={240} redondeo={12} /> : (
              <div className="dona">
                <div className="dona-grafica">
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie data={desglose} dataKey="monto" nameKey="categoria" innerRadius={62} outerRadius={88} paddingAngle={2} stroke="none" animationDuration={900}>
                        {desglose.map((d) => <Cell key={d.categoria_id} fill={estiloCategoria(d.categoria).color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => pesos(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="dona-centro">
                    <span>Gastado</span>
                    <b>{pesos(gastos)}</b>
                  </div>
                </div>
                <ul className="dona-leyenda">
                  {desglose.slice(0, 6).map((d) => (
                    <li key={d.categoria_id}>
                      <i style={{ background: estiloCategoria(d.categoria).color }} />
                      <span>{d.categoria}</span>
                      <b>{n(d.porcentaje).toFixed(0)} %</b>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Tarjeta>
        </div>
      )}

      {/* --------------------------------------- topes, recientes y meta */}
      {(cargando || hayDatos) && (
        <div className="fila-tres">
          <Tarjeta i={6}>
            <div className="tarjeta-t-cabeza">
              <TituloEnlace onClick={() => onIrA('presupuesto')} etiqueta="Ir a presupuestos">Presupuestos</TituloEnlace>
              <button className="enlace" onClick={() => onIrA('presupuesto')}>Administrar</button>
            </div>
            {cargando && [0, 1, 2].map((k) => <Esqueleto key={k} alto={42} className="separado" />)}
            {!cargando && topes.length === 0 && (
              <div className="vacio-mini">
                <p>Aún no tienes topes este mes. Ponle un límite a la categoría donde más gastas.</p>
                <button className="boton auto fantasma" onClick={() => onIrA('presupuesto')}>Definir un tope</button>
              </div>
            )}
            {!cargando && topes.length > 0 && (
              <>
                <ul className="topes-t">
                  {topes.map((t) => {
                    const pct = n(t.porcentaje_consumido)
                    const tono = tonoTope(pct)
                    return (
                      <li key={t.presupuesto_id}>
                        <IconoCategoria nombre={t.categoria} tamano={34} />
                        <div className="tope-cuerpo">
                          <div className="tope-linea">
                            <span className="tope-nombre">{t.categoria}</span>
                            <span className={`tope-pct ${tono}`}>{pct.toFixed(0)} %</span>
                          </div>
                          <div className="barra-progreso" role="img" aria-label={`${pct.toFixed(0)} % usado`}>
                            <motion.i
                              className={tono}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(pct, 100)}%` }}
                              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </div>
                          <span className="tope-meta">{pesos(t.gasto_acumulado)} de {pesos(t.monto_tope)}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {mensajeTopes && (
                  <p className={`aviso-tope ${mensajeTopes.tono}`}>
                    {mensajeTopes.tono === 'bien' ? <CircleCheck size={18} /> : <TriangleAlert size={18} />}
                    {mensajeTopes.texto}
                  </p>
                )}
              </>
            )}
          </Tarjeta>

          <Tarjeta i={7}>
            <div className="tarjeta-t-cabeza">
              <TituloEnlace onClick={() => onIrA('transacciones')} etiqueta="Ir a movimientos">Movimientos recientes</TituloEnlace>
              <button className="enlace" onClick={() => onIrA('transacciones')}>Ver todos</button>
            </div>
            {cargando && [0, 1, 2, 3].map((k) => <Esqueleto key={k} alto={40} className="separado" />)}
            {!cargando && (
              <ul className="recientes-t">
                {recientes.map((t) => (
                  <li key={t.id}>
                    <IconoCategoria nombre={t.categorias?.nombre} tamano={38} />
                    <span className="reciente-texto">
                      <span className="reciente-titulo">{t.descripcion}</span>
                      <span className="reciente-meta">{t.categorias?.nombre} · {fechaCorta(t.fecha)}</span>
                    </span>
                    <span className={t.tipo === 'ingreso' ? 'monto entra' : 'monto sale'}>
                      {t.tipo === 'ingreso' ? '+' : '−'}{pesos(t.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>

          <div className="columna-meta">
            <Tarjeta i={8} className="meta-t">
              <div className="tarjeta-t-cabeza">
                <h2>Meta de ahorro</h2>
                {!editandoMeta ? (
                  <button className="boton-icono" onClick={() => { setMetaEscrita(String(metaPct)); setEditandoMeta(true) }} aria-label="Editar la meta de ahorro" title="Editar la meta">
                    <Pencil size={16} />
                  </button>
                ) : (
                  <span className="kpi-icono ocre pequeno"><Target size={18} /></span>
                )}
              </div>
              {cargando ? <Esqueleto alto={60} /> : (
                <>
                  {editandoMeta ? (
                    <form className="meta-editar" onSubmit={guardarMeta}>
                      <label htmlFor="meta-pct">Quiero ahorrar el</label>
                      <input id="meta-pct" type="number" min="1" max="90" inputMode="numeric"
                        value={metaEscrita} onChange={(e) => setMetaEscrita(e.target.value)} />
                      <span>% de mis ingresos</span>
                      <div className="meta-editar-botones">
                        <button type="button" className="boton auto fantasma" onClick={() => setEditandoMeta(false)}>Cancelar</button>
                        <button type="submit" className="boton auto">Guardar</button>
                      </div>
                    </form>
                  ) : (
                    <p className="meta-texto">
                      Ahorrar el {metaPct} % de tus ingresos: <b>{pesos(meta)}</b>
                    </p>
                  )}
                  <div className="barra-progreso grande">
                    <motion.i
                      className="meta"
                      initial={{ width: 0 }}
                      animate={{ width: `${avanceMeta}%` }}
                      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <p className="meta-pie">
                    {ahorro > 0
                      ? <>Llevas <b>{pesos(ahorro)}</b> · {avanceMeta.toFixed(0)} % de la meta</>
                      : 'Cuando tus ingresos superen tus gastos, aquí verás tu avance.'}
                  </p>
                  {ingresos > 0 && <p className="meta-tasa">Tasa de ahorro del mes: {tasaAhorro.toFixed(0)} %</p>}
                </>
              )}
            </Tarjeta>

            <Tarjeta i={9} className="consejo-t">
              <div className="consejo-cabeza">
                <Lightbulb size={18} />
                <span>Consejo del día</span>
              </div>
              <p>{consejo.texto}</p>
              <p className="consejo-fuente">Fuente: {consejo.fuente}</p>
            </Tarjeta>
          </div>
        </div>
      )}
    </div>
  )
}
