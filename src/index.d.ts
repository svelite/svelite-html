import { Application } from "express"
export type Component =  ((props: Record<string, any>, body: any[]) => string) & {getScript: () => string}


export const html = (str: TemplateStringsArray, rest: any[]) => string
export const component = (params: {template: string, script?: string}) => Component

export const createApp = (configPath: string) => Application