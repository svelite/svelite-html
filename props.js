export function getProps(propsString) {
    let props = {};
    let currentKey = '';
    let currentValue = '';
    let inQuotes = false;
    let inCurlyBraces = false;

    let curlyBraces = 0

    for (let i = 0; i < propsString.length; i++) {
        const char = propsString[i];

        if (char === '"') {
            inQuotes = !inQuotes;
            if (inCurlyBraces) {
                currentValue += char;
            }

        } else if (char === '{') {
            curlyBraces += 1;
            inCurlyBraces = curlyBraces > 0;
            currentValue += char;
        } else if (char === '}') {
            curlyBraces -= 1;
            inCurlyBraces = curlyBraces > 0;
            currentValue += char;
        } else if (char === ' ' && !inQuotes && !inCurlyBraces) {
            if (currentKey !== '') {
                props[currentKey] = currentValue;
            }
            currentKey = '';
            currentValue = '';
        } else if (char === '=' && !inQuotes && !inCurlyBraces) {
            // Skip the equal sign
        } else {
            if (inCurlyBraces || inQuotes) {
                currentValue += char;
            } else {
                currentKey += char;
            }
        }
    }

    // Handling the last key-value pair
    if (currentKey !== '') {
        props[currentKey] = currentValue;
    }

    return props;
}
