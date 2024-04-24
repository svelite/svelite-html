import { BaseComponent, html } from "../Base.js";

export const Accordion = BaseComponent({
    template(props, slot) {
        return html`
            <f-accordion>hi</f-accordion>
        `
    },
    script() {
        console.log('front')
    }
})