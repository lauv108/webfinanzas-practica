# WebFinanzas

Aplicación web de gestión de finanzas personales. Permite registrar ingresos y
gastos, clasificarlos por categoría, fijar topes mensuales de gasto y consultar
el resumen del período.

Está dirigida a personas sin conocimientos financieros ni técnicos: registrar un
movimiento ocurre en una sola pantalla y con cinco campos.

## Decisión de diseño

Las reglas de integridad y de control de acceso residen en la base de datos, no
en la interfaz. Una restricción declarada en el esquema se cumple venga la
operación de donde venga; una validación escrita solo en el cliente se puede
evadir con una petición directa.

En la práctica esto significa que la interfaz no calcula dinero. Los totales del
mes, el gasto acumulado por categoría y el semáforo del presupuesto los devuelven
vistas de PostgreSQL, de modo que la misma regla da el mismo resultado desde
cualquier pantalla.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Interfaz | React con Vite |
| Estilos | CSS con tokens de diseño, sin framework |
| Datos | PostgreSQL gestionado (Supabase) |
| Autenticación | Supabase Auth |

Sin biblioteca de gráficos: el anillo de distribución del gasto se dibuja en SVG,
para no ampliar la superficie de la cadena de suministro por un gráfico de seis
sectores.

## Secciones

- **Resumen** — balance del mes, ingresos y gastos, gráfico de distribución,
  desglose por categoría, últimos movimientos y estado de los topes.
- **Movimientos** — historial del mes con buscador, filtro por tipo y fichas por
  categoría, con edición y eliminación por fila.
- **Presupuesto** — topes mensuales por categoría con barra de consumo y
  semáforo: verde por debajo del 90 % del tope, amarillo entre 90 y 99, rojo al
  alcanzarlo.
- **Perfil** — datos de la cuenta, cambio de contraseña, exportación de todos
  los datos en JSON, eliminación de la cuenta y cierre de sesión.
- **Privacidad** — política de tratamiento de datos personales (Ley 1581 de
  2012), visible también antes de registrarse. El registro exige aceptarla.

La navegación es un riel vertical de iconos en escritorio y una barra inferior
por debajo de 768 px. La interfaz es operable desde 360 px de ancho.

## Puesta en marcha

Requiere Node 24.

```bash
npm install
```

Crear `.env.local` en la raíz con las credenciales del proyecto de Supabase:

```
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<llave publicable>
```

La llave publicable es pública por diseño: lo que protege los datos son las
políticas de acceso de la base de datos. **La llave secreta nunca va en el
frontend.** `.env.local` está excluido del control de versiones.

```bash
npm run dev     # servidor de desarrollo en http://localhost:5173
npm run build   # compilación de producción
npm run lint    # análisis estático
```

## Base de datos

El esquema completo, las vistas de cálculo y las políticas de acceso se entregan
como scripts SQL y se ejecutan desde el editor SQL de Supabase. Son idempotentes.

| Script | Qué hace |
|---|---|
| `webfinanzas_base-de-datos_v1.sql` | Tipos, tablas, índices, vistas, disparadores y políticas |
| `webfinanzas_eliminacion-cuenta_v1.sql` | Función para que el usuario elimine su propia cuenta y sus datos |
| `webfinanzas_verificacion-seguridad_v1.sql` | Comprueba el estado real de las políticas de acceso |
| `webfinanzas_datos-demo_v1.sql` | Carga movimientos de ejemplo en una cuenta de prueba |

Al crear una cuenta, un disparador siembra ocho categorías iniciales, de modo que
se puede registrar desde el primer uso sin configurar nada.

## Seguridad

Row Level Security activo en las tres tablas de negocio, con cuatro políticas por
tabla. Las vistas se declararon con `security_invoker = on`, de modo que heredan
esas políticas en lugar de esquivarlas.

```bash
bash scripts/revision-seguridad.sh
```

Ejecuta diez comprobaciones estáticas sobre el código y la configuración,
mapeadas a las categorías del OWASP Top 10:2025: llaves y tokens en el código,
archivos de entorno versionados, direcciones sin cifrar, inyección de HTML y
exposición de mensajes del motor. Conviene correrlo antes de cada publicación,
junto con el script SQL de verificación.

`public/_headers` y `vercel.json` llevan los encabezados de seguridad del sitio
(política de seguridad de contenido, HSTS, `nosniff`, `frame-ancestors`). Entran
en vigor al publicar.

## Despliegue

Pasos, variables de entorno y lista de pruebas de aceptación en
[`docs/despliegue-y-pruebas.md`](docs/despliegue-y-pruebas.md). Las variables
de entorno deben existir en el hosting **antes** del primer despliegue: sin
ellas el sitio compila pero queda en blanco.

## Fuera del alcance de la versión 1.0

Exportación a CSV, sincronización bancaria, notificaciones automáticas, metas de
ahorro, reportes comparativos entre meses, multimoneda, aplicación móvil nativa y
cuentas compartidas.

## Estado

Los veintidós requerimientos funcionales y los de tratamiento de datos (RNF-12
y RNF-13) están implementados. Quedan pendientes la configuración de seguridad
de la autenticación en el panel, la publicación del sitio y las pruebas de
aceptación sobre la URL publicada.
