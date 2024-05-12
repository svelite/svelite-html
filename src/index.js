import express from 'express'
import cookieParser from 'cookie-parser'
import { readFile } from 'fs/promises'
import { buildcss, loadPages } from './utils.js'
import { readdirSync } from 'fs'
export { html, component } from './render/render.js'

// TODO: Add Build command to build project for vercel

export function createApp({ middlewares, pages, routes, static: staticConfig, css }) {
    const app = express()

    app.start = async (port) => {
        // normalize config
        if (typeof middlewares === 'string') {
            middlewares = await import(middlewares).then(res => res.default)
        }

        if (typeof pages === 'string') {
            pages = await loadPages(pages, '/')
        }

        if (typeof routes === 'string') {
            routes = await import(routes).then(res => res.default)
        }

        if (css && css.tailwindcss !== false && !css.tailwindcss) {
            css.tailwindcss = {
                content: [/** TODO */]
            }
        }

        // middlewares
        app.use(cookieParser());
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        for (let middleware of middlewares) {
            app.use(middleware)
        }

        // pages
        for (let index in pages) {
            const page = pages[+index]

            app.get(page.slug, async (req, res) => {

                const props = {
                    baseUrl: new URL(req.protocol + '://' + req.headers.host + req.url).origin,
                    params: req.params,
                    query: req.query,
                    url: req.url,
                    cookies: req.cookies,
                }

                let html = ''
                for (let i in page.modules) {
                    const mod = page.modules[i]
                    html += mod.default(props)
                }

                if (!page.layout?.default) {
                    page.layout = {
                        default(props, slot) {
                            return slot
                        }
                    }
                }

                try {
                    const html = await page.layout.default(props, html)

                    res.writeHead(200, 'OK', { 'Content-Type': 'text/html' })
                    return res.end(html)
                } catch (err) {
                    if (err.message.startsWith('{"')) {
                        const response = JSON.parse(err.message)
                        if (typeof response === 'object') {
                            if (response.cookie) {
                                for (let key in response.cookie) {
                                    res.cookie(key, response.cookie[key], { httpOnly: true, maxAge: 60 * 60 * 24 * 1000 })
                                }
                            }
                            if (response.redirect) {
                                return res.redirect(302, response.redirect)
                            }
                        }
                    } else {
                        throw err
                    }
                }
                res.end(response)
            })

            app.post(page.slug, async (req, res) => {
                const methodName = Object.keys(req.query)[0]

                for (let i in page.modules) {
                    const method = page.modules[i][methodName]
                    console.log(page.modules[i])
                    if (!method) continue;
                    const response = await method(props)

                    if (response.cookie) {
                        for (let key in response.cookie) {
                            res.cookie(key, response.cookie[key], {
                                httpOnly: true,
                                maxAge: 60 * 60 * 24 * 1000
                            })
                        }
                    }

                    if (response.redirect) {
                        return res.redirect(302, response.redirect)
                    }
                }
            })
        }

        // routes
        function registerRoute(slug, route) {
            if (typeof route === 'function') {
                app.post(slug, async (req, res) => {
                    return route(req, res)
                })
            } else if (typeof route === 'object') {
                for (let key in route) {
                    registerRoute(slug + key + '/', route[key])
                }
            }
        }
        registerRoute('/', routes)

        // static
        if (staticConfig) {
            if (typeof staticConfig === 'object') {
                if (Array.isArray(staticConfig)) {
                    for (let key of staticConfig) {
                        app.use('/', express.static(path.resolve(key)))
                    }
                } else {
                    for (let key in staticConfig) {
                        app.use(path.join(key), express.static(path.resolve(staticConfig[key])))
                    }
                }
            } else {
                app.use('/', express.static(path.resolve(staticConfig)))
            }
        }

        // styles
        if (existsSync(css?.path)) {
            const files = readdirSync(css.path)

            for (let file of files) {
                app.get('/styles/' + file, async (req, res) => {
                    const content = await readFile(path.join(css.path, file))

                    console.log(css.tailwindcss)
                    const result = await buildcss(content, css.tailwindcss)

                    res.end(result)
                })
            }
        }

        const { PORT = port } = process.env
        app.listen(PORT, () => console.log('server started on http://localhost:' + PORT))
    }

    return app
}
