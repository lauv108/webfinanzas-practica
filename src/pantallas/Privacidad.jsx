import EncabezadoPagina from '../componentes/EncabezadoPagina'
import PoliticaDatos from '../componentes/PoliticaDatos'

/* RNF-12. Política de tratamiento de datos personales, Ley 1581 de 2012. */

export default function Privacidad({ onVolver }) {
  return (
    <>
      <EncabezadoPagina
        rotulo="Privacidad"
        titulo="Tratamiento de datos personales"
        resumen="Qué datos guarda WebFinanzas, para qué, quién los ve y cómo ejerces tus derechos."
        acciones={<button className="boton fantasma auto" onClick={onVolver}>Volver al perfil</button>}
      />
      <section className="tarjeta ancha">
        <PoliticaDatos />
      </section>
    </>
  )
}
