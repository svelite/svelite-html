import { Edge } from "edge.js";

export default function createEngine({ modules }) {

    return {
        async render(component, loadParams) {
            const name = component.name
            let props = component.props ?? {}
            let content = component.content ?? []


            if (content && Array.isArray(content)) {
                content = { body: content }
            }
            if (content && typeof content === 'object') {
                for (let key in content) {
                    let res = content[key].map(item => this.render(item, {...props, ...loadParams}))

                    props[key] = (await Promise.all(res)).join('')
                }
            }

            let result = await modules[name]({...props, ...loadParams})

            return result
        }
    }
}


function parse(obj) {
    if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.join('')
        }
        return JSON.stringify(obj)
    }
    return obj ?? ''
}

export const html = (strings, ...args) => strings.reduce(
    (acc, currentString, index) => acc + currentString + (parse(args[index]) || ""),
    ""
)