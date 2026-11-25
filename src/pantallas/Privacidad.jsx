import { ArrowLeft } from 'lucide-react'
import EncabezadoPagina from '../componentes/EncabezadoPagina'
import PoliticaDatos from '../componentes/PoliticaDatos'

/* RNF-12. Política de tratamiento de datos personales, Ley 1581 de 2012. */

export default function Privacidad({ onVolver }) {
  return (
    <div className="pantalla">
      <EncabezadoPagina
        rotulo="Privacidad"
        titulo="Tratamiento de datos personales"
        resumen="Qué datos guarda WebFinanzas, para qué, quién los ve y cómo ejerces tus derechos."
        acciones={<button className="boton fantasma auto con-icono" onClick={onVolver}><ArrowLeft size={17} /> Volver al perfil</button>}
      />
      <section className="tarjeta-t politica-t">
        <PoliticaDatos />
      </section>
    </div>
  )
}
