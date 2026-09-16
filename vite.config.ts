import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { pluginAchatarCamadasCss } from './build/achatar-camadas-css.ts'

/*
 * Piso de compatibilidade: Chromium 94, que é o browser da TV Samsung 2023
 * (Tizen 7) onde o dashboard fica aberto. Sem `target` explícito o Vite usa o
 * default moderno e volta a emitir sintaxe que a TV não parseia.
 * Ver docs/plans/compat-navegador-antigo.md.
 */
const ALVO_LEGADO = 'chrome94'

export default defineConfig({
  plugins: [react(), tailwindcss(), pluginAchatarCamadasCss()],
  build: {
    target: ALVO_LEGADO,
    cssTarget: ALVO_LEGADO,
  },
})
