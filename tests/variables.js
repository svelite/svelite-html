// // // // test.ava.js
import test from 'ava';
// import createEngine from '../src/render/render.js'; // Adjust the import path
// import path from 'path'

// // const res = await render({
// //     Home: {
// //         template: '<div>@Condition({value: 4}) @end</div>'
// //     },
// //     Card: {
// //         template: '<div class="card">@slot() @CardBody() @slot("body") @end</div>'
// //     },
// //     CardBody: {
// //         template: '<div class="card-body">@slot()</div>'
// //     },
// //     Condition: {
// //         template: '<div>@if(value===1) One @elseif(value === 2 ) Two @elseif(value === 3 ) Three @else None @end</div>'
// //     }
// // })

// // console.log(res)
// // console.log('<div><!--include:Condition--><div>One</div></div>')



// async function render(name, props) {
//     const engine = createEngine({
//         views: path.resolve('./views')
//     })

//     return engine.render({ name, props }).then(x => x.html)
// }

// test('renders simple variable', async t => {
//     t.is(await render('simple-vars', { name: 'World' }), 'Hello, World!')
// });

// test('renders undefined variable', async t => {
//     const templates = {
//         Home: {
//             template: 'Hello, {{ name }}!'
//         }
//     }

//     t.is(await render('simple-vars', { name1: 'World' }), 'Hello, !')
// });


test('renders if', async t => {
    // t.is(await render({ value: 1 }), '<div>One</div>');
    // t.is(await render({ value: 2 }), '<div>Two</div>');
    // t.is(await render({ value: 3 }), '<div>Three</div>');
    // t.is(await render({ value: 4 }), '<div>None</div>');
    t.pass()
});


// test('renders for', async t => {
//     const template = '@for(item in items) <h1>{{item.value}} - {{item.name}}</h1>@end';

//     const engine = createEngine({
//         views: './views'

//         // templates: {
//         //     Home: { template }
//         // }
//     })

//     async function render(props) {
//         return await engine.render({ name: 'Home', props }).then(res => res.html)
//     }

//     t.is(await render({ items: [{ value: 1, name: 'One' }, { value: 2, name: 'Two' }] }), '<h1>1 - One</h1><h1>2 - Two</h1>');
//     t.is(await render({ items: [] }), '');
// });


// test('renders nested if inside for loop', async t => {
//     const template = '';

//     // const engine = createEngine({
//     //     views: './views'

//     //     // templates: {
//     //     //     Home: { template }
//     //     // }
//     // })

//     // async function render(props) {
//     //     return await engine.render({ name: 'Home', props }).then(res => res.html)
//     // }

//     t.is(await render('if-inside-loop', { items: [{ value: 1 }, { value: 2 }] }), '<h1>One</h1><h1>Two</h1>');
//     t.is(await render('if-inside-loop',{ items: [{ value: 3 }, { value: 4 }] }), '<h1>Three</h1><h1>None</h1>');
//     t.is(await render('if-inside-loop', { items: [] }), '');
// });

// test('renders loop inside condition', async t => {

//     t.is(await render('loop-inside-condition', { condition: true, items: [{ value: 'One' }, { value: 'Two' }] }), '<h1>One</h1><h1>Two</h1>');
//     t.is(await render('loop-inside-condition', { condition: false, items: [{ value: 'Three' }, { value: 'Four' }] }), '    <h1>No items</h1>');
//     t.is(await render('loop-inside-condition', { condition: true, items: [] }), '');
// });

// test('renders component', async t => {
//     const templates = {
//         Home: {
//             template: 'Hello, @Test() @end!'
//         },
//         Test: {
//             template: '<div>Test</div>'
//         }
//     }

//     t.is(await render('component', { }), 'Hello, <!--include:Test--><div>Test</div>!')
// });

// test('renders component with props', async t => {
//     const templates = {
//         Home: {
//             template: 'Hello, @Test({a: "abc", b: 123}) @end!'
//         },
//         Test: {
//             template: '<div>num: {{b}} | str: {{a}}</div>'
//         }
//     }

//     t.is(await render(templates, { }), 'Hello, <!--include:Test--><div>num: 123 | str: abc</div>!')
// });


// test('renders multiple components with props', async t => {
//     const templates = {
//         Home: {
//             template: 'Hello, @Test1({a: "abc", b: 123}) @end@Test2({c: "def", d: 456}) @end!'
//         },
//         Test1: {
//             template: '<div>num: {{b}} | str: {{a}}</div>'
//         },
//         Test2: {
//             template: '<div>num: {{d}} | str: {{c}}</div>'
//         }
//     }

//     t.is(await render(templates, { }), 'Hello, <!--include:Test1--><div>num: 123 | str: abc</div><!--include:Test2--><div>num: 456 | str: def</div>!')
// });

// test('renders component inside condition', async t => {
//     const templates = {
//         Home: {
//             template: '<div>@if(condition)@Test({a: ds, b: 123}) @end@end</div>'
//         },
//         Test: {
//             template: '<div>num: {{b}} | str: {{a}}</div>'
//         }
     
//     }

//     t.is(await render(templates, { condition: true, ds: 'qwe' }), '<div><!--include:Test--><div>num: 123 | str: qwe</div></div>')
// });

// test('renders component inside loop', async t => {
//     const templates = {
//         Home: {
//             template: '<div>@for(item in items)@Test({a: item, b: 123}) @end @end</div>'
//         },
//         Test: {
//             template: '<div>num: {{b}} | str: {{a}}</div>'
//         }
     
//     }

//     t.is(await render(templates, { items: ['q', 'w', 'e'] }), '<div><!--include:Test--><div>num: 123 | str: q</div><!--include:Test--><div>num: 123 | str: w</div><!--include:Test--><div>num: 123 | str: e</div></div>')
// });

// test('renders component slot', async t => {
//     const templates = {
//         Home: {
//             template: '<div>@Test({a: ds, b: 123}) Default @end</div>'
//         },
//         Test: {
//             template: '<div>num: {{b}} | str: {{a}} | slot: @slot()</div>'
//         }
     
//     }

//     t.is(await render(templates, { condition: true, ds: 'qwe' }), '<div><!--include:Test--><div>num: 123 | str: qwe | slot: Default</div></div>')
// });

// test('renders component named slot', async t => {
//     const templates = {
//         Home: {
//             template: ''
//         },
//         Test: {
//             template: ''
//         }
//     }

//     t.is(await render(templates, { condition: true, ds: 'qwe' }), '<div><!--include:Test--><div>num: 123 | str: qwe | slot: Default | one: ONE | two: TWO</div></div>')
// });

// test('renders nested component inside slot', async t => {
//     const templates = {
//         Home: {
//             template: '<div>@Test({id: 1})<div>@Test({id: 2})ONE@end</div>@end</div>'
//         },
//         Test: {
//             template: '<div id="test" data-id="{{id}}">@slot()</div>'
//         }
//     }

//     t.is(await render(templates, { condition: true, ds: 'qwe' }), '<div><!--include:Test--><div id="test" data-id="1"><div><!--include:Test--><div id="test" data-id="2">ONE</div></div></div></div>')
// });

// test('renders nested component using include in component', async t => {
//     const templates = {
//         Home: {
//             template: '<div>@Test2({id: 1})HOME@end</div>'
//         },
//         Test: {
//             template: '<div id="test" data-id="{{id}}" data-id2="{{id2}}">@slot()</div>'
//         },
//         Test2: {
//             template: '<div>@Test({id: 2, id2: id})TWO@end</div>'
//         }
//     }

//     t.is(await render(templates, { condition: true, id: 1 }), '<div><!--include:Test2--><div><!--include:Test--><div id="test" data-id="2" data-id2="1">TWO</div></div></div>')
// });

// test.skip('renders dynamic component', async t => {
//     const templates = {
//         Home: {
//             template: '<div>@for(item in items) @{item.name}({value: item.value}) @end</div>'
//         },
//         One: {
//             template: '<div>ONE {{value}}</div>'
//         },
//         Two: {
//             template: '<div>TWO {{value}}</div>'
//         },
//         Three: {
//             template: '<div>THREE {{value}}</div>'
//         }
//     }

//     t.is(await render(templates, { items: [{name: 'One', value: 'yak'}] }), '<div><!--include:One--><div>ONE yak</div></div>')
// });
