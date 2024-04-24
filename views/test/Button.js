import { html } from "../../src/index.js"

export default ({body} = {}) => {
    return html`<button u-button>
        ${body}
    </button>`
}