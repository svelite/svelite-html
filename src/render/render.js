function parse(obj) {
    if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.join('')
        }
        return JSON.stringify(obj)
    }
    return obj ?? ''
}

export const html = (strings, ...args) => {
    const res = strings.reduce(
        (acc, currentString, index) => acc + currentString + (parse(args[index]) || ""),
        ""
    )

    return res
}

export function component({template, script}) {
    const result = (props, body) => {
        if(Array.isArray(props) || typeof props !== 'object') {
            return template({}, props)
        }
        return template(props, body)
    }

    result.getScript = () =>{
        const raw = script.toString()
        return '\n\n/* ... */\n' + raw.slice(raw.indexOf('{') + 1, raw.lastIndexOf('}')).trim() 
    }
    return result
}

export const getScripts = (module) => Object.keys(module).map(key => module[key].getScript()).join('')
