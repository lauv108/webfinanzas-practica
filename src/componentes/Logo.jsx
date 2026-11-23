/*
 * Logo de WebFinanzas.
 * El ícono es el SVG de public/. El nombre y el lema van en HTML y no dentro
 * del SVG: un SVG cargado como imagen no puede usar las fuentes web de la
 * página, así que su texto saldría en Georgia y no en Newsreader.
 * tono="claro" va sobre fondos claros y tono="oscuro" sobre fondos oscuros.
 */

const ICONO = '/webfinanzas_logo-icono_v1.svg'

export function LogoIcono({ tamano = 36 }) {
  return <img className="logo-icono" src={ICONO} width={tamano} height={tamano} alt="" />
}

export function LogoCompleto({ tono = 'claro' }) {
  return (
    <div className={`logo logo-${tono}`} role="img" aria-label="WebFinanzas. Tu dinero, tu control">
      <LogoIcono tamano={44} />
      <span className="logo-texto" aria-hidden="true">
        <span className="logo-nombre">Web<span className="logo-nombre-fin">Finanzas</span></span>
        <span className="logo-lema">Tu dinero, tu control</span>
      </span>
    </div>
  )
}
