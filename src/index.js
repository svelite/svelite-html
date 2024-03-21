import { createServer as createViteServer } from 'vite'
import express, { Router } from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { readFile, readdir, stat } from 'fs/promises'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import createEngine from './render.js'

async function buildcss(config) {

    return postcss([
        tailwindcss(config)
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
    if (!config.config.views) {
        config.config.views = './views'
    }
    if (!config.config.static) {
        config.config.static = './public'
    }

    if (!config.middlewares) {
        config.middlewares = []
    }

    if (!config.ctx) {
        config.ctx = {}
    }
    return config
}


async function renderPage(page, loadParams, config) {

    const templates = {}
    let script = `const views = {};`

    async function initializeViews(folder, prefix) {
        const views = await readdir(folder)
        for (let view of views) {
            if (view.endsWith('.html')) {
                const content = await readFile(path.join(folder, view), 'utf-8')
                let name;

                if (prefix.split('.').at(-1) === view.replace('.html', '')) {
                    name = prefix
                } else {
                    name = [prefix, view.replace('.html', '')].filter(Boolean).join('.')
                }

                templates[name] = parse(content)
                script += `views["${name}"] = ($el) => {${templates[name].script ?? ``}};\n`
            } else if ((await stat(path.join(folder, view))).isDirectory) {
                initializeViews(path.join(folder, view), view)
            }
        }
    }

    await initializeViews(config.config.views, '')

    const engine = createEngine({ templates })


    let head = ''

    if (config.config?.tailwindcss) {
        const defaultTailwindConfig = {
            content: ['./**/*.html', './app.config.js']
        }
        const tailwindConfig = config.config.tailwindcss === true ? defaultTailwindConfig : config.config.tailwindcss
        head = await buildcss(tailwindConfig).then(css => `<style>${css}</style>`)
    }

    script += `
    function api(path) {
		return {
			async post(data, headers = {}) {

				const res = await fetch(window.location.origin + path, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...headers
					},
					body: JSON.stringify(data)
				}).then(res => res.json())
                return res
			}
		}
	}
    function initialize(element) {
        element.childNodes.forEach(child => {
            if (child.nodeType === Node.COMMENT_NODE) {
                const value = child.nodeValue.trim()
                if(value.startsWith('include:')) {
                    const name = value.split(':')[1]
                    components[name](child.nextElementSibling)
                }
            } else if(child.nodeType === Node.ELEMENT_NODE) {
                initialize(child)
            }
        })
    }

    document.addEventListener('DOMContentLoaded', () => {
        initialize(document.body.parentElement);
    })`

    let res = ''
    for (let content of page.content) {
        const response = await engine.render(content, loadParams)

        res += response.html
        head += response.head
    }

    const resp = { html: res, script, head }

    return resp
}

function getLoadParams(req) {
    const baseUrl = new URL(req.protocol + '://' + req.headers.host + req.url).origin
    const params = req.params
    const query = req.query
    const url = req.url
    const cookies = req.cookies

    function api(path) {
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

    return {
        baseUrl,
        params,
        query,
        url,
        cookies,
        api
    }
}

function pageHandler(page) {
    return async (req, res) => {
        const { head, html, script } = await renderPage(page, getLoadParams(req), req.config)

        const response = template
            .replace('<!--body-->', html)
            .replace('<!--script-->', `<script>${script}</script>`)
            .replace('<!--head-->', head)

        res.writeHead(200, 'OK', { 'Content-Type': 'text/html' })
        return res.end(response)
    }
}

function staticFilesMiddleware(staticConfig) {
    const router = Router()
    if (staticConfig) {
        if (typeof staticConfig === 'object') {

            if (Array.isArray(staticConfig)) {
                for (let path of staticConfig) {
                    router.get('/*', express.static(path))
                }
            } else {
                for (let key in staticConfig)
                    router.get(key + '*', express.static(staticConfig[key]))
            }
        } else {
            router.get('/*', express.static(staticConfig))
        }
    }

    return router
}

function apiRoutesMiddleware(routes) {
    const router = Router()

    function registerRoute(slug, route) {
        if (typeof route === 'function') {
            router.post(slug, async (req, res) => {
                return route(req, res)
            })
        } else if (typeof route === 'object') {
            for (let key in route) {
                registerRoute(slug + key + '/', route[key])
            }
        }
    }
    registerRoute('/', routes)
    return router
}

function pagesMiddleware(pages) {
    const router = Router()

    for (let page of pages) {
        router.get(page.slug, pageHandler(page))
    }

    return router
}

function routesMiddleware() {
    return async (req, res, next) => {

        const router = new Router()

        router.use(staticFilesMiddleware(req.config.config.static))

        router.use(apiRoutesMiddleware(req.config.routes))
        router.use(pagesMiddleware(req.config.pages))

        return router(req, res, next)
    }
}

export function createApp(config) {

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

        app.use(vite.middlewares)
        app.use(cookieParser())
        app.use(express.json())
        app.use(express.urlencoded({ extended: true }))

        app.use('/', async (req, res, next) => {
            ({ default: config } = await vite.ssrLoadModule('./app.config.js'))
            req.config = normalizeConfig(config)

            next()
        })

        app.use(routesMiddleware())

        const {PORT = port} = process.env
        app.listen(PORT, () => console.log('server started on localhost:' + PORT))
    }

    return app
}

function parse(template) {
    const serverRegex = /<script server>([\s\S]*?)<\/script>/;
    const clientRegex = /<script>([\s\S]*?)<\/script>/;

    const serverScriptMatch = template.match(serverRegex);
    const clientScriptMatch = template.match(clientRegex);

    const serverScript = serverScriptMatch ? serverScriptMatch[1].trim() : null;
    const clientScript = clientScriptMatch ? clientScriptMatch[1].trim() : null;

    const load = eval('(' + serverScript + ')')


    return {
        template: template.replace(serverRegex, '').replace(clientRegex, ''),
        load,
        script: clientScript
    }
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
    <!--script-->
</body>
</html>`
