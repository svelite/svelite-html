import { BaseComponent } from "../../components/Accordion.js"

export const Accordion = Base({
    render({ a } = {}, body) {
        return Base.html`<div u-accordion ${a}>${body}</div>`
    },
    script() {
        console.log('Client side code')
    }
})

export const Card = Base({
    render({ a } = {}, body) {
        return Base.html`<div u-card ${a}>${body}</div>`
    },
    script() {
        console.log('Client side code')
    }
})

console.log([
    '<script>',
    Accordion.getScript(),
    Card.getScript(),
    '</script>'
].join('\n'))