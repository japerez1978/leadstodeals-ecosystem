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
      // Forzamos la resolución desde la raíz del monorepositorio
      '@supabase/supabase-js': path.resolve(__dirname, '../node_modules/@supabase/supabase-js'),
      'react': path.resolve(__dirname, '../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../node_modules/react-dom')
    }
  }
})
