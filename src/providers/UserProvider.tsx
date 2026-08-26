/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Provider de identidad
 * Archivo: UserProvider.tsx
 * Responsabilidad: Resolver la sesión con Auth central y exponerla a la aplicación.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-04 · sesión real el 2026-08-18
 *
 * ANTES CONSTRUÍA EL USUARIO DESDE `config/usuariosPrueba.ts` y permitía cambiar de
 * perfil desde la barra superior. Eso desapareció con la identidad real: quién es cada
 * quien lo dice Auth central, y **qué rol tiene en el cuadro lo decide el servidor**
 * con la tabla `t_usuario`. El navegador ya no elige ni lo uno ni lo otro.
 *
 * NO GUARDA NADA EN `localStorage`. La sesión vive en una cookie `HttpOnly` que este
 * código no puede leer; al recargar se vuelve a preguntar al servidor. Persistir aquí
 * el perfil crearía una segunda fuente que podría contradecir a la cookie.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────
 * `user` Y `estado` SON UN MISMO HECHO, y solo se mueven juntos. Nada fuera de este
 * archivo escribe uno de los dos por separado; ese era el fallo de los dos clics que se
 * explica en `UserContext.tsx`.
 * ─────────────────────────────────────────────────────────────────────────────────────
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";

import type { User } from "../interfaces/User";
import { env } from "../config/env";
import { SESION_EXPIRADA } from "../api/httpClient";
import {
  cerrarSesion as cerrarSesionEnServidor,
  obtenerSesion,
  type PerfilSesion,
} from "../services/sesion.service";
import { UserContext, type EstadoSesion } from "../context/UserContext";

/**
 * Arma el usuario de la interfaz desde el perfil que devuelve el servidor.
 *
 * `token` queda vacío **y no es un descuido**: el token de sesión vive en la cookie y
 * el navegador no puede verlo. El campo sobrevive porque lo declara `User`, que es
 * anterior a esta integración.
 *
 * `actividades` también: en este módulo los permisos son por rol y se verifican en el
 * servidor. No existe un catálogo de acciones por usuario.
 */
const construirUser = (perfil: PerfilSesion): User => ({
  userid: 0,
  usuFullName: perfil.displayName,
  usuEmail: perfil.username,
  rolCodes: perfil.rolCodes,
  rolName: perfil.displayName,
  token: "",
  actividades: [],
});

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [estado, setEstado] = useState<EstadoSesion>("resolviendo");

  /**
   * Marca que el canje ya fijó la sesión, para que la consulta del arranque no la pise.
   *
   * LAS DOS COSAS OCURREN A LA VEZ al llegar del portal: el provider monta y pregunta
   * `GET /auth/session` mientras la página de callback canjea el código. En ese momento
   * todavía no hay cookie, así que la consulta del arranque responde «sin sesión»; si
   * llega **después** del canje —y llega, porque el canje habla con Auth central y tarda
   * más— borraría una sesión perfectamente válida. Es una carrera que se gana o se
   * pierde según la red, que es la peor clase de fallo.
   */
  const canjeada = useRef(false);

  // Arranque: se pregunta al servidor si la cookie corresponde a una sesión viva.
  useEffect(() => {
    let vigente = true;

    void obtenerSesion().then((perfil) => {
      if (!vigente || canjeada.current) return;
      setUser(perfil ? construirUser(perfil) : null);
      setEstado(perfil ? "conSesion" : "sinSesion");
    });

    // Evita escribir estado sobre un componente ya desmontado si la respuesta tarda.
    return () => {
      vigente = false;
    };
  }, []);

  /** Sesión recién canjeada. Único camino de entrada, y mueve los dos valores. */
  const establecerSesion = useCallback((perfil: PerfilSesion) => {
    canjeada.current = true;
    setUser(construirUser(perfil));
    setEstado("conSesion");
  }, []);

  /**
   * La sesión murió mientras el usuario trabajaba.
   *
   * Lo anuncia el interceptor de `httpClient` con un evento, porque un módulo no puede
   * navegar por su cuenta. Aquí se limpia el perfil y la guarda de ruta hace el resto:
   * no se redirige desde el escuchador para no cortar un flujo a la mitad.
   */
  useEffect(() => {
    const alExpirar = () => {
      canjeada.current = false;
      setUser(null);
      setEstado("sinSesion");
    };
    window.addEventListener(SESION_EXPIRADA, alExpirar);
    return () => window.removeEventListener(SESION_EXPIRADA, alExpirar);
  }, []);

  /**
   * Cierre de sesión.
   *
   * Se limpia el estado y se navega al portal **pase lo que pase** con la petición:
   * dejar al usuario dentro porque el servidor no respondió sería lo contrario de lo
   * que pidió. `replace` y no `assign` para que el botón de volver no reentre.
   */
  const cerrarSesion = useCallback(async () => {
    await cerrarSesionEnServidor();
    canjeada.current = false;
    setUser(null);
    setEstado("sinSesion");
    window.location.replace(env.logoutAuthUrl);
  }, []);

  return (
    <UserContext.Provider
      value={{ user, establecerSesion, estado, cerrarSesion }}
    >
      {children}
    </UserContext.Provider>
  );
};
