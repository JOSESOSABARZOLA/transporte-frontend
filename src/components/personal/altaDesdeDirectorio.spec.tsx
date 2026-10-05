/**
 * App: Cuadro de Colores
 * Módulo: Cuadro de Colores
 * Feature: Personal y disponibilidad
 * Archivo: altaDesdeDirectorio.spec.tsx
 * Responsabilidad: Fijar el recorrido del alta, que ahora empieza en el directorio.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-24
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LO QUE SE PRUEBA ES EL RECORRIDO, NO CADA VENTANA POR SEPARADO.
 *
 * Las dos ventanas ya tienen sus pruebas en `personal.spec.tsx`. Lo que no tenía ninguna
 * es **el paso de una a otra**, que es justo lo que este cambio introduce y lo único que
 * puede romperse sin que ningún componente falle: que «Nuevo funcionario» abra el
 * directorio y no la ficha en blanco, que elegir a alguien traiga sus datos, y que
 * cancelar devuelva al directorio en lugar de al maestro.
 *
 * Y que **nunca coexistan las dos**: `MarcoModal` atrapa el foco y bloquea el
 * desplazamiento de la página; dos a la vez se pelearían por los dos.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ESTAS PRUEBAS SON DEL ADMINISTRADOR, y desde el 2026-08-27 hay que decirlo.
 *
 * P-07 la comparten dos perfiles: el administrador la usa entera y los tres roles
 * departamentales solo consultan y anotan ausencias. Todo lo que este archivo comprueba
 * —«Nuevo funcionario», la ficha, «Crear Funcionario Operativo»— es del primero.
 */
vi.mock("../../hooks/useUser.ts", () => ({
  useUser: () => ({
    user: { rolCodes: ["ADMINISTRADOR_DMIP"], usuFullName: "Administrador" },
  }),
}));

vi.mock("../../services/personal.service.ts", () => ({
  PersonalService: {
    listar: vi.fn(),
    /*
      DESDE EL 2026-09-02 LA PANTALLA PIDE TAMBIÉN LAS ÁREAS QUE SE ALCANZAN, y de ahí sale
      `puedeAdministrar`: sin este simulacro la promesa conjunta se rompe, el botón «Nuevo
      funcionario» no se pinta y las siete pruebas de este archivo caen sin decir por qué.
    */
    areasQueGestiona: vi.fn().mockResolvedValue(["GENERAL"]),
    consultarDirectorio: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    desactivar: vi.fn(),
    listarAusencias: vi.fn(),
    registrarAusencia: vi.fn(),
    retirarAusencia: vi.fn(),
  },
}));

// Desde el 2026-09-21 la página también pide las zonales (para el campo Zonal de la ficha DMIP).
// Sin este simulacro la promesa conjunta de `cargar` se rompe y el maestro no se pinta.
vi.mock("../../services/catalogoCuadro.service.ts", () => ({
  CatalogoCuadroService: { listarZonales: vi.fn().mockResolvedValue([]) },
}));

import AdminPersonalPage from "../../pages/AdminPersonalPage.tsx";
import { PersonalService } from "../../services/personal.service.ts";
import type { FilaDirectorio } from "../../interfaces/DirectorioAuth.ts";

const EN_AUTH: FilaDirectorio = {
  authId: 501,
  cedula: "1712345678",
  nombre: "PEREZ LOPEZ JUAN CARLOS",
  usuario: "jcperez",
  correo: "jcperez@amc.gob.ec",
  dependencia: "DMIP",
  roles: ["(Cuadro de Colores) Administrador"],
  inspector: null,
  ficha: null,
  cuenta: null,
};

const listar = vi.mocked(PersonalService.listar);
const consultarDirectorio = vi.mocked(PersonalService.consultarDirectorio);

/** Monta la pantalla con el maestro ya resuelto, para no probar el arranque. */
const abrirPantalla = async () => {
  render(<AdminPersonalPage />);
  await waitFor(() => expect(listar).toHaveBeenCalled());
};

const pulsarNuevoFuncionario = async () =>
  userEvent.click(screen.getByRole("button", { name: "Nuevo funcionario" }));

beforeEach(() => {
  vi.clearAllMocks();
  listar.mockResolvedValue([]);
  consultarDirectorio.mockResolvedValue({
    disponible: true,
    motivo: null,
    personas: [EN_AUTH],
  });
});

describe("el alta empieza en el directorio de Auth", () => {
  it("la pantalla ya no ofrece cambiar a una vista de directorio", async () => {
    await abrirPantalla();

    // La pestaña se retiró el 2026-08-24: había un `join` con «Maestro» y
    // «Directorio de Auth».
    expect(screen.queryByRole("button", { name: "Directorio de Auth" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Maestro" })).toBeNull();
  });

  it("no se consulta a Auth al entrar: solo al abrir la ventana", async () => {
    await abrirPantalla();

    // Quien entra a corregir un teléfono no paga la ida a Auth.
    expect(consultarDirectorio).not.toHaveBeenCalled();

    await pulsarNuevoFuncionario();

    await waitFor(() => expect(consultarDirectorio).toHaveBeenCalledTimes(1));
  });

  it("«Nuevo funcionario» abre el directorio, no la ficha en blanco", async () => {
    await abrirPantalla();
    await pulsarNuevoFuncionario();

    expect(
      await screen.findByText("PEREZ LOPEZ JUAN CARLOS"),
    ).toBeInTheDocument();
    // Si abriera la ficha, este campo estaría a la vista.
    expect(screen.queryByLabelText(/Tipo de contrato/)).toBeNull();
  });

  it("elegir a alguien y «Continuar» cierra el directorio y abre su ficha con lo que Auth sabe", async () => {
    await abrirPantalla();
    await pulsarNuevoFuncionario();

    // En el cajón se ELIGE la fila y luego se «Continúa» (ya no hay «Crear ficha» por fila).
    await userEvent.click(
      await screen.findByRole("button", { name: /PEREZ LOPEZ JUAN CARLOS/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    // La cédula (solo lectura, en la tarjeta) y el nombre partido (editable) llegan al paso 2.
    expect(screen.getByText("1712345678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("PEREZ LOPEZ")).toBeInTheDocument();
    expect(screen.getByDisplayValue("JUAN CARLOS")).toBeInTheDocument();

    // Ya está en el paso 2: no hay «Continuar» (eso es del paso 1).
    expect(
      screen.queryByRole("button", { name: "Continuar" }),
    ).toBeNull();
  });

  it("«← Atrás» devuelve al directorio a elegir otra persona, no al maestro", async () => {
    await abrirPantalla();
    await pulsarNuevoFuncionario();
    await userEvent.click(
      await screen.findByRole("button", { name: /PEREZ LOPEZ JUAN CARLOS/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    // Quien se equivocó de persona quiere elegir otra, no empezar de cero: «← Atrás» al directorio.
    await userEvent.click(screen.getByRole("button", { name: "← Atrás" }));

    expect(
      await screen.findByText("PEREZ LOPEZ JUAN CARLOS"),
    ).toBeInTheDocument();
  });

  /**
   * `CLAUDE.md` §7: «el maestro sigue administrándose igual. No acople una a la otra».
   * Aquí es donde esa regla se cumple o se rompe.
   */
  it("«Registro manual» abre la ficha en blanco, sin nada de Auth", async () => {
    await abrirPantalla();
    await pulsarNuevoFuncionario();

    // Con resultados a la vista, la salida manual es la del pie del cajón (una sola).
    await userEvent.click(
      await screen.findByRole("button", { name: "¿No aparece? Registro manual" }),
    );

    expect(screen.getByLabelText(/Cédula/)).toHaveValue("");
    expect(screen.queryByDisplayValue("PEREZ LOPEZ")).toBeNull();
  });

  it("con Auth caído, «Nuevo funcionario» sigue llevando a algún sitio", async () => {
    consultarDirectorio.mockResolvedValue({
      disponible: false,
      motivo: "Auth central no respondió. Vuelva a intentarlo en unos minutos.",
      personas: [],
    });

    await abrirPantalla();
    await pulsarNuevoFuncionario();

    expect(
      await screen.findByText(/Auth central no respondió/),
    ).toBeInTheDocument();
    // Con Auth caído la salida manual sigue disponible (pie del cajón y el estado del paso 1).
    expect(
      screen.getAllByRole("button", { name: /Registro manual/ })[0],
    ).toBeEnabled();
  });

  it("la segunda vez no se vuelve a consultar a Auth: se conserva lo traído", async () => {
    await abrirPantalla();

    await pulsarNuevoFuncionario();
    await waitFor(() => expect(consultarDirectorio).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await pulsarNuevoFuncionario();

    // Abrir la ventana no cuesta otra ida a Auth. «Actualizar» es lo que vuelve a pedir.
    expect(consultarDirectorio).toHaveBeenCalledTimes(1);

    await userEvent.click(
      screen.getByRole("button", { name: "Actualizar el directorio" }),
    );
    await waitFor(() => expect(consultarDirectorio).toHaveBeenCalledTimes(2));
  });
});
