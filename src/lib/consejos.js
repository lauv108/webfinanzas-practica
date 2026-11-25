/*
 * Consejos del día.
 * Cada consejo es una paráfrasis corta de una guía pública de educación
 * financiera y lleva su fuente. Cambian una vez al día y no se repiten hasta
 * recorrer la lista completa (60 días).
 */

export const FUENTES = {
  asobancaria: 'Asobancaria, Banca de las Oportunidades y Superfinanciera (2018)',
  sfc: 'Superintendencia Financiera de Colombia, Endeudamiento responsable',
  banrep: 'Banco de la República, Taller Virtual del Ahorro',
}

const CONSEJOS = [
  // Presupuesto
  ['Lleva tu presupuesto por escrito. De memoria siempre se escapa algo.', 'asobancaria'],
  ['Anota todos tus ingresos, también los ocasionales, como un trabajo extra o un regalo.', 'asobancaria'],
  ['Registra cada gasto, incluso los pequeños. Son los que más se olvidan.', 'asobancaria'],
  ['Agrupa tus gastos por categoría. Así ves de un vistazo dónde se va el dinero.', 'asobancaria'],
  ['Antes de comprar, pregúntate si es una necesidad o un deseo.', 'asobancaria'],
  ['Si el mes termina sin dinero disponible, es una señal de alerta, no algo normal.', 'asobancaria'],
  ['Cuando el dinero no alcanza, primero recorta gastos innecesarios antes de pedir prestado.', 'asobancaria'],
  ['Si tus gastos superan tus ingresos, busca recortar y también nuevas fuentes de ingreso.', 'asobancaria'],
  ['Revisa tus categorías al final del mes y decide cuál ajustar el siguiente.', 'asobancaria'],
  ['Incluye una categoría para imprevistos. Siempre aparece alguno.', 'asobancaria'],
  ['Calcula tu dinero disponible restando del ingreso tu ahorro y tus gastos.', 'asobancaria'],
  ['Programa con tiempo los gastos grandes de inicio de año, como matrículas y útiles.', 'sfc'],
  ['Pagar con medios electrónicos deja registro y te ayuda a controlar el gasto.', 'sfc'],
  ['No cargues mucho efectivo. Es más fácil gastarlo por impulso.', 'asobancaria'],
  ['Revisa con frecuencia los saldos de tus cuentas y tarjetas.', 'sfc'],
  ['Activa las notificaciones de tu banco para enterarte de cada movimiento.', 'sfc'],
  ['Antes de comprar en una plataforma del exterior, confirma con tu banco cómo te van a cobrar.', 'sfc'],
  ['El dinero extra de fin de año no es permanente. Úsalo con cabeza.', 'sfc'],
  ['Antes de gastar una prima o un bono, pregúntate si de verdad lo necesitas.', 'sfc'],
  ['Compara lo que planeaste con lo que gastaste. Ahí está la lección del mes.', 'asobancaria'],

  // Ahorro
  ['Intenta ahorrar al menos el 10 % de lo que ganas.', 'asobancaria'],
  ['Si no puedes ahorrar un porcentaje fijo, ahorra lo que puedas, pero no dejes de hacerlo.', 'asobancaria'],
  ['Separa tu ahorro apenas recibes el ingreso, no con lo que sobre a fin de mes.', 'asobancaria'],
  ['Guarda el dinero extra que recibas en lugar de dejarlo ir en gastos innecesarios.', 'asobancaria'],
  ['Ponle nombre a tu ahorro: una meta concreta motiva más que "ahorrar por ahorrar".', 'asobancaria'],
  ['Toda meta de ahorro necesita un costo, un plazo y una cuota mensual.', 'banrep'],
  ['Divide el valor de tu meta entre los meses que tienes y sabrás cuánto apartar cada mes.', 'asobancaria'],
  ['Empieza con metas pequeñas y alcanzables. Cumplirlas da impulso para las grandes.', 'banrep'],
  ['Si tienes varias metas, ordénalas por prioridad y empieza por la primera.', 'banrep'],
  ['La constancia vale más que el monto. Ahorrar poco cada mes suma.', 'banrep'],
  ['Ahorrar es dejar de gastar algo hoy para lograr algo mañana.', 'banrep'],
  ['Los recursos son limitados. Cuidarlos es lo que te deja llegar a tus metas.', 'banrep'],
  ['Fija una meta de ahorro para el año que empieza.', 'sfc'],
  ['Guarda una parte de tus ingresos para imprevistos.', 'sfc'],
  ['Guarda tus ahorros en una entidad vigilada por la Superintendencia Financiera.', 'asobancaria'],
  ['Desconfía de quien promete hacerte rico rápido.', 'asobancaria'],
  ['Si una inversión promete ganancias muy altas sin respaldo claro, es una señal de alerta.', 'sfc'],
  ['Celebra cuando cumplas una meta, y define la siguiente.', 'banrep'],
  ['Revisa tu meta de ahorro cada mes y ajústala si tus ingresos cambian.', 'asobancaria'],
  ['Ahorrar en casa es arriesgado. En una entidad vigilada tu dinero está protegido.', 'asobancaria'],

  // Crédito y deudas
  ['Antes de pedir un préstamo, haz tu presupuesto y calcula cuánto puedes pagar.', 'asobancaria'],
  ['Que la cuota de un crédito no afecte tu calidad de vida.', 'asobancaria'],
  ['Pide prestado solo lo que necesitas, y úsalo para lo que lo pediste.', 'asobancaria'],
  ['Antes de firmar un crédito, pregunta por intereses, costos y compromisos.', 'asobancaria'],
  ['Lee el contrato completo y pregunta todo lo que no entiendas.', 'asobancaria'],
  ['Compara el mismo crédito en varias entidades antes de escoger.', 'sfc'],
  ['Suma todos los costos de un crédito, no solo la tasa, antes de aceptarlo.', 'sfc'],
  ['Antes de endeudarte, ten claro con qué vas a pagar: sueldo, ahorros u otro ingreso.', 'sfc'],
  ['Verifica que quien te presta sea una entidad vigilada.', 'asobancaria'],
  ['Desconfía de los préstamos de "dinero fácil" y de los cobros agresivos.', 'asobancaria'],
  ['Anota las fechas de pago de tus cuotas en un calendario.', 'asobancaria'],
  ['Separa el dinero de la cuota antes de que llegue la fecha de pago.', 'asobancaria'],
  ['No tomes una deuda nueva mientras no termines la que tienes.', 'asobancaria'],
  ['Si ya no puedes pagar, habla con tu entidad y explica tu situación con honestidad.', 'sfc'],
  ['Para cancelar una deuda, págala directo a la entidad, sin intermediarios.', 'sfc'],
  ['Cuando termines de pagar una deuda, pide tu paz y salvo.', 'sfc'],
  ['Evita endeudarte en temporada de fiestas para gastos que no son necesarios.', 'sfc'],

  // Seguridad
  ['Si vas a retirar mucho efectivo, hazlo en tu entidad y no aceptes ayuda de desconocidos.', 'sfc'],
  ['En temporada de festivos, consulta el horario especial de tu banco antes de ir.', 'sfc'],
  ['Si algo suena demasiado bueno para ser verdad, probablemente lo es. Verifica antes de invertir.', 'sfc'],
]

export function consejoDelDia(fecha = new Date()) {
  // Días desde una fecha fija: así el consejo avanza uno por día sin saltos
  const base = Date.UTC(2026, 0, 1)
  const hoy = Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const dia = Math.floor((hoy - base) / 86400000)
  const [texto, fuente] = CONSEJOS[((dia % CONSEJOS.length) + CONSEJOS.length) % CONSEJOS.length]
  return { texto, fuente: FUENTES[fuente] }
}

export const TOTAL_CONSEJOS = CONSEJOS.length
