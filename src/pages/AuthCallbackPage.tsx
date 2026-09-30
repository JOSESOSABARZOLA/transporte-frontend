/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Identidad y acceso
 * Archivo: AuthCallbackPage.tsx
 * Responsabilidad: Canjear el código con el que Auth central devuelve al usuario.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-18
 *
 * RUTA PÚBLICA `/auth/callback`. Es el único sitio de la aplicación al que se llega sin
 * sesión y que no es el portal: Auth central navega aquí con `?code=` después de que el
 * usuario se autentica.
 *
 * EL CANJE OCURRE UNA SOLA VEZ, y el guardián es `canjeado`, no el efecto. En modo
 * estricto React monta cada componente dos veces en desarrollo; sin esta bandera el
 * código —que es de un solo uso— se enviaría dos veces, el segundo intento fallaría con
 * «caducó o ya fue utilizado», y entrar en desarrollo sería imposible.
 *
 * LA AUSENCIA DE CÓDIGO SE RESUELVE AL PINTAR y no dentro del efecto. Es un hecho que
 * se conoce sin pedir nada a nadie: meterlo en el efecto obligaría a un estado que solo
 * repite lo que la URL ya dice.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Loading from "../components/common/Loading";
import { canjearCodigo } from "../services/sesion.service";
import { useUser } from "../hooks/useUser";
import { urlDelPortal } from "../services/sesion.service";

/** Aviso con el marco institucional, para los dos motivos por los que no se entra. */
const NoSePudo = ({ motivo }: { motivo: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-base-200 p-6">
    <div className="app-modules-panel app-shell-surface max-w-md rounded-md border border-base-300 bg-base-100 p-6">
      <h1 className="page-heading-title">
        No se pudo iniciar sesión
      </h1>
      <p className="page-heading-subtitle mt-2 text-sm">{motivo}</p>
      <a className="btn btn-primary btn-sm mt-4" href={urlDelPortal()}>
        Volver al portal institucional
      </a>
    </div>
  </div>
);

const AuthCallbackPage = () => {
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const { establecerSesion } = useUser();
  const canjeado = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const code = parametros.get("code");

  useEffect(() => {
    if (!code || canjeado.current) return;
    canjeado.current = true;

    void canjearCodigo(code)
      .then((perfil) => {
        // Fija perfil y estado de sesión de una vez. Antes se armaba el usuario aquí y
        // `estado` se quedaba en «sinSesion», de modo que /home rebotaba al portal y
        // había que pulsar el rol dos veces. Ver UserContext.tsx.
        establecerSesion(perfil);
        // `replace` retira el código de la barra de direcciones y del historial: un
        // código gastado en una URL que alguien pueda volver a visitar solo produce un
        // error confuso.
        navegar("/home", { replace: true });
      })
      .catch((fallo: unknown) => {
        // El mensaje del servidor se muestra tal cual: está redactado para el
        // funcionario y distingue «no está dado de alta» de «está desactivado».
        setError(
          fallo instanceof Error && fallo.message
            ? fallo.message
            : "No se pudo completar el ingreso.",
        );
      });
  }, [code, navegar, establecerSesion]);

  if (!code) {
    return (
      <NoSePudo motivo="El portal no entregó un código de ingreso. Vuelva a iniciar sesión desde el portal institucional." />
    );
  }

  if (error) return <NoSePudo motivo={error} />;

  return <Loading />;
};

export default AuthCallbackPage;
