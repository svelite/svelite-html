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
        if (template.slice(i).startsWith('@end')) {
            skips -= 1
        }
        if (template.slice(i).startsWith('@elseif')) {
            const start = i + '@elseif'.length
            const condition = getCondition(template, start)

            const block = getBlock(template, condition.end, ['@else', '@end'], ['@if'])

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
        if (template.slice(i).startsWith('@end')) {
            skips -= 1
        }
        else if (template.slice(i).startsWith('@elseif')) {
        }
        else if (template.slice(i).startsWith('@else')) {
            return getBlock(template, i + '@else'.length, ['@end'], ['@if'])
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
    let skips = ['@if', '@include', '@for', '@head', '@slot']

    let stack = 0;
    for (let i = index; i < template.length; i++) {
        for(let skip of skips) {
            if (template.slice(i).startsWith(skip)) {
                stack += 1;
            }    
        }

        if (stack == 0) {

            for (let tag of endtags) {
                if (template.slice(i).startsWith(tag)) {

                    // const tagIndex = template.indexOf(tag, index)
                    const start = index + 1
                    const end = i

                    let result = template.slice(start, end).trim()

                    if(result[0] != '<') {
                        result = ' ' + result
                    }

                    console.log('result of getBlock: ', result)
                    return {
                        start,
                        end,
                        result
                    }

                }
            }
        }


        if (template.slice(i).startsWith('@end')) {
            stack -= 1;
        }
    }

    return null

}

function getIfTag(template, index) {
    const condition = getCondition(template, index)

    let lastIndex;
    const block = getBlock(template, condition.end, ['@elseif', '@else', '@end'], ['@if', '@for'])
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
        end: lastIndex + '@end'.length,
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

    const block = getBlock(template, iteratorEnd, ['@end'], ['@for'])

    if (block) {
        end = block.end + '@end'.length
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

        if (template[i] === ',' || template[i] === ')') {
            const endName = i
            return {
                start: index + 1,
                end: endName -1,
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

        if(stack === 0 && char === ')') {
            return {
                start: i,
                end: i,
                result: ''
            }
        }

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
                    end: i +1,
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


    let content = getBlock(template, (props?.end ?? name.end), ['@end'], ['@include', '@slot'])


    function extractSections(input) {
        const sections = {}
        let stack = 0
        let key = 'slot_default'
        sections[key] = ''
        for(let i=0; i<input.length; i++) {
            if(input.slice(i).startsWith('@slot')) {
                const slot = getSlotTag(input, i);
                key = 'slot_' + slot.result.name
                sections[key] ??= ''
                i = slot.end
            } else {
                let tags = ['@if', '@head', '@include', '@slot', '@for', '@elseif', '@else']

                for(let tag of tags) {
                    if(input.slice(i).startsWith(tag)) {
                        stack += 1
                    }
                }

                if(input.slice(i).startsWith('@end')) {
                    stack -= 1
                    
                    if(key !== 'slot_default')
                        i += 4

                    if(stack == 0) {
                        key = 'slot_default'
                    }
                }
            }
            
            if(input[i]) {
                sections[key] += input[i]
            }
        }

        return sections
        // console.log('extractSections', input)
        // const regex = /@slot\(['"]([^'"]+)['"]\)([\s\S]*?)@end/g;
        // let match;
        // let sections = {};
        // let defaultContent = '';
    
        // while ((match = regex.exec(input)) !== null) {
        //     const sectionName = match[1];
        //     const sectionContent = match[2].trim();
        //     sections['slot_' + sectionName] = sectionContent;
        // }
    
        // // Extract content outside of sections
        // const remainingContent = input.replace(regex, '').trim();
        // if (remainingContent) {
        //     defaultContent = remainingContent;
        // }
    
        // // If there's content outside sections, add it to default
        // if (defaultContent) {
        //     sections.slot_default = defaultContent;
        // }
    
        // return sections;
    }
    
    const slots = extractSections(content?.result ?? '');

    
    // handle other slots

    const result = {
        type: 'include',
        name: name.result,
        props: props?.result ?? '{}',
        slots
    }

    return {
        start: index,
        end: (content?.end ?? props.end ?? name.end) + '@end'.length,
        result
    }
}

function getHeadTag(template, index) {

    const block = getBlock(template, index + 'head'.length, ['@end'], [])

    return {
        start: index,
        end: block.end + '@end'.length,
        result: {
            type: 'head',
            content: block.result
        }
    }
}

function getPropsTag(template, i) {
    const startIndex = template.indexOf('(', i) + 1
    const endIndex = template.indexOf(')', i)

    const result = {
        type: 'props',
        props: template
            .slice(startIndex, endIndex)
            .split(',')
            .map(x => x.trim())
            .map(x => x.slice(1, x.length - 1))
    }
    
    return {
        start: i,
        end: endIndex + 1,
        result

    }
}

function getSlotTag(template, i) {
    const startIndex = template.indexOf('(', i) + 1
    const endIndex = template.indexOf(')', i)

    const content = template.slice(startIndex, endIndex).trim();

    let name = content ? content.slice(1, content.length - 1) : 'default';


    const result = {
        type: 'slot',
        name
    }
    
    return {
        start: i,
        end: endIndex + 1,
        result

    }
}

function findNextTag(template) {
    for (let i = 0; i < template.length; i++) {
        if (template.slice(i).startsWith('@if')) {
            // also supports @elseif and @else
            return getIfTag(template, i)
        }
        if (template.slice(i).startsWith('@for')) {
            return getForTag(template, i)
        }
        if (template.slice(i).startsWith('@include')) {
            // also supports @slot
            return getComponentTag(template, i)
        }
        if (template.slice(i).startsWith('@head')) {
            return getHeadTag(template, i)
        }
        if (template.slice(i).startsWith('@props')) {
            return getPropsTag(template, i)
        }
        if (template.slice(i).startsWith('@slot')) {
            return getSlotTag(template, i)
        }
    }
}

function applyTag(template, props, tag, templates, head) {

    function getContent() {
        if (tag.result.type == 'if') {
            let result; 

            try {
                const variable = renderVariable(`{${tag.result.condition}}`, props)
                result = evaluate(variable, props)
            } catch(err) {
                result = false;
            }

            if (result) {
                return render(tag.result.block, props, templates, head).html
            }
            for (let elseif of tag.result.elseifs) {

                const result = evaluate(renderVariable(`{${elseif.condition}}`, props), props)

                if (result) {
                    return render(elseif.block, props, templates, head).html
                }
            }
            return render(tag.result.else, props, templates, head).html
        } else if (tag.result.type == 'for') {

            const rendered = renderVariable(`{${tag.result.iterator}}`, props, true)
            const iterator = evaluate(rendered, props)

            let res = ''
            for (let item of iterator) {
                const result = render(tag.result.block, { ...props, [tag.result.item]: item }, templates, head)
                res += result.html
                // head += result.head
            }
            return res;
        } else if (tag.result.type === 'include') {
            const componentProps = tag.result.props ? evaluate(`(${tag.result.props})`, props) : {};

            const template = templates[tag.result.name]?.template
            
            for(let slot in tag.result.slots) {
                componentProps[slot] = render(tag.result.slots[slot], props, templates, head).html;
            }
            
            let res = render(template, componentProps, templates, head).html;

            if(res.startsWith('<') && !res.startsWith('<!--')) {
                res = `<!--include:${tag.result.name}-->` + res
            }
            
            return res;
        } else if(tag.result.type === 'head') {
            head[template] = render(tag.result.content, props, templates, '').html

            return ''
        } else if(tag.result.type === 'props') {
            for(let item of tag.result.props) {
                props[item] = undefined
            }
            return ''
        }
        else if(tag.result.type === 'slot') {
            const content = render(props['slot_' + tag.result.name], props, templates, head).html
            return content
        }
    }

    return {
        html: template.slice(0, tag.start) + getContent() + template.slice(tag.end),
        head
    }

}

function render(template, props, templates, head = {}) {
    let result = renderVariables(template, props);

    const tag = findNextTag(result)

    if (tag) {
        result = applyTag(result, props, tag, templates, head)

        return render(result.html, props, templates, head)
    }

    return {
        html: result.trim(),
        head
    }
}

export default function createEngine({ templates }) {

    return {
        async render(component, loadParams) {
            const name = component.name
            let props = component.props ?? {}
            props.content = component.content ?? []
            let head = {}
            head[component.template] = component.head ?? ''

            if(!templates[name]) return ''

            if (templates[name]?.load) {
                const loadProps = await templates[name].load(loadParams)
                props = { ...props, ...loadProps }
            }

            if (props.content && Array.isArray(props.content)) {
		    props.content = {default: props.content}
            }
		if(props.content && typeof props.content === 'object') {
		for(let key in props.content) {
			let res = ''
			for (let content of props.content[key]) {

			    const response = await this.render(content, loadParams)
			    res += response.html
		     
			}
			props['slot_' + key] = res
		}

	    }

            let result = render(templates[name]?.template ?? `template ${name} not found.`, props, templates, head)

            if(result.html.startsWith('<')) {
                result.html = `<!--include:${name}-->` + result.html
            }
            return {html: result.html, head: Object.keys(result.head).map(x => result.head[x]).join('') }
        }
    }
}