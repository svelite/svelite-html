import createEngine from '../render/render.js'
import { Router } from 'express'

async function renderPage(page, loadParams, config) {
    const engine = createEngine()

    let html = ''

    for (let content of page.content) {
        const response = await engine.render(content, loadParams)

        html += response
    }

    return html
}

async function getLoadParams(req, props = {}) {
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
        form: {},
        errors: {},
        ...props,
        ...ctx,
        baseUrl,
        params,
        query,
        url,
        cookies,
        api
    }
}

function pageHandler(page, props ={}) {
    return async (req, res) => {
        try {

        const html = await renderPage(page, await getLoadParams(req, props), req.config)

        
        
        res.writeHead(200, 'OK', { 'Content-Type': 'text/html' })
        return res.end(html)
    } catch(err) {
        const resp = JSON.parse(err.message)
        if(typeof resp === 'object') {
            if(resp.redirect) {
                return res.redirect(resp.redirect, 302)
            }
            
        }
    }

    }
}

function pageApiHandler(page) {
    return async (req, res) => {

        const methodName = Object.keys(req.query)[0]

        function findMethod(content) {
            if(Array.isArray(content)) {
                for(let item of content) {
                    if(item.module[methodName]) {
                        return item.module[methodName]
                    }
                    return findMethod(item.content)
                }
            } else {
                for(let key in content) {
                    return findMethod(content[key])   
                }
            }
            return null
        }

        const method = findMethod(page.content)
        
        const resp = await method(await getLoadParams(req, {body: req.body}))

        if(resp.cookie) {
            for(let key in resp.cookie) {
                res.cookie(key, resp.cookie[key], {httpOnly: true, maxAge: 60 * 60 * 24 * 1000})
            }
        }

        if(resp.redirect) {
            return res.redirect(resp.redirect, 302)
        }
        
        return pageHandler(page, resp)(req, res)

    }
}

export function pagesMiddleware(pages) {
    const router = Router()

    for (let page of pages) {
        router.get(page.slug, pageHandler(page))
        router.post(page.slug, pageApiHandler(page))
    }

    return router
}