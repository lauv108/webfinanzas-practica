import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Target } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { pesos, rangoDelPeriodo, nombrePeriodo } from '../lib/formato'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import SelectorMes from '../componentes/SelectorMes'
import FormularioPresupuesto from '../componentes/FormularioPresupuesto'
import IconoCategoria from '../componentes/IconoCategoria'
import CifraAnimada from '../componentes/CifraAnimada'
import Esqueleto from '../componentes/Esqueleto'
import MetaAhorro from '../componentes/MetaAhorro'
import { estiloCategoria } from '../lib/categorias'

/*
 * Presupuesto mensual.
 * RF-15 definición del tope, RF-16 gasto acumulado, RF-17 indicadores de
 * alerta, RF-18 edición y eliminación.
 *
 * Ni el acumulado ni el semáforo se calculan aquí: los resuelve la vista
 * v_estado_presupuesto. La interfaz solo elige el color de la barra.
 */

/* Color del progreso: verde normal, ocre desde 80 %, terracota al pasarse.
   La vista sigue marcando su estado con la regla del 90 %; esto es solo visual. */
function tonoTope(pct) {
  if (pct > 100) return 'excedido'
  if (pct >= 80) return 'alerta'
  return 'bien'
}

const MENSAJE = {
  bien: { texto: 'Vas bien' },
  alerta: { texto: 'Cerca del tope' },
  excedido: { texto: 'Te pasaste' },
}

export default function Presupuesto({ periodo, onCambiarPeriodo, recarga, categorias }) {
  const [topes, setTopes] = useState([])
  const [mes, setMes] = useState({ ingresos: 0, gastos: 0 })
  const [estado, setEstado] = useState('cargando')
  const [modal, setModal] = useState(null)
  const [borrando, setBorrando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState(null)

  const cargar = useCallback(async () => {
    setEstado('cargando')
    const { desde } = rangoDelPeriodo(periodo)

    const [{ data, error }, resumen] = await Promise.all([
      supabase
        .from('v_estado_presupuesto')
        .select('presupuesto_id, categoria_id, categoria, monto_tope, gasto_acumulado, disponible, porcentaje_consumido, estado')
        .eq('periodo', desde)
        .order('porcentaje_consumido', { ascending: false }),
      supabase.from('v_resumen_mensual')
        .select('total_ingresos, total_gastos')
        .eq('periodo', desde).maybeSingle(),
    ])

    if (error) {
      console.error('[presupuesto]', error)
      setEstado('error')
    } else {
      if (resumen.error) console.error('[presupuesto] resumen', resumen.error)
      setMes({ ingresos: Number(resumen.data?.total_ingresos) || 0, gastos: Number(resumen.data?.total_gastos) || 0 })
      setTopes(data)
      setEstado('listo')
    }
  }, [periodo])

  useEffect(() => { cargar() }, [cargar, recarga])

  const conTope = new Set(topes.map((t) => t.categoria_id))
  const disponibles = categorias.filter((c) => c.tipo === 'gasto' && !conTope.has(c.id))

  const totalTope = topes.reduce((s, t) => s + Number(t.monto_tope), 0)
  const totalGasto = topes.reduce((s, t) => s + Number(t.gasto_acumulado), 0)
  const excedidos = topes.filter((t) => tonoTope(Number(t.porcentaje_consumido)) === 'excedido').length
  const avance = totalTope > 0 ? Math.min((totalGasto / totalTope) * 100, 100) : 0

  async function eliminar(tope) {
    setBorrando(true)
    const { error } = await supabase.from('presupuestos').delete().eq('id', tope.presupuesto_id)
    setBorrando(false)

    if (error) {
      console.error('[presupuesto]', error)
      setErrorGeneral('No se pudo eliminar el tope. Intenta de nuevo.')
      return
    }
    setModal(null)
    setErrorGeneral(null)
    cargar()
  }

  const enAlerta = topes.filter((t) => tonoTope(Number(t.porcentaje_consumido)) === 'alerta').length
  const tonoTotal = tonoTope(totalTope > 0 ? (totalGasto / totalTope) * 100 : 0)

  return (
    <div className="pantalla">
      <EncabezadoPagina
        rotulo={`Presupuesto · ${nombrePeriodo(periodo)}`}
        titulo="Presupuesto"
        resumen="Ponle un tope mensual a cada categoría y te avisamos cuando te acerques."
        acciones={
          <>
            <SelectorMes periodo={periodo} onCambiar={onCambiarPeriodo} />
            <button
              className="boton auto con-icono"
              onClick={() => setModal({ clase: 'nuevo' })}
              disabled={disponibles.length === 0}
              title={disponibles.length === 0 ? 'Todas tus categorías de gasto ya tienen tope este mes' : undefined}
            >
              <Plus size={18} strokeWidth={2.2} /> Definir tope
            </button>
          </>
        }
      />

      {errorGeneral && <p className="error bloque">{errorGeneral}</p>}
      {estado === 'error' && <p className="error bloque">No se pudo cargar el presupuesto. Recarga la página.</p>}

      {estado === 'cargando' && (
        <>
          <Esqueleto alto={150} redondeo={18} />
          <div className="topes-rejilla">
            {[0, 1, 2].map((k) => <Esqueleto key={k} alto={170} redondeo={18} />)}
          </div>
        </>
      )}

      {estado === 'listo' && topes.length > 0 && (
        <motion.section className="tarjeta-t resumen-topes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="resumen-topes-cifras">
            <div>
              <p className="kpi-rotulo">Gastado del total presupuestado</p>
              <p className="resumen-topes-monto">
                <CifraAnimada valor={totalGasto} formato={pesos} /> <span>de {pesos(totalTope)}</span>
              </p>
            </div>
            <div className="resumen-topes-pildoras">
              <span className="pildora">{topes.length} {topes.length === 1 ? 'tope' : 'topes'}</span>
              {enAlerta > 0 && <span className="pildora alerta">{enAlerta} cerca del límite</span>}
              {excedidos > 0 && <span className="pildora excedido">{excedidos} {excedidos === 1 ? 'excedido' : 'excedidos'}</span>}
            </div>
          </div>
          <div className="barra-progreso grande">
            <motion.i className={tonoTotal} initial={{ width: 0 }} animate={{ width: `${avance}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
          </div>
          <p className="resumen-topes-pie">Llevas el {avance.toFixed(0)} % de lo que planeaste gastar este mes.</p>
        </motion.section>
      )}

      {estado === 'listo' && <MetaAhorro ingresos={mes.ingresos} gastos={mes.gastos} />}

      {estado === 'listo' && topes.length === 0 && (
        <section className="tarjeta-t vacio-t">
          <span className="vacio-icono"><Target size={30} strokeWidth={1.6} /></span>
          <h2>Todavía no tienes topes este mes</h2>
          <p>Ponle un límite a la categoría donde más gastas y aquí verás cuánto te queda.</p>
          <button
            className="boton auto con-icono"
            onClick={() => setModal({ clase: 'nuevo' })}
            disabled={disponibles.length === 0}
          >
            <Plus size={18} strokeWidth={2.2} /> Definir mi primer tope
          </button>
        </section>
      )}

      {estado === 'listo' && topes.length > 0 && (
        <div className="topes-rejilla">
          {topes.map((t, i) => {
            const pct = Number(t.porcentaje_consumido)
            const tono = tonoTope(pct)
            const { texto } = MENSAJE[tono]
            return (
              <motion.section className="tarjeta-t tope-t" key={t.presupuesto_id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="tope-t-cabeza">
                  <IconoCategoria nombre={t.categoria} tamano={42} />
                  <div className="tope-t-titulo">
                    <h2>{t.categoria}</h2>
                    <span className={`pildora ${tono}`}>{texto}</span>
                  </div>
                  <span className="acciones-fila visibles">
                    <button className="boton-icono" onClick={() => setModal({ clase: 'editar', tope: t })} aria-label={`Editar el tope de ${t.categoria}`} title="Editar"><Pencil size={16} /></button>
                    <button className="boton-icono peligro" onClick={() => setModal({ clase: 'borrar', tope: t })} aria-label={`Borrar el tope de ${t.categoria}`} title="Borrar"><Trash2 size={16} /></button>
                  </span>
                </div>

                <p className="tope-t-monto">{pesos(t.gasto_acumulado)} <span>de {pesos(t.monto_tope)}</span></p>

                <div className="barra-progreso">
                  <motion.i className={tono} initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }} />
                </div>

                <div className="tope-t-pie">
                  <span className={`tope-pct ${tono}`}>{pct.toFixed(0)} %</span>
                  <span>
                    {pct > 100
                      ? `${pesos(Number(t.gasto_acumulado) - Number(t.monto_tope))} por encima`
                      : `Te quedan ${pesos(t.disponible)}`}
                  </span>
                </div>
              </motion.section>
            )
          })}
        </div>
      )}

      {estado === 'listo' && topes.length > 0 && disponibles.length > 0 && (
        <section className="tarjeta-t sin-tope">
          <div>
            <h2>Categorías sin tope</h2>
            <p className="tarjeta-t-sub">Puedes ponerles un límite cuando quieras.</p>
          </div>
          <div className="fichas">
            {disponibles.map((c) => (
              <button key={c.id} className="ficha" onClick={() => setModal({ clase: 'nuevo' })}>
                <i style={{ background: estiloCategoria(c.nombre).color }} />{c.nombre}
              </button>
            ))}
          </div>
        </section>
      )}

      {modal?.clase === 'nuevo' && (
        <FormularioPresupuesto
          categorias={disponibles} periodo={periodo}
          onCerrar={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar() }}
        />
      )}

      {modal?.clase === 'editar' && (
        <FormularioPresupuesto
          tope={modal.tope} categorias={disponibles} periodo={periodo}
          onCerrar={() => setModal(null)}
          onGuardado={() => { setModal(null); cargar() }}
        />
      )}

      {modal?.clase === 'borrar' && (
        <div className="velo" role="dialog" aria-modal="true" aria-label="Confirmar eliminación del tope">
          <div className="modal">
            <h2>¿Eliminar este tope?</h2>
            <p className="sub">
              La categoría deja de tener límite este mes. Las transacciones no se tocan.
            </p>
            <div className="resumen-fila">
              <strong>{modal.tope.categoria}</strong>
              <span>Tope de {pesos(modal.tope.monto_tope)}</span>
              <strong>{pesos(modal.tope.gasto_acumulado)} gastados</strong>
            </div>
            <div className="par">
              <button className="boton fantasma" onClick={() => setModal(null)}>Cancelar</button>
              <button className="boton peligro" onClick={() => eliminar(modal.tope)} disabled={borrando}>
                {borrando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
