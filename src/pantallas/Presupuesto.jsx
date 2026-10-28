import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pesos, rangoDelPeriodo, nombrePeriodo } from '../lib/formato'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import SelectorMes from '../componentes/SelectorMes'
import FormularioPresupuesto from '../componentes/FormularioPresupuesto'

/*
 * Presupuesto mensual.
 * RF-15 definición del tope, RF-16 gasto acumulado, RF-17 indicadores de
 * alerta, RF-18 edición y eliminación.
 *
 * Ni el acumulado ni el semáforo se calculan aquí: los resuelve la vista
 * v_estado_presupuesto, de modo que la regla del 90 % vive en un solo lugar.
 */

const SEMAFORO = {
  seguro: { texto: 'Seguro', clase: 'bien' },
  alerta: { texto: 'Alerta', clase: 'ojo' },
  excedido: { texto: 'Excedido', clase: 'mal' },
}

export default function Presupuesto({ periodo, onCambiarPeriodo, recarga, categorias }) {
  const [topes, setTopes] = useState([])
  const [estado, setEstado] = useState('cargando')
  const [modal, setModal] = useState(null)
  const [borrando, setBorrando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState(null)

  const cargar = useCallback(async () => {
    setEstado('cargando')
    const { desde } = rangoDelPeriodo(periodo)

    const { data, error } = await supabase
      .from('v_estado_presupuesto')
      .select('presupuesto_id, categoria_id, categoria, monto_tope, gasto_acumulado, disponible, porcentaje_consumido, estado')
      .eq('periodo', desde)
      .order('porcentaje_consumido', { ascending: false })

    if (error) {
      console.error('[presupuesto]', error)
      setEstado('error')
    } else {
      setTopes(data)
      setEstado('listo')
    }
  }, [periodo])

  useEffect(() => { cargar() }, [cargar, recarga])

  const conTope = new Set(topes.map((t) => t.categoria_id))
  const disponibles = categorias.filter((c) => c.tipo === 'gasto' && !conTope.has(c.id))

  const totalTope = topes.reduce((s, t) => s + Number(t.monto_tope), 0)
  const totalGasto = topes.reduce((s, t) => s + Number(t.gasto_acumulado), 0)
  const excedidos = topes.filter((t) => t.estado === 'excedido').length
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

  return (
    <>
      <EncabezadoPagina
        rotulo={`Presupuesto — ${nombrePeriodo(periodo)}`}
        titulo="Presupuesto"
        resumen={
          estado === 'listo' && topes.length > 0
            ? `${topes.length} topes definidos${excedidos > 0 ? ` · ${excedidos} excedido${excedidos > 1 ? 's' : ''}` : ''}`
            : null
        }
        acciones={
          <>
            <SelectorMes periodo={periodo} onCambiar={onCambiarPeriodo} />
            <button
              className="boton auto"
              onClick={() => setModal({ clase: 'nuevo' })}
              disabled={disponibles.length === 0}
              title={disponibles.length === 0 ? 'Todas tus categorías de gasto ya tienen tope este mes' : undefined}
            >
              + Definir tope
            </button>
          </>
        }
      />

      {errorGeneral && <p className="error bloque">{errorGeneral}</p>}
      {estado === 'error' && <p className="error bloque">No se pudo cargar el presupuesto. Recarga la página.</p>}

      {estado === 'listo' && topes.length > 0 && (
        <section className="bloque-hero">
          <p className="dato-rotulo">Gastado del total presupuestado</p>
          <p className="cifra-hero">
            {pesos(totalGasto)} <span className="cifra-hero-tenue">de {pesos(totalTope)}</span>
          </p>
          <span className="medidor ancho"><i style={{ width: `${avance}%` }} /></span>
          <p className="dato-pie">
            {avance.toFixed(0)} % de los topes del mes
            {excedidos > 0 && ` · ${excedidos} categoría${excedidos > 1 ? 's' : ''} por encima del tope`}
          </p>
        </section>
      )}

      {estado === 'cargando' && <p className="pista">Calculando tus topes...</p>}

      {estado === 'listo' && topes.length === 0 && (
        <section className="tarjeta ancha">
          <div className="vacio">
            <p className="fuerte">Todavía no has definido topes para este mes.</p>
            <p>Asigna un límite a una categoría y te avisamos cuando te acerques.</p>
            <button
              className="boton auto"
              onClick={() => setModal({ clase: 'nuevo' })}
              disabled={disponibles.length === 0}
            >
              Definir mi primer tope
            </button>
          </div>
        </section>
      )}

      {estado === 'listo' && topes.length > 0 && (
        <div className="rejilla-dos">
          {topes.map((t) => {
            const s = SEMAFORO[t.estado] ?? SEMAFORO.seguro
            const ancho = Math.min(Number(t.porcentaje_consumido), 100)
            const excedido = t.estado === 'excedido'
            return (
              <section className="tarjeta tope" key={t.presupuesto_id}>
                <div className="tarjeta-encabezado">
                  <h2>{t.categoria}</h2>
                  <span className="tope-cifras">
                    <span className={excedido ? 'cifra sale' : 'cifra'}>{pesos(t.gasto_acumulado)}</span>
                    <span className="tope-de"> de {pesos(t.monto_tope)}</span>
                  </span>
                </div>

                <span className={'medidor ancho ' + s.clase}>
                  <i style={{ width: `${ancho}%` }} />
                </span>

                <div className="tope-pie">
                  <span className={'semaforo ' + s.clase}>
                    {s.texto} · {Number(t.porcentaje_consumido).toFixed(0)} %
                  </span>
                  <span className="tope-nota">
                    {excedido
                      ? `${pesos(Number(t.gasto_acumulado) - Number(t.monto_tope))} por encima`
                      : `${pesos(t.disponible)} disponibles`}
                  </span>
                  <span className="mov-acciones">
                    <button className="mini" onClick={() => setModal({ clase: 'editar', tope: t })}>editar</button>
                    <button className="mini borrar" onClick={() => setModal({ clase: 'borrar', tope: t })}>borrar</button>
                  </span>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {estado === 'listo' && topes.length > 0 && (
        <p className="nota">
          El acumulado se recalcula al guardar, editar o eliminar una transacción de la categoría.
          El semáforo lo devuelve la vista de la base de datos, no la interfaz.
        </p>
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
    </>
  )
}
