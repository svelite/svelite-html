// test.ava.js
import test from 'ava';
import createEngine from '../src/render.js'; // Adjust the import path

async function render(templates, props) {
    const engine = createEngine({
        templates
    })

    return engine.render({ name: 'Home', props }).then(x => x.html)
}

test('renders simple variable', async t => {
    const templates = {
        Home: {
            template: 'Hello, {{ name }}!'
        }
    }

    t.is(await render(templates, { name: 'World' }), 'Hello, World!')
});

test('renders undefined variable', async t => {
    const templates = {
        Home: {
            template: 'Hello, {{ name }}!'
        }
    }

    t.is(await render(templates, { name1: 'World' }), 'Hello, !')
});


test('renders if', async t => {
    const template = '<div>@if(value===1) One @elseif(value === 2 ) Two @elseif(value === 3 ) Three @else None @endif</div>';

    const engine = createEngine({
        templates: {
            Home: { template }
        }
    })

    async function render(props) {
        return await engine.render({ name: 'Home', props }).then(res => res.html)
    }

    t.is(await render({ value: 1 }), '<!--include:Home--><div>One</div>');
    t.is(await render({ value: 2 }), '<!--include:Home--><div>Two</div>');
    t.is(await render({ value: 3 }), '<!--include:Home--><div>Three</div>');
    t.is(await render({ value: 4 }), '<!--include:Home--><div>None</div>');
});


test('renders for', async t => {
    const template = '@for(item in items) <h1>{{item.value}} - {{item.name}}</h1>@endfor';

    const engine = createEngine({
        templates: {
            Home: { template }
        }
    })

    async function render(props) {
        return await engine.render({ name: 'Home', props }).then(res => res.html)
    }

    t.is(await render({ items: [{ value: 1, name: 'One' }, { value: 2, name: 'Two' }] }), '<!--include:Home--><h1>1 - One</h1><h1>2 - Two</h1>');
    t.is(await render({ items: [] }), '');
});


test('renders nested if inside for loop', async t => {
    const template = '@for(item in items) @if(item.value === 1) <h1>One</h1> @elseif(item.value === 2) <h1>Two</h1> @elseif(item.value === 3) <h1>Three</h1> @else <h1>None</h1> @endif @endfor';

    const engine = createEngine({
        templates: {
            Home: { template }
        }
    })

    async function render(props) {
        return await engine.render({ name: 'Home', props }).then(res => res.html)
    }

    t.is(await render({ items: [{ value: 1 }, { value: 2 }] }), '<!--include:Home--><h1>One</h1><h1>Two</h1>');
    t.is(await render({ items: [{ value: 3 }, { value: 4 }] }), '<!--include:Home--><h1>Three</h1><h1>None</h1>');
    t.is(await render({ items: [] }), '');
});

test('renders loop inside condition', async t => {
    const template = '@if(condition) @for(item in items) <h1>{{item.value}}</h1> @endfor @else <h1>No items</h1> @endif';

    const engine = createEngine({
        templates: {
            Home: { template }
        }
    })

    async function render(props) {
        return await engine.render({ name: 'Home', props }).then(res => res.html)
    }

    t.is(await render({ condition: true, items: [{ value: 'One' }, { value: 'Two' }] }), '<!--include:Home--><h1>One</h1><h1>Two</h1>');
    t.is(await render({ condition: false, items: [{ value: 'Three' }, { value: 'Four' }] }), '<!--include:Home--><h1>No items</h1>');
    t.is(await render({ condition: true, items: [] }), '');
});

test('renders component', async t => {
    const templates = {
        Home: {
            template: 'Hello, @include("Test") @endinclude!'
        },
        Test: {
            template: '<div>Test</div>'
        }
    }

    t.is(await render(templates, { }), 'Hello, <!--include:Test--><div>Test</div>!')
});

test('renders component with props', async t => {
    const templates = {
        Home: {
            template: 'Hello, @include("Test", {a: "abc", b: 123}) @endinclude!'
        },
        Test: {
            template: '<div>num: {{b}} | str: {{a}}</div>'
        }
    }

    t.is(await render(templates, { }), 'Hello, <!--include:Test--><div>num: 123 | str: abc</div>!')
});


test('renders multiple components with props', async t => {
    const templates = {
        Home: {
            template: 'Hello, @include("Test1", {a: "abc", b: 123}) @endinclude@include("Test2", {c: "def", d: 456}) @endinclude!'
        },
        Test1: {
            template: '<div>num: {{b}} | str: {{a}}</div>'
        },
        Test2: {
            template: '<div>num: {{d}} | str: {{c}}</div>'
        }
    }

    t.is(await render(templates, { }), 'Hello, <!--include:Test1--><div>num: 123 | str: abc</div><!--include:Test2--><div>num: 456 | str: def</div>!')
});

test('renders component inside condition', async t => {
    const templates = {
        Home: {
            template: '<div>@if(condition)@include("Test", {a: ds, b: 123}) @endinclude@endif</div>'
        },
        Test: {
            template: '<div>num: {{b}} | str: {{a}}</div>'
        }
     
    }

    t.is(await render(templates, { condition: true, ds: 'qwe' }), '<!--include:Home--><div><!--include:Test--><div>num: 123 | str: qwe</div></div>')
});

test('renders component inside loop', async t => {
    const templates = {
        Home: {
            template: '<div>@for(item in items)@include("Test", {a: item, b: 123}) @endinclude @endfor</div>'
        },
        Test: {
            template: '<div>num: {{b}} | str: {{a}}</div>'
        }
     
    }

    t.is(await render(templates, { items: ['q', 'w', 'e'] }), '<!--include:Home--><div><!--include:Test--><div>num: 123 | str: q</div><!--include:Test--><div>num: 123 | str: w</div><!--include:Test--><div>num: 123 | str: e</div></div>')
});

test('renders component slot', async t => {
    const templates = {
        Home: {
            template: '<div>@include("Test", {a: ds, b: 123}) Default @endinclude</div>'
        },
        Test: {
            template: '<div>num: {{b}} | str: {{a}} | slot: @slot()</div>'
        }
     
    }

    t.is(await render(templates, { condition: true, ds: 'qwe' }), '<!--include:Home--><div><!--include:Test--><div>num: 123 | str: qwe | slot: Default</div></div>')
});

test('renders component named slot', async t => {
    const templates = {
        Home: {
            template: '<div>@include("Test", {a: ds, b: 123}) Default @slot("one") ONE @endslot @slot("two") TWO @endslot @endinclude</div>'
        },
        Test: {
            template: '<div>num: {{b}} | str: {{a}} | slot: @slot() | one: @slot("one") | two: @slot("two")</div>'
        }
    }

    t.is(await render(templates, { condition: true, ds: 'qwe' }), '<!--include:Home--><div><!--include:Test--><div>num: 123 | str: qwe | slot: Default | one: ONE | two: TWO</div></div>')
});

test('renders nested component inside slot', async t => {
    const templates = {
        Home: {
            template: '<div>@include("Test", {id: 1})<div>@include("Test", {id: 2})ONE@endinclude</div>@endinclude</div>'
        },
        Test: {
            template: '<div id="test" data-id="{{id}}">@slot()</div>'
        }
    }

    t.is(await render(templates, { condition: true, ds: 'qwe' }), '<!--include:Home--><div><!--include:Test--><div id="test" data-id="1"><div><!--include:Test--><div id="test" data-id="2">ONE</div></div></div></div>')
});


// const templates = {
//     Home: {
//         template: '<div>@for(item in items)@include("Test", {a: item}) @endinclude @endfor</div>'
//     },
//     Test: {
//         template: '<div>{{a}}</div>'
//     }
    
// }

// const res = await render(templates, { items: ['q', 'w', 'e'] }) 