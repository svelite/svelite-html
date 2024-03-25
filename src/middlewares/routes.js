import { Router } from "express"
import { apiRoutesMiddleware } from "./api.js"
import { pagesMiddleware } from "./page.js"
import { staticFilesMiddleware, stylesMiddleware } from "./static.js"


export function routesMiddleware() {
    return async (req, res, next) => {

        const router = new Router()

        router.use(staticFilesMiddleware(req.config.config.static))
        router.use(apiRoutesMiddleware(req.config.routes))
        router.use(pagesMiddleware(req.config.pages))
        router.use(stylesMiddleware(req.config.config))

        return router(req, res, next)
    }
}