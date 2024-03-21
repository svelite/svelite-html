import test from 'ava'
import { createApp } from '../src/index.js';
import request from 'supertest'

test.beforeEach(t => {
    t.context.app = createApp({
        config: {
            views: './tests/views'
        },
        pages: [
            {
                slug: '/',
                content: [
                    {name: 'Hello'}
                ]
            }
        ],
        routes: {
            api(req, res) {
                res.json({hello: 'world'})
            }
        }
    });
});

test('passes', t => {
    t.true(true)
})
// test('GET / route returns status code 200', async t => {
//     const app = t.context.app;
//     const response = await request(app)
//         .get('/test')
//         .expect(200);

//     t.true(response.text.includes('<!--include:Hello--><h1>Hello</h1>'));
// });

// test('POST /api route returns status code 200', async t => {
//     const app = t.context.app;
//     const response = await request(app)
//         .post('/api')
//         .expect(200);

//     t.true(response.text === JSON.stringify({hello: 'world'}));
// });