import { createServer as createViteServer, build as viteBuild } from 'vite'
import path from 'path'
import express from 'express'
import cookieParser from 'cookie-parser'
import { configMiddleware } from './middlewares/config.js'
import { routesMiddleware } from './middlewares/routes.js'

// export function build(configPath = './app.config.js') {
//     console.log('build app')
    
//     viteBuild({
//         css: false,
//         build: {
//             outDir: './dist', // Output directory for the built files
//             emptyOutDir: true, // Clear the output directory before building
//             target: 'node', // Specify the target environment (Node.js)
//             lib: {
//                 entry: path.resolve(configPath), // Entry point of your Node.js app
//                 formats: ['cjs'], // Output format (CommonJS)
//             },
//             rollupOptions: {
//                 input: path.resolve(configPath), // Rollup input file
//                 output: {
//                     entryFileNames: '[name].js', // Output file name pattern
//                     chunkFileNames: 'chunks/[name].js', // Output chunk file name pattern
//                     format: 'cjs', // Output format (CommonJS)
//                 },
//             },
//         }
//     }).catch(err => {
//         console.error(err);
//         process.exit(1);
//     });
// }

export function createApp(configPath = './app.config.js') {

    const app = express()

    app.start = async (port) => {
        const vite = await createViteServer({
            appType: 'custom',
            server: {
                middlewareMode: true,
                fs: {
                    allow: [],
                }
            },
            publicDir: false
        })

        // default
        app.use(vite.middlewares)
        app.use(cookieParser())
        app.use(express.json())
        app.use(express.urlencoded({ extended: true }))

        // svelite
        app.use(configMiddleware(vite, configPath))
        app.use(routesMiddleware())

        const {PORT = port} = process.env
        app.listen(PORT, () => console.log('server started on localhost:' + PORT))
    }

    return app
}
