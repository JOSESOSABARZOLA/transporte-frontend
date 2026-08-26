/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Asignación de transporte
 * Archivo: flota.util.ts
 * Responsabilidad: Componer lo que la DAF puede ofrecer de la flota, y buscar en la bandeja.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-06
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LA DAF NO PUEDE LISTAR LA FLOTA, Y ESO CONDICIONA ESTA PANTALLA.
 *
 * `PATCH /transporte/operativos/:id` exige `vehiculoId`, pero el único endpoint que
 * enumera vehículos —`GET /administracion/vehiculos`— es del `ADMINISTRADOR`. Lo único que
 * este perfil llega a conocer es el **vehículo habitual de cada conductor**, que viaja en
 * `GET /transporte/conductores`.
 *
 * `vehiculosDeLosConductores` compone la lista con eso, sin repetir. Es lo que se puede
 * ofrecer sin inventar nada, y cubre el caso 3 del plan; pero **un vehículo que no sea
 * habitual de nadie no se puede asignar desde aquí**. Está registrado como PV-33: es una
 * pieza que falta del contrato, no una limitación de la interfaz.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { FiltrosFlota } from "../interfaces/Flota";
import type {
  Conductor,
  ConductorDisponible,
  OperativoPendiente,
  Vehiculo,
} from "../interfaces/Transporte";
import { normalizar } from "./texto.util";

export type VehiculoOfrecido = { id: number; placa: string };

/**
 * LA BANDEJA VACÍA NO SIGNIFICA QUE NO HAYA OPERATIVOS.
 *
 * `GET /transporte/pendientes/:fecha` descarta los operativos cuyo formulario tiene
 * `politicaVehiculo = NO_APLICA` —hoy los formularios 1, 3 y 9—: operan por propios
 * medios por definición (RN-41, RN-42), y pedirle a la DAF que los resuelva sería pedirle
 * que resuelva algo que no existe.
 *
 * Una jornada con operativos registrados puede, por tanto, dejar la bandeja vacía y estar
 * correcta. Decir solo «no hay pendientes» hacía indistinguibles dos situaciones muy
 * distintas: que nadie haya registrado nada todavía, y que lo registrado no necesite
 * vehículo. La segunda frase es la que las separa.
 */
export const SIN_PENDIENTES =
  "No hay asignaciones de transporte pendientes para hoy. La bandeja solo recoge los " +
  "operativos cuyo formulario habilita vehículo; los demás operan por propios medios y " +
  "no aparecen aquí aunque estén registrados.";

/** Los vehículos habituales de los conductores disponibles, sin repetir y por placa. */
export const vehiculosDeLosConductores = (
  conductores: ConductorDisponible[],
): VehiculoOfrecido[] => {
  const porId = new Map<number, VehiculoOfrecido>();

  for (const conductor of conductores) {
    if (conductor.vehiculoHabitual) {
      porId.set(conductor.vehiculoHabitual.id, conductor.vehiculoHabitual);
    }
  }

  return [...porId.values()].sort((uno, otro) =>
    uno.placa.localeCompare(otro.placa),
  );
};

/**
 * Busca en lo que la fila muestra.
 *
 * Mismo criterio que en P-02: se busca sobre el texto visible, no sobre campos internos.
 * Aquí la bandeja tiene una sola caja de búsqueda —así lo dibuja FASE5 §4.2— en lugar de
 * un filtro por columna, porque las columnas son pocas y la lista es corta por definición.
 */
export const coincideEnBandeja = (
  operativo: OperativoPendiente,
  buscado: string,
): boolean => {
  const texto = buscado.trim().toLowerCase();
  if (!texto) return true;

  return [
    operativo.identificador,
    operativo.formularioNombre,
    operativo.puntoEncuentro,
    operativo.horario,
    ...operativo.zonales,
  ]
    .join(" ")
    .toLowerCase()
    .includes(texto);
};

// ─────────────────── Administración de la flota (P-12) ───────────────────

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE FILTRA EN MEMORIA, Y NO POR COMODIDAD.
 *
 * `GET /administracion/conductores` y `GET /administracion/vehiculos` admiten un único
 * parámetro, `incluirInactivos`: no hay filtro de servidor por nombre, cédula ni placa.
 * Repartir los filtros entre servidor y memoria daría dos comportamientos distintos en la
 * misma barra —unos recargarían y otros no—, así que se pide el maestro entero una vez y
 * se filtra aquí. Es el mismo criterio, y el mismo motivo, que en `personal.util.ts`.
 *
 * La flota de la AMC son decenas de registros, no miles.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Conductores que satisfacen los filtros.
 *
 * La búsqueda mira **cédula, nombre, placa habitual y tipo de licencia**: son los cuatro
 * datos con los que alguien busca a un conductor, y el tercero importa porque quien llega
 * con una placa en la mano no siempre sabe de quién es.
 */
export const filtrarConductores = (
  conductores: Conductor[],
  filtros: FiltrosFlota,
): Conductor[] => {
  const buscado = normalizar(filtros.busqueda ?? "");

  return conductores.filter((conductor) => {
    if (filtros.estado === "activos" && !conductor.activo) return false;
    if (filtros.estado === "inactivos" && conductor.activo) return false;

    if (!buscado) return true;

    return normalizar(
      `${conductor.cedula} ${conductor.nombreCompleto} ` +
        `${conductor.vehiculoHabitual?.placa ?? ""} ${conductor.licenciaTipo ?? ""}`,
    ).includes(buscado);
  });
};

/** Vehículos que satisfacen los filtros. Se busca por placa y por descripción. */
export const filtrarVehiculos = (
  vehiculos: Vehiculo[],
  filtros: FiltrosFlota,
): Vehiculo[] => {
  const buscado = normalizar(filtros.busqueda ?? "");

  return vehiculos.filter((vehiculo) => {
    if (filtros.estado === "activos" && !vehiculo.activo) return false;
    if (filtros.estado === "inactivos" && vehiculo.activo) return false;

    if (!buscado) return true;

    return normalizar(
      `${vehiculo.placa} ${vehiculo.descripcion ?? ""}`,
    ).includes(buscado);
  });
};

/** `true` si hay algún filtro puesto. Distingue «sin datos» de «sin coincidencias». */
export const hayFiltrosDeFlota = (filtros: FiltrosFlota): boolean =>
  Boolean((filtros.busqueda ?? "").trim() || filtros.estado);
