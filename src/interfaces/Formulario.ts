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

/** Área de personal admitida. RN-15. */
export type AreaPersonal =
  | "GENERAL"
  | "TECNICO"
  | "INSTRUCCION"
  | "OPERATIVOS"
  | "CCF";

/** Área que el formulario admite, y si el cupo es del rol compartido. RN-15. */
export interface AreaFormulario {
  area: AreaPersonal;
  esCompartida: boolean;
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
  /** Clave sustituta. La usan las altas de catálogo: `formularioIds`. */
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
}

export interface Zonal {
  id: number;
  codigo: string;
  nombre: string;
  esDmq?: boolean;
}

export interface PuntoEncuentro {
  id: number;
  nombre: string;
  zonalId: number;
  zonalNombre?: string;
}

export interface TipoControl {
  id: number;
  nombre: string;
}

export interface Institucion {
  id: number;
  sigla: string;
  nombre: string;
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
}

// ─────────────────── Administración de catálogos (P-08) ───────────────────

/**
 * Cuerpos de alta. `formularioIds` **no es opcional en la práctica**: omitirlo crea el
 * valor sin vincularlo a ningún formulario, y entonces no aparece en ninguna cascada.
 * P-08 envía siempre el formulario que se está administrando.
 */
export interface CrearPunto {
  nombre: string;
  zonalId: number;
  formularioIds: number[];
}

export interface CrearTipoControl {
  nombre: string;
  formularioIds: number[];
}

export interface CrearInstitucion {
  sigla: string;
  nombre: string;
  formularioIds: number[];
}

export type ActualizarPunto = {
  nombre?: string;
  zonalId?: number;
  activo?: boolean;
};

export type ActualizarTipoControl = { nombre?: string; activo?: boolean };

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
  /** Redactado para el funcionario: se muestra tal cual. */
  mensaje: string;
  evaluadoEn: string;
}
