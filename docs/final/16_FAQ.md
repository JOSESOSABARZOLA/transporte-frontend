# 16 · Preguntas frecuentes

**Módulo Transportes / Cuadro de Colores Operativo — Agencia Metropolitana de Control**
7 de agosto de 2026 · **actualizado el 19 de agosto de 2026**

Todas las respuestas están comprobadas contra el sistema en marcha.

---

## Uso diario

### ¿Por qué no veo los formularios de otro departamento?

Porque no le corresponden. El servidor devuelve **solo los suyos**: no es un filtro de la
pantalla que alguien pudiera quitar. Es el requisito que originó el encargo.

### Falta gente en la lista de personal y no sé por qué

Si la persona **aparece en gris con un motivo debajo**, ahí tiene la respuesta: el sistema dice por
qué no puede salir. Desde el 11-AGO-2026, al resolverse **PV-37** y **F-08**.

Si **no aparece en absoluto**, la causa es otra: su área no está entre las que admite ese
formulario. Compruébelo en P-07; cada formulario delimita sus áreas.

Y si el motivo dice solo que «no está disponible en la fecha del operativo», es una ausencia
registrada. **La causa concreta no se publica** a propósito: un reposo médico o una calamidad
doméstica no tienen por qué llegar a quien arma el cuadro.

### El sistema dice que la persona ya está en un operativo que yo eliminé

Fue un defecto, **corregido el 7 de agosto de 2026**. La baja de un operativo es lógica y su
personal asignado no se borra, así que un operativo retirado seguía ocupando a su gente y no había
forma de liberarla. Si vuelve a ocurrir, reconstruya la imagen del backend.

### ¿Puedo registrar un operativo que cruza la medianoche?

Sí. De 22H00 a 02H00 es válido y el sistema lo marca como nocturno. Que la hora de fin sea menor
que la de inicio **no es un error**.

### ¿Por qué no puedo escribir el identificador?

Porque el problema original era equivocarse en el año y en el secuencial al escribirlo a mano. Lo
genera el sistema y reinicia cada día, por formulario.

### ¿Por qué no puedo poner el conductor?

Lo asigna la DAF, en su propia pantalla y en su propia ventana (15H00–16H30). Conductor y placa
nacen vacíos por diseño (RN-40).

### La bandeja de transporte está vacía y sí hay operativos registrados

Es lo esperado, no un fallo. La bandeja de P-03 **solo recoge los operativos cuyo formulario
habilita vehículo**. Los formularios **1 · FIJOS**, **3 · LIMPIA** y **9 · CBQ** tienen política
`NO_APLICA`: operan por propios medios por definición (RN-41 y RN-42), así que nunca llegan a la
DAF. Una jornada compuesta solo por ellos deja la bandeja vacía y está correcta.

Los seis restantes sí aparecen: 2 · PMO (condicional), 4 · ECU, 5 · REACD, 6 · REACN y 7 · DMIT
(requerido) y 8 · INSP (obligatorio).

### Se me pasó la hora. ¿Qué hago?

Tres opciones, en este orden: esperar al día siguiente; pedir a la Dirección que **reabra** el
cuadro; o pedir al administrador que cambie la hora de cierre desde P-09, que rige de inmediato.

### Perdí lo que había escrito al recibir un error. ¿Es normal?

No debería ocurrir: **lo capturado se conserva** en todos los rechazos. Si le pasó, repórtelo con
el identificador de correlación.

### ¿Puedo elegir más de una zonal?

El contrato lo admite (RN-19) pero **la interfaz ofrece una sola** (PV-31). Si el reparto entre
zonales es habitual en su departamento, comuníquelo: es un cambio de pantalla, no de contrato.

---

## Reglas y rechazos

### El sistema no me deja asignar a alguien. ¿Puedo saltarlo?

No desde la interfaz, y es deliberado: la regla protege a esa persona. Lo que sí se puede es
**cambiar el umbral** desde P-09, y eso lo decide la Dirección.

### ¿Qué formularios cuentan como patrulla?

Los formularios **4, 5, 6 y 9**. Decidido por el Product Owner el 7 de agosto de 2026.

Conviene notar que **no se puede deducir del nombre**: el 9 es patrulla y no se llama así, y el 2
lleva un nombre operativo y no lo es.

### Si alguien salió en patrulla ayer, ¿puede salir hoy en otra?

No. El bloqueo es **cruzado entre formularios de patrulla**, no «no repetir el mismo». Dura lo que
diga `DIAS_DESCANSO_PATRULLA`, hoy un día.

### ¿Por qué el sistema me deja registrar aunque falten vehículos?

Porque que la demanda supere la flota es **un hecho de la jornada, no un error de captura**. Se
avisa en rojo y no se bloquea: alguien lo resolverá pidiendo apoyo o cubriendo por propios medios.

### Dos personas editamos el mismo operativo y me salió un aviso

Es el bloqueo optimista protegiendo el trabajo de la otra persona. Recargue y repita el cambio.

---

## Matriz y órdenes

### ¿Por qué no puedo ver la matriz completa?

Es exclusiva de la Dirección (RN-48). El cuadro completo circulando es exactamente el problema que
este sistema existe para resolver. Ni siquiera la DAF la ve, aunque asigne transporte en los nueve
formularios.

**Con una excepción desde el 2026-08-26.** DMIT Instrucción tiene su propia pantalla, «Jornada del
Día», con los nueve formularios y el personal editable en aquellos en los que su departamento
participa. No es la matriz: **no exporta el PDF y no cierra el cuadro**, que es lo que de verdad
dejó de circular.

### Entonces, ¿el DMIT puede llevarse el cuadro completo?

No. Puede **verlo en pantalla**; el documento firmable lo sigue emitiendo solo la Dirección, y el
endpoint de la jornada no tiene ruta de exportación. Es una distinción deliberada: lo que se filtraba
por WhatsApp era el archivo.

### ¿Por qué la orden de servicio no dice el punto de encuentro?

Porque la orden contiene **cuatro campos**: horario, funcionario, conductor y placa (INV-24,
RN-50). Una orden que dijera el punto reproduciría el problema original en formato individual.

### Emití las órdenes y había un error. ¿Puedo borrarlas?

No se borran: se **reemiten**. La anterior queda marcada como «Sustituida» y se conserva. El error
no se deshace, se documenta.

### ¿Se pueden emitir órdenes sin cerrar el cuadro?

La pantalla no lo permite. **Pero el servidor sí lo permitiría**: la regla vive hoy solo en la
interfaz, y eso está pendiente de decidir (PV-34).

---

## Administración

### Di de alta un funcionario y no aparece en el registro

Compruebe tres cosas: que el **área** del funcionario esté entre las que admite el formulario; que
no tenga una **ausencia vigente**; y que su **tipo de contrato** admita ese turno.

### Registré vacaciones y la persona sigue apareciendo

Compruebe el rango: los extremos **están incluidos**, pero un periodo que empieza mañana no afecta
a hoy.

### Desactivé un punto por error. ¿Cómo lo recupero?

Desde la pantalla, **no se puede** (PV-36): el listado solo muestra lo vigente. Hoy exige
intervención en la base de datos. Está reportado.

### ¿Por qué no puedo eliminar un funcionario?

Porque el histórico de quién salió en cada operativo depende de su ficha, y la rotación es mensual:
quien sale hoy puede reingresar el mes que viene con su historial intacto. La base tampoco lo
permitiría.

### Cambié la hora de cierre y no pasó nada

Debería regir de inmediato. Compruebe que guardó y que la ventana de ese rol está **activa**: una
ventana desactivada no restringe nada.

### ¿Puedo crear una ventana nueva?

No, y no falta: hay **una por rol** y son seis, fijas. Eliminar una **abriría** la carga las
veinticuatro horas, porque el sistema trata la ausencia de ventana como «sin restricción». Para
quitarla se desactiva.

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
réplicas las aplicaría varias veces a la vez. Son un paso explícito del despliegue.

### Cambié `VITE_API_BASE_URL` y no pasó nada

Se lee **en tiempo de construcción**. Hay que reconstruir la imagen del frontend.

### ¿Por qué todo responde 401?

No hay cookie de sesión válida. Tres causas, por frecuencia:

1. **La sesión caducó** —dura ocho horas— o nunca se estableció. Vuelva a entrar por el portal.
2. **`SESSION_JWT_SECRET` está vacía o cambió**, así que la firma de la cookie ya no valida. El
   registro lo dice: `docker logs transporte-app 2>&1 | grep SESSION_JWT_SECRET`.
3. El navegador conserva una cookie de una configuración anterior. Bórrela y vuelva a entrar.

> `MODO_IDENTIDAD_PROVISIONAL` **ya no existe**: se retiró el 18 de agosto de 2026. Si la encuentra
> en un `.env` heredado, sobra.

### Entro al portal, elijo el rol, y me devuelve al portal

La ruta del **módulo 80** en Auth central no apunta al frontend, o apunta a un origen distinto del
que usted está abriendo. Debe ser **solo el origen** —hoy `localhost:5180`—: el portal añade
`/auth/callback` por su cuenta.

### Me dice que mi usuario no está dado de alta, pero entro bien al portal

Es correcto y son dos cosas distintas. **Auth dice quién es usted; el Cuadro de Colores decide qué
rol tiene**, y para eso necesita una fila en `t_usuario` con su usuario institucional en
`usua_identificador_ad`. Sin ella no entra, aunque el portal le reconozca. Se da de alta por semilla
o por SQL: todavía no hay pantalla.

### Los formularios me salen todos deshabilitados en el registro

Fue un defecto, **corregido el 7 de agosto de 2026**: el frontend comparaba el acceso contra un
valor que el servidor nunca envía. Si vuelve a ocurrir, reconstruya la imagen del frontend
(`docker compose build`).

### ¿Puedo consultar la base directamente para corregir algo?

Puede consultarla. **Modificarla no**: un cambio por SQL no pasa por las reglas de negocio y **no
deja traza en la auditoría**.

---

## Estado del proyecto

### ¿El sistema está listo para producción?

**Le queda un motivo, y no es de software: faltan datos maestros** —la matriz zonal ↔ punto (PV-01),
el personal (PV-02) y la flota (PV-03)—.

> **Eran dos.** El primero, «no hay identidad real», se resolvió del 17 al 19 de agosto de 2026 con
> el ingreso por Auth central. **Ya no queda ningún bloqueante de desarrollo.**

Todo lo demás está implementado y probado: **738** pruebas unitarias, **283** de integración y
**258** de interfaz, medidas el 19 de agosto.

### ¿Qué falta exactamente?

Ver `17_KNOWN_ISSUES.md`. En resumen: tres catálogos que debe entregar el negocio, el criterio de
prefijo por área (PV-27) que hoy impide registrar en cinco de los nueve formularios, y dos cosas del
lado de **Auth central**: el rol `Transporte - Funcionario` —sin él P-06 sigue inaccesible— y que el
token traiga el subsistema.

### ¿Cuánto trabajo de desarrollo queda?

**Poco, y ninguno bloquea.** La pantalla de administración de usuarios es lo más útil: hoy dar de
alta a alguien exige semilla o SQL, y **quien no tenga fila en `t_usuario` no entra** aunque el
portal le reconozca. Lo demás son decisiones del negocio o de Auth central.

> Antes esta respuesta decía «el modo JWT en un solo archivo». Se hizo, y **la previsión era
> correcta en lo esencial**: la cadena de autorización no cambió. Pero hicieron falta además un
> submódulo nuevo para los tres endpoints de sesión y dos migraciones que no estaban previstas.
