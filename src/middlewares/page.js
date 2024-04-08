import createEngine from '../render/render.js'
import { Router } from 'express'

async function renderPage(page, loadParams, config) {
    const engine = createEngine({modules: config.modules})

    let html = ''

    for (let content of page.content) {
        const response = await engine.render(content, loadParams)

        html += response
    }

    return html
}

async function getLoadParams(req) {
    const baseUrl = new URL(req.protocol + '://' + req.headers.host + req.url).origin
    const params = req.params
    const query = req.query
    const url = req.url
    const cookies = req.cookies
    const ctx = typeof req.config.ctx === 'function' ? await req.config.ctx(req) : req.config.ctx

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
        ...ctx,
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
        const html = await renderPage(page, await getLoadParams(req), req.config)

        res.writeHead(200, 'OK', { 'Content-Type': 'text/html' })
        return res.end(html)
    }
}

export function pagesMiddleware(pages) {
    const router = Router()

    for (let page of pages) {
        router.get(page.slug, pageHandler(page))
    }

    return router
}