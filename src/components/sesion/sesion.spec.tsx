/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Identidad y acceso
 * Archivo: sesion.spec.tsx
 * Responsabilidad: Verificar las decisiones del ingreso con Auth central.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-18
 *
 * SE PRUEBAN DECISIONES, NO MAQUETADO. Las cuatro que importan y que, de romperse, no
 * darían un error visible sino un comportamiento raro:
 *
 *   1. Mientras la sesión se resuelve NO se decide nada. Sin esto, cada recarga
 *      expulsaría al portal a quien sí tenía sesión.
 *   2. Sin sesión se sale al portal, no a `/home`.
 *   3. Con sesión, el rol sigue decidiendo qué se puede ver.
 *   4. El código de Auth se canjea UNA sola vez, aunque el componente se monte dos
 *      veces, porque es de un solo uso.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RutaConSesion from "../common/RutaConSesion.tsx";
import RutaProtegida from "../common/RutaProtegida.tsx";
import LoginPage from "../../pages/LoginPage.tsx";
import AuthCallbackPage from "../../pages/AuthCallbackPage.tsx";
import { UserContext, type EstadoSesion } from "../../context/UserContext.tsx";
import { UserProvider } from "../../providers/UserProvider.tsx";
import { rolUser } from "../../config/env.ts";
import type { User } from "../../interfaces/User.ts";

vi.mock("../../services/sesion.service.ts", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  canjearCodigo: vi.fn(),
  obtenerSesion: vi.fn(),
  cerrarSesion: vi.fn(),
}));

import {
  canjearCodigo,
  obtenerSesion,
  urlDelPortal,
} from "../../services/sesion.service.ts";

const USUARIO: User = {
  userid: 0,
  usuFullName: "Analista de Transportes",
  usuEmail: "daf.transportes",
  rolCodes: [rolUser.rolDaf],
  rolName: "Analista de Transportes",
  token: "",
  actividades: [],
};

/** Envuelve el árbol con una sesión en el estado que la prueba necesita. */
const conSesion = (
  estado: EstadoSesion,
  user: User | null,
  hijos: React.ReactNode,
) => (
  <UserContext.Provider
    value={{ user, establecerSesion: vi.fn(), estado, cerrarSesion: vi.fn() }}
  >
    {hijos}
  </UserContext.Provider>
);

describe("Ingreso con Auth central", () => {
  const irAlPortal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // `window.location.replace` no existe en jsdom como función espiable.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, replace: irAlPortal, assign: vi.fn() },
    });
  });

  describe("la guarda de ruta", () => {
    it("mientras la sesión se resuelve no expulsa a nadie", () => {
      render(
        conSesion(
          "resolviendo",
          null,
          <MemoryRouter>
            <RutaProtegida rolesPermitidos={[rolUser.rolDaf]}>
              <p>contenido reservado</p>
            </RutaProtegida>
          </MemoryRouter>,
        ),
      );

      expect(irAlPortal).not.toHaveBeenCalled();
      expect(screen.queryByText("contenido reservado")).not.toBeInTheDocument();
    });

    it("sin sesión sale al portal institucional, no a otra ruta interna", () => {
      render(
        conSesion(
          "sinSesion",
          null,
          <MemoryRouter>
            <RutaProtegida rolesPermitidos={[rolUser.rolDaf]}>
              <p>contenido reservado</p>
            </RutaProtegida>
          </MemoryRouter>,
        ),
      );

      expect(irAlPortal).toHaveBeenCalledTimes(1);
      expect(String(irAlPortal.mock.calls[0][0])).toContain("/login");
    });

    it("con sesión, el rol sigue decidiendo qué se ve", () => {
      render(
        conSesion(
          "conSesion",
          USUARIO,
          <MemoryRouter initialEntries={["/reservada"]}>
            <Routes>
              <Route
                path="/reservada"
                element={
                  <RutaProtegida rolesPermitidos={[rolUser.rolDirector]}>
                    <p>solo la Dirección</p>
                  </RutaProtegida>
                }
              />
              <Route path="/home" element={<p>inicio</p>} />
            </Routes>
          </MemoryRouter>,
        ),
      );

      expect(screen.queryByText("solo la Dirección")).not.toBeInTheDocument();
      expect(screen.getByText("inicio")).toBeInTheDocument();
      // Un rol ajeno es un desvío interno, NO una expulsión de la aplicación.
      expect(irAlPortal).not.toHaveBeenCalled();
    });

    it("con sesión y rol correcto, deja pasar", () => {
      render(
        conSesion(
          "conSesion",
          USUARIO,
          <MemoryRouter>
            <RutaProtegida rolesPermitidos={[rolUser.rolDaf]}>
              <p>contenido reservado</p>
            </RutaProtegida>
          </MemoryRouter>,
        ),
      );

      expect(screen.getByText("contenido reservado")).toBeInTheDocument();
    });
  });

  describe("el regreso desde el portal", () => {
    const montar = (busqueda: string) =>
      render(
        conSesion(
          "sinSesion",
          null,
          <MemoryRouter initialEntries={[`/auth/callback${busqueda}`]}>
            <Routes>
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/home" element={<p>inicio</p>} />
            </Routes>
          </MemoryRouter>,
        ),
      );

    /**
     * EL CÓDIGO ES DE UN SOLO USO. Un segundo canje devuelve «caducó o ya fue
     * utilizado», así que reenviarlo convierte un ingreso bueno en un error.
     */
    it("canjea el código una sola vez aunque el componente se vuelva a pintar", async () => {
      vi.mocked(canjearCodigo).mockResolvedValue({
        username: "daf.transportes",
        displayName: "Analista de Transportes",
        rolCodes: [rolUser.rolDaf],
      });

      const { rerender } = montar("?code=abc123");
      rerender(
        conSesion(
          "sinSesion",
          null,
          <MemoryRouter initialEntries={["/auth/callback?code=abc123"]}>
            <Routes>
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/home" element={<p>inicio</p>} />
            </Routes>
          </MemoryRouter>,
        ),
      );

      await waitFor(() => expect(canjearCodigo).toHaveBeenCalled());
      expect(canjearCodigo).toHaveBeenCalledTimes(1);
      expect(canjearCodigo).toHaveBeenCalledWith("abc123");
    });

    it("sin código no llama a nadie y explica qué hacer", () => {
      montar("");

      expect(canjearCodigo).not.toHaveBeenCalled();
      expect(screen.getByText(/No se pudo iniciar sesión/)).toBeInTheDocument();
    });

    /** El mensaje del servidor se muestra tal cual: distingue casos que el funcionario resuelve distinto. */
    it("muestra el motivo que devuelve el servidor, sin reescribirlo", async () => {
      vi.mocked(canjearCodigo).mockRejectedValue(
        new Error(
          "Su usuario no está dado de alta en el Cuadro de Colores. Solicite el alta al administrador del módulo.",
        ),
      );

      montar("?code=abc123");

      expect(
        await screen.findByText(/no está dado de alta en el Cuadro de Colores/),
      ).toBeInTheDocument();
    });
  });
  /**
   * EL MARCO DE LA APLICACIÓN, que es lo que este archivo destapó.
   *
   * `RutaProtegida` cubría cada pantalla, pero el marco —barra lateral con el nombre de
   * las nueve, barra superior, menú de perfil— se pintaba antes y sin comprobar nada.
   * Quien llegara por URL sin sesión veía la estructura completa del módulo.
   *
   * En un sistema que existe porque el cuadro se filtraba, **la lista de lo que hay
   * también es información**.
   */
  describe("el marco de la aplicación", () => {
    it("no se pinta sin sesión: ni la barra lateral ni el menú", () => {
      render(
        conSesion(
          "sinSesion",
          null,
          <MemoryRouter>
            <RutaConSesion>
              <p>barra lateral con las nueve pantallas</p>
            </RutaConSesion>
          </MemoryRouter>,
        ),
      );

      expect(
        screen.queryByText("barra lateral con las nueve pantallas"),
      ).not.toBeInTheDocument();
      expect(irAlPortal).toHaveBeenCalledTimes(1);
    });

    it("mientras la sesión se resuelve tampoco lo pinta, pero no expulsa", () => {
      render(
        conSesion(
          "resolviendo",
          null,
          <MemoryRouter>
            <RutaConSesion>
              <p>barra lateral con las nueve pantallas</p>
            </RutaConSesion>
          </MemoryRouter>,
        ),
      );

      expect(
        screen.queryByText("barra lateral con las nueve pantallas"),
      ).not.toBeInTheDocument();
      expect(irAlPortal).not.toHaveBeenCalled();
    });

    it("con sesión lo pinta, sea cual sea el rol: el marco no es de nadie en concreto", () => {
      render(
        conSesion(
          "conSesion",
          USUARIO,
          <MemoryRouter>
            <RutaConSesion>
              <p>barra lateral con las nueve pantallas</p>
            </RutaConSesion>
          </MemoryRouter>,
        ),
      );

      expect(
        screen.getByText("barra lateral con las nueve pantallas"),
      ).toBeInTheDocument();
    });
  });

  /**
   * Abrir `/` con la sesión abierta mandaba al portal, y el portal devolvía aquí.
   * Un rebote que el usuario percibe como «la aplicación parpadea y no entra».
   */
  describe("la pantalla de ingreso", () => {
    it("con sesión activa entra a la aplicación en vez de rebotar al portal", () => {
      render(
        conSesion(
          "conSesion",
          USUARIO,
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/home" element={<p>inicio</p>} />
            </Routes>
          </MemoryRouter>,
        ),
      );

      expect(screen.getByText("inicio")).toBeInTheDocument();
      expect(irAlPortal).not.toHaveBeenCalled();
    });

    it("sin sesión ofrece el portal y no finge un formulario de ingreso", () => {
      render(
        conSesion(
          "sinSesion",
          null,
          <MemoryRouter>
            <LoginPage />
          </MemoryRouter>,
        ),
      );

      expect(
        screen.getByText(/El ingreso se realiza en el portal institucional/),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
    });
  });
  /**
   * El contrato compartido pide enviar `redirectUri` y `module` al portal, y el módulo
   * de Instrucción los envía. Está comprobado que el portal DESPLEGADO los ignora —el
   * regreso lo resuelve con el `path` del módulo en su base—, pero se mandan igual: si
   * algún día empieza a leerlos, esto ya funciona, y así los dos módulos hermanos hacen
   * lo mismo.
   */
  describe("la URL del portal", () => {
    it("lleva el callback de este origen y el código del módulo", () => {
      const url = new URL(urlDelPortal());

      expect(url.searchParams.get("redirectUri")).toBe(
        `${window.location.origin}/auth/callback`,
      );
      expect(url.searchParams.get("module")).toBe("TRANSPORTE");
    });

    it("apunta al portal configurado, no a una ruta interna", () => {
      expect(urlDelPortal()).toContain("/login");
    });
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════════
 * EL FALLO DE LOS DOS CLICS. Reportado el 2026-08-18: al elegir «Transporte - Operativos»
 * en el portal había que pulsarlo DOS veces para entrar.
 *
 * Causa: el contexto exponía el `setUser` crudo del `useState`, que movía `user` y dejaba
 * `estado` como estaba. Llegando del portal la aplicación arranca en `/auth/callback`
 * **sin cookie**, así que el arranque fijaba «sinSesion»; el canje ponía `user` y `estado`
 * se quedaba atrás; y `RutaConSesion`, que pregunta por `estado`, devolvía al portal. El
 * segundo clic entraba porque al arrancar ya existía la cookie del primero.
 *
 * Estas dos pruebas usan el `UserProvider` REAL y no el contexto simulado: el fallo no
 * estaba en ningún componente, sino en la coordinación entre el arranque y el canje.
 * ═══════════════════════════════════════════════════════════════════════════════════
 */
describe("al volver del portal con el código", () => {
  const PERFIL = {
    username: "ffnavarrete",
    displayName: "Fernando Navarrete",
    rolCodes: [rolUser.rolDaf],
  };

  const irAlPortal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, replace: irAlPortal, assign: vi.fn() },
    });
  });

  /** Monta la aplicación tal y como llega del portal: en el callback, con su código. */
  const llegarDelPortal = () =>
    render(
      <UserProvider>
        <MemoryRouter initialEntries={["/auth/callback?code=CODIGO-DEL-PORTAL"]}>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="/home"
              element={
                <RutaConSesion>
                  <p>marco de la aplicación</p>
                </RutaConSesion>
              }
            />
          </Routes>
        </MemoryRouter>
      </UserProvider>,
    );

  it("entra al primer intento, sin rebotar al portal", async () => {
    // Al llegar todavía no hay cookie: es exactamente lo que responde el servidor.
    vi.mocked(obtenerSesion).mockResolvedValue(null);
    vi.mocked(canjearCodigo).mockResolvedValue(PERFIL);

    llegarDelPortal();

    expect(await screen.findByText("marco de la aplicación")).toBeInTheDocument();
    expect(irAlPortal).not.toHaveBeenCalled();
    expect(canjearCodigo).toHaveBeenCalledTimes(1);
  });

  /**
   * La consulta del arranque y el canje salen a la vez, y el canje habla con Auth
   * central, así que suele tardar más. Si la respuesta «no hay sesión» del arranque llega
   * después, no debe borrar la sesión que el canje acaba de establecer: sería una carrera
   * que se gana o se pierde según la red, la peor clase de fallo.
   */
  it("la consulta tardía del arranque no borra la sesión recién canjeada", async () => {
    let responderArranque: (perfil: null) => void = () => {};
    vi.mocked(obtenerSesion).mockReturnValue(
      new Promise((resolver) => {
        responderArranque = resolver;
      }),
    );
    vi.mocked(canjearCodigo).mockResolvedValue(PERFIL);

    llegarDelPortal();

    expect(await screen.findByText("marco de la aplicación")).toBeInTheDocument();

    // Ahora sí responde el arranque, tarde y con «no hay sesión».
    responderArranque(null);

    await waitFor(() =>
      expect(screen.getByText("marco de la aplicación")).toBeInTheDocument(),
    );
    expect(irAlPortal).not.toHaveBeenCalled();
  });
});
