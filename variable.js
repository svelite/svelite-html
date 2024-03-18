export function evaluate(code, context = {}) {
    const pre = Object.keys(context).map(key => `var ${key} = context["${key}"];`).join('')
    return eval(pre + '\n' + code)        
}

export function renderVariable(template, props, stringify) {
    let value = template.slice(1, template.length - 1).trim()

    try {
        let res1 = evaluate(value, props)

        let res = res1;
        if (stringify) {
            res = JSON.stringify(res1)
        }

        // template = template + res + template.slice(i + 1)
        return res

    } catch (err) {

        console.log(err.message)

    }
    return template
}

export function renderVariables(template, props, stringify) {
    if(!template) return ''

    let pre = ''
    let post = ''


    let index = 0;
    let stack = []

    for(let i=0; i<template.length; i++) {
        if(template.slice(i).startsWith('<!--')) {
            stack.push('-->')
        }
        if(stack.at(-1) === '-->' && template.slice(i).startsWith('-->')) {
            stack.pop()
        }
        if(template.slice(i).startsWith('@for')) {
            stack.push('@endfor')
        }
        if(stack.at(-1) === '@endfor' && template.slice(i).startsWith('@endfor')) {
            stack.pop()
        }
        if(template.slice(i).startsWith('@if')) {
            stack.push('@endif')
        }
        if(stack.at(-1) === '@endif' && template.slice(i).startsWith('@endif')) {
            stack.pop()
        }
        if(template.slice(i).startsWith('@include')) {
            stack.push('@endinclude')
        }
        if(stack.at(-1) === '@endinclude' && template.slice(i).startsWith('@endinclude')) {
            stack.pop()
        }
        
        if(template[i] === '{') {
            index = i
            stack.push('}')
        }
        if(stack.at(-1) === '}' && template[i] === '}') {

            stack.pop()
            if(stack.length == 0) {
                const variable = template.slice(index, i + 1)
                
                pre = template.slice(0, index)
                post = template.slice(i + 1)
                return pre + renderVariable(variable, props, stringify) + renderVariables(post, props, stringify)
            }
        }   
    }
    return template;
}
