import { createMemoryDb } from "./src/db.js";
import { createMongoDb } from "./src/db.js";
import { createFileDb } from "./src/db.js";

const db = createMemoryDb({})
// const db = createFileDb({path: './db.json'})
// const db = createMongoDb({
//     uri: 'mongodb://localhost:27017',
//     db: 'db-tst'
// })


await db('test2').insert({name: 'Hadi', username: 'thehadiahmadi', age: 43, path: '/image.png'})
await db('test2').insert({name: 'Other', username: 'theother', age: 20, path: '/image.jpg'})


const res = await db('test2').query().filter('name', '=', 'Other').filter('age', '!=', 43).paginate()
// const res = await db('test2').query({
//     filters: [
//         {field: 'name', operator: '!=', value: 'Other'},
//         // {field: 'age', operator: '<=', value: 20},
//     ],
//     // perPage: 3
// })

console.log(res)