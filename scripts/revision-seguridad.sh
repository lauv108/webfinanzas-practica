#!/usr/bin/env bash
# =============================================================================
# WebFinanzas - Revision estatica de seguridad
#
# Comprueba, sobre el codigo y la configuracion del repositorio, los controles
# que se pueden verificar sin desplegar nada. Cada comprobacion dice a que
# categoria del OWASP Top 10:2025 responde.
#
# Uso:    bash scripts/revision-seguridad.sh
# Salida: 0 si todas pasan, 1 si alguna falla.
#
# Lo que este script NO cubre: el estado de las politicas de acceso en la base
# de datos (ver webfinanzas_verificacion-seguridad_v1.sql) ni la configuracion
# de autenticacion de la plataforma, que se revisa en su panel.
# =============================================================================

set -uo pipefail
cd "$(dirname "$0")/.."

FALLOS=0
pasa() { printf '  PASA    %s\n' "$1"; }
falla() { printf '  FALLA   %s\n' "$1"; FALLOS=$((FALLOS + 1)); }
titulo() { printf '\n%s\n' "$1"; }

printf 'Revision estatica de seguridad - %s\n' "$(date '+%Y-%m-%d %H:%M')"

# ---------------------------------------------------------------------------
titulo 'A01 Broken Access Control / A04 Cryptographic Failures'

if grep -rqE 'sb_secret_|service_role' src/ index.html 2>/dev/null; then
  falla 'Hay una llave secreta o de rol de servicio en el codigo del cliente'
else
  pasa 'Sin llaves secretas ni de rol de servicio en el codigo del cliente'
fi

if grep -rqE 'eyJ[A-Za-z0-9_-]{20,}' src/ index.html 2>/dev/null; then
  falla 'Hay un token JWT escrito directamente en el codigo'
else
  pasa 'Sin tokens JWT escritos en el codigo'
fi

# ---------------------------------------------------------------------------
titulo 'A02 Security Misconfiguration'

if git ls-files 2>/dev/null | grep -qE '(^|/)\.env'; then
  falla 'Un archivo de variables de entorno esta rastreado por git'
else
  pasa 'Ningun archivo de variables de entorno esta rastreado por git'
fi

if grep -qE '^\.env\.local$|^\.env$' .gitignore 2>/dev/null; then
  pasa 'Los archivos de variables de entorno estan en .gitignore'
else
  falla 'Los archivos de variables de entorno no aparecen en .gitignore'
fi

if grep -rqE "http://[a-zA-Z0-9.-]+\.[a-z]{2,}" src/*.jsx src/**/*.jsx src/**/*.js 2>/dev/null; then
  falla 'Hay una direccion http sin cifrar en el codigo de la aplicacion'
else
  pasa 'Sin direcciones http sin cifrar en el codigo de la aplicacion'
fi

# ---------------------------------------------------------------------------
titulo 'A03 Software Supply Chain Failures'

if npm audit --audit-level=low >/dev/null 2>&1; then
  pasa 'La auditoria de dependencias no reporta vulnerabilidades'
else
  falla 'La auditoria de dependencias reporta hallazgos; revisar npm audit'
fi

if [ -f package-lock.json ]; then
  pasa 'Existe archivo de bloqueo de versiones'
else
  falla 'No hay archivo de bloqueo: las versiones no son reproducibles'
fi

# ---------------------------------------------------------------------------
titulo 'A05 Injection'

if grep -rqE 'dangerouslySetInnerHTML|\.innerHTML|eval\(|new Function\(' src/ 2>/dev/null; then
  falla 'Hay inyeccion de HTML o evaluacion dinamica de codigo en el cliente'
else
  pasa 'Sin inyeccion de HTML ni evaluacion dinamica de codigo en el cliente'
fi

# ---------------------------------------------------------------------------
titulo 'A10 Mishandling of Exceptional Conditions'

if grep -rn 'error\.message' src/ 2>/dev/null | grep -v 'auth/mensajes.js' | grep -q .; then
  falla 'Alguna pantalla puede estar mostrando el mensaje crudo del motor'
else
  pasa 'Los mensajes del motor no se muestran al usuario'
fi

if grep -rq 'console.error' src/ 2>/dev/null; then
  pasa 'El detalle de los errores se registra en consola para quien desarrolla'
else
  falla 'Los errores no se registran en ningun lado'
fi

# ---------------------------------------------------------------------------
printf '\n'
if [ "$FALLOS" -eq 0 ]; then
  printf 'Resultado: todas las comprobaciones pasan.\n'
  exit 0
fi
printf 'Resultado: %s comprobacion(es) fallan.\n' "$FALLOS"
exit 1
