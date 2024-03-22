import path from 'path'

import { readFile, readdir, stat } from 'fs/promises'
import createEngine from '../render/render.js'
import { Router } from 'express'
import { buildcss, parseTemplate } from '../utils.js'



function getScript(templates) {
    let script = `const views = {};`

    for (let view of Object.keys(templates)) {
        script += `views["${view}"] = ($el) => {${templates[view].script ?? ``}};\n`
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
                    views[name](child.nextElementSibling)
                }
            } else if(child.nodeType === Node.ELEMENT_NODE) {
                initialize(child)
            }
        })
    }

    document.addEventListener('DOMContentLoaded', () => {
        initialize(document.body.parentElement);
    })`

    return script
}

async function initializeViews(folder, prefix, templates = {}) {
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

            templates[name] = parseTemplate(content)
        } else if ((await stat(path.resolve(path.join(folder, view)))).isDirectory) {
            templates = {...templates, ...(await initializeViews(path.resolve(path.join(folder, view)), view, templates))}
        }
    }
    return templates
}

async function renderPage(page, loadParams, config) {

    const templates = await initializeViews(path.resolve(config.config.views), '', {})

    const engine = createEngine({ templates })

    let head = ''
    let html = ''


    if (config.config?.tailwindcss) {
        let tailwindConfig = {};

        if (config.config.tailwindcss === true) {
            tailwindConfig = {
                content: [config.config.views + '/**/*.html']
            }
        } else {
            tailwindConfig = config.config.tailwindcss
        }

        const css = await buildcss(tailwindConfig)

        head += `<style>${css}</style>`
    }

    for (let content of page.content) {
        const response = await engine.render(content, loadParams)

        html += response.html
        head += response.head
    }

    const script = getScript(templates)

    return {
        html,
        script,
        head
    }
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

        const response = template
            .replace('<!--body-->', html)
            .replace('<!--script-->', `<script>${script}</script>`)
            .replace('<!--head-->', head)

        res.writeHead(200, 'OK', { 'Content-Type': 'text/html' })
        return res.end(response)
    }
}

export function pagesMiddleware(pages) {
    const router = Router()

    for (let page of pages) {
        router.get(page.slug, pageHandler(page))
    }

    return router
}