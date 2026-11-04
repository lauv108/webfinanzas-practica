import { POLITICA, FECHA_POLITICA } from '../lib/privacidad'

/* Cuerpo de la política de tratamiento de datos. Se reutiliza en el acceso
   (antes de registrarse) y en la sección Privacidad de la aplicación. */

export default function PoliticaDatos() {
  return (
    <div className="politica">
      <p className="politica-fecha">Vigente desde el {FECHA_POLITICA}</p>
      {POLITICA.map((s) => (
        <section key={s.titulo}>
          <h3>{s.titulo}</h3>
          {s.parrafos.map((t, i) => <p key={i}>{t}</p>)}
        </section>
      ))}
    </div>
  )
}
