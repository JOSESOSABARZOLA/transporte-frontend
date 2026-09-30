/**
 * App: Cuadro de Colores
 * Módulo: App Shell
 * Feature: Autorización de pantallas (RBAC)
 * Archivo: rolesDeAdministracion.spec.ts
 * Responsabilidad: Fijar que ruta y menú se ofrecen por los MISMOS permisos, y a quién.
 * Desarrollador: Jose Sosa · reescrita para RBAC el 2026-09-16
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ES LA GEMELA DE `roles-administracion.spec.ts` DEL SERVIDOR.
 *
 * Desde el RBAC, ruta (`routes.tsx`, campo `permisos`) y menú (`navigation.ts`, campo
 * `requiredPermissions`) se gatean por PERMISO, no por rol. Las dos listas tienen que decir
 * lo mismo: una pantalla ofrecida a quien el servidor rechazará con 403 es un rebote sin
 * explicación. Se comprueba con los permisos que cada rol tiene en la semilla (`pruebas/permisos`).
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, expect, it } from "vitest";

import type { RolDepartamental } from "./env.ts";
import { shellNavigationItems, type NavigationItem } from "./navigation.ts";
import { pantallas } from "./routes.tsx";
import { permisosDeRoles } from "../pruebas/permisos.ts";

/** El super-administrador general: abre todo lo de administración, nada más. */
const SUPER: RolDepartamental = "ADMINISTRADOR";
const permisosSuper = permisosDeRoles([SUPER]);

const esRutaAdmin = (path: string): boolean => path.startsWith("administracion/");

/** ¿Alguno de los permisos requeridos lo tiene el conjunto del usuario? (semántica OR). */
const abre = (requeridos: readonly string[], permisos: readonly string[]): boolean =>
  requeridos.some((permiso) => permisos.includes(permiso));

/** Recoge las rutas del menú (padres e hijas) que abre un conjunto de permisos. */
const rutasDeMenuQueAbre = (permisos: readonly string[]): string[] => {
  const rutas: string[] = [];
  const recorrer = (entradas: NavigationItem[]): void => {
    for (const entrada of entradas) {
      if (entrada.requiredPermissions && abre(entrada.requiredPermissions, permisos)) {
        rutas.push(entrada.path);
      }
      if (entrada.children) recorrer(entrada.children);
    }
  };
  recorrer(shellNavigationItems);
  return rutas;
};

/** El `requiredPermissions` que el menú declara para una ruta. */
const permisosDeMenu = (ruta: string): string[] => {
  let encontrado: string[] = [];
  const recorrer = (entradas: NavigationItem[]): void => {
    for (const entrada of entradas) {
      if (entrada.path === ruta) encontrado = [...(entrada.requiredPermissions ?? [])];
      if (entrada.children) recorrer(entrada.children);
    }
  };
  recorrer(shellNavigationItems);
  return encontrado;
};

/** Los `permisos` que la ruta declara en `routes.tsx`. */
const permisosDeRuta = (ruta: string): string[] => {
  const pantalla = pantallas.find((una) => una.path === ruta);
  return pantalla ? [...pantalla.permisos] : [];
};

describe("el super-administrador general", () => {
  it("abre TODAS las pantallas de administración", () => {
    const admin = pantallas.filter((pantalla) => esRutaAdmin(pantalla.path));
    expect(admin.length).toBeGreaterThan(4);

    const sinSuper = admin
      .filter((pantalla) => !abre(pantalla.permisos, permisosSuper))
      .map((pantalla) => pantalla.path);

    expect(sinSuper).toEqual([]);
  });

  it("no abre ninguna pantalla que no sea de administración", () => {
    const intrusas = pantallas
      .filter((pantalla) => !esRutaAdmin(pantalla.path))
      .filter((pantalla) => abre(pantalla.permisos, permisosSuper))
      .map((pantalla) => pantalla.path);

    expect(intrusas).toEqual([]);
  });

  it("en el menú aparece solo en administración —el grupo y sus hijas—", () => {
    const rutas = rutasDeMenuQueAbre(permisosSuper);
    const fuera = rutas.filter(
      (path) => path !== "administracion" && !esRutaAdmin(path),
    );

    expect(fuera).toEqual([]);
    expect(rutas).toContain("administracion/usuarios");
  });
});

/**
 * Ruta y menú de cada pantalla sensible declaran los MISMOS permisos, y son los esperados.
 * Si divergieran, quien ve la entrada y la abre recibe un 403.
 */
describe("ruta y menú declaran los mismos permisos", () => {
  const CASOS: { ruta: string; permisos: string[] }[] = [
    { ruta: "administracion/personal", permisos: ["personal:administrar"] },
    { ruta: "administracion/flota", permisos: ["flota:administrar"] },
    { ruta: "administracion/mantenimiento", permisos: ["flota:mantenimiento"] },
    {
      ruta: "administracion/ventanas",
      permisos: ["ventanas:administrar", "parametros:administrar"],
    },
  ];

  it.each(CASOS)("$ruta", ({ ruta, permisos }) => {
    expect(permisosDeRuta(ruta).sort()).toEqual([...permisos].sort());
    expect(permisosDeMenu(ruta).sort()).toEqual([...permisos].sort());
  });
});
