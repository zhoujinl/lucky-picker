import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// @ts-expect-error Node middleware is shared with the production server.
import {hotStockApiPlugin} from './scripts/hot-stock-api.mjs'
export default defineConfig({ plugins: [vue(), hotStockApiPlugin()], base: './' })
