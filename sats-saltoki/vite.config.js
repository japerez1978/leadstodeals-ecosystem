import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: ['..']
    }
  },
  resolve: {
    alias: {
      // Solo fijamos dependencias compartidas del monorepo.
      // React y ReactDOM se resuelven desde este workspace para respetar su versión propia.
      '@supabase/supabase-js': path.resolve(__dirname, '../node_modules/@supabase/supabase-js')
    }
  }
})
