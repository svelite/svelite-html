import { Router } from "express"

export function apiRoutesMiddleware(routes) {
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