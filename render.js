import { Edge } from 'edge.js'
import { createServer } from 'node:http'
import createHeadTag from './src/render/head.js'

const head = createHeadTag()
const edge = Edge.create({
  cache: process.env.NODE_ENV === 'production'
})

edge.registerTag(head)
edge.mount(new URL('./edge', import.meta.url))

const server = createServer(async (req, res) => {
  const data = { 
    username: 'virk', 
    users: [{username: 'Hadi'}, {username: 'test'}] ,
    $slots: {main: async () => 'Hi'}
  }
  const html = await edge.render('test', data)

  res.setHeader('content-type', 'text/html')
  res.end(html)
})

server.listen(3000)

// function renderSection(section, tags) {
//     for(let tag of tags) {
//         console.log({tag, section})
//         if(tag.name === section.type) {
//             return tag.render(section)
//         }
//     }
// }

// function parse(template, tags) {
//     const sections = []

//     let i = 0;

//     while (i < template.length) {
//         for (let tag of tags) {
//             if (tag.condition(template.slice(i))) {
//                 let result = tag.parse(template, i)
//                 console.log('nane: ', tag.name, tag)
//                 result.type = tag.name
//                 i = result.end

//                 sections.push(result)
//             }
//         }
//     }

//     return sections
// }


// export function render(component, tags) {
//     let result = ''

//     for (let section of component) {
//         result += renderSection(section, tags)
//     }

//     return result;
// }


// function getBlock(template, index, start, end) {

// }

// const tags = [
//     {
//         name: 'block',
//         condition() {
//             // 
//         },
//         parse() {
//             // 
//         },
//         render() {
//             // 
//         }
//     },
//     {
//         name: 'expression',
//         condition(template) {
//             return template.startsWith('{{')
//         },
//         parse(template, index) {
//             const end = template.indexOf('}}', index)
//             return {
//                 start: index,
//                 end: end + 2,
//                 result: template.slice(index + 2, end).trim()
//             }
//         },
//         render(section) {
//             console.log('eval: ', section)
//             return eval(section.result)
//         }
//     },{
//         name: 'static',
//         condition() {
//             return true;
//         },
//         parse(template, index) {
//             let result = ''
//             for (let i = index; i < template.length; i++) {
//                 console.log(i, template[i], result)

//                 if (template.slice(i).startsWith('{{')) {
//                     return { type: 'static', start: index, end: i, result };
//                 } else {
//                     result += template[i]
//                 }
//             }
//             return { type: 'static', start: index, end: template.length, result };
//         },
//         render(section) {
//             return section.result
//         }
//     },
//     {
//         name: 'if',
//         condition(template) {
//             return template.startsWith('@if')
//         },
//         parse(template, index) {
//             const conditionStart = template.indexOf('(', index);
//             const conditionEnd = template.indexOf(')', index);

//             for(let i=index; i<template.length; i++) {
                
//             }
//         },
//         render(section) {
            

//         }
//     }
// ]

// const component = parse('<div>{{1 + 1}}</div>', tags)

// const res = render(component, tags)
// console.log({ res })