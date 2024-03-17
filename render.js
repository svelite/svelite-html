import { getProps } from "./props.js";
import { renderVariable, renderVariables } from "./variable.js";


function findMatchingPair(template, index, char) {
    // let inQuotes = false;
    for (let i = index; i < template.length; i++) {
        if (template.slice(i).startsWith(char)) {
            return i;
        }
    }
    return -1
}

function findNextElseIf(template, index) {
    let skips = 0
    for (let i = index; i < template.length; i++) {
        if (template.slice(i).startsWith('@if')) {
            skips += 1
        }
        if (template.slice(i).startsWith('@endif')) {
            skips -= 1
        }
        if (template.slice(i).startsWith('@elseif')) {
            const start = i + '@elseif'.length
            const condition = getCondition(template, start)

            const block = getBlock(template, condition.end, ['@else', '@endif'], ['@if', '@endif'])

            const result = {
                start,
                end: block.end,
                result: {
                    condition: condition.result,
                    block: block.result

                }
            }
            return result;
        }
    }
    return null
}

function findElse(template, index) {
    let skips = 0
    for (let i = index; i < template.length; i++) {
        if (template.slice(i).startsWith('@if')) {
            skips += 1
        }
        if (template.slice(i).startsWith('@endif')) {
            skips -= 1
        }
        else if (template.slice(i).startsWith('@elseif')) {
        }
        else if (template.slice(i).startsWith('@else')) {
            return getBlock(template, i + '@else'.length, ['@endif'], ['@if', '@endif'])
        }
    }
    return null
}

function getCondition(template, index) {
    const start = findMatchingPair(template, index, '(') + 1

    const end = findMatchingPair(template, start, ')')

    return {
        start,
        end,
        result: template.slice(start, end)
    }
}

function getBlock(template, index, endtags, skipOn) {

    let stack = 0;
    for (let i = index; i < template.length; i++) {
        if (template.slice(i).startsWith(skipOn[0])) {
            stack += 1;
        }

        if (stack == 0) {

            for (let tag of endtags) {
                if (template.slice(i).startsWith(tag)) {

                    // const tagIndex = template.indexOf(tag, index)
                    const start = index + 1
                    const end = i

                    const result = template.slice(start, end).trim()

                    return {
                        start,
                        end,
                        result
                    }

                }
            }
        }


        if (template.slice(i).startsWith(skipOn[1])) {
            stack -= 1;
        }
    }

    return null

}

function getIfTag(template, index) {
    const condition = getCondition(template, index)

    let lastIndex;
    const block = getBlock(template, condition.end, ['@elseif', '@else', '@endif'], ['@if', '@endif'])
    if (block) {
        lastIndex = block.end
    }

    let elseifs = []
    let elseif = findNextElseIf(template, condition.end)

    if (elseif) {
        lastIndex = elseif.end

    }
    while (elseif) {
        elseifs.push(elseif.result)
        lastIndex = elseif.end
        elseif = findNextElseIf(template, lastIndex)
    }

    const elseBlock = findElse(template, lastIndex)
    if (elseBlock) {
        lastIndex = elseBlock.end
    }

    let result = {
        type: 'if',
        condition: condition.result,
        block: block?.result ?? '',
        elseifs,
        else: elseBlock ? elseBlock.result : ''
    }

    return {
        start: index,
        end: lastIndex + '@endif'.length,
        result
    }
}

function getForTag(template, index) {
    const start = index
    let end = start

    const iteratorStart = findMatchingPair(template, start, '(') + 1
    const iteratorEnd = findMatchingPair(template, start, ')')

    console.log(iteratorEnd)

    const iterator = template.slice(iteratorStart, iteratorEnd);
    const [key, list] = iterator.split(' in ');

    console.log([{key, list}])

    console.log('getBlock', template.slice(iteratorStart))
    const block = getBlock(template, iteratorEnd, ['@endfor'], ['@for', '@endfor'])

    console.log('block: ', block)
    
    if (block) {
        end = block.end + '@endfor'.length
    }
    const result = {
        type: 'for',
        iterator: list,
        item: key,
        block: block?.result ?? ''
    }
    console.log('FOR:', template.slice(start, end))
    console.log()
    console.log()
    console.log()
    console.log()
    return {
        start,
        end,
        result
    }
}

function getComponentName(template, index) {

    for (let i = index; i < template.length; i++) {

        if (template[i] === ' ' || template[i] == '>' || (template[i] == '/' && template[i + 1] == '>')) {
            const endName = i
            return template.slice(index + 1, endName)
        }
    }
}

function getComponentTag(template, index) {
    // TODO: Implement
    let name = getComponentName(template, index)
    let content = ''
    let endIndex = index

    let props = {}
    let inline = false;

    const startProps = index + 1 + name.length;
    let propsStr;
    for (let i = index; i < template.length; i++) {
        if (template.slice(i).startsWith('/>')) {
            const endProps = i
            propsStr = template.slice(startProps, endProps)
            content = ''
            inline = true;
            endIndex = i + 2
            break;
        }
        if (template.slice(i).startsWith('>')) {
            const endProps = i
            propsStr = template.slice(startProps, endProps)
            const block = getBlock(template, inline ? index + propsStr.length + (name.length + 2) : index + propsStr.length + (name.length + 1), ['</' + name], ['<' + name, '</' + name])

            inline = false;
            endIndex = block.end

            content = block.result
            break;
        }
    }

    const result = {
        type: 'component',
        name,
        inline,
        props: getProps(propsStr),
        content,
    }

    console.log('result: ', result)
    
    return {
        start: index,
        end: endIndex + (inline ? 2 : name.length + 3),
        result
    }
}
function findNextTag(template) {
    for (let i = 0; i < template.length; i++) {
        if (template.slice(i).startsWith('@if')) {
            return getIfTag(template, i)
        }
        if (template.slice(i).startsWith('@for')) {
            return getForTag(template, i)
        }
        if (template[i] === '<' && template[i + 1] >= 'A' && template[i + 1] <= 'Z') {
            return getComponentTag(template, i)
        }
    }
}

function applyTag(template, props, tag, templates) {

    function getContent() {
        if (tag.result.type == 'if') {
            console.log('calling renderVariable if')
            const result = eval(renderVariable(`{${tag.result.condition}}`, props))

            if (result) {
                return tag.result.block
            }
            for (let elseif of tag.result.elseifs) {

            console.log('calling renderVariable elseif')
                const result = eval(renderVariable(`{${elseif.condition}}`, props))

                if (result) {
                    return elseif.block
                }
            }
            return tag.result.else
        } else if (tag.result.type == 'for') {

            console.log('calling renderVariable for', tag.result, props)
            const rendered = renderVariable(`{${tag.result.iterator}}`, props, true)
            const iterator = eval(rendered)

            console.log('iterator: ', iterator)
            let res = ''
            for (let item of iterator) {
                console.log('inside loop')
                res += render(tag.result.block, { ...props, [tag.result.item]: item }, templates)
            }
            console.log('returning: ', res)
            return res;
        } else if (tag.result.type === 'component') {
            const template = templates[tag.result.name].template

            for (let key in tag.result.props) {
                if (tag.result.props[key].startsWith('{')) {

                    console.log('calling renderVariable component prop')
                    tag.result.props[key] = renderVariable(`${tag.result.props[key]}`, props, true)
                    if(typeof tag.result.props[key] === 'string') {
                        tag.result.props[key] = JSON.parse(tag.result.props[key])
                    }
                }
            }
            console.log("tag.result.props", tag.result.props)

            return render(template, { content: render(tag.result.content, props, templates), ...tag.result.props }, templates)

        }
    }

    console.log("rendering!!!!", tag.start, tag.end, template.slice(tag.start, tag.end))
    return template.slice(0, tag.start) + getContent() + template.slice(tag.end)

}

function render(template, props, templates) {
    console.log({props})
    let result = renderVariables(template, props);
    console.log({template, result})
    

    const tag = findNextTag(result)

    if (tag) {
        console.log('before applying tag: ', result, tag)
        result = applyTag(result, props, tag, templates)

        console.log('calling render from recursive: ', result)
        return render(result, props, templates)
    }

    return result;
}

export default function createEngine({ templates }) {

    console.log(templates)
    return {
        async render(component, loadParams) {
            console.log('createEngine render', component)
            const name = component.name
            let props = component.props ?? {}
            props.content = props.content ?? component.content ?? []

            if(templates[name].load) {
                const loadProps = await templates[name].load(loadParams)
                props = {...props, ...loadProps}
            }

            if (props.content) {
                let res = ''
                for (let content of props.content) {
                    res += await this.render(content, loadParams)
                }
                props.content = res
            }

            console.log(templates[name])
            console.log(render(templates[name].template, props, templates))
            return render(templates[name].template, props, templates)
        }
    }
}

const engine = createEngine({
    templates: {
        // "Home": {
        //     template: `<div>@for (i in names) {i} @endfor</div>`
        // }
        'Home': {
            template: `<div class="something">
            <select name="name" id="nameInput" class="bg-white w-full p-4 shadow outline-none focus:shadow-lg">
                <option selected value="{ item.name }" disabled> انتخاب نام </option>

                @for (name in names)
                    <option { item.name == name ? 'selected' : '' } >{ name }</option>
                @endfor
                <option value="__new__">نام جدید...</option>
            </select>
            <div>`
        }
    }
})
const rendered = await engine.render({name: 'Home', props: {names: ['hadi', 'mahsa'], item: {name: 'hadi', value: 3}}})
console.log(rendered)