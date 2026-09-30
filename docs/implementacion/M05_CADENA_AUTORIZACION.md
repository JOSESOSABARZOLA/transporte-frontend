# M-05 · CADENA DE AUTORIZACIÓN
## Documentación de lo implementado — Cuadro de Colores Operativo · AMC

| | |
|---|---|
| **Módulo** | M-05 de `PLAN_DE_IMPLEMENTACION.md` |
| **Etapa** | E2 de `IMPLEMENTATION_GUIDE.md` |
| **Fecha** | 2026-08-05 |
| **Depende de** | M-03 y M-04 |
| **Alcance** | Solo backend. **Ningún módulo aprobado fue modificado**; el frontend no se tocó |
| **Estado** | **Terminado.** 55 pruebas unitarias pasan, más la verificación contra las ventanas reales |

---

## 1. QUÉ SE ENTREGÓ

La cadena completa, en su orden obligatorio:

```
IdentidadGuard → RolesGuard → FormularioRolGuard → VentanaCargaGuard → ValidationPipe → Servicio
     401             403             403                423                400            409
```

| Guarda | Pregunta que responde | Fuente de verdad | Archivo |
|---|---|---|---|
| `IdentidadGuard` | ¿Quién realiza la petición? | Cabecera provisional, **solo si el modo está activo** | `guards/identidad.guard.ts` **nuevo** |
| `RolesGuard` | ¿El rol figura entre los autorizados? | Decorador `@Roles()` | `guards/roles.guard.ts` **reutilizado sin tocar** |
| `FormularioRolGuard` | ¿El formulario pertenece a este rol? | **Tabla `t_formulario`** | `guards/formulario-rol.guard.ts` **nuevo** |
| `VentanaCargaGuard` | ¿Puede escribir en este momento? | `t_ventana_carga`, en `America/Guayaquil` | `guards/ventana-carga.guard.ts` **nuevo** |

Más: dos decoradores, dos repositorios, el evaluador de ventanas, el catálogo provisional de
perfiles, la interfaz de identidad y el módulo que lo publica todo.

---

## 2. EL `RolesGuard` EXISTENTE SE REUTILIZA SIN MODIFICARLO

La guía §0.2 dice que `src/common/auth/` «se extiende con guardas nuevas, no se modifica lo
existente». El `RolesGuard` heredado lee `user.roles`, un **arreglo** de cadenas; el módulo trabaja
con un **rol único**, `RolDepartamental`.

La tentación era reescribirlo. En su lugar, `UsuarioAutenticado` **extiende** el contrato `AuthUser`
que esa guarda ya consume, y el `IdentidadGuard` rellena `roles` con `[rol]`:

```ts
export interface UsuarioAutenticado extends AuthUser {
  usuarioId: number;
  rol: RolDepartamental;   // fuente de toda autorización
  roles: string[];         // [rol], para el RolesGuard heredado
}
```

Una línea de adaptación evita tocar código que no es de este módulo. Los decoradores `@Roles()` y
`@Permissions()` siguen intactos.

---

## 3. LA DECISIÓN DE SEGURIDAD DEL MÓDULO

### 3.1 El cliente dice QUIÉN dice ser; el servidor decide QUÉ ROL tiene

El modo provisional podría haberse resuelto con una cabecera que transportara el rol directamente.
No se hizo, y la diferencia importa.

La cabecera `x-usuario-prueba` transporta **el identificador del usuario**. El rol que le
corresponde lo resuelve el servidor contra su propio catálogo. Aunque el modo sea provisional,
**un cliente no puede reclamar un rol que no le pertenece cambiando una cabecera**.

Hay una prueba dedicada a esto: una petición que dice ser el usuario 1 —DMIP Operativos— y añade
`x-rol: DIRECTOR` se resuelve como DMIP Operativos.

Es la misma idea que sostiene toda la cadena y que el análisis repite: la autorización se verifica
en el servidor, con independencia de lo que envíe o muestre la interfaz.

### 3.2 La propiedad del formulario la dice la tabla, nunca la petición

PER-01 exige que un departamento no pueda escribir en formularios ajenos **ni siquiera manipulando
la petición**.

La petición solo indica **qué** formulario se pretende usar. Quién es su dueño lo dice
`t_formulario`. Si la guarda confiara en un campo del cuerpo para decidir la propiedad, bastaría con
alterar ese campo.

La prueba lo comprueba explícitamente: un cuerpo que declara `rolDueno: DMIT_INSTRUCTOR` sobre el
formulario `FIJOS` se rechaza igual, porque la guarda consulta la tabla y esa dice
`DMIP_OPERATIVOS`.

### 3.3 Un formulario inexistente responde «no autorizado», no «no encontrado»

Devolver 404 revelaría qué códigos de formulario existen y cuáles no. Ante un código desconocido o
un formulario dado de baja, la guarda responde `403 FORMULARIO_NO_AUTORIZADO`, igual que ante uno
ajeno.

### 3.4 El modo provisional está aislado en un solo punto

`IdentidadGuard` es **el único punto provisional del sistema**. Todo lo que viene después —Roles,
FormularioRol y VentanaCarga— está construido en su forma definitiva y **no cambiará** cuando llegue
el microservicio de Active Directory.

Si `MODO_IDENTIDAD_PROVISIONAL` es falso, la cabecera **se ignora por completo** y la petición
recibe `401`. Es la garantía del riesgo RT-05: si la variable queda mal configurada en producción,
la cabecera no sirve para suplantar a nadie. Hay una prueba dedicada, y se verificó en el
contenedor, donde el `docker-compose` la pone en `false`.

En E12 se implementa aquí el modo JWT y se retira `usuarios-prueba.ts`. **Un archivo y una variable
de entorno.**

---

## 4. LA VENTANA DE CARGA

### 4.1 Por qué 423 y no 403

`VentanaCargaGuard` responde **423** deliberadamente. El rol **sí** tiene permiso sobre el
formulario; lo que no tiene es el momento. Un 403 diría que el perfil no puede hacer eso nunca, que
es falso y confundiría al funcionario. El mensaje que devuelve sale de la propia ventana e indica
cuándo vuelve a abrirse.

### 4.2 Solo restringe la escritura

La consulta nunca se limita: la Dirección debe poder revisar el cuadro a cualquier hora. La guarda
solo interviene en `POST`, `PATCH`, `PUT` y `DELETE`.

> **Corregido en el code review del 2026-08-05 · `CODE_REVIEW.md` SEG-05.**
>
> Ante una petición sin identidad resuelta, la guarda devolvía `true` —fallaba **abierta**— dando
> por hecho que `IdentidadGuard` se había ejecutado antes. Un endpoint que la declarara sin
> aquella, o en otro orden, habría admitido escrituras sin ventana y sin usuario.
>
> `FormularioRolGuard` ya fallaba cerrada ante exactamente lo mismo: dos guardas de la misma cadena
> con criterios opuestos. Ahora ambas fallan cerradas.

### 4.3 El cruce de medianoche, otra vez

El evaluador contempla que la hora de cierre sea **menor** que la de apertura. Es el mismo riesgo
que `RangoHorario` —RT-01—: una ventana de 20H00 a 05H00 comparada sin contemplarlo da resultados
silenciosamente incorrectos. Tres pruebas lo cubren.

También soporta ventanas con día de la semana, que es la forma que describen las fuentes para la
planificación zonal —viernes 00H00 a martes 10H00—, con la misma aritmética cíclica.

### 4.4 Se evalúa en la zona de la ventana, no en la del servidor

Una prueba toma **el mismo instante** y lo evalúa contra dos ventanas idénticas salvo por su zona
horaria: en Guayaquil permite escribir y en Madrid no. Es el riesgo RT-03: con la zona mal
configurada, los cierres de las 15H00 ocurrirían a otra hora y nadie lo notaría hasta que un
departamento perdiera su ventana.

### 4.5 Se expone como clase propia para que M-08 no la duplique

`VentanaCargaEvaluador` es la política POL-05. Se implementó como clase inyectable y no como método
privado de la guarda para que el `VentanaCargaService` del submódulo `configuracion` **la reutilice
en lugar de reimplementarla**. Está exportada por `AuthModule`.

---

## 5. LAS GUARDAS NO SE REGISTRAN DE FORMA GLOBAL

Podrían haberse aplicado con `APP_GUARD` a toda la aplicación. No se hizo.

La cadena **no es la misma en todos los endpoints**: una consulta lleva Identidad y Roles; una
escritura lleva además FormularioRol y VentanaCarga; y algunos endpoints, como la consulta de
órdenes propias, no trabajan sobre un formulario. Registrarlas globalmente obligaría a **excluir**
endpoints uno por uno, y una exclusión olvidada es un agujero silencioso: nadie nota que una guarda
dejó de aplicarse.

Declararlas por endpoint con `@UseGuards()` hace visible en el propio controlador qué protege cada
ruta. Así lo consumirán M-06 en adelante:

```
@UseGuards(IdentidadGuard, RolesGuard, FormularioRolGuard, VentanaCargaGuard)
@Roles(RolDepartamental.DMIP_OPERATIVOS, ...)
@FormularioDesde('body', 'formularioCodigo')
```

---

## 6. PRUEBAS

### 6.1 Los siete casos del plan

| # | Caso | Resultado |
|---|---|---|
| 1 | Petición sin identidad | **401** |
| 2 | Rol no listado en `@Roles()` | El `RolesGuard` heredado devuelve falso → 403 |
| 3 | `DMIP_OPERATIVOS` escribiendo en formulario ajeno | **403 `FORMULARIO_NO_AUTORIZADO`** |
| 4 | Petición manipulada con otro dueño en el cuerpo | **403.** La guarda consulta la tabla, no el cuerpo |
| 5 | Escritura fuera de la ventana | **423 `VENTANA_CARGA_CERRADA`** con la hora de cierre y el mensaje |
| 6 | Cabecera provisional con el modo en `false` | **401.** La cabecera se ignora |
| 7 | Orden de evaluación | La cadena corta en la primera guarda que falla: con rol ajeno y ventana cerrada, gana el 403 |

### 6.2 Las 55 pruebas unitarias

| Suite | Casos |
|---|---|
| `identidad.guard.spec.ts` | **9** · resolución, rol decidido por el servidor, `roles` para la guarda heredada, contexto, rechazos y aislamiento del modo provisional |
| `formulario-rol.guard.spec.ts` | **9** · dueño, ajeno, **rol compartido del formulario 6**, petición manipulada, inexistente, dado de baja, sin código, sin decorador, y código en parámetros de ruta |
| `ventana-carga.evaluador.spec.ts` | **14** · departamental, DAF, cruce de medianoche, zona horaria, ventana semanal |
| Suites de M-02 y M-04 | 23 |

### 6.3 Verificación contra las ventanas reales de la base

Ejecutada contra las seis ventanas que sembró M-03:

```
  DMIP_OPERATIVOS    10H:si  14H:si  15H:NO  16H:NO  17H:NO
  DAF                10H:NO  14H:NO  15H:si  16H:si  17H:NO
  DIRECTOR           10H:si  14H:si  15H:si  16H:si  17H:si
```

Es exactamente el proceso que describen las fuentes: los departamentos cargan hasta las 15H00, la
DAF asigna de 15H00 a 16H30, y la Dirección no tiene restricción horaria.

### 6.4 Compilación y ejecución

| Verificación | Resultado |
|---|---|
| `npm run build` | **0** |
| `npm run lint:check` | **0** |
| `npm test` | **0** · 55/55 |
| Imagen de Docker y contenedor | Arranca; **sin advertencia de modo provisional**, que es lo correcto en el contenedor |
| Frontend | **Sin cambios** |

---

## 7. DOS AJUSTES QUE LAS PRUEBAS OBLIGARON A HACER

Menores comparados con los de módulos anteriores, pero conviene registrarlos.

**Una prueba estaba mal escrita, no el código.** El caso «sin decorador, la guarda deja pasar»
fallaba porque pasar `undefined` como argumento activaba el valor por defecto del parámetro, de
modo que el reflector sí devolvía una ubicación. Se corrigió la prueba, no la guarda.

**Referencias a métodos desligadas de su objeto.** Pasar `repositorio.buscarPorCodigo` a `expect()`
separa el método de su objeto. Se conserva la referencia a la función simulada aparte.

---

## 8. LO QUE NO ENTRA EN ESTE MÓDULO

| Elemento | Dónde va |
|---|---|
| Aplicar las guardas a endpoints reales | M-06 en adelante. No hay endpoints de negocio todavía |
| El cupo del rol compartido en el formulario 6 | **M-15.** No puede ir en una guarda: depende del área de la persona que se asigna y de cuántas lleva el rol. Va en la capa de aplicación |
| `VentanaCargaService` completo | M-08, que reutilizará el evaluador |
| Modo JWT | E12 |

> **Nota sobre `t_formulario`.** La tabla está **vacía**: su siembra sigue bloqueada por PV-25 y
> PV-26. `FormularioRolGuard` está probado con dobles, y su comportamiento contra datos reales solo
> podrá verificarse cuando lleguen esos dos pendientes. La guarda ya se comporta correctamente ante
> la tabla vacía: rechaza con `FORMULARIO_NO_AUTORIZADO`.

---

## 9. ARCHIVOS

| Archivo | Cambio |
|---|---|
| `auth/interfaces/usuario-autenticado.interface.ts` | **Nuevo** |
| `auth/usuarios-prueba.ts` | **Nuevo** · TEMPORAL, se retira en E12 |
| `auth/guards/identidad.guard.ts` + `.spec.ts` | **Nuevo** |
| `auth/guards/formulario-rol.guard.ts` + `.spec.ts` | **Nuevo** |
| `auth/guards/ventana-carga.guard.ts` | **Nuevo** |
| `auth/application/ventana-carga.evaluador.ts` + `.spec.ts` | **Nuevo** |
| `auth/infrastructure/formulario-autorizacion.repository.ts` | **Nuevo** |
| `auth/infrastructure/ventana-carga.repository.ts` | **Nuevo** |
| `auth/decorators/usuario-actual.decorator.ts` | **Nuevo** |
| `auth/decorators/formulario-desde.decorator.ts` | **Nuevo** |
| `auth/auth.module.ts` | **Nuevo** |
| `common/utilidades/marca-tiempo.ts` | **Ampliado** con `horaEnZona` y `diaIsoEnZona`. Añadido, no modificado |
| `app.module.ts` | Importa `AuthModule` |

`auth/guards/roles.guard.ts`, `auth/decorators/roles.decorator.ts`,
`auth/decorators/permissions.decorator.ts` y `auth/interfaces/auth-user.interface.ts`
**no se tocaron**.

Sin cambios en el esquema, las migraciones, la semilla ni el frontend.

---

*Fin de la documentación de M-05. A la espera de aprobación.*
