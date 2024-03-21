import { evaluate } from "../utils.js"

export function renderVariable(template, props, stringify) {
    let value = template.trim()

    try {
        let res = evaluate(value, props)

        if (stringify) {
            res = JSON.stringify(res)
        }

        return res
    } catch (err) {
        // console.log(err.message)
        return ''
    }
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

        if(template.slice(i).startsWith('<script')) {
            stack.push('</script>')
        }
        if(stack.at(-1) === '</script>' && template.slice(i).startsWith('</script>')) {
            stack.pop()
        }
        
        if(template.slice(i).startsWith('<style')) {
            stack.push('</style>')
        }
        if(stack.at(-1) === '</style>' && template.slice(i).startsWith('</style>')) {
            stack.pop()
        }
        
        if(template.slice(i).startsWith('@for')) {
            stack.push('tag')
        }
        if(stack.at(-1) === 'tag' && template.slice(i).startsWith('@end')) {
            stack.pop()
        }

        if(template.slice(i).startsWith('@if')) {
            stack.push('tag')
        }
        
        if(template.slice(i).startsWith('@head')) {
            stack.push('tag')
        }
        
        if(template[i] === '{' && template[i+1] === '{') {
            index = i
            stack.push('}}')
        }
        if(stack.at(-1) === '}}' && template[i] === '}' && template[i+1] === '}') {

            stack.pop()
            if(stack.length == 0) {
                const variable = template.slice(index + 2, i )
                
                pre = template.slice(0, index)
                post = template.slice(i + 2)

                return pre + renderVariable(variable, props, stringify) + renderVariables(post, props, stringify)
            }
        }   
    }
    
    return template;
}
