import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// @ts-expect-error Node middleware is shared with the production server.
import {hotStockApiPlugin} from './scripts/hot-stock-api.mjs'
// @ts-expect-error Node middleware is shared with the production server.
import {stockObservationApiPlugin} from './scripts/stock-observation-api.mjs'
// @ts-expect-error Node middleware is shared with the production server.
import {lotteryObservationApiPlugin} from './scripts/lottery-observation-api.mjs'
// @ts-expect-error Node middleware is shared with the production server.
import {localDataApiPlugin} from './scripts/local-data-api.mjs'
export default defineConfig({ plugins: [vue(), localDataApiPlugin(), hotStockApiPlugin(), stockObservationApiPlugin(), lotteryObservationApiPlugin()], base: './' })
