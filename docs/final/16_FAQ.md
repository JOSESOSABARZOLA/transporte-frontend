# 16 · Preguntas frecuentes

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · actualizado el 19 de agosto de 2026 · **actualizado el 5 de noviembre de 2026**

Todas las respuestas están comprobadas contra el código vigente de la rama `base/cuadro-colores`
(backend `24520af`, frontend `d13a5db`). Donde una respuesta cambió desde agosto, lo decimos.

---

## Uso diario

### ¿Por qué no veo los formularios de otro departamento?

Porque no le corresponden. El servidor devuelve **solo los suyos**: no es un filtro de la
pantalla que alguien pudiera quitar. Es el requisito que originó el encargo.

### Falta gente en la lista de personal y no sé por qué

Abra **«▸ No disponibles (N)»**, al final de la lista: ahí está quien no puede salir, **con su
motivo** —ausencia, sin jornada laboral, descanso tras patrulla, tope de salidas—.

Si **no aparece en absoluto**, ni ahí, la causa es otra: su área no está entre las que admite ese
formulario. Lo configura el administrador en «Catálogos del cuadro» («Áreas de personal
admitidas»).

Y si el motivo dice solo que «no está disponible en la fecha del operativo», es una ausencia
registrada. **La causa concreta no se publica** a propósito: un reposo médico o una calamidad
doméstica no tienen por qué llegar a quien arma el cuadro.

### ¿Qué significan «Ocupado» y «Se cruza» en las tarjetas del personal?

Que esa persona ya tiene otro operativo ese día. **«Ocupado 08H00–16H30»**, en ámbar, no choca con
su horario; **«Se cruza 18H00–22H00»**, en rojo, sí. Pulse la etiqueta para ver en qué operativo
está. Si agrega a alguien que se cruza, el pie no deja registrar hasta que cambie su horario o lo
quite. De un formulario de otro departamento solo verá el horario, no cuál es.

### El sistema dice que la persona ya está en un operativo que yo eliminé

Fue un defecto, **corregido el 7 de agosto de 2026**. La baja de un operativo es lógica y su
personal asignado no se borra, así que un operativo retirado seguía ocupando a su gente y no había
forma de liberarla. Si vuelve a ocurrir, reconstruya la imagen del backend.

### ¿Puedo registrar un operativo que cruza la medianoche?

Sí. De 22H00 a 02H00 es válido, el sistema lo marca como nocturno y la persona lleva «Termina al
día siguiente». Que la hora de fin sea menor que la de inicio **no es un error**.

### ¿Cada persona puede tener un horario distinto?

Sí. El «Horario del operativo» es el que hereda quien se agrega, y se puede cambiar en la línea de
cada persona. El horario del operativo que ven la DAF y la Dirección lo calcula el sistema a partir
del de su gente.

### ¿Por qué no puedo escribir el identificador?

Porque el problema original era equivocarse en el año y en el secuencial al escribirlo a mano. Lo
genera el sistema y reinicia cada día, por formulario o por prefijo.

### ¿Por qué no puedo poner el conductor?

Lo asigna la DAF, en «Planificar el día» y en su propia ventana (la que trae el sistema es de
15H00 a 16H30). Conductor y vehículo nacen vacíos por diseño (RN-40).

### Cambié de formulario y no perdí lo que tenía. ¿Es normal?

Sí, desde el 10 de septiembre de 2026. Cada formulario y cada fecha guardan su propia captura,
también el horario del operativo (desde el 4 de noviembre). Se vacía solo con «Limpiar», al
registrar con éxito o al cerrar sesión.

### Mi operativo no aparece en «Planificar el día»

Es lo esperado en tres casos:

- **El formulario no habilita vehículo.** El **1 · FIJOS**, el **3 · LIMPIA** y el **9 · CBQ**
  operan por propios medios (RN-41 y RN-42).
- **Eligió «Propios medios» o «Vehículo de otra institución»** en «Transporte requerido».
- **Es parte de un registro agrupado.** La patrulla 5/6 y el registro por zonas del 8 llegan como
  **una sola solicitud**, con un identificador que representa a todos (desde el 4 de noviembre de
  2026). Busque la tarjeta con los identificadores unidos: «IGECU-001 · ITECU-001».

### ¿Qué es «Vehículo de otra institución»?

Una opción de «Transporte requerido», desde el 22 de octubre de 2026: el personal va en el vehículo
de otra institución (por ejemplo, el GIR) y **la DAF no asigna vehículo**. No se guarda cuál
institución lo presta; si hace falta decirlo, va en las observaciones. En la matriz se lee «Otra
institución» en el conductor.

### Pedí compartir unidad. ¿Ya está compartida?

No. La casilla **«Solicitar compartir unidad con X»** es una petición: quien decide y ejecuta es la
DAF, que ve su pedido primero en la lista. Si no la marca, también decide la DAF.

### Se me pasó la hora. ¿Qué hago?

Si es una urgencia de hoy, use **«Agregar adicional»** sobre un operativo existente: funciona con
la ventana cerrada, en los formularios que lo admiten (hoy el 2 y el 8). Si no, hay tres opciones,
en este orden: esperar al día siguiente; pedir a la Dirección que **reabra** el cuadro, si ya lo
cerró; o pedir al administrador que cambie la hora de cierre en «Ventanas y parámetros», que rige
de inmediato.

### Perdí lo que había escrito al recibir un error. ¿Es normal?

No debería ocurrir: **lo capturado se conserva** en todos los rechazos. Si le pasó, repórtelo con
el código de seguimiento que aparece en «Ver detalle».

### ¿Puedo elegir más de una zonal?

**Sí, desde el 18 de septiembre de 2026.** El campo se llama «Zonales» y admite varias. En el
formulario 8 cada zona es además una tarjeta con su punto, su tipo de control y su cantidad.

> Hasta esa fecha la respuesta era «el contrato lo admite (RN-19) pero la interfaz ofrece una sola»
> (PV-31). Ya no aplica.

### En «Mis operativos» no veo los de la semana pasada

Desde el 13 de octubre de 2026 la pantalla consulta **un rango**: cambie «Desde» y «Hasta» o use
los atajos «Esta semana», «Últimos 7 días» o «Este mes». Se abre en la jornada que se está armando
y el rango máximo es de 31 días.

### Pulsé «Ver detalle» y no puedo cambiar nada

Es a propósito, desde el 27 de octubre de 2026: «Ver detalle» es solo consulta. Para cambiar, use
«Editar»; si la ficha no lo ofrece, la ventana o el cuadro están cerrados o el operativo es de otro
departamento.

---

## Reglas y rechazos

### El sistema no me deja asignar a alguien. ¿Puedo saltarlo?

No desde la interfaz, y es deliberado: la regla protege a esa persona. Lo que sí se puede es
**cambiar el umbral** en «Ventanas y parámetros», y eso lo decide la Dirección.

### ¿Qué es la jornada laboral?

Los días y, si los tiene, las horas en que se puede convocar a una persona o a un conductor. **Desde
el 23 de octubre de 2026 reemplaza al tipo de contrato** (Nombramiento / Ocasional, que se dio de
baja). El sistema trae dos: «Lunes a Viernes 8 horas» y «Lunes a Domingo 24/7»; el administrador
puede crear otras.

- **Sin jornada no se convoca.** La ficha dice «⚠ Sin jornada» y la persona sale en «No
  disponibles».
- **Un día u hora fuera de su jornada** también la deja fuera.
- **La 24/7 no exime de nada más**: siguen rigiendo las ausencias, el cruce de horario y el
  descanso.

### ¿Qué formularios cuentan como patrulla?

Los que tienen marcada **«Es patrulla»** en «Formularios del cuadro». Tal como se sembraron, son el
**4, 5, 6 y 9**, decididos por el Product Owner el 7 de agosto de 2026.

Conviene notar que **no se puede deducir del nombre**: el 9 es patrulla y no se llama así, y el 2
lleva un nombre operativo y no lo es.

### Si alguien salió en patrulla ayer, ¿puede salir hoy en otra?

No. El bloqueo es **cruzado entre formularios de patrulla**, no «no repetir el mismo». Dura lo que
diga `DIAS_DESCANSO_PATRULLA`, que por omisión es un día. Rige para el personal y para los
conductores.

### ¿Por qué en la patrulla falta un inspector y me deja registrar?

Porque la composición **informa, no bloquea** (PV-29). El pie dice «Falta: Inspector Técnico ·
puede registrar igual» y la decisión es suya. Instrucción no se reclama: la aporta el DMIT después.

### ¿Por qué el formulario 8 solo admite una persona?

Porque así está configurado desde el 28 de octubre de 2026: **una persona y un tipo de personal por
operativo**, y una o varias zonas, cada una con su cantidad de controles. No es una regla atada al
número del formulario; son dos datos de su configuración.

### ¿Por qué el sistema me deja registrar aunque falten vehículos?

Porque que la demanda supere la flota es **un hecho de la jornada, no un error de captura**. Se
avisa y no se bloquea: alguien lo resolverá pidiendo apoyo o cubriendo por propios medios.

### Dos personas editamos el mismo operativo y me salió un aviso

Es el bloqueo optimista protegiendo el trabajo de la otra persona. Recargue y repita el cambio.

---

## Matriz y órdenes

### ¿Por qué no puedo ver la matriz completa?

Es exclusiva de la Dirección (RN-48). El cuadro completo circulando es exactamente el problema que
este sistema existe para resolver. Ni siquiera la DAF la ve, aunque asigne transporte en los nueve
formularios.

Los tres departamentos tienen la **«Jornada del Día»**, con el mismo diseño, pero **cada uno ve solo
sus formularios**. No exporta el PDF ni cierra el cuadro.

> **Cambió el 15 de septiembre de 2026.** Desde el 26 de agosto la Jornada del Día mostraba los
> nueve formularios en lectura. El negocio revirtió esa apertura: pesó más el aislamiento que ver el
> volumen ajeno.

### Entonces, ¿un departamento puede llevarse el cuadro completo?

No. Ve en pantalla solo lo suyo; el documento firmable lo emite solo la Dirección, y la Jornada del
Día no tiene exportación. Lo que se filtraba por WhatsApp era el archivo.

### ¿Quién emite las órdenes de servicio?

**Solo la Dirección**, desde el 27 de octubre de 2026. La pantalla no aparece para nadie más, y el
servidor rechaza a cualquier otro rol con «Solo la Dirección emite órdenes de servicio.».

### ¿Por qué la orden de servicio no dice el punto de encuentro?

Porque los datos de la persona en la orden son **cuatro**: horario, funcionario, conductor y placa
(INV-24, RN-50). La orden es un memorando con su plantilla —datos generales, tabla de control,
apartados—, pero lo que dice de la asignación son esos cuatro. Una orden que dijera el punto
reproduciría el problema original en formato individual.

### ¿Con qué formato sale cada orden?

Con el del **área de la persona**, no el del formulario: hay uno para DMIT · Instrucción, otro para
DMIP · Unidad de Operativos y otro para DMIP · Inspecciones Técnicas y Generales. Se editan en
«Editar plantilla». Si un departamento no tiene formato, sus personas no reciben orden y la
emisión lo avisa; las demás sí se emiten.

### Emití las órdenes y había un error. ¿Puedo borrarlas?

No se borran: se **reemiten**. La anterior queda marcada como «Sustituida» y se conserva. El error
no se deshace, se documenta. Si las emitió otro Director, solo él puede reemitirlas.

### ¿Se pueden emitir órdenes sin cerrar el cuadro?

La pantalla no lo permite: «Disponible cuando el cuadro esté cerrado.». **Pero el servidor sí lo
permitiría**: exige personal y que quien emite sea la Dirección, no el cuadro cerrado. Sigue
pendiente de decidir (PV-34).

### Cerré el cuadro y falta corregir algo

La Dirección puede **«Reabrir cuadro»** en la Matriz desde el 8 de octubre de 2026: «Devuelve el
cuadro a Aprobado para corregirlo.».

---

## Administración

### Di de alta un funcionario y no aparece en el registro

Compruebe cuatro cosas: que el **área** del funcionario esté entre las que admite el formulario;
que tenga **jornada laboral** asignada; que no tenga una **ausencia vigente**; y que su jornada
admita el día y la hora del operativo. Las tres últimas lo llevan a «No disponibles» con su motivo.

### Registré vacaciones y la persona sigue apareciendo

Compruebe el rango: los extremos **están incluidos**, pero un periodo que empieza mañana no afecta
a hoy. Y una ausencia **no retira** los operativos que la persona ya tenía: el cajón lo avisa al
registrarla.

### Desactivé un punto por error. ¿Cómo lo recupero?

Con el filtro **«Inactivos»** de «Catálogos del cuadro» y el botón **«Reactivar»**.

> Hasta octubre la respuesta era «desde la pantalla no se puede» (PV-36). El rediseño de Catálogos
> del 12 de octubre de 2026 lo resolvió.

### ¿Por qué no puedo eliminar un funcionario?

Porque el histórico de quién salió en cada operativo depende de su ficha, y la rotación es mensual:
quien sale hoy puede reingresar el mes que viene con su historial intacto. Se da de baja y se
reactiva. La base tampoco permitiría borrarlo.

### Cambié la hora de cierre y no pasó nada

Debería regir de inmediato. Compruebe que guardó y que la ventana de ese rol está **activa**: una
ventana desactivada no restringe nada.

### Cambié un parámetro y no se guardó

En la pestaña «Parámetros» **no hay guardado por fila**: los cambios se juntan y se guardan todos
con la barra de abajo, después de confirmar el resumen. Si uno no es válido, **no se guarda
ninguno** y el error aparece bajo su fila.

### ¿Puedo crear una ventana nueva?

No, y no falta: hay **una por rol**, fijas. Eliminar una **abriría** la carga las veinticuatro
horas, porque el sistema trata la ausencia de ventana como «sin restricción». Para quitarla se
desactiva.

### ¿Cómo doy de alta a alguien que no puede entrar?

En «Cuentas del cuadro» › **«+ Nueva cuenta»**: se elige a la persona del directorio institucional
y se le asigna su perfil. Desde agosto ya no hace falta SQL.

---

## Técnicas

### ¿Hay documentación Swagger?

**No.** `@nestjs/swagger` no está instalado. La referencia de la API es `06_Manual_API.md`.

### ¿Por qué las pruebas de integración usan otra base?

Porque `ck_formulario_numero` acota el número de formulario **entre 1 y 9**: hay nueve casilleros y
el catálogo institucional los ocupa todos. No es aislamiento por prefijo: el recurso es finito por
diseño.

### ¿Por qué el contenedor no aplica las migraciones al arrancar?

Porque las aplicaría **cada vez que se reinicia**, en el peor momento posible, y con varias
réplicas las aplicaría varias veces a la vez. Son un paso explícito del despliegue
(`npx prisma migrate deploy`).

### Cambié `VITE_API_BASE_URL` y no pasó nada

Se lee **en tiempo de construcción**. Hay que reconstruir la imagen del frontend. Lo mismo vale para
`VITE_AUTH_PORTAL_URL`, que desde el 16 de octubre de 2026 es **obligatoria**: sin ella el build se
detiene.

### ¿Por qué todo responde 401?

No hay cookie de sesión válida. Tres causas, por frecuencia:

1. **La sesión caducó** —dura ocho horas— o nunca se estableció. Vuelva a entrar por el portal.
2. **`SESSION_JWT_SECRET` está vacía o cambió**, así que la firma de la cookie ya no valida. Desde
   septiembre el backend no arranca si está vacía o mide menos de 32 caracteres. El registro lo
   dice: `docker logs transporte-app 2>&1 | grep SESSION_JWT_SECRET`.
3. El navegador conserva una cookie de una configuración anterior. Bórrela y vuelva a entrar.

> `MODO_IDENTIDAD_PROVISIONAL` **ya no existe**: se retiró el 18 de agosto de 2026. Si la encuentra
> en un `.env` heredado, sobra.

### Entro al portal, elijo el rol, y me devuelve al portal

La ruta del **módulo 80** en Auth central no apunta al frontend, o apunta a un origen distinto del
que usted está abriendo. Debe ser **solo el origen** del frontend en ese ambiente —en desarrollo,
`localhost:5180`—: el portal añade `/auth/callback` por su cuenta.

### Me dice que mi usuario no está dado de alta, pero entro bien al portal

Es correcto y son dos cosas distintas. **Auth dice quién es usted; el Cuadro de Colores decide qué
rol tiene**, y para eso necesita una fila en `t_usuario` con su usuario institucional en
`usua_identificador_ad` y al menos un rol en `t_usuario_rol`. Sin ella no entra, aunque el portal le
reconozca. Se da de alta en «Cuentas del cuadro».

### Los formularios me salen todos deshabilitados en el registro

Fue un defecto, **corregido el 7 de agosto de 2026**: el frontend comparaba el acceso contra un
valor que el servidor nunca envía. Si vuelve a ocurrir, reconstruya la imagen del frontend
(`docker compose build`).

### ¿Puedo consultar la base directamente para corregir algo?

Puede consultarla. **Modificarla no**: un cambio por SQL no pasa por las reglas de negocio y **no
deja traza en la auditoría**. Los scripts de corrección que existen (limpieza de catálogos, tramos
de registros agrupados) solo reportan si no se les pasa `--aplicar`, y dejan su traza.

---

## Estado del proyecto

### ¿El sistema está listo para producción?

**En desarrollo no queda ningún bloqueante.** Lo que decide la puesta en marcha son **los datos
maestros** de cada ambiente —catálogos por formulario, personal con su jornada laboral, flota y
turnos— y las decisiones pendientes del negocio que lista `17_KNOWN_ISSUES.md`.

Las pruebas automáticas, medidas el 5 de noviembre de 2026:

| Repositorio | Pruebas |
|---|---|
| Backend | **2420** pruebas unitarias en **151** suites |
| Frontend | **2081** pruebas en **140** archivos |

> En agosto eran 738 unitarias, 283 de integración y 258 de interfaz (medidas el 19 de agosto). La
> cifra de integración no se volvió a medir para esta revisión.

### ¿Qué falta exactamente?

Ver `17_KNOWN_ISSUES.md`. Lo que comprobamos en el código para esta revisión:

- **PV-27, prefijo por área**: resuelto para el 5, el 6 y el 8; el **7** sigue esperando el
  criterio del negocio.
- **PV-34**: el servidor no exige el cuadro cerrado para emitir órdenes.
- **Abrir la jornada** sigue sin botón: se hace por la API (`POST /cuadros`).
- **Auth central**: que el canje transmita el rol elegido (desajuste D-5).

> Ya no aplica lo que decía esta respuesta en agosto sobre el rol `Transporte - Funcionario`: el
> perfil de funcionario se retiró el 10 de septiembre de 2026.

### ¿Cuánto trabajo de desarrollo queda?

**Poco, y ninguno bloquea.** La pantalla de cuentas, que en agosto era lo más útil, existe desde
entonces. Lo que queda son decisiones del negocio (prefijo del 7, emisión sin cierre, dónde aborda
el personal para calcular traslados) y del lado de Auth central.

> Antes esta respuesta decía «el modo JWT en un solo archivo». Se hizo, y **la previsión era
> correcta en lo esencial**: la cadena de autorización no cambió. Pero hicieron falta además un
> submódulo nuevo para los tres endpoints de sesión y dos migraciones que no estaban previstas.
