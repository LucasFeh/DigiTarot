import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * No GitHub Pages o site fica em /<nome-do-repositorio>/, e sem esta base os
 * assets seriam buscados na raiz do domínio — resultando em tela branca. Em
 * desenvolvimento a base continua `/`, para o endereço local seguir simples.
 *
 * Renomeou o repositório? Troque aqui também.
 */
const REPO = '/DigiTarot/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPO : '/',
  plugins: [react(), tailwindcss()],
}))
