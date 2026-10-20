/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Formularios y catálogos
 * Archivo: Formulario.ts
 * Responsabilidad: Declarar los nueve formularios y sus catálogos delimitados.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * LOS COLORES VIENEN DEL SERVIDOR Y NO SE INTERPRETAN AQUÍ. Son dato institucional del
 * Excel aprobado (FASE5 §10.2) y la regla 3 de CLAUDE.md: el frontend los pinta. Si
 * estuvieran en el cliente, cambiar el color de un formulario exigiría desplegar la
 * interfaz.
 */

import type { RolDepartamental } from "../config/env";
import type { TipoTransporte } from "./Operativo.ts";

/** Qué puede hacer el rol actual sobre el formulario. PER-01. */
/**
 * Acceso del rol sobre un formulario. Lo resuelve el servidor en `accesoDe()`.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SON LOS TRES VALORES QUE EL BACKEND ENVÍA, NI UNO MÁS NI UNO MENOS.
 *
 * Hasta el 2026-08-07 este tipo decía `"DUENO" | "COMPARTIDO"`, y **`DUENO` no existe
 * en el contrato**: el servidor responde `ESCRITURA`. La comparación `acceso === "DUENO"`
 * era falsa siempre, así que **los nueve formularios salían deshabilitados** y no se
 * podía registrar nada.
 *
 * No lo detectó ninguna prueba porque los objetos de prueba usaban el mismo valor
 * inventado que el código: un ficticio que repite la suposición del código no comprueba
 * nada. Ahora se construyen con los valores del contrato.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   · `ESCRITURA`  el rol es dueño del formulario y registra en él
 *   · `COMPARTIDO` aporta personal dentro de su cupo, pero **no registra** (PER-06)
 *   · `LECTURA`    lo ve y no lo escribe. Es lo que reciben DAF, Dirección y Administración
 */
export type AccesoFormulario = "ESCRITURA" | "COMPARTIDO" | "LECTURA";

/** Política de vehículo del formulario. RN-41 y RN-42. */
export type PoliticaVehiculo =
  | "NO_APLICA"
  | "CONDICIONAL"
  | "REQUERIDO"
  | "OBLIGATORIO";

/**
 * Área de personal admitida. RN-15.
 *
 * SON CUATRO DESDE EL 2026-08-27. Se retiró `CCF`, que ningún formulario admitía y en la
 * que no había nadie. La retirada exigió tocar los dos lados: esta unión es una **copia a
 * mano** del enumerado del servidor, no algo derivado de él.
 *
 * El compilador avisa del descuido por un sitio: `NOMBRE_AREA` es un `Record<AreaPersonal,
 * string>` y no compila si le sobra o le falta una clave.
 */
export type AreaPersonal =
  | "GENERAL"
  | "TECNICO"
  | "INSTRUCCION"
  | "OPERATIVOS";

/** Área que el formulario admite, y si el cupo es del rol compartido. RN-15. */
export interface AreaFormulario {
  area: AreaPersonal;
  esCompartida: boolean;
}

/**
 * Respuesta de `PUT /administracion/formularios/:codigo/areas`.
 *
 * Lleva lo que quedó, no un acuse: la pantalla repinta con el estado real del servidor,
 * incluida `esCompartida`, que el cambio conserva y la petición no envía.
 */
export interface AreasDeFormulario {
  codigo: string;
  nombre: string;
  areas: AreaFormulario[];
}

/**
 * Respuesta de `GET /formularios/permitidos`. **No existe `GET /formularios`**: el
 * único listado es el que filtra por rol.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * COPIADA DE `FormularioResponseDto`, CAMPO POR CAMPO.
 *
 * Hasta el 2026-08-07 esta declaración tenía tres errores frente al servidor:
 *
 *   · `condicionanteNoct` — el servidor envía `condicionanteNocturno`. El aviso de
 *     operativo nocturno de P-01 leía `undefined` y **nunca se mostraba**.
 *   · `areas: AreaPersonal[]` — el servidor envía objetos `{ area, esCompartida }`.
 *   · `id` no lo enviaba nadie. P-08 lo mandaba como `formularioIds: [undefined]` y
 *     **el alta de todo catálogo fallaba** con «Los formularios se indican por su
 *     identificador». Se agregó al DTO del servidor, que es donde faltaba.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
/** Participación de un departamento en un formulario. `t_formulario_rol`. */
export interface RolDelFormulario {
  rol: RolDepartamental;
  /** `ESCRITURA` registra y edita lo suyo; `APORTA` solo asigna personal, con cupo. */
  acceso: "ESCRITURA" | "APORTA";
  /** Máximo de personas que puede asignar. Solo en `APORTA`. */
  cupo: number | null;
}

export interface Formulario {
  /** Clave sustituta. La usan las altas de catálogo para fijar su `formularioId`. */
  id: number;
  numero: number;
  codigo: string;
  nombre: string;
  colorFondo: string;
  colorAcento: string;
  colorNombre: string;
  /** Departamento responsable. **No decide el permiso**: eso lo dice `acceso`. */
  rolDueno: RolDepartamental;
  /**
   * Qué puede hacer cada departamento en este formulario. Desde el 2026-08-25.
   *
   * SUSTITUYE A `rolCompartido` Y `cupoCompartido`, que solo daban para un invitado. La
   * patrulla ECU tiene **dos departamentos que registran**, y eso en dos campos no cabía.
   *
   * `acceso` sigue siendo lo que la pantalla mira para decidir qué ofrecer: es el
   * veredicto **para quien pregunta**. Esto es el cuadro completo, para explicarlo.
   */
  roles: RolDelFormulario[];
  politicaVehiculo: PoliticaVehiculo;
  condicionanteNocturno: boolean;
  esPatrulla: boolean;
  /**
   * RN-20, y es propiedad de CADA CATÁLOGO: «los catálogos que lo prevén».
   *
   * Eran una sola bandera hasta el 2026-08-11, y esta pantalla la aplicaba a los dos
   * desplegables: ofrecía captura libre del punto de encuentro, que el insumo aprobado
   * no contempla en ninguno de los nueve formularios.
   */
  capturaLibrePunto: boolean;
  capturaLibreTipo: boolean;
  /** Orden institucional del Excel aprobado. El servidor ya los envía ordenados. */
  orden: number;
  areas: AreaFormulario[];
  acceso: AccesoFormulario;
  /**
   * El «Transporte» que el registro propone para este formulario (2026-10-06): el PMO, «Dejar y
   * retirar». Editable al registrar. Opcional: un servidor anterior no lo envía.
   */
  tipoTransportePorDefecto?: TipoTransporte;
}

export interface Zonal {
  id: number;
  codigo: string;
  nombre: string;
  esDmq?: boolean;
  /**
   * Vigente o desactivada. Al registrar solo llegan las vigentes; importa en
   * administración (`GET /zonales?incluirInactivas=true`), que ve también las retiradas.
   */
  activo?: boolean;
}

/** Un formulario nombrado en pocas palabras: el que se está configurando en P-08. */
export interface FormularioBreve {
  codigo: string;
  numero: number;
  nombre: string;
}

/**
 * Lo que el camino de ADMINISTRACIÓN agrega a cada valor de catálogo (rediseño de P-08,
 * 2026-10-12). El registro de operativos no lo recibe: por eso todo es opcional.
 *
 * `puedeEliminar` y `motivoNoEliminar` son la MISMA política que aplica el `DELETE …/permanente`
 * del servidor, calculada en la lista: la pantalla apaga «Eliminar» y explica por qué antes de
 * que alguien lo pulse y reciba un 409.
 *
 * Desde el 2026-10-13 cada formulario tiene su configuración PROPIA: no hay copias ni vínculos
 * entre formularios, así que un valor ya no dice «en qué otros formularios está».
 */
export interface DatosDeAdministracion {
  usos?: number;
  puedeEliminar?: boolean;
  motivoNoEliminar?: string | null;
}

export interface PuntoEncuentro extends DatosDeAdministracion {
  id: number;
  /** El punto PERTENECE A UN FORMULARIO (2026-09-29): ya no se comparte entre formularios. */
  formularioId: number;
  nombre: string;
  zonalId: number;
  zonalNombre?: string;
  /** PV-36. Solo lo trae el camino de administración; ausente = vigente. */
  activo?: boolean;
}

/** El tipo de control pertenece a UN formulario (2026-09-07): no se comparte. */
export interface TipoControl extends DatosDeAdministracion {
  id: number;
  nombre: string;
  activo?: boolean;
  formularioId: number;
}

export interface Institucion extends DatosDeAdministracion {
  id: number;
  /** La institución PERTENECE A UN FORMULARIO (2026-09-29): ya no se comparte. */
  formularioId: number;
  sigla: string;
  nombre: string;
  activo?: boolean;
}

/**
 * Zonal DEL FORMULARIO tal como la ve la ADMINISTRACIÓN (`GET /administracion/catalogos/:codigo/zonales`,
 * 2026-10-13). `id` es el de la ZONA DE LA CIUDAD (el `zonalId` de puntos y operativos); el
 * nombre, el estado y los conteos son de ESTE formulario. `zonalFormularioId` es informativo.
 */
export interface ZonalAdmin {
  id: number;
  zonalFormularioId: number;
  codigo: string;
  nombre: string;
  esDmq: boolean;
  activo: boolean;
  orden: number;
  /** Operativos DE ESTE formulario con esa zona. */
  usos: number;
  /** Puntos de ESTE formulario en la zonal, activos o no. */
  puntos: number;
  puntosActivos: number;
  puedeEliminar: boolean;
  motivoNoEliminar: string | null;
}

/** Respuesta de `GET /formularios/:codigo/catalogos`. */
export interface CatalogosFormulario {
  zonales: Zonal[];
  puntos: PuntoEncuentro[];
  tiposControl: TipoControl[];
  instituciones: Institucion[];
  /** RN-20, por catálogo. Ver `Formulario`. */
  capturaLibrePunto: boolean;
  capturaLibreTipo: boolean;
  /** Si el formulario admite VARIOS tipos de control a la vez (los nueve desde 2026-09-14). */
  tipoControlMultiple: boolean;
  /**
   * SPLIT por persona: cada persona asignada genera su propio operativo independiente, con el
   * prefijo de su área (el 8 desde 2026-09-10; el 5 desde 2026-09-14, IGECU/ITECU, para que
   * convivan las dos áreas). NO implica la columna de cantidad: eso es `cantidadPorPersona`.
   */
  variosPorPersona: boolean;
  /**
   * Si el formulario OFRECE la columna «Cantidad de operativos» por persona (fijar cantidad > 1).
   * Solo el 8 (2026-09-14). El 5 divide por persona pero NO la ofrece: por eso no la muestra.
   */
  cantidadPorPersona: boolean;
  /**
   * Si al REGISTRAR se puede AGREGAR un punto de encuentro al catálogo, ligado a la zonal
   * elegida (Unidad de Operativos, formularios 1-4). Distinto de `capturaLibrePunto` (que solo
   * teclea texto en el operativo): esto CREA el punto y queda para todos. 2026-09-24.
   */
  puntoManual: boolean;
  /** Igual que en `Formulario`: lo que el adicional propone en «Transporte» (2026-10-06). */
  tipoTransportePorDefecto?: TipoTransporte;
}

// ─────────────────── Administración de catálogos (P-08) ───────────────────

/**
 * Cuerpos de alta. Cada valor PERTENECE A UN FORMULARIO, y ese formulario viaja en la RUTA
 * (`/administracion/catalogos/:codigo/…`, 2026-10-13), no en el cuerpo: el servidor rechaza
 * los campos de más.
 */
export interface CrearPunto {
  nombre: string;
  zonalId: number;
}

export interface CrearTipoControl {
  nombre: string;
}

export interface CrearInstitucion {
  sigla: string;
  nombre: string;
}

/**
 * Alta de una zonal DEL FORMULARIO (2026-10-13): la ZONA DE LA CIUDAD a la que corresponde
 * (`GET …/:codigo/zonas-disponibles`; una por formulario) y el nombre que tendrá en él.
 */
export interface CrearZonal {
  zonaId: number;
  nombre: string;
}

// ─────────────────── Administración de formularios (2026-09-29) ───────────────────

/**
 * Un color de la paleta institucional: cómo se pinta (fondo/acento) y cómo se llama.
 * `GET /administracion/formularios/paleta`. El administrador elige uno; no teclea hexadecimales.
 */
export interface ColorPaleta {
  nombre: string;
  fondo: string;
  acento: string;
}

/**
 * La definición completa de un formulario para la pantalla de administración.
 * `GET /administracion/formularios` (incluye los dados de baja, para poder reactivarlos).
 */
export interface FormularioAdmin {
  id: number;
  numero: number;
  codigo: string;
  nombre: string;
  colorFondo: string;
  colorAcento: string;
  colorNombre: string;
  rolDueno: RolDepartamental;
  politicaVehiculo: PoliticaVehiculo;
  condicionanteNoct: boolean;
  esPatrulla: boolean;
  capturaLibrePunto: boolean;
  capturaLibreTipo: boolean;
  puntoManual: boolean;
  filtraPersonalPorRol: boolean;
  tipoControlMultiple: boolean;
  variosPorPersona: boolean;
  cantidadPorPersona: boolean;
  orden: number;
  activo: boolean;
  areas: AreaPersonal[];
  /** El prefijo GENERAL, el único editable; `null` si el formulario numera solo por área. */
  prefijo: string | null;
  /** El que se ve en la tabla: el general o, si no lo hay, el primero. */
  prefijoMostrado: string | null;
  /** Todos sus prefijos (general, por área y de adicionales), en el orden del servidor. */
  prefijos: PrefijoFormulario[];
  /** Lo que el registro propone en «Transporte» (2026-10-06). Sin él, el servidor no lo tiene. */
  tipoTransportePorDefecto?: TipoTransporte;
}

/** Un prefijo del identificador de operativos de un formulario (`t_formulario_prefijo`). */
export interface PrefijoFormulario {
  prefijo: string;
  area: AreaPersonal | null;
  predeterminado: boolean;
  adicional: boolean;
}

/**
 * Alta de un formulario. Número y código SOLO viajan aquí: son inmutables tras crear. SIN áreas
 * (2026-10-13): nace sin ellas y se configuran en Catálogos del cuadro, su única puerta.
 */
export interface CrearFormulario {
  numero: number;
  codigo: string;
  nombre: string;
  colorFondo: string;
  colorAcento: string;
  colorNombre: string;
  rolDueno: RolDepartamental;
  prefijo: string;
  politicaVehiculo: PoliticaVehiculo;
  condicionanteNoct: boolean;
  esPatrulla: boolean;
  capturaLibrePunto: boolean;
  capturaLibreTipo: boolean;
  puntoManual: boolean;
  filtraPersonalPorRol: boolean;
  tipoControlMultiple: boolean;
  variosPorPersona: boolean;
  cantidadPorPersona: boolean;
  orden?: number;
  tipoTransportePorDefecto?: TipoTransporte;
}

/**
 * Edición: todo opcional, SIN número, código ni áreas (el servidor responde 400 si llegan). Solo
 * viaja lo que cambió. `activo: true` reactiva.
 */
export type ActualizarFormulario = Partial<
  Omit<CrearFormulario, "numero" | "codigo">
> & {
  activo?: boolean;
};

/**
 * Corrección de una zonal: solo el nombre —el código queda fijo tras crearse— y el estado.
 * `activo: true` es el camino de reactivación, igual que en los otros catálogos.
 */
export type ActualizarZonal = {
  nombre?: string;
  activo?: boolean;
};

/**
 * Corrección de un punto: nombre, zonal y estado. El formulario al que pertenece es
 * inmutable (2026-09-29), así que no viaja aquí.
 */
export type ActualizarPunto = {
  nombre?: string;
  zonalId?: number;
  activo?: boolean;
};

export type ActualizarTipoControl = {
  nombre?: string;
  activo?: boolean;
};

export type ActualizarInstitucion = {
  sigla?: string;
  nombre?: string;
  activo?: boolean;
};

/**
 * Respuesta de una baja lógica. RF-058 e INV-22.
 *
 * `usosHistoricos` es lo que convierte el aviso en una explicación: no dice «no se pudo
 * borrar», dice **cuántos operativos anteriores usan el valor** y por eso se conserva.
 */
export interface BajaCatalogo {
  id: number;
  activo: boolean;
  usosHistoricos: number;
  /** Redactado por el servidor. Se muestra tal cual. */
  mensaje: string;
}

/** Respuesta de `GET /ventanas/mi-estado`. RN-56. */
export interface EstadoVentana {
  rol: RolDepartamental;
  abierta: boolean;
  activo: boolean;
  zonaHoraria: string;
  horaApertura: string | null;
  horaCierre: string | null;
  diaApertura: number | null;
  diaCierre: number | null;
  /** Redactado para el funcionario: se muestra tal cual. Calculado de las horas reales. */
  mensaje: string;
  /**
   * El horario en UNA frase, calculado por el servidor de las horas reales (2026-10-06). Es lo
   * único que se muestra como horario; opcional para no romper respuestas anteriores.
   */
  horarioTexto?: string;
  /** Solo la DAF: «cuando cierra el registro de operativos» si abre justo entonces (RN-56). */
  motivoApertura?: string | null;
  /** El texto libre de «Ventanas y parámetros»: nota secundaria, NUNCA el horario. */
  notaAdministrador?: string | null;
  evaluadoEn: string;
}
