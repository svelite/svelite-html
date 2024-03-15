import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { readFile, readdir } from 'fs/promises'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import createEngine, { render } from './render.js'

async function buildcss(config) {
    return postcss([
        tailwindcss({
            content: ['./**/*.html', './app.config.js']
        })
    ]).process(`@tailwind base;
@tailwind components;
@tailwind utilities;`).then(res => {
        return res.css
    })
}

function normalizeConfig(config) {
    if (!config.config) {
        config.config = {}
    }
    if (typeof config.config.tailwindcss === 'undefined') {
        config.config.tailwindcss = true
    }
    if (!config.config.components) {
        config.config.components = './components'
    }
    if (!config.config.layouts) {
        config.config.layouts = './layouts'
    }

    if (!config.middlewares) {
        config.middlewares = []
    }

    if (!config.ctx) {
        config.ctx = {}
    }
}

function ctxMiddleware(ctx) {
    return (req, res, next) => {
        for (let key in ctx) {
            req[key] = ctx[key]
        }
        return next()
    }
}

async function renderPage(page, loadParams, config) {
    const engine = await createEngine({ components: config.config.components })

    // async function renderComponent(component) {
    //     const {name, props, content} = component


    //     if (!component.props) component.props = {}



    //     let result = template



    //     let rendered = render(name, component.props, {...loadParams, api});

    //     for(let component of componentList) {
    //         if(rendered.indexOf('<' + component)) {
    //             const path = path.resolve(path.join(config.config.components, component + '.html'))
    //             const {template} = parse(path)


    //             const componentTemplate = render(template, {})
    //             rendered = rendered.slice(0, rendered.indexOf('<' + component)) + componentTemplate + rendered.slice(rendered.indexOf('</' + component))
    //         }
    //     }

    //     return rendered
    // }

    let head = Promise.resolve(() => '')

    if (config.config?.tailwindcss) {
        head = buildcss().then(css => `<style>${css}</style>`)
    }

    let res = ''
    for (let content of page.content) {
        res += await engine.render(content, loadParams)
    }

    return { html: res, head: await head }
}

const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--head-->
</head>
<body>
    <!--body-->

</body>
</html>`

const script = `
window.svelite = {
	api(path) {
		return {
			async post(data, headers = {}) {

				return fetch(window.location.origin + path, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...headers
					},
					body: JSON.stringify(data)
				}).then(res => res.json())
			}
		}
	}
}

window.onMount = (cb) => {
    document.addEventListener('DOMContentLoaded', (ev) => {
        cb({api: svelite.api}) /** add more */
    })
}
`

function pagesMiddleware(pages, config) {
    const router = express.Router()

    for (let page of pages) {
        console.log('register page', page.slug)
        registerPage(page, config, router)
    }

    return router
}


function registerPage(page, config, router) {
    router.get(page.slug, async (req, res) => {
        console.log('request page: ', req.url)

        const baseUrl = new URL(req.protocol + '://' + req.headers.host + req.url).origin
        const params = req.params
        const query = req.query
        const url = req.url
        const cookies = req.cookies

        function api(path) {
            const baseUrl = loadParams.baseUrl;

            return {
                async post(data, headers = {}) {
                    return fetch(baseUrl + path, {
                        method: 'POST', headers: {
                            'Content-Type': 'application/json',
                            ...headers
                        }, body: JSON.stringify(data)
                    }).then(res => res.json())
                }
            }
        }


        const { head, html } = await renderPage(page, { url, params, query, cookies, baseUrl, api }, config)

        const response = template
            .replace('<!--body-->', html)
            .replace('<!--head-->', head + `<script>${script}</script>`)

        res.writeHead(200, 'OK', { 'Content-Type': 'text/html' })
        return res.end(response)
    })
}

function routesMiddleware(routes) {
    return async (req, res, next) => {
        console.log(req.url)
        const slugs = req.url.split('?')[0].split('/').slice(1)


        if (req.method === 'POST') {
            // find route
            const route = slugs.reduce((prev, curr) => {
                if (curr === '') return prev['index']
                return prev[curr]
            }, routes)

            if (typeof route === 'function')
                return route(req, res)
        }

        return next()
    }
}

export function createApp(config) {
    normalizeConfig(config)

    const app = express()
    app.use(cookieParser())
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    app.use(ctxMiddleware(config.ctx))

    app.use(pagesMiddleware(config.pages, config, app))

    app.use(routesMiddleware(config.routes))

    for (let middleware of config.middlewares) {
        app.use(middleware)
    }

    app.use((req, res) => {
        res.end('404 Not found')
    })

    return app
    // const { PORT = port } = process.env
    // app.listen(PORT, () => console.log('listening on http://localhost:' + PORT))
}