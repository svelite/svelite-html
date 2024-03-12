
let value = {}

function crud(config) {
    // validate based on config
    return {
        insert(req, res) {

            const body = req.body

            let payload = {}

            for(let field in config.fields) {
                // validate
                if(body[field]) {
                    payload[field] = body[field]
                }   
            }
            
            console.log('payload: ', payload)
            return res.json({insert: payload})

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
                res.json({success: true})
            },
            users: crud({fields: {name: 'string', password: 'string'}})
        }
    },
    pages: {
        '': [
            { name: 'Hello', props: { name: 'hadi' } },
            { name: 'Script', props: { count: 50 } },
        ],
        form: [
            { name: 'Form' }
        ],
        '*': [
            { name: 'Hello', props: { name: 'hadi' } },

        ]
    }
}