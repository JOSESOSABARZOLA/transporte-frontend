import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
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
})
