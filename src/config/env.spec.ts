/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Configuración
 * Archivo: env.spec.ts
 * Responsabilidad: Que una variable declarada y vacía no se coma el valor por defecto.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-28
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ESTA PRUEBA NACE DE UN FALLO QUE SE ENCONTRÓ CONSTRUYENDO, NO LEYENDO.
 *
 * El `Dockerfile` declara `ARG VITE_AUTH_PORTAL_URL=` vacío, para que la dirección del
 * portal de Auth se pueda elegir al construir en lugar de quedar escrita en el fuente.
 * Pero `??` cae al respaldo **solo** con `null` o `undefined`, y una variable declarada
 * vacía llega como `""`. El resultado era `portalAuthUrl === ""` y la URL de ingreso
 * quedaba en `?redirectUri=…`, sin servidor al que ir.
 *
 * No fallaba ninguna prueba, ni el lint, ni la compilación: el paquete se construía
 * perfectamente y nadie podía entrar.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SE IMPORTA EL MÓDULO DE VERDAD, Y ESO NO ES UN DETALLE.
 *
 * La primera versión de esta prueba **reimplementaba** la función aquí y comprobaba la
 * copia. Pasaba con el defecto puesto: al restaurar el `??` en `env.ts`, las siete
 * seguían verdes. Una prueba que ejercita su propio duplicado no protege nada.
 *
 * Por eso aquí se usa `vi.stubEnv` sobre `import.meta.env` más `resetModules` y un
 * `import()` dinámico: `env` es una constante que se evalúa al importar el módulo, así
 * que cada caso necesita volver a evaluarla con otro entorno.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { afterEach, describe, expect, it, vi } from "vitest";

/** Un portal de ejemplo: en el repositorio no se escriben direcciones reales. */
const PORTAL = "https://auth.example/login";

/**
 * Vuelve a evaluar `config/env.ts` con las variables que se le den.
 *
 * `undefined` significa **no declarada**; la cadena vacía, declarada y vacía, que es
 * justamente lo que produce un `ARG` sin valor en el `Dockerfile`.
 */
const cargarEnv = async (variables: Record<string, string | undefined>) => {
  vi.resetModules();

  for (const [nombre, valor] of Object.entries(variables)) {
    if (valor === undefined) continue;
    vi.stubEnv(nombre, valor);
  }

  return (await import("./env.ts")).env;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/**
 * DESDE EL 2026-10-16 EL PORTAL NO TIENE DIRECCIÓN POR OMISIÓN (no se versionan IP). Lo que
 * impide un paquete sin portal es `vite build`, que se detiene; aquí se fija el contrato del
 * navegador: sin portal no se finge uno, y `hayPortal()` lo dice para no navegar a una URL rota.
 */
describe("una variable declarada y vacía no es un valor", () => {
  it("sin declarar, no hay portal y `hayPortal` lo dice", async () => {
    vi.resetModules();
    const modulo = await import("./env.ts");

    expect(modulo.env.portalAuthUrl).toBe("");
    expect(modulo.hayPortal()).toBe(false);
  });

  /**
   * ES LA QUE DISCRIMINA: con `??` en lugar de `oPorDefecto`, el espacio en blanco pasaría
   * por un portal y `hayPortal` mentiría.
   */
  it("declarada VACÍA o en blanco, tampoco hay portal", async () => {
    for (const vacia of ["", "   "]) {
      const env = await cargarEnv({ VITE_AUTH_PORTAL_URL: vacia });
      expect(env.portalAuthUrl).toBe("");
    }
  });

  it("con portal, `hayPortal` es verdadero", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_AUTH_PORTAL_URL", PORTAL);
    const modulo = await import("./env.ts");

    expect(modulo.hayPortal()).toBe(true);
  });

  it("y el cierre de sesión hereda del portal cuando solo él está vacío", async () => {
    const env = await cargarEnv({
      VITE_AUTH_LOGOUT_URL: "",
      VITE_AUTH_PORTAL_URL: PORTAL,
    });

    expect(env.logoutAuthUrl).toBe(PORTAL);
  });

  it("con las dos vacías, ninguna queda con basura; el módulo toma su código", async () => {
    const env = await cargarEnv({
      VITE_AUTH_PORTAL_URL: "",
      VITE_AUTH_LOGOUT_URL: "",
      VITE_AUTH_MODULE_CODE: "",
    });

    expect(env.portalAuthUrl).toBe("");
    expect(env.logoutAuthUrl).toBe("");
    expect(env.moduleCode).toBe("TRANSPORTE");
  });

  it("con valor propio manda el valor", async () => {
    const env = await cargarEnv({ VITE_AUTH_PORTAL_URL: PORTAL });

    expect(env.portalAuthUrl).toBe(PORTAL);
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Y `apiBaseUrl` ES LA EXCEPCIÓN, A PROPÓSITO.
 *
 * Ahí la cadena vacía **sí** es un valor: significa «pide a tu propio origen», que es
 * como funciona dentro de Docker, con el nginx de la imagen haciendo de proxy a
 * `/api/v1`. Coalescerla a `http://localhost:3003` mandaría las peticiones del navegador
 * de otra máquina a su propio equipo, donde no hay nada escuchando.
 *
 * Esta prueba existe para que quien vea la asimetría entre las dos no la «corrija».
 * ═══════════════════════════════════════════════════════════════════════════════
 */
describe("apiBaseUrl no se coalesce, y es deliberado", () => {
  it("la cadena vacía se conserva: es la configuración de la imagen de Docker", async () => {
    const env = await cargarEnv({ VITE_API_BASE_URL: "" });

    expect(env.apiBaseUrl).toBe("");
  });

  it("y sin declarar sí toma el respaldo, que es el de `npm run dev`", async () => {
    const env = await cargarEnv({});

    expect(env.apiBaseUrl).toBe("http://localhost:3003");
  });

  /**
   * El build del Gateway (`npm run build` en el servidor) puede no declararla: un paquete de
   * producción nunca debe mandar las peticiones al equipo del usuario.
   */
  it("en un build de producción sin declarar, pide al propio origen", async () => {
    vi.stubEnv("DEV", false);
    const env = await cargarEnv({});

    expect(env.apiBaseUrl).toBe("");
  });
});
