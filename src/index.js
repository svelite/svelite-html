import express from 'express'
import cookieParser from 'cookie-parser'
import { configMiddleware } from './middlewares/config.js'
import { routesMiddleware } from './middlewares/routes.js'
export { html, component } from './render/render.js'

// TODO: Add Build command to build project for vercel

export function createApp(configPath = './app.config.js') {

    const app = express()

    app.start = async (port) => {
        app.use(cookieParser())
        app.use(express.json())
        app.use(express.urlencoded({ extended: true }))

        // svelite
        app.use(configMiddleware(configPath))
        app.use(routesMiddleware())

        const {PORT = port} = process.env
        app.listen(PORT, () => console.log('server started on http://localhost:' + PORT))
    }

    return app
}
