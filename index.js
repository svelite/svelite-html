import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { readFile, readdir } from 'fs/promises'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import createEngine from './render.js'

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

async function renderPage(page, loadParams, config) {

    const templates = {}
    const components = await readdir(config.config.components)
    let script = `const components = {};`

    for (let component of components) {
        const content = await readFile(path.join(config.config.components, component), 'utf-8')
        const name = component.replace('.html', '')
        templates[name] = parse(content)
        script += `components["${name}"] = ($el) => {${templates[name].script ?? ''}; ${name}($el)};\n`

    }

    const engine = createEngine({ templates })


    let head = Promise.resolve(() => '')

    if (config.config?.tailwindcss) {
        head = buildcss().then(css => `<style>${css}</style>`)
    }

    script += `
    function api(path) {
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
    function initialize(el) {
        const allElements = el.querySelectorAll('*');

        allElements.forEach(element => {
            element.childNodes.forEach(child => {
                if (child.nodeType === Node.COMMENT_NODE) {
                    const value = child.nodeValue.trim()
                    if(value.startsWith('include:')) {
                        child.parentNode.remove(child);
                        const name = value.split(':')[1]
                        components[name](child.nextElementSibling)
                    }
                }
            })
            if (element.nodeType === Node.ELEMENT_NODE) {
                initialize(element)
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initialize(document.body.parentElement);
    })`

    let res = ''
    for (let content of page.content) {
        res += await engine.render(content, loadParams)
    }

    const resp = { html: res, script, head: await head }
    console.log('returning: ', resp)

    return resp
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

const script = `
window.svelite = {
	
}

window.onMount = (cb) => {
    document.addEventListener('DOMContentLoaded', (ev) => {
        cb({api: svelite.api}) /** add more */
    })
}

window.$info = () => {
    return {el: '123', props: {todo: '123'}}
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


        const { head, html, script } = await renderPage(page, { url, params, query, cookies, baseUrl, api }, config)

        const response = template
            .replace('<!--body-->', html)
            .replace('<!--script-->', `<script>${script}</script>`)
            .replace('<!--head-->', head)

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

    const listen = (port) => {
        const { PORT = port } = process.env
        return app.listen(port, () => console.log('Listening on http://localhost:' + port))
    }

    app.start = listen;
    return app
}