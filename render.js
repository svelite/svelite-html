import { readdir, readFile } from 'fs/promises'
import path from 'path'


function extractAttributes(templateString) {
    const attributesRegex = /(\w+)\s*=\s*"([^"]+)"|(\w+)\s*=\s*'([^']+)'/g;
    const attributes = {};
    let match;

    while ((match = attributesRegex.exec(templateString)) !== null) {
        const attributeName = match[1] || match[3];
        const attributeValue = match[2] || match[4];
        attributes[attributeName] = attributeValue;
    }

    return attributes;
}

function findNextTemplate(template, from, to) {
    let start = 0
    let templates = []

    let content = template.slice(from, to)
    for (let i = 0; i < content.length; i++) {
        if (content.slice(i, i + '<template'.length) === '<template') {
            if (templates.length == 0) {
                start = i
                const attributes = content.slice(i + '<template'.length, i + content.slice(i).indexOf('>'))
                templates.push({ start, attributes })
                continue;
            }
            templates.push('')


        }
        if (content.substring(i, i + '</template>'.length) === '</template>') {

            // templates[templates.length -1].end = i
            if (templates.length === 1) {
                templates[0].content = content.slice(start + (templates[0].attributes.length + '<template>'.length), i)
                templates[0].end = from + i + '</template>'.length
                templates[0].start = from + start
                templates[0].attributesLength = templates[0].attributes.length


                templates[0].attributes = templates[0].attributes.replace('{{ ', '{{')
                templates[0].attributes = templates[0].attributes.replace(' }}', '}}')

                templates[0].attributes = extractAttributes(templates[0].attributes);


                return templates[0]
            }
            templates.pop()
        }
    }
    return null
}

function renderVariables(template, props) {
    let start = 0
    let skip = false;
    for (let i = 0; i < template.length; i++) {
        if (template.slice(i).startsWith('<template')) {
            skip = true;
        }
        if (template.slice(i).startsWith('</template>')) {
            skip = false;
        }
        if (template[i] === '{' && template[i + 1] === '{') {
            start = i
        }
        if (template[i] === '}' && template[i + 1] === '}') {
            if (skip) {
                continue;
            }
            let value = template.slice(start + 2, i).trim()

            for (let key in props) {
                value = value.replace(new RegExp(`${key}`), 'props.' + key)
            }
            try {

                const res = eval(value)
                template = template.slice(0, start) + (typeof res == 'object' ? JSON.stringify(res) : res) + template.slice(i + 2)
                return renderVariables(template, props)
            } catch (err) {
                console.log(err.message)
                return template
            }
        }
    }
    return template
}

function renderTemplate(template, props, templateProps = {}) {
    if (templateProps['if']) {
        const ifValue = templateProps['if']
        const res = renderVariables(ifValue, props)
        if (res && res != 'false' && res != 'undefined') {
            return renderTemplate(template, props)
        } else {
            return ''
        }
    } else if (templateProps['for']) {
        try {
            const listStr = renderVariables(templateProps['for'], props)
            if (!listStr || listStr === 'undefined') return '';

            const list = JSON.parse(listStr)
            const as = templateProps['as']

            let result = ''
            for (let item of list) {
                result += render(template, { ...props, [as]: item })
            }
            return result
        } catch (err) {
            console.log(err.message)
        }
    } else if (templateProps['this']) {
        // 
    } else {
        template = renderVariables(template, props)
        return template
    }
}

export function render(template, props) {
    template = renderVariables(template, props)

    let templateTag = findNextTemplate(template, 0, template.length);

    while (templateTag) {
        const rendered = renderTemplate(templateTag.content, props, templateTag.attributes)

        template = template.slice(0, templateTag.start) + rendered + template.slice(templateTag.end)

        templateTag = findNextTemplate(template, 0, template.length)
    }

    return template;
}

async function parse(filename) {
    const file = await readFile(filename, 'utf-8')
    const serverRegex = /<script server>([\s\S]*?)<\/script>/;

    const serverScriptMatch = file.match(serverRegex);
    const template = file.replace(serverRegex, '');

    const serverScript = serverScriptMatch ? serverScriptMatch[1].trim() : null;

    const load = eval('(' + serverScript + ')')

    return {
        template,
        load
    }
}

export default async function createEngine(config) {
    const componentsPath = config.components
    const components = (await readdir(componentsPath)).map(x => x.slice(0, x.length - 5))

    return {
        async render(component, loadProps) {
            console.log("render", component )
            const { template, load } = await parse(path.join(componentsPath, component.name + '.html'))

            const props = component.props ?? {}
            if(!props['content'] && component.content) {
                props.content = component.content
            }

            if (load) {
                loadProps.props = props

                const newProps = await load(loadProps)
                props = { ...props, ...newProps }
            }

            let rendered = render(template, props)

            for (let key in props) {

                if (props[key] && typeof props[key] === 'object' && Array.isArray(props[key]) && props[key].length > 0 && props[key][0].name && components.includes(props[key][0].name)) {
                    let res = ''
                    for (let item of props[key]) {
                        res += await this.render(item, loadProps)
                    }

                    rendered = rendered.replace(`<slot name="${key}">`, res)
                }
            }

            // Handle slot and componets
            for (let i = 0; i < rendered.length; i++) {
                if (rendered[i] === '<' && rendered[i + 1] >= 'A' && rendered[i + 1] <= 'Z') {
                    const start = rendered.slice(i + 1).indexOf(' ');
                    const end = rendered.indexOf('/>')
                    const props = extractAttributes(rendered.slice(start, end))

                    const name = rendered.slice(i + 1, i + 1 + start)

                    const { template } = await parse(path.join(componentsPath, name + '.html'))

                    const res = render(template, props)

                    rendered = rendered.slice(0, i) + res + rendered.slice(end + 2)
                }

            }

            return rendered
        }
    }
}