/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Identidad y acceso
 * Archivo: LoginPage.tsx
 * Responsabilidad: Enviar al portal institucional a quien llega sin sesión.
 * Desarrollador: Johan Freire · reescrita por Jose Sosa
 * Fecha: 2026-03-27 · 2026-08-18
 *
 * YA NO ES UN FORMULARIO DE INGRESO, y no puede serlo: las credenciales se comprueban
 * en Auth central. `INTEGRACION_AUTH_CENTRAL_FRONTEND.md` lo prohíbe expresamente —«no
 * crear un formulario de login local cuando Auth central gestiona el acceso»— y el
 * motivo es que un segundo sitio donde escribir la contraseña es un segundo sitio del
 * que puede escaparse.
 *
 * SE CONSERVA LA PANTALLA con su marco institucional, porque alguien llegará a `/` por
 * marcador o por costumbre. Reenvía sola y ofrece el enlace por si el reenvío no ocurre.
 *
 * QUIEN YA TIENE SESIÓN NO VA AL PORTAL, va a la aplicación. Sin esta comprobación,
 * abrir `/` con la sesión abierta producía un rebote: aquí al portal, y el portal de
 * vuelta aquí.
 */

import { useEffect } from "react";
import { Navigate } from "react-router-dom";

import Loading from "../components/common/Loading";
import { useUser } from "../hooks/useUser";
import { urlDelPortal } from "../services/sesion.service";

/** Margen antes de reenviar, para que el aviso llegue a leerse. */
const ESPERA_MS = 1200;

const LoginPage = () => {
  const { estado } = useUser();
  const debeReenviar = estado === "sinSesion";

  useEffect(() => {
    if (!debeReenviar) return;
    const temporizador = window.setTimeout(
      () => window.location.replace(urlDelPortal()),
      ESPERA_MS,
    );
    return () => window.clearTimeout(temporizador);
  }, [debeReenviar]);

  if (estado === "resolviendo") return <Loading />;
  if (estado === "conSesion") return <Navigate to="/home" replace />;

  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <p className="page-heading-kicker font-semibold uppercase text-primary-content">
        Cuadro de Colores Operativo
      </p>
      <h1 className="page-heading-title text-primary-content">
        El ingreso se realiza en el portal institucional
      </h1>
      <p className="text-sm text-primary-content/80">
        Le estamos llevando allí. Si no ocurre en unos segundos, use el enlace.
      </p>
      <a className="btn btn-accent btn-sm" href={urlDelPortal()}>
        Ir al portal institucional
      </a>
    </div>
  );
};

export default LoginPage;
