/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Registro por zonas del formulario 8
 * Archivo: rangoIdentificadores.util.ts
 * Responsabilidad: Escribir una lista de identificadores como rangos («IG-030 a IG-042»).
 * Fecha: 2026-10-28
 *
 * Espejo de `transporte-backend/src/modules/operativos/domain/rango-identificadores.ts`: se quita
 * la fecha del identificador (`IG-030-28-OCT-2026` → `IG-030`), se ordena por prefijo y número, y
 * cada racha consecutiva va como un rango. Un número retirado deja un hueco y parte la racha:
 * «IG-030 a IG-035, IG-037».
 */

const PATRON = /^([A-Z]+)-(\d+)/;

/** `IG-030-28-OCT-2026` → `IG-030`. Lo que no tiene la forma esperada queda igual. */
export function identificadorCorto(identificador: string): string {
  const coincidencia = PATRON.exec(identificador);
  return coincidencia ? `${coincidencia[1]}-${coincidencia[2]}` : identificador;
}

export function compactarIdentificadores(identificadores: readonly string[]): string {
  const sueltos: string[] = [];
  const validos: { prefijo: string; numero: number; texto: string }[] = [];
  for (const identificador of identificadores) {
    const coincidencia = PATRON.exec(identificador);
    if (coincidencia) {
      validos.push({
        prefijo: coincidencia[1],
        numero: Number(coincidencia[2]),
        texto: identificadorCorto(identificador),
      });
    } else {
      sueltos.push(identificador);
    }
  }
  validos.sort((a, b) => a.prefijo.localeCompare(b.prefijo) || a.numero - b.numero);

  const rangos: { prefijo: string; texto: string }[] = [];
  let inicio = validos[0];
  let fin = validos[0];
  const cerrar = () => {
    rangos.push({
      prefijo: inicio.prefijo,
      texto: inicio === fin ? inicio.texto : `${inicio.texto} a ${fin.texto}`,
    });
  };
  for (const actual of validos.slice(1)) {
    if (actual.prefijo === fin.prefijo && actual.numero === fin.numero + 1) {
      fin = actual;
      continue;
    }
    if (actual.prefijo === fin.prefijo && actual.numero === fin.numero) continue;
    cerrar();
    inicio = actual;
    fin = actual;
  }
  if (inicio) cerrar();
  return [unirRangos(rangos), ...sueltos].filter(Boolean).join(", ");
}

/**
 * Los huecos de un mismo prefijo van con coma («IG-030 a IG-035, IG-037»); los prefijos distintos
 * de un registro agrupado, con punto medio («IGECU-001 · ITECU-001», 2026-11-04).
 */
function unirRangos(rangos: readonly { prefijo: string; texto: string }[]): string {
  return rangos
    .map((rango, indice) =>
      indice === 0
        ? rango.texto
        : `${rango.prefijo === rangos[indice - 1].prefijo ? ", " : " · "}${rango.texto}`,
    )
    .join("");
}
