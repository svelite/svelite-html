import { readFile, readdir } from 'fs/promises'
import express, { Router } from "express"
import { buildcss } from '../utils.js'
import { existsSync, readdirSync } from 'fs'
import path from 'path'


export function staticFilesMiddleware(staticConfig) {
    const router = Router()
    console.log('static: ', staticConfig)
    if (staticConfig) {
        if (typeof staticConfig === 'object') {
            if (Array.isArray(staticConfig)) {
                for (let key of staticConfig) {
                    router.use('/', express.static(path.resolve(key)))
                }
            } else {
                for (let key in staticConfig) {
                    router.use(path.join(key), express.static(path.resolve(staticConfig[key])))
                }
            }
        } else {
            router.use('/', express.static(path.resolve(staticConfig)))
        }
        // if (typeof staticConfig === 'object') {
        //     if (Array.isArray(staticConfig)) {
        //         for (let key of staticConfig) {
        //             router.use('/', (req, res, next) => {
        //                 if(existsSync(path.join(key, req.url)))
        //                     res.sendFile(path.join(key, req.url))
        //                 next()
        //             })
        //         }
        //     } else {
        //         for (let key in staticConfig) {
        //             router.use(path.join(key), (req, res, next) => {
        //                 console.log('here', existsSync(path.join(staticConfig[key], req.url)))
        //                 if(existsSync(path.join(staticConfig[key], req.url)))
        //                     res.sendFile(path.join(staticConfig[key], req.url))
        //                 else
        //                     next()
        //             })
        //         }
        //     }
        // } else {
        //     router.use('/', (req, res, next) => {
        //         if(existsSync(path.join(key, req.url)))
        //             res.sendFile(path.join(staticConfig, req.url))
        //         next()
        //     })
        // }
    }

    return router
}

export function stylesMiddleware(config) {
    const router = Router()
    if (existsSync(config.styles)) {
        const styles = readdirSync(config.styles)

        for (let style of styles) {
            router.get('/styles/' + style, async (req, res) => {
                const css = await readFile(path.join(config.styles, style))

                const result = await buildcss(css, config.tailwindcss)

                res.end(result)
            })
        }
    }
    return router
}