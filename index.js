import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { readFile } from 'fs/promises'
import { Liquid } from 'liquidjs';
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'

async function buildcss(config) {
    return postcss([
        tailwindcss({
            content: ['./**/*.liquid', './app.config.js']
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

    if(!config.middlewares) {
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

async function parseLiquid(filename) {
    const file = await readFile(filename, 'utf-8')
    const serverRegex = /<script server>([\s\S]*?)<\/script>/;

    const serverScriptMatch = file.match(serverRegex);
    const template = file.replace(serverRegex, '');

    const serverScript = serverScriptMatch ? serverScriptMatch[1].trim() : null;

    const load = eval('(' + serverScript + ')')

    return {
        template,
        load
    }
}

async function renderPage(page, loadParams, config) {
    // layout, slug, content | children
    
    let head = Promise.resolve(() => '');


    const engine = new Liquid({
        extname: '.liquid',
        partials: path.resolve(config.config.components),
    });

    if (config.config?.tailwindcss) {
        head = buildcss().then(css => `<style>${css}</style>`)
    }

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

    async function renderPageContent(content) {
        let result = content.map(async x => {
            console.log({ x })

            let filename = path.resolve(path.join(config.config.components, x.name + '.liquid'))

            const { template, load } = await parseLiquid(filename)

            if (!x.props) x.props = {}
            if (load) {
                loadParams.props = x.props
                loadParams.api = api

                const props = await load(loadParams)
                x.props = { ...x.props, ...props }
            }

            return engine.parseAndRender(template, x.props)
        })

        return (await Promise.all(result)).join('')
    }

    async function renderPageLayout(layout, content) {
        console.log('loading layout: ', layout)
        const { template, load } = await parseLiquid(path.resolve(path.join(config.config.layouts, layout.name + '.liquid')))
        if (!layout.props) layout.props = {}

        if (load) {
            loadParams.props = layout.props
            loadParams.api = api

            const props = await load(loadParams)
            layout.props = { ...layout.props, ...props }
        }

        layout.props.content = content
        const res = await engine.parseAndRender(template, layout.props)

        return res
    }
    
    let html = ''
    if (page.layouts) {
        html = await renderPageContent(page.content);
        for(let i=page.layouts.length; i>0; i--) {
            html = await renderPageLayout(page.layouts[i-1], html)
            console.log(page.layouts[i-1])
        }
    }

    return { html, head: await head }
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

    for(let page of pages) {
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

        const { head, html } = await renderPage(page, { url, params, query, cookies, baseUrl }, config)

        const response = template
            .replace('<!--body-->', html)
            .replace('<!--head-->', head  + `<script>${script}</script>`)

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

    for(let middleware of config.middlewares) {
        app.use(middleware)
    }

    app.use((req, res) => {
        res.end('404 Not found')
    })

    return app
    // const { PORT = port } = process.env
    // app.listen(PORT, () => console.log('listening on http://localhost:' + PORT))
}