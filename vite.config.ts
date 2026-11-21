import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins:[react()], base:'./', optimizeDeps:{include:['pptxgenjs']},build:{outDir:'bundle',emptyOutDir:true},test:{include:['tests/unit/**/*.test.ts']} });
