/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Jornada del día (P-13)
 * Archivo: avisoPersonalPendiente.spec.tsx
 * Responsabilidad: Verificar a quién le llega el aviso, dónde, y cuándo calla.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-27
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTE AVISO OCUPA EL SITIO DE UNA NOTIFICACIÓN QUE NO EXISTE, Y ESO ES LO QUE SE PRUEBA.
 *
 * No hay tabla de notificaciones ni endpoint: el encargo —que el DMIT se entere de que
 * otro departamento registró un operativo que necesita a su gente— se resolvió poniendo
 * el recuento en el marco de la aplicación, de modo que se ve en todas las pantallas.
 *
 * Lo que hay que proteger son las tres decisiones que lo hacen aceptable, y ninguna se
 * ve mirando la pantalla en la que funciona:
 *
 *   1. NO SE PIDE LA JORNADA SI EL PERFIL NO PARTICIPA. `GET /jornada/:fecha` está
 *      reservado por rol; pedirla desde otro perfil daría un 403 en cada navegación.
 *   2. NO SE DUPLICA EN LA PANTALLA DE LA JORNADA, que tiene su propio recuento y sigue
 *      a la fecha que el usuario elija.
 *   3. UN FALLO NO SE CONVIERTE EN BANNER. Un 404 significa «el cuadro de mañana todavía
 *      no está abierto», que es lo más corriente del día, y sale en las nueve pantallas.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AvisoPersonalPendiente from "./AvisoPersonalPendiente.tsx";
import { JornadaService } from "../../services/jornada.service.ts";

vi.mock("../../services/jornada.service.ts", () => ({
  JornadaService: { consultarJornada: vi.fn() },
}));

const rolesActuales = { rolCodes: ["DMIT_INSTRUCTOR"] as string[] };

vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({ user: { rolCodes: rolesActuales.rolCodes } }),
}));

/** Una jornada con las filas que se le den, envueltas en una sola sección. */
const jornadaCon = (pendientes: string[][]) => ({
  cabecera: {
    ordenTrabajo: "AMC-2026-AGO-28",
    fecha: "2026-08-28",
    fechaNatural: "viernes 28 de agosto de 2026",
    nroSemana: 35,
    anioSemana: 2026,
    estado: "APROBADO" as const,
    totalOperativos: pendientes.length,
    totalAlertas: 0,
    formulariosSinCarga: 0,
  },
  secciones: [
    {
      numero: 4,
      codigo: "ECU",
      nombre: "Patrulla ECU Diurna",
      colorFondo: "#EEEEEE",
      colorAcento: "#000000",
      colorNombre: "gris",
      responsable: "DMIP Operativos + DMIT",
      acceso: "APORTA" as const,
      totalOperativos: pendientes.length,
      evidencia: null,
      filas: pendientes.map((areas, indice) => ({
        id: indice + 1,
        identificador: `OCECU-00${indice + 1}-28-AGO-2026`,
        esAdicional: false,
        origen: null,
        horario: "08H00 A 12H00",
        personal: [],
        zonales: [],
        puntoEncuentro: "",
        tipoControl: "",
        instituciones: [],
        conductor: null,
        placa: null,
        observaciones: [],
        estadoTransporte: "PENDIENTE" as const,
        esNocturno: false,
        areasPendientesDelRol: areas as never,
        alertas: [],
      })),
    },
  ],
});

const pintar = (ruta = "/cuadro/registro") =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <AvisoPersonalPendiente />
    </MemoryRouter>,
  );

beforeEach(() => {
  rolesActuales.rolCodes = ["DMIT_INSTRUCTOR"];
  vi.mocked(JornadaService.consultarJornada).mockReset();
});

describe("el aviso llega a quien puede actuar, esté en la pantalla que esté", () => {
  it("en una pantalla cualquiera dice cuántos esperan y de qué área", async () => {
    vi.mocked(JornadaService.consultarJornada).mockResolvedValue(
      jornadaCon([["INSTRUCCION"]]) as never,
    );

    pintar("/cuadro/registro");

    expect(await screen.findByRole("status")).toHaveTextContent(
      "1 operativo espera personal que a su departamento le toca asignar: Personal de Instrucción.",
    );
  });

  it("concuerda en plural cuando son varios", async () => {
    vi.mocked(JornadaService.consultarJornada).mockResolvedValue(
      jornadaCon([["INSTRUCCION"], ["INSTRUCCION"]]) as never,
    );

    // Desde el 2026-08-31 el aviso calla en Mis operativos, que es su destino. Se pinta
    // en cualquier otra pantalla, y aquí lo que se comprueba es la concordancia.
    pintar("/cuadro/registro");

    expect(await screen.findByRole("status")).toHaveTextContent(
      "2 operativos esperan",
    );
  });

  it("ofrece el camino para resolverlo, no solo la noticia", async () => {
    // Un aviso que no se puede resolver desde donde se lee obliga a buscar la pantalla.
    vi.mocked(JornadaService.consultarJornada).mockResolvedValue(
      jornadaCon([["INSTRUCCION"]]) as never,
    );

    pintar("/cuadro/registro");

    /*
     * ═══════════════════════════════════════════════════════════════════════════
     * SE COMPRUEBA EL `href` COMPLETO, CON `/home` DELANTE, Y ESO ES EL PUNTO.
     *
     * Esta prueba existía y afirmaba `/cuadro/mis-operativos`, sin prefijo. Pasaba en
     * verde y **el enlace estaba roto en la aplicación**: las dieciséis pantallas cuelgan
     * de `/home`, así que la ruta real es `/home/cuadro/mis-operativos`. Con la barra
     * inicial y sin prefijo, el enlace es absoluto, no casa con ninguna ruta y deja la
     * pantalla en blanco.
     *
     * No lo detectó porque el `MemoryRouter` de arriba declara sus propias rutas sin el
     * prefijo: la prueba verificaba su propio universo, no el de la aplicación. Afirmar
     * la cadena entera es lo que la ata a `config/routes.tsx`.
     * ═══════════════════════════════════════════════════════════════════════════
     */
    expect(
      await screen.findByRole("link", { name: "Ir a Mis operativos" }),
    ).toHaveAttribute("href", "/home/cuadro/mis-operativos");
  });
});

describe("y calla en los tres casos en que debe callar", () => {
  /**
   * ES LA QUE MÁS IMPORTA. `GET /jornada/:fecha` está reservado por rol: si este
   * componente preguntara para todo el mundo, cada navegación de un perfil ajeno dejaría
   * un 403 en la consola, y el ruido acabaría tapando un fallo de verdad.
   */
  it("un perfil que no participa no pregunta siquiera", async () => {
    rolesActuales.rolCodes = ["DMIP_OPERATIVOS"];

    pintar("/cuadro/registro");

    await waitFor(() => {
      expect(JornadaService.consultarJornada).not.toHaveBeenCalled();
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("en Mis operativos, que es su destino, no se repite", async () => {
    // Un aviso que sigue gritando en la pantalla a la que acaba de llevarte es ruido.
    // Hasta el 2026-08-31 la ruta silenciada era la Jornada del Día, porque era el
    // destino; la regla no cambió, cambió a dónde lleva el enlace.
    vi.mocked(JornadaService.consultarJornada).mockResolvedValue(
      jornadaCon([["INSTRUCCION"]]) as never,
    );

    // La ruta real lleva `/home` delante: es la que compara `useLocation().pathname`.
    pintar("/home/cuadro/mis-operativos");

    await waitFor(() => {
      expect(JornadaService.consultarJornada).toHaveBeenCalled();
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("si no hay nada pendiente no aparece", async () => {
    vi.mocked(JornadaService.consultarJornada).mockResolvedValue(
      jornadaCon([[]]) as never,
    );

    pintar("/cuadro/registro");

    await waitFor(() => {
      expect(JornadaService.consultarJornada).toHaveBeenCalled();
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  /**
   * UN 404 ES LO MÁS CORRIENTE DEL DÍA: nadie ha abierto todavía el cuadro de mañana.
   * Convertirlo en franja de error pondría un aviso rojo en las nueve pantallas hasta
   * que el administrador abriera el cuadro, y quien lo viera dejaría de leer los avisos.
   */
  it("si la jornada no se puede consultar, no anuncia su propio fallo", async () => {
    vi.mocked(JornadaService.consultarJornada).mockRejectedValue(
      new Error("404"),
    );

    pintar("/cuadro/registro");

    await waitFor(() => {
      expect(JornadaService.consultarJornada).toHaveBeenCalled();
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText(/error/i)).toBeNull();
  });
});
