/**
 * App: Cuadro de Colores
 * Módulo: Compartido
 * Feature: Navegación
 * Archivo: InicioSegunRol.tsx
 * Responsabilidad: Resolver `/home` llevando a la primera pantalla que el perfil abre.
 * Desarrollador: Jose Sosa
 * Fecha: 2026-08-31
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * `/home` ERA UNA PANTALLA EN BLANCO, Y TRES CAMINOS LLEVABAN A ELLA.
 *
 * El árbol de rutas declaraba `/home` con las sedeciséis pantallas como hijas y **ninguna
 * ruta índice**. Entrar a `/home` a secas montaba el marco —barra lateral, cabecera,
 * avisos— con el `<Outlet />` vacío: la aplicación parecía rota, y el único contenido que
 * quedaba a la vista era el aviso de personal pendiente, que vive en el marco.
 *
 * Los tres caminos que acababan ahí:
 *
 *   1. `RutaProtegida` cuando el rol no abre la pantalla pedida.
 *   2. La ruta comodín `*` de cualquier dirección desconocida bajo `/home`.
 *   3. El propio `/home`, escrito a mano o guardado como marcador.
 *
 * El comentario del comodín decía que volvía «al inicio del área, no a una página en
 * blanco». La intención era ésa; el código no la cumplía porque ese inicio no existía.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NO HAY PANTALLA DE INICIO QUE MOSTRAR, y no se inventa una: el sistema no tiene tablero
 * ni resumen, y fabricarlo aquí sería decidir por el negocio qué ve cada perfil al entrar.
 * Se lleva a **la primera pantalla que ese perfil puede abrir**, que es la que el menú
 * lateral ya ofrece en primer lugar.
 *
 * EL ORDEN LO DA `pantallas`, que es el del cuadro. Para los tres roles departamentales la
 * primera es el registro de operativo; para la DAF, la asignación de transporte; para la
 * Dirección, la matriz. Cada uno aterriza en lo que hace todos los días.
 *
 * SIN COINCIDENCIA NO SE NAVEGA, SE EXPLICA. Redirigir a una pantalla que el perfil no
 * abre haría que `RutaProtegida` devolviera aquí, y aquí otra vez allá: un bucle infinito
 * de redirecciones que el navegador acaba cortando con un error incomprensible.
 */

import { Navigate } from "react-router-dom";

import { useUser } from "../../hooks/useUser.ts";
import { pantallas } from "../../config/routes.tsx";

const InicioSegunRol = () => {
  const { user } = useUser();

  const primera = pantallas.find((pantalla) =>
    pantalla.permisos.some((permiso) => user?.permisos.includes(permiso)),
  );

  if (primera) {
    return (
      <Navigate
        to={`/home/${primera.path}`}
        replace
      />
    );
  }

  /*
   * Le puede pasar a una cuenta a la que Auth todavía no le asignó rol de Transporte, o a
   * la que se lo retiraron. Decirlo con palabras y nombrar a quién acudir es lo único
   * útil que se puede hacer desde aquí (regla 6).
   */
  return (
    <div
      className="alert alert-info"
      role="status"
    >
      <span>
        Su perfil no tiene todavía ninguna pantalla asignada en el Cuadro de
        Colores. Solicite a la Administración que le asigne un rol del módulo.
      </span>
    </div>
  );
};

export default InicioSegunRol;
