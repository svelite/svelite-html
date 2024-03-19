import { getProps } from "./props.js";
import { evaluate, renderVariable, renderVariables } from "./variable.js";


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
    console.log('getBlock', template.slice(index), {endtags, skipOn})

    let stack = 0;
    for (let i = index; i < template.length; i++) {
        if (template.slice(i).startsWith(skipOn[0])) {
            stack += 1;
        }

        if (stack == 0) {

            for (let tag of endtags) {
                if (template.slice(i).startsWith(tag)) {
                    console.log('found tag', template.slice(i), tag)

                    // const tagIndex = template.indexOf(tag, index)
                    const start = index + 1
                    const end = i

                    let result = template.slice(start, end).trim()

                    console.log(result[0])

                    if(result[0] != '<') {
                        result = ' ' + result
                    }

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

    const iterator = template.slice(iteratorStart, iteratorEnd);
    const [key, list] = iterator.split(' in ');

    const block = getBlock(template, iteratorEnd, ['@endfor'], ['@for', '@endfor'])

    if (block) {
        end = block.end + '@endfor'.length
    }
    const result = {
        type: 'for',
        iterator: list,
        item: key,
        block: block?.result ?? ''
    }

    return {
        start,
        end,
        result
    }
}

function getComponentName(template, index) {

    for (let i = index; i < template.length; i++) {

        if (template[i] === ',') {
            const endName = i
            return {
                start: index + 1,
                end: endName,
                result: template.slice(index + 1, endName).replace(/'/g, '').replace(/"/g, '')
            }
        }
    }
}

function getObject(template, index) {
    let stack = 0
    let start = index

    for(let i=index; i<template.length; i++) {
        const char = template[i]

        if(char === '{') {
            stack +=1
            if(stack === 1) {
                start = i
            }
        }
        if(char === '}' && stack > 0) {
            stack -=1

            if(stack === 0) {
                return {
                    start,
                    end: i + 1,
                    result: template.slice(start, i + 1)
                }
            }
        }
    }
    return null
}

function getComponentTag(template, index) {
    // TODO: Implement
    let name = getComponentName(template, index + '@include'.length)
    let props = getObject(template, name.end)

    console.log('getBlock', template.slice(props.end + 1))
    let content = getBlock(template, props.end + 1, ['@endinclude'], ['@include', '@endinclude'])

    console.log({content})


    const result = {
        type: 'include',
        name: name.result,
        props: props?.result ?? '',
        content: content?.result ?? '',
    }


    return {
        start: index,
        end: (content?.end ?? props.end) + '@endinclude'.length,
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
        if (template.slice(i).startsWith('@include')) {
            return getComponentTag(template, i)
        }
    }
}

function applyTag(template, props, tag, templates) {
    console.log('applyTag', tag)

    function getContent() {
        if (tag.result.type == 'if') {
            let result; 

            try {
                result = evaluate(renderVariable(`{${tag.result.condition}}`, props), props)
            } catch(err) {
                result = false;
            }

            if (result) {
                return tag.result.block
            }
            for (let elseif of tag.result.elseifs) {

                const result = evaluate(renderVariable(`{${elseif.condition}}`, props), props)

                if (result) {
                    return elseif.block
                }
            }
            return tag.result.else
        } else if (tag.result.type == 'for') {

            const rendered = renderVariable(`{${tag.result.iterator}}`, props, true)
            const iterator = evaluate(rendered, props)

            let res = ''
            for (let item of iterator) {
                res += render(tag.result.block, { ...props, [tag.result.item]: item }, templates)
            }
            return res;
        } else if (tag.result.type === 'include') {
            const template = templates[tag.result.name].template

            console.log(props)
            console.log('start evaluate', `(${tag.result.props})`, props)
            const props2 = evaluate(`(${tag.result.props})`, props)
            console.log('end evaluate')
            console.log(props2)

            // for (let key in tag.result.props) {
            //     if (tag.result.props[key].startsWith('{')) {

            //         console.log('calling renderVariable include prop')
            //         tag.result.props[key] = renderVariable(`${tag.result.props[key]}`, props, true)
            //         if (typeof tag.result.props[key] === 'string') {
            //             tag.result.props[key] = JSON.parse(tag.result.props[key])
            //         }
            //     }
            // }
            // console.log("tag.result.props", tag.result.props)

            // return render(template, { content: render(tag.result.content, props, templates), ...tag.result.props }, templates)

            props2.content = render(tag.result.content, props, templates)
            const res = render(template, props2, templates)
            console.log({res})
            return res
        }
    }

    return template.slice(0, tag.start) + getContent() + template.slice(tag.end)

}

function render(template, props, templates) {
    console.log('render', template, props)

    let result = renderVariables(template, props);

    console.log(result)

    const tag = findNextTag(result)

    if (tag) {
        result = applyTag(result, props, tag, templates)

        return render(result, props, templates)
    }

    return result;
}

export default function createEngine({ templates }) {

    return {
        async render(include, loadParams) {
            const name = include.name
            let props = include.props ?? {}
            props.content = props.content ?? include.content ?? []

            if (templates[name].load) {
                const loadProps = await templates[name].load(loadParams)
                props = { ...props, ...loadProps }
            }

            if (props.content) {
                let res = ''
                for (let content of props.content) {
                    res += await this.render(content, loadParams)
                }
                props.content = res
            }

            return render(templates[name].template, props, templates)
            
        }
    }
}

const engine = createEngine({
    // templates: {
    //     Home: {
    //         template: '@include("Test", {name}) abc @endinclude'
    //     },
    //     Test: {
    //         template: '<name>{name}</name><content>{content}</content>'
    //     }
    // }
    templates: {
        // "Home": {
        //     template: `<div>@for (i in names) {i} @endfor</div>`
        // }
        'Select': {
            template: `<select name="{{name}}" id="{{id}}" class="bg-white w-full p-4 shadow outline-none focus:shadow-lg">
            @if(placeholder)<option selected value="{{ item.name }}" disabled> {{placeholder}}</option>@endif
            {{content}}
            </select>`
        },
        'Option': {
            template: `<option@if(selected) selected @endif>{{value}}</option>`
        },
        'Home': {
            template: `
            @include('Select', {
                name: 'name',
                id: 'nameInput',
                placeholder: 'انتخاب نام',
            })
                @for (n in names)
                    @include("Option", {value: n, selected: n === name})
                    @endinclude
                @endfor
            @endinclude
            `
        }
        // Home: {
        //     template: '<div>Hello {{name}}{{name2}}{{name}}</div>'
        // }
    }
})
const rendered = await engine.render({ name: 'Home', props: { name: 'hi', names: ['hi', 'di'] }})
console.log(rendered)

// <div class="something">
{/* <select name="name" id="nameInput" class="bg-white w-full p-4 shadow outline-none focus:shadow-lg">
                <option selected value="{ item.name }" disabled> انتخاب نام </option>

                <option value="__new__">نام جدید...</option>
            </select>
            <div></div> */}