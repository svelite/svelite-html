import { Router } from "express"
import { apiRoutesMiddleware } from "./api.js"
import { pagesMiddleware } from "./page.js"
import { staticFilesMiddleware } from "./static.js"


export function routesMiddleware() {
    return async (req, res, next) => {

        const router = new Router()

        router.use(staticFilesMiddleware(req.config.config.static))
        router.use(apiRoutesMiddleware(req.config.routes))
        router.use(pagesMiddleware(req.config.pages))

        return router(req, res, next)
    }
}