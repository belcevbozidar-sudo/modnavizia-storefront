import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        product: resolve(__dirname, 'product.html'),
        collection: resolve(__dirname, 'collection.html'),
        contact: resolve(__dirname, 'contact.html'),
        policy: resolve(__dirname, 'policy.html')
      },
      external: [
        /^@theme\/.*/
      ]
    }
  }
})
