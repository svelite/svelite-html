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
