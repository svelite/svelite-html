export default function createHeadTag() {
    return {
        block: true,
        seekable: false,
        tagName: 'head',
        compile(parser, buffer, token) {
            token.children.forEach((child) => {
                parser.processToken(child, buffer)
            })

            buffer.writeExpression(`head = (head || '') + out`, token.filename, token.loc.start.line)
        }
    }
}