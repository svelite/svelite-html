
let value = {}

function crud(config) {
    // validate based on config
    return {
        insert(req, res) {

            const body = req.body

            let payload = {}

            for (let field in config.fields) {
                // validate
                if (body[field]) {
                    payload[field] = body[field]
                }
            }

            console.log('payload: ', payload)
            return res.json({ insert: payload })

        },
        update(req, res) {
            return res.end('update')

        },
        remove(req, res) {
            return res.end('remove')

        },
        query(req, res) {
            return res.end('query')

        }
    }

}
export default {
    // config: {
    //     tailwindcss: true
    // },
    routes: {
        test(req, res) {
            res.end('Hello')
        },
        api: {
            test(req, res) {
                console.log('value: ', value)

                res.json(value)
            },
            test2(req, res) {
                value = req.body
                console.log('value: ', value)
                res.json({ success: true })
            },
            users: crud({ fields: { name: 'string', password: 'string' } })
        }
    },
    // pages: [
    //     {
    //         slug: '/', content: [
    //             { name: 'Hello', props: { name: 'hadi' } },
    //             { name: 'Script', props: { count: 50 } },
    //         ]
    //     },
    //     {
    //         slug: '/form',
    //         layout: { name: 'Main' },
    //         content: [
    //             { name: 'Form' }
    //         ],
    //     },
    //     {
    //         slug: '/table',
    //         layout: { name: 'Main' },
    //         content: [
    //             { name: 'Table' }
    //         ]
    //     },
    //     {
    //         slug: '/page',
    //         layout: { name: 'Main' },
    //         content: [
    //             {
    //                 name: 'Page',
    //                 props: {
    //                     content: [{ name: 'Form' }],
    //                     action: [{ name: 'Button', props: {} }]
    //                 }
    //             }
    //         ]
    //     },
    //     {
    //         slug: '/*', content: [
    //             { name: 'Hello', props: { name: 'hadi' } },
    //         ]
    //     }
    // ],

    // pages2: {
    //     slug: '/',
    //     layout: 'Main',
    //     pages: [
    //         {
    //             slug: '/test',
    //             content: [
    //                 {
    //                     name: 'Page',
    //                     props: {
    //                         content: [
    //                             {}
    //                         ]
    //                     },
    //                     slots: {
    //                         content: [
    //                             {}
    //                         ]
    //                     }
    //                 }
    //             ]
    //         }
    //     ]
    // },

    pages: [
        {
            slug: '/admin/users',
            layouts: [
                { name: 'Main' },
                { name: 'Page', props: {title: 'Table'} }
            ],
            content: [
                { name: 'PageHeader', props: { title: 'Table' } },
                {
                    name: 'Table'
                }
            ]
        },
        {
            slug: '/admin/users/insert',
            layouts: [
                { name: 'Main' },
                { name: 'Page' }
            ],
            content: [
                { name: 'PageHeader', props: { title: 'Form', actions: '<h1 class="font-bold text-red-700">SSS</h1>' } },
                {
                    name: 'Form'
                }
            ]
        }
    ]
}

// function page(config) {
//     return {
//         slug: config.slug
//     }
// }
// page.group = function (config, cb) {

// }
/*

page.group({layout: 'Main', slug: '/'}, () => {
    page({
        slug: '/test', 
        content: [
            
        ]
    })
})

*/