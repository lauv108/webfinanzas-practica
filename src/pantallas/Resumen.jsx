import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { pesos, rangoDelPeriodo, nombrePeriodo, hoyLargo, fechaCorta } from '../lib/formato'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import SelectorMes from '../componentes/SelectorMes'
import GraficoAnillo from '../componentes/GraficoAnillo'

/*
 * Resumen del mes.
 * RF-19 totales, RF-20 selector de mes, RF-21 gráfico de distribución,
 * RF-22 desglose por categoría.
 *
 * Los totales y el desglose los calculan las vistas del esquema, de modo que
 * la interfaz no repite ninguna operación aritmética sobre el dinero.
 */

const VACIO = { total_ingresos: 0, total_gastos: 0, balance: 0, num_transacciones: 0 }

export default function Resumen({ periodo, onCambiarPeriodo, recarga, onNuevaTransaccion, onIrA }) {
  const [totales, setTotales] = useState(VACIO)
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

      const [resumen, categorias, ultimos, presupuesto] = await Promise.all([
        supabase.from('v_resumen_mensual')
          .select('total_ingresos, total_gastos, balance, num_transacciones')
          .eq('periodo', desde).maybeSingle(),
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
          .select('presupuesto_id, categoria, monto_tope, gasto_acumulado, porcentaje_consumido, estado')
          .eq('periodo', desde).order('porcentaje_consumido', { ascending: false }).limit(4),
      ])

      if (!activo) return

      const fallo = resumen.error || categorias.error || ultimos.error || presupuesto.error
      if (fallo) {
        console.error('[resumen]', fallo)
        setError('No se pudo cargar el resumen. Recarga la página.')
        setEstado('error')
        return
      }

      setTotales(resumen.data ?? VACIO)
      setDesglose(categorias.data ?? [])
      setRecientes(ultimos.data ?? [])
      setTopes(presupuesto.data ?? [])
      setEstado('listo')
    }

    traer()
    return () => { activo = false }
  }, [periodo, recarga])

  const sinDatos = estado === 'listo' && totales.num_transacciones === 0
  const balance = Number(totales.balance)

  return (
    <>
      <EncabezadoPagina
        rotulo={`Resumen — ${hoyLargo()}`}
        titulo={nombrePeriodo(periodo)}
        resumen={
          estado === 'listo'
            ? `${totales.num_transacciones} movimientos · ${desglose.length} categorías con gasto`
            : null
        }
        acciones={
          <>
            <SelectorMes periodo={periodo} onCambiar={onCambiarPeriodo} />
            <button className="boton auto" onClick={onNuevaTransaccion}>+ Nueva transacción</button>
          </>
        }
      />

      {estado === 'error' && <p className="error bloque">{error}</p>}

      <section className="bloque-hero">
        <p className="dato-rotulo">Balance del mes</p>
        <p className={'cifra-hero' + (balance < 0 ? ' sale' : '')}>{pesos(balance)}</p>
        <p className="dato-pie">
          {pesos(totales.total_ingresos)} entraron y {pesos(totales.total_gastos)} salieron
        </p>
      </section>

      <div className="indicadores">
        <div className="indicador">
          <span className="etiqueta-dato">Ingresos</span>
          <span className="cifra-grande entra">{pesos(totales.total_ingresos)}</span>
        </div>
        <div className="indicador">
          <span className="etiqueta-dato">Gastos</span>
          <span className="cifra-grande sale">{pesos(totales.total_gastos)}</span>
        </div>
        <div className="indicador">
          <span className="etiqueta-dato">Movimientos</span>
          <span className="cifra-grande">{totales.num_transacciones}</span>
        </div>
      </div>

      {sinDatos && (
        <section className="tarjeta ancha">
          <div className="vacio">
            <p className="fuerte">Todavía no hay movimientos en este mes.</p>
            <p>Registra el primero y el resumen se arma solo.</p>
            <button className="boton auto" onClick={onNuevaTransaccion}>
              Registrar mi primer movimiento
            </button>
          </div>
        </section>
      )}

      {estado === 'listo' && desglose.length > 0 && (
        <div className="rejilla-dos">
          <section className="tarjeta ancha">
            <div className="tarjeta-encabezado">
              <h2>Distribución del gasto</h2>
            </div>
            <GraficoAnillo desglose={desglose} total={totales.total_gastos} />
          </section>

          <section className="tarjeta ancha">
            <div className="tarjeta-encabezado">
              <h2>Desglose por categoría</h2>
            </div>
            <div className="tabla-scroll">
              <table>
                <thead>
                  <tr><th>Categoría</th><th className="der">Monto</th><th className="der">%</th></tr>
                </thead>
                <tbody>
                  {desglose.map((d) => (
                    <tr key={d.categoria_id}>
                      <td>{d.categoria}</td>
                      <td className="der cifra">{pesos(d.monto)}</td>
                      <td className="der cifra">{Number(d.porcentaje).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {estado === 'listo' && (recientes.length > 0 || topes.length > 0) && (
        <div className="rejilla-dos">
          {recientes.length > 0 && (
            <section className="tarjeta ancha">
              <div className="tarjeta-encabezado">
                <h2>Últimos movimientos</h2>
                <button className="enlace" onClick={() => onIrA('transacciones')}>Ver todos</button>
              </div>
              <ul className="lista-movimientos">
                {recientes.map((t) => (
                  <li key={t.id}>
                    <span className="mov-texto">
                      <span className="mov-titulo">{t.descripcion}</span>
                      <span className="mov-meta">{t.categorias?.nombre} · {fechaCorta(t.fecha)}</span>
                    </span>
                    <span className={t.tipo === 'ingreso' ? 'cifra entra' : 'cifra'}>
                      {t.tipo === 'ingreso' ? '+' : '-'}{pesos(t.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {topes.length > 0 && (
            <section className="tarjeta ancha">
              <div className="tarjeta-encabezado">
                <h2>Topes del mes</h2>
                <button className="enlace" onClick={() => onIrA('presupuesto')}>Administrar</button>
              </div>
              <ul className="lista-topes">
                {topes.map((t) => {
                  const clase = t.estado === 'excedido' ? 'mal' : t.estado === 'alerta' ? 'ojo' : 'bien'
                  return (
                    <li key={t.presupuesto_id}>
                      <span className="mov-texto">
                        <span className="mov-titulo">{t.categoria}</span>
                        <span className="mov-meta">
                          {pesos(t.gasto_acumulado)} de {pesos(t.monto_tope)}
                        </span>
                      </span>
                      <span className={'semaforo ' + clase}>
                        {Number(t.porcentaje_consumido).toFixed(0)} %
                      </span>
                      <span className={'medidor ' + clase}>
                        <i style={{ width: `${Math.min(Number(t.porcentaje_consumido), 100)}%` }} />
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  )
}
