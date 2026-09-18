# Requisitos — IA-1 login (port)

> **Sembrado por `/importar-modulo` el 2026-09-16.** Los `R<n>` son la renumeracion mecanica
> de los `E<n>` de `imports/login/prompt.md > 8`: **no se reescribio contenido**, solo el
> identificador. El mapa completo `E<n> -> R<n>` esta en `## Origen`.
>
> Este documento es el **punto de partida** para `spec_author`, que lo adapta a este repo
> (stack, convenciones, la alternativa descartada de `design.md`). Las decisiones de negocio
> se cierran con el humano en el Paso 3 y se anexan aqui con su fecha.
>
> **Adaptado por `spec_author` el 2026-09-16.** La renumeracion y el mapa `E<n> -> R<n>` se
> conservan. Ajustes de wording por las decisiones acotadas del 2026-09-16: R3 (decision 2: el
> tope del identificador compartido con el alta), R15 y R16 (decision 1: politica de bloqueo
> configurable por entorno, numeros como default), R24 (decision 3: el rastro del
> compare-and-set agotado, y las tres fronteras del rastro). El resto —incluido
> `## No implementar` y las decisiones— queda como en la siembra.
>
> **Ronda 2 (2026-09-16, anexada con la aprobacion del spec):** se anexan las decisiones 5
> (roles: solo `admin_maestro` y `admin`) y 6 (unicidad GLOBAL del identificador) al bloque de
> decisiones; la pregunta abierta 1 queda **CERRADA** por la decision 6; R1 lleva una nota
> breve de unicidad global.
>
> **Ronda 3 (2026-09-16, ampliaciones tras la aprobacion del spec; el spec vuelve a F1.4 con
> ellas):** el humano decidio dos ampliaciones, incorporadas **sin renumerar los R1-R24**: (A)
> el stack base del repo —`package.json`, tsconfig strict, Next.js App Router, Tailwind v4,
> Prisma, vitest, Playwright, `.env.example`— se monta como **infraestructura previa dentro de
> IA-1**, sin ficha aparte y sin R propio (vive en `tasks.md`, Bloque 0); (B) IA-1 **crea la
> identidad minima** que el login consume —esquema `companies`/`roles`/`users`, indice global,
> catalogo de dos roles, hasher compartido—, que el design declaraba como prerrequisito externo.
> La superacion de esa frontera queda anexada como **decision 7** y la cubren los **R25-R30** de
> la seccion «Identidad minima».

## Origen

- **Fuente:** `imports/login/prompt.md > 8` (nucleo invariante en EARS).
- **Decisiones abiertas:** `imports/login/decisiones.md` (4 decisiones que este proyecto debe
  tomar; ver `## Decisiones abiertas`).
- **Evidencia del origen:** `imports/login/inventario.md` (inventario con evidencia citada).
- **Deuda del original que NO se hereda:** ver `## No implementar`.

### Mapa de renumeracion `E<n> -> R<n>`

| Origen | Aqui | Origen | Aqui |
| --- | --- | --- | --- |
| E1 | R1 | E13 | R13 |
| E2 | R2 | E14 | R14 |
| E3 | R3 | E15 | R15 |
| E4 | R4 | E16 | R16 |
| E5 | R5 | E17 | R17 |
| E6 | R6 | E18 | R18 |
| E7 | R7 | E19 | R19 |
| E8 | R8 | E20 | R20 |
| E9 | R9 | E21 | R21 |
| E10 | R10 | E22 | R22 |
| E11 | R11 | E23 | R23 |
| E12 | R12 | E24 | R24 |

Los parentesis tras cada `R<n>` conservan la trazabilidad al requisito original del repo de
origen (formato numerico del origen + los `QC-*` que el prompt cita). Son evidencia de origen,
no la numeracion de este repo.

## Requisitos

### Verificacion

- **R1** *(original R1)*. CUANDO se solicita autenticar unas credenciales, el sistema DEBE
  aceptarlas si y solo si existe una cuenta **no borrada** cuyo identificador coincide con el
  recibido y cuya contrasena corresponde al hash almacenado. *(Nota 2026-09-16, decision 6: la
  unicidad del identificador es **global** —dos empresas no pueden tener el mismo usuario—, asi
  que el lector no desambigua: devuelve la fila unica o ninguna.)*
- **R2** *(original R2, R3, R5, R28)*. SI la autenticacion no procede por cualquier motivo
  —identificador inexistente, contrasena incorrecta, cuenta borrada, cuenta bloqueada, cuenta
  no activa u organizacion dada de baja—, ENTONCES el sistema DEBE rechazarla devolviendo **el
  mismo resultado y el mismo mensaje**, indistinguible para quien lo consume.
- **R3** *(original R4; ajustado el 2026-09-16 por la decision 2)*. El sistema DEBE comparar
  el identificador **sin distinguir mayusculas** y sin espacios al inicio o al final, y la
  contrasena de forma **exacta**. El identificador DEBE acotarse por la **misma constante de
  longitud maxima que usa el alta administrada** —un solo numero compartido, para que el tope
  del login no pueda divergir del tope del alta—; la contrasena DEBE mantener su tope propio
  (64 caracteres).
- **R4** *(original R6, R29)*. CUANDO un intento se rechaza por identificador inexistente o por
  estado de la cuenta, el sistema DEBE ejecutar igualmente **una** verificacion de contrasena,
  de modo que el numero de verificaciones sea el mismo que en un intento correcto.
- **R5** *(original R7)*. El hash señuelo DEBE producirse con el **mismo mecanismo y coste** que
  los de produccion, de forma que su verificacion no sea sistematicamente mas rapida ni mas
  lenta.
- **R6** *(original R8)*. SI la entrada no cumple el esquema de credenciales, ENTONCES el
  sistema DEBE rechazarla **sin** consultar la base, sin verificar ningun hash y sin emitir
  sesion.
- **R7** *(original R31)*. SI el identificador recibido no corresponde a ninguna cuenta,
  ENTONCES el sistema NO DEBE crear ni actualizar ningun registro, de modo que la existencia de
  una cuenta no pueda deducirse por sus efectos en la base.

### Sesion

- **R8** *(original R9, R10)*. CUANDO la autenticacion es correcta, el sistema DEBE emitir la
  sesion en un transporte **inaccesible al codigo del navegador**, con alcance a toda la
  aplicacion y envio restringido entre sitios.
- **R9** *(original R11)*. La sesion DEBE caducar, y el instante de caducidad DEBE viajar
  **dentro del valor firmado**, no solo en el atributo que controla el cliente.
- **R10** *(original R12)*. El valor de sesion DEBE ir firmado con un codigo de autenticacion de
  mensajes y DEBE contener **unicamente identificadores**: nunca la contrasena, el hash, el
  identificador legible de la persona ni ningun otro dato personal.
- **R11** *(original R13)*. SI el secreto de firma no esta configurado o no alcanza la longitud
  minima, ENTONCES el sistema DEBE fallar la operacion **sin emitir sesion y sin dar por
  autenticado a nadie**.
- **R12** *(original R14)*. SI la autenticacion no es correcta por cualquier motivo, ENTONCES el
  sistema NO DEBE emitir ninguna sesion.
- **R13** *(original R15)*. El sistema NO DEBE escribir en ningun registro de salida la
  contrasena recibida, el hash almacenado ni el valor de sesion.
- **R14** *(original QC-23)*. CUANDO se emite una sesion, el sistema DEBE asignarle un
  identificador **nuevo, aleatorio y no derivado** de la persona ni del instante, de modo que
  dos sesiones simultaneas de la misma persona se puedan distinguir y cerrar por separado.

### Bloqueo

- **R15** *(original R22; ajustado el 2026-09-16 por la decision 1)*. CUANDO una cuenta
  acumula **5** verificaciones fallidas consecutivas —valor por defecto, configurable por
  entorno—, el sistema DEBE bloquearla temporalmente y reiniciar su contador.
- **R16** *(original R23; ajustado el 2026-09-16 por la decision 1)*. CUANDO se bloquea una
  cuenta, el sistema DEBE aplicar la duracion del nivel de escalada alcanzado —1, 5, 15 y 60
  minutos, duraciones por defecto configurables por entorno— y DEBE mantener el ultimo valor
  como tope. El bloqueo NUNCA DEBE ser permanente.
- **R17** *(original R24)*. MIENTRAS una cuenta este bloqueada, el sistema DEBE rechazar todo
  intento **incluso si la contrasena es correcta**.
- **R18** *(original R25)*. MIENTRAS una cuenta este bloqueada, el sistema NO DEBE incrementar
  su contador, NO DEBE subir su nivel y NO DEBE alargar el bloqueo vigente.
- **R19** *(original R26)*. CUANDO el instante de fin de bloqueo ha pasado, el sistema DEBE
  volver a aceptar credenciales correctas **sin ninguna intervencion manual**.
- **R20** *(original R27)*. CUANDO una autenticacion es correcta, el sistema DEBE dejar
  contador, nivel y bloqueo a cero.
- **R21** *(original QC-78)*. MIENTRAS una cuenta no este **efectivamente activa**, el sistema
  DEBE rechazar sus credenciales y NO DEBE escribir nada sobre ella.

### Estructura

- **R22** *(original R17)*. El sistema DEBE implementar la decision de autenticar en el
  **dominio**, obteniendo por interfaces la lectura de la cuenta, el hashing, la emision de la
  sesion, el registro del intento y el identificador de sesion; **ningun archivo fuera del
  punto unico de composicion** DEBE elegir la implementacion concreta.
- **R23** *(original R21)*. El sistema DEBE poder demostrarse en su camino feliz **sin depender
  de datos sembrados**: la propia verificacion automatizada crea y limpia lo que necesita.

### Capacidad NUEVA — el original NO la tiene

- **R24** *(no existe en el original; decidido por el humano el 2026-09-13, ajustado el
  2026-09-16 por la decision 3)*. CUANDO un intento de autenticacion se resuelve —**tanto si
  acierta como si falla**—, el sistema DEBE dejar un rastro consultable con **quien, cuando y
  desde donde**.
  El original **no registra nada** —ni un mensaje de salida en todo el camino, a proposito,
  para no filtrar secretos— y lo unico que guarda son tres contadores que se **sobrescriben**.
  Eso no permite responder «¿alguien entro a mi cuenta?» ni detectar a alguien probando
  contrasenas, que son las dos preguntas que justifican el requisito. En el original seria
  ficha aparte y **no se implementa desde esta extraccion**. En el port, **se hace desde el
  principio**: anadir historico despues es una migracion, y R13 sigue mandando —el rastro
  guarda identificadores y contexto, **jamas** la contrasena ni el hash ni el valor de sesion.
  La decision 3 amplia el rastro: SI el registro condicional del fallo (el compare-and-set con
  sus reintentos) se agota sin poder anotar su fila, ENTONCES el sistema DEBE dejar constancia
  del intento de anotacion fallido en el mismo rastro, **sin propagar ningun error** hacia
  quien consume —propagar reabre el oraculo: un mensaje distinto solo apareceria en cuentas
  que existen.
  El rastro respeta tres fronteras: (1) **empieza donde termina la forma**: la entrada que no
  cumple el esquema de credenciales se rechaza sin consultar la base y no deja rastro (R6);
  (2) **tambien se escribe con identificador inexistente**, con el identificador recibido y sin
  vinculo a ningun registro de cuenta —R7 prohibe crear o actualizar registros de cuenta, no
  la fila de auditoria, que no es observable por quien consume el login y registra siempre el
  desenlace «credenciales no validas» de R2; (3) **R21 se refiere a los contadores y el estado
  de la cuenta**, no al rastro: una cuenta no efectivamente activa deja su fila de auditoria
  con su desenlace, sin escribir en la cuenta.

### Identidad minima — creada por IA-1 (ampliacion 2026-09-16, decision 7)

> El port asumia como prerrequisito externo la identidad que el login consume (`## Material
> para design.md > Prerrequisitos`). El humano la incorporo a esta feature el 2026-09-16
> (decision 7, ampliacion B): la identidad minima creada aqui es **esquema y catalogo**, no el
> alta administrada — quien crea cuentas de persona llega en su propia feature y reusa lo que
> esta deja montado (decidido; ver Ronda 3).

- **R25** *(nuevo 2026-09-16, decision 7, ampliacion B)*. CUANDO se aplican las migraciones de
  esta feature, el sistema DEBE crear el esquema de identidad minima con las tablas
  `companies`, `roles` y `users`, donde `users` referencia **una** organizacion (`company_id`,
  obligatoria, integridad referencial restrictiva) y **un** rol (`role_id`, obligatoria), y
  donde toda baja de `users` o `companies` es **borrado logico** (`deleted_at`), nunca fisico
  (R1, R21).
- **R26** *(nuevo 2026-09-16, decision 7 + decision 5)*. El catalogo de roles DEBE contener
  **exactamente dos roles —`admin_maestro` y `admin`—** y el sistema DEBE rechazar cualquier
  otro valor o duplicado; el `role` que el login pone en el ticket de sesion (R10) DEBE
  limitarse a ese conjunto cerrado.
- **R27** *(nuevo 2026-09-16, decision 7 + decision 6)*. El esquema DEBE imponer la unicidad
  **funcional y parcial GLOBAL** del identificador —`lower(username) WHERE deleted_at IS
  NULL`—, de modo que dos `companies` no puedan tener el mismo usuario y que una cuenta
  borrada libere su identificador.
- **R28** *(nuevo 2026-09-16, decision 7)*. El estado de cuenta DEBE escribirse con una de
  **una sola grafia** —`active`, `pending`, `inactive`, `blocked`— en esquema, codigo y base, y
  el sistema DEBE rechazar cualquier otra grafia como valor invalido del estado.
- **R29** *(nuevo 2026-09-16, decision 7; prerrequisito 4 del port)*. El sistema DEBE tener
  **un unico hasher compartido** —el del login, bcrypt coste 10— accesible para el alta y el
  cambio de credencial que lleguen en otras features: CUANDO se crea o se cambia una
  credencial, el sistema DEBE usar ese mismo hasher, y NINGUN otro modulo DEBE implementar
  hashing propio.
- **R30** *(nuevo 2026-09-16, decision 7; refuerza `## No implementar`)*. El esquema NO DEBE
  declarar `must_change_password` y el verificador NO DEBE rechazar una cuenta por la forma de
  su hash (centinela) **antes** del coste de verificacion: una cuenta sin credencial DEBE
  verificarse al **mismo coste** que una real (R4, R5) — en la practica guarda un hash real de
  un valor aleatorio y la verificacion fracasa siempre con el mismo resultado y mensaje
  indistinguibles de R2.

## No implementar

Deuda del modulo original (`imports/login/prompt.md > 2`, «No la heredes»). El port **no
arrastra los fallos del original**; esta prohibicion es vinculante para el spec.

1. **La columna «debe cambiar su credencial»:** el esquema del original declara una columna que
   afirma que este flujo la lee y bloquea el acceso, pero **ningun archivo del flujo la lee**.
   Resultado: se puede marcar a alguien y esa persona entra igual. **No se replica el patron de
   una columna declarada y no consumida.** Si el port necesita forzar el cambio de credencial,
   o se implementa de verdad (se lee y se bloquea) o no se declara la columna.
2. **El centinela `'!'` rechazado por forma antes del hashing:** una cuenta sin credencial del
   original guarda un centinela en la columna del hash y el verificador lo rechaza **por forma,
   antes de llamar al algoritmo**, respondiendo en microsegundos. Es un agujero en la
   uniformidad de tiempos que la propia politica de fallo promete, y nadie lo anoto como riesgo
   aceptado. **Si el port adopta el patron del centinela, debe pasar por el mismo coste que un
   hash real.**

## Material para design.md

No son requisitos: son insumos para que `spec_author` escriba `design.md`. Toda dependencia
nueva pasa por aprobacion humana (`docs/dependencias.md`, regla 7 de `CLAUDE.md`).

### Prerrequisitos asumidos ya montados (`prompt.md > 12`)

El modulo **no los crea**; hay que tenerlos antes y no reimplementarlos:

1. Esquema de personas, roles y organizaciones, con la ficha apuntando a **una** organizacion
   (obligatoria, integridad referencial restrictiva) y a **un** rol.
2. Indice de unicidad del identificador, **funcional y parcial** (`lower(username) WHERE
   deleted_at IS NULL`), escrito a mano en la migracion.
3. Cliente de datos con consulta parametrizada cruda y actualizacion condicional que informe
   **cuantas filas afecto** (sin eso no hay compare-and-set).
4. Un hasher de contrasenas **ya elegido y cableado, compartido con el alta y el cambio de
   credencial** (uno solo: dos hashers son dos costes que pueden divergir).
5. Fuente de identificadores aleatorios con forma de UUID.
6. Catalogo de permisos y menu privado filtrable, para calcular el aterrizaje (una consulta por
   **inicio de sesion**, no por peticion).
7. Resolucion y validacion del destino de vuelta (que una ruta sea interna y valida).
8. Constantes de ruta del producto.
9. Secreto de firma en el entorno, nunca un valor real en el repositorio.
10. Tooling de tests: unitario, integracion contra base real y E2E con navegador.

> **Nota 2026-09-16 (decision 7, ampliaciones A y B):** el item 10 se monta en el Bloque 0 de
> `tasks.md` (TS4/TS5) y los items 1, 2 y 4 los crea **esta misma feature** —esquema
> `companies`/`roles`/`users`, indice global y hasher compartido, R25-R30—. Siguen siendo
> dependientes, con degradacion declarada en el `design.md`: el 6 (catalogo de permisos y menu
> privado, aterrizaje fijo a `DASHBOARD_ROUTE`) y el 8 (constantes de ruta del producto,
> provisionales en esta feature); el item 5 es del runtime (UUID, `crypto.randomUUID`) y los
> items 3 y 9 son config/stack que T0 verifica. La lista se conserva como referencia del port
> y de lo que vendra despues.

### Librerias y requisitos abstractos (`prompt.md > 9`)

El stack original es intercambiable; lo que sobrevive es el requisito abstracto:

- **Validacion de esquema declarativa** con errores por campo y discriminacion del tipo de
  fallo (distinguir «vacio» de «demasiado largo»).
- **Hashing de contrasenas adaptativo**, con sal interna y coste configurable, y con un limite
  de longitud de entrada conocido y respetado.
- **Acceso a datos** que permita bajar a SQL parametrizado cuando el indice lo exija.
- **Criptografia estandar del runtime:** HMAC-SHA-256 y comparacion en tiempo constante,
  disponibles en todos los runtimes donde se verifica la sesion. Se descarto una libreria de
  JWT a proposito (el manejo del campo de algoritmo es la parte con historial de
  vulnerabilidades y aqui no existe: formato fijo, un solo algoritmo).
- **Runner E2E con navegador real**, para comprobar desde fuera que la cookie es inaccesible a
  scripts.

### Parametros a reemplazar (`prompt.md > 10`)

`spec_author` los resuelve en `design.md` con este repo, no copiando los del origen: nombre de
la cookie, variable del secreto, duracion, tope de credencial, destino por defecto, nombre del
parametro de retorno, copys (constantes exportadas y provisionales, tests sobre la constante),
tablas y columnas, estados de cuenta, unicidad del identificador y tipo de borrado.

### Alternativas descartadas documentadas (`prompt.md > 5` y `> 6`)

Material del design, no requisitos nuevos: token firmado sin estado frente a tabla de sesiones;
8 h absolutas sin renovacion; caducidad dentro y firmada; un solo secreto sin ventana de
convivencia; bloqueo por cuenta y no por IP; 5 fallos con escalada 1/5/15/60; señuelo cacheado
y calentado; cortes por estado/organizacion despues del hash; diferencia residual de escritura
declarada.

### Invariantes (`prompt.md > 7`)

Las 15 invariantes de la tabla de `prompt.md > 7` son restricciones de diseño que `spec_author`
debe respetar en `design.md` y que `reviewer` usara para juzgar. No se renumeran aqui: se citan
desde su origen.

## Decisiones acotadas con el humano (2026-09-16)

De `imports/login/decisiones.md`. El port las presento y este proyecto decidio. Las respuestas
quedan anexadas aqui con su fecha; el issue IA-1 en Jira fue reescrito con ellas ANTES de esta
anexion (`docs/jira.md > Cuando el disco descubre que el board esta desactualizado`).

1. **Politica de bloqueo: CONFIGURABLE por entorno** *(se aparta de la recomendacion de
   numeros fijos)*. Los valores por defecto son los del original —5 fallos, escalada 1/5/15/60,
   tope 60, nunca permanente— pero parametrizables por entorno (variables de entorno). R15 y
   R16 deben leerse con este ajuste: los numeros son el default, no una constante del codigo.
   `spec_author` adapta el wording de R15/R16 a «valores por defecto configurables por
   entorno».
2. **Tope de longitud del nombre de usuario: SI, en el borde.** El login reusa la misma
   constante de longitud maxima que el alta administrada (un solo numero compartido, para que
   el tope del login no pueda divergir del tope del alta). R3 se enriquece: el usuario se
   recorta pero no excede el tope; la contrasena mantiene su tope propio (64) y su comparacion
   exacta.
3. **Reintentos del compare-and-set agotados: DEJAR RASTRO.** No se propaga error (eso reabre
   el oraculo: un mensaje distinto solo aparece en cuentas que existen), pero el fallo de
   anotacion se registra en el rastro de accesos de R24. R24 incluye asi dos cosas: el rastro
   de quien entro/fallo al entrar, y el rastro del intento que no pudo anotar su fallo.
4. **Hashing: bcrypt coste 10** (~110 ms), como el original. Sin cambio de algoritmo ni rehash
   progresivo. El `design.md` justifica el 10 y registra la alternativa descartada (coste 12,
   argon2id/scrypt con rehash progresivo).

Estas cuatro reemplazan la seccion anterior de «Decisiones abiertas». Ya cerradas por el humano
el 2026-09-13 y **no reabiertas**: el rastro de accesos SI (aciertos y fallos, entra como
**R24**) y las sesiones caen todas al cambiar el secreto (sin ventana de convivencia).

**Ronda 2 — anexadas el 2026-09-16 con la aprobacion del spec (amplian el alcance aprobado):**

5. **Solo DOS roles en toda la app: `admin_maestro` y `admin`.** El catalogo de roles del
   prerrequisito de identidad se limita a esos dos; el login y el ticket de sesion los tratan
   como **conjunto cerrado**: el `role` del ticket solo puede valer `admin_maestro` o `admin`.
   El calculo del aterrizaje queda acotado a lo que estos dos roles pueden ver, y el gate T0
   verifica que los dos roles existen.
6. **Unicidad GLOBAL del identificador: dos empresas NO pueden tener el mismo usuario.**
   Revierte, para el identificador de login, la lectura per-empresa de `docs/architecture.md`
   (QC-46/47). El prerrequisito de identidad pasa a ser un indice de unicidad **funcional y
   parcial GLOBAL** —`lower(username) WHERE deleted_at IS NULL`—, como el original del port. El
   lector de credenciales devuelve la fila unica o ninguna: **no hay desambiguacion** (se
   elimina el stopgap `LIMIT 2` de `design.md`/`tasks.md` y se cierra la pregunta abierta 1).

**Ronda 3 — anexadas el 2026-09-16 (ampliaciones del humano sobre el spec aprobado; el spec
vuelve a F1.4 con ellas):**

7. **Ampliacion A — el stack base del repo se monta DENTRO de IA-1.** `package.json`, tsconfig
   **strict**, Next.js App Router, Tailwind v4, Prisma, vitest, Playwright y `.env.example`
   dejan de ser infraestructura ajena (T0 dejaba de correr si no existian) y pasan a ser
   infraestructura **previa de esta feature**: se construye en el Bloque 0 de `tasks.md`
   (TS1-TS6), **sin ficha aparte y sin R propio** —no hay requisito de producto nuevo, es
   herramienta—. Las dependencias del stack se aprueban con este spec (tabla «Stack base
   (ampliacion A)» del `design.md`, REQUIERE APROBACION).
8. **Ampliacion B — IA-1 crea la identidad minima que el login consume.** El esquema
   `companies`/`roles`/`users`, el indice global, el catalogo de dos roles y el hasher
   compartido (prerrequisitos 1, 2 y 4 del port) dejan de ser externos y los **crea esta
   feature** como esquema y catalogo, no como alta administrada. Los cubren los **R25-R30**.
   La pregunta abierta 2 queda **CERRADA** por esta decision: la opcion (a) —«implementar hasta
   donde el stack lo permita y reportar si falta una base»— deja de ser el default, porque el
   stack y la identidad minima ya estan dentro del alcance; el unico entorno que T0 sigue
   verificando es la config (`SESSION_SECRET` y credenciales de base, items 3 y 9 del
   prerrequisito).

## Preguntas abiertas

Para que el `implementer` no suponga: lo que sigue no lo decide este spec. Cada item da sus
opciones y un **default de implementacion**; quien cierre la pregunta anexa la decision aqui
con su fecha.

1. **Como resuelve el login la organizacion, dada la unicidad por empresa? — CERRADA el
   2026-09-16 por la decision 6 (ronda 2).** La unicidad del identificador pasa a ser
   **GLOBAL**: indice funcional y parcial `lower(username) WHERE deleted_at IS NULL`, como el
   original del port; **dos empresas no pueden tener el mismo usuario**. El login recibe solo
   usuario + contrasena y «el identificador coincide» de R1 ya no es ambiguo por construccion:
   el lector devuelve la fila unica o ninguna. Quedan **descartadas** las opciones (b)
   (organizacion en la forma) y (c) con su stopgap `LIMIT 2`; el texto original de la pregunta
   y sus tres opciones quedan en el historial del spec (git). Lo vinculante es la decision 6.
2. **Prerrequisitos y stack de identidad.** `## Material para design.md > Prerrequisitos
   asumidos ya montados` lista 10 items que el modulo no crea. En este repo ninguno esta
   montado aun (sin esquema de personas/roles/organizaciones, sin hasher compartido, sin
   catalogo de permisos, sin constantes de ruta) y el board las tiene como features propias.
   Opciones: (a) **default**: el login se implementa hasta donde el stack lo permita y se
   declara en `design.md` una tabla de «prerrequisitos dependientes»; el `implementer` PARA y
   reporta al leader si una base falta, en vez de inventarla; (b) el port arrastra el minimo
   ineludible como deuda documentada. Hasta que se decida, se implementa (a).
   — **CERRADA el 2026-09-16 por la decision 7 (ronda 3).** Las ampliaciones A y B
   incorporan a IA-1 el stack base y la identidad minima: el login ya no se implementa «hasta
   donde el stack lo permita», porque el stack es parte de esta feature (Bloque 0 de
   `tasks.md`), y los prerrequisitos 1, 2 y 4 —esquema de identidad, indice global y hasher
   compartido— los crea esta misma feature (R25-R30). Siguen dependientes, con degradacion
   declarada en el `design.md`: el 6 (catalogo de permisos y menu privado, aterrizaje fijo a
   `DASHBOARD_ROUTE`) y el 8 (constantes de ruta del producto, provisionales en esta feature);
   el 3 y el 9 son config/stack (TS1/TS3 y T0). El texto original de la pregunta y sus dos
   opciones quedan en el historial del spec (git). Lo vinculante es la decision 7.
