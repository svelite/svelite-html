import { Edge } from "edge.js";

export default function createEngine({ views }) {

    const edge = new Edge({
        cache: process.env.NODE_ENV === 'production',
    })

    edge.mount(views)

    return {
        async render(component, loadParams) {
            const name = component.name
            let props = component.props ?? {}
            let content = component.content ?? []


            if (content && Array.isArray(content)) {
                content = { main: content }
            }
            if (content && typeof content === 'object') {
                props['$slots'] = {}
                for (let key in content) {
                    let res = content[key].map(item => this.render(item, {...props, ...loadParams}))

                    props['$slots'][key] = async () => (await Promise.all(res)).join('')
                }
            }

            let result = await edge.render(name, {...props, ...loadParams})

            return result
        }
    }
}