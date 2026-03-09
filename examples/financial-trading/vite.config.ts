import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { gridstormResolve } from '../shared/gridstorm-resolve';

export default defineConfig({
  plugins: [gridstormResolve(), react()],
  base: '/financial-trading/',
});
