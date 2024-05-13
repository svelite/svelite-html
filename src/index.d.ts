import { Application } from "express"
import { Config } from "tailwindcss"
export type Component =  ((props: Record<string, any>, body: any[]) => string) & {getScript: () => string}


export type html = (str: TemplateStringsArray, rest: any[]) => string
export type component = (params: {template: string, script?: string}) => Component

export type SveliteConfig = {
    pages: string | any[] // TODO: Page
    routes: string | Record<string, any> // TODO: recursive routes
    static: string | Record<string, string> | string[],
    css: {
        path: string,
        tailwindcss: Config,
    },
    middlewares: string | any[]
}

export type createApp = (config: SveliteConfig) => Application