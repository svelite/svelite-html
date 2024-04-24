import { BaseComponent, html } from "../Base.js";

export const Card = BaseComponent({
    template(props, slot) {
        return html`
            <f-card>${slot}</f-card>
        `
    },
    script() {
        console.log('front')
    }
})