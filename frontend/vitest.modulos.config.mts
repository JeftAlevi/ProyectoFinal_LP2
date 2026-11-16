import {defineConfig} from 'vitest/config';

// Ejecución serial para equipos con pocos recursos y entornos Windows restringidos.
export default defineConfig({test: {pool: 'threads', maxWorkers: 1, fileParallelism: false}});
