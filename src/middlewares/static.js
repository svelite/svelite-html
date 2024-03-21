import express, { Router } from "express"


export function staticFilesMiddleware(staticConfig) {
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
