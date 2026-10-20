import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

/**
 * SIN PORTAL DE AUTH NO HAY PAQUETE (2026-10-16). `src/config/env.ts` ya no trae una
 * direccion del portal por omision -era la IP del servidor de Auth, y en un repositorio
 * visible no se versionan IP-. Un paquete sin ella mandaria a todos a `?redirectUri=...`,
 * el fallo del 2026-08-28, que no rompe ni la compilacion ni las pruebas. Por eso se
 * detiene AQUI, al construir, y no en el navegador de cada usuario.
 *
 * `loadEnv` lee los `.env*` del modo y tambien las variables del proceso (los `ARG` del
 * Dockerfile, `-e` de `docker run`), que mandan sobre los archivos.
 */
const exigirPortal = (mode: string): void => {
  const portal = (loadEnv(mode, process.cwd(), 'VITE_').VITE_AUTH_PORTAL_URL ?? '').trim()
  if (portal === '') {
    throw new Error(
      'Falta VITE_AUTH_PORTAL_URL: la direccion del portal de Auth central (p. ej. ' +
        'https://<host-del-portal>/login). Definala en el .env del modo o como argumento de ' +
        'construccion; sin ella el paquete no podria iniciar sesion.',
    )
  }
  try {
    new URL(portal)
  } catch {
    throw new Error(`VITE_AUTH_PORTAL_URL no es una URL absoluta: «${portal}».`)
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') exigirPortal(mode)

  return {
    plugins: [
      react(),
      tailwindcss(),],
    server: {
      // 5180, y no un puerto de la banda 5173-5179: ahi viven los otros frontales de SIGOC
      // (Resolucion 5173, Instruccion 5175, Admin Core 5176) y Auth exige que la ruta de
      // cada modulo sea unica dentro del subsistema 11. Con 5176 el registro respondia 409.
      port: 5180,
      // SIN ESTO VITE SE MUEVE SOLO. Si el puerto esta ocupado busca el siguiente libre y
      // sigue arrancando, sin fallar. Ya paso: el contenedor retenia el 5176, el servidor
      // salto al 5179, y durante dos dias se estuvo probando una version antigua creyendo
      // que era la recien construida. Preferimos que reviente a que mienta.
      strictPort: true,
      host: true,
    },
  }
})
