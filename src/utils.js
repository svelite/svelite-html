import postcss from 'postcss'
import tailwindcss from 'tailwindcss'

export async function buildcss(config) {
    console.log('buildcss', {config})

    return postcss([
        tailwindcss(config)
    ]).process(`@tailwind base;
@tailwind components;
@tailwind utilities;`).then(res => {
        return res.css
    })
}

export function evaluate(code, context = {}) {
    console.log('function evaluate')


    const pre = Object.keys(context).map(key => `var ${key} = context["${key}"];`).join('')
    return eval(pre + '\n' + code)
}


export function parseTemplate(template) {
    console.log('function parseTemplate')

    const serverRegex = /<script server>([\s\S]*?)<\/script>/;
    const clientRegex = /<script>([\s\S]*?)<\/script>/;

    const serverScriptMatch = template.match(serverRegex);
    const clientScriptMatch = template.match(clientRegex);

    const serverScript = serverScriptMatch ? serverScriptMatch[1].trim() : null;
    const clientScript = clientScriptMatch ? clientScriptMatch[1].trim() : null;

    const load = eval('(' + serverScript + ')')


    return {
        template: template.replace(serverRegex, '').replace(clientRegex, ''),
        load,
        script: clientScript
    }
}
