import {readdir} from 'fs/promises'

import postcss from 'postcss'
import tailwindcss from 'tailwindcss'

export async function buildcss(css, config) {
    return postcss([
        tailwindcss(config)
    ]).process(css).then(res => {
        return res.css
    })
}

export async function loadPages(folder, slug, layouts = []) {
    let pages = []

    const fileNames = (await readdir(folder)).sort((a, b) => a.startsWith(':') ? 1 : -1)

    let layout;

    if (fileNames.includes('layout.js')) {
        layout = await import(folder + '/layout.js')
    }

    if (fileNames.includes('index.js')) {
        pages.push({
            layout: mergeLayouts(layouts, layout),
            slug,
            modules: [
                await import(folder + '/index.js')
            ]
        })
    }

    for (let fileName of fileNames) {
        if (!fileName.endsWith('.js')) {
            const res = await loadPages(folder + '/' + fileName, slug === '/' ? slug + fileName : slug + '/' + fileName, [...layouts, layout])
            pages = [...pages, ...res]
        }
    }

    return pages
}

function mergeLayouts(layouts, layout) {
    return {
        default: async (props, slot) => {
            let result = slot;

            if (layout) {
                result = await layout.default(props, result)
            }

            for (let i = layouts.length; i > 0; i--) {
                if (!layouts[i - 1]) continue;
                result = await layouts[i - 1].default(props, result)
            }

            return result;
        }
    }
}
