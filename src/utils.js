import postcss from 'postcss'
import tailwindcss from 'tailwindcss'

export async function buildcss(css, config) {

    return postcss([
        tailwindcss(config)
    ]).process(css).then(res => {
        return res.css
    })
}
