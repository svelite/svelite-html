import { existsSync, writeFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import {MongoClient, UUID} from 'mongodb'

import {customAlphabet} from 'nanoid';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const getId = customAlphabet(alphabet, 8);

// TODO: Use one function and multiple adapters.

/** @type {import('./db.types').createMemoryDbType} */

export function createMemoryDb(initialData = {}) {
    const _data = initialData

    return (table = "") => {
        return {
            query() {
                let filters = []

                async function paginate(page = 1, perPage = 10) {
                    let items = applyFilters(_data[table] ?? [], filters)

                    return {
                        data: perPage === 0 ? items : items.slice(
                            (page - 1) * perPage,
                            page * perPage
                        ),
                        total: items.length,
                        page: page,
                        perPage: perPage === 0 ? items.length : Math.min(items.length, perPage)
                    }
                }

                async function first() {
                    let items = applyFilters(_data[table] ?? [], filters)

                    return items[0] 
                }

                function filter(field, operator, value) {
                    filters.push({field, operator, value})
                    return {
                        filter,
                        all,
                        first,
                        paginate,
                        filters
                    }
                }

                async function all() {
                    let items = applyFilters(_data[table] ?? [], filters)

                    return items
                }

                return {
                    all,
                    filter,
                    first,
                    paginate,
                    filters
                }
            },
            async insert(data) {
                if(!_data[table])
                    _data[table] = []
                
                data.id ??= getId();
                data.createdAt = new Date().valueOf()
                data.updatedAt = 0

                _data[table].push(data)

                return data
            },
            async update(data) {

                if (!_data[table]) {
                    return;
                }

                _data[table] = _data[table].map(x => {

                    if (x.id === data.id) {

                        data.updatedAt = new Date().valueOf()
                        return { ...x, ...data }
                    }

                    return x
                })

                return { todo: true }

            },
            async remove(id) {
                if (!_data[table]) return;

                _data[table] = _data[table].filter(x => x.id !== id)
                return true
            }
        }
    }
}


/** @type {import('./db.types').createHttpDbType} */

// export function createHttpDb(base_url, token) {
//     return (table = "") => {
//         async function call(path, body) {

//             console.log('db:', `${base_url}/${token}/${table}/${path}`, body)
//             const response = await fetch(`${base_url}/${token}/${table}/${path}`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify(body)
//             }).then(res => res.json())
//             return response;
//         }

//         return {
//             async query({ filters, page, perPage }) {
//                 return call('query', { filters, page, perPage })
//             },
//             async insert(data) {
//                 return call('insert', data)
//             },
//             async update(data) {
//                 return call('update', data)
//             },
//             async remove(id) {
//                 return call('remove', { id })
//             }
//         }
//     }
// }

/** @type {import('./db.types').createFileDbType} */
export function createFileDb({path}) {

    const adapter = createFileAdapter(path)

	return (collectionName) => {
		return {
			query() {
                
                return adapter.query(collectionName)
			},
			async insert(data) {
                data.id ??= getId();
                data.createdAt = new Date().valueOf()
                data.updatedAt = 0
                const result = await adapter.insert(collectionName, data);
				return result;
			},
			async remove(id) {
                await adapter.remove(collectionName, id)
                return true;
			},
			async update(data) {
                data.updatedAt = new Date().valueOf()
				const result = await adapter.update(collectionName, data.id, data);
                return result
			}
		};
	};
}

/** @type {import('./db.types').createMongoDbType} */
export function createMongoDb({uri, db}) {

    let adapter = createMongoAdapter(uri, db)
  
	return (collectionName) => {
		return {
			query() {
                return adapter.query(collectionName)
			},
			async insert(data) {
                data._id ??= getId();
                data.createdAt = new Date().valueOf()
                data.updatedAt = 0
                const result = await adapter.insert(collectionName, data);

                delete data['_id']
                return {id: result, ...data};
			},
			async remove(id) {
                await adapter.remove(collectionName, id)
                return true;
			},
			async update(data) {
                data.updatedAt = new Date().valueOf()
				const result = await adapter.update(collectionName, data.id, data);
                return result
			}
		};
	};
}

const createFileAdapter = (path) => {
    let db = null;
    let isDirty = false;

    async function init() {
        if(!existsSync(path)) {
            writeFileSync(path, '{}')
        }
        if(!db) {
            await read()
        }
    }

    async function read() {
        const file = await readFile(path, 'utf-8');
        db = JSON.parse(file)
    }

    async function write() {
        await writeFile(path, JSON.stringify(db));
    }

    setInterval(async () => {
        if(isDirty) {
            await write()
            isDirty = false
        }
    }, 1000)

    return {
        async insert(collection, data) {
            await init()
            if (!db[collection]) {
                db[collection] = [];
            }
            db[collection].push(data);
            isDirty = true
            return JSON.parse(JSON.stringify(data));
        },

        query(collection) {
            let filters = []
            let withs = []

            async function paginate(page = 1, perPage = 10) {
                await init()

                let items = JSON.parse(JSON.stringify(applyFilters(db[collection] ?? [], filters)))

                let data = perPage === 0 ? items : items.slice(
                    (page - 1) * perPage,
                    page * perPage
                ) 

                for(let item of data) {
                    for(let _with of withs) {
                        item[_with.field] = await _with.handler(item)
                    }
                }

                return {
                    data,
                    total: items.length,
                    page: page,
                    perPage: perPage === 0 ? items.length : Math.min(items.length, perPage)
                }
            }

            async function first() {
                await init()
                let items = applyFilters(db[collection] ?? [], filters)

                if(items[0]) {
                    for(let _with of withs) {
                        items[0][_with.field] = await _with.handler(items[0])
                    }

                    return JSON.parse(JSON.stringify(items[0]))
                }
                return;
            }

            function _with(field, handler) {
                withs.push({field, handler})
                return {
                    filter,
                    all,
                    first,
                    paginate,
                    with: _with,
                    filters
                }
            }

            function filter(field, operator, value) {
                filters.push({field, operator, value})
                
                return {
                    filter,
                    all,
                    first,
                    paginate,
                    with: _with,
                    filters
                }
            }

            async function all() {
                await init()

                let items = JSON.parse(JSON.stringify(applyFilters(db[collection] ?? [], filters)))

                for(let item of items) {
                    for(let _with of withs) {
                        item[_with.field] = await _with.handler(item)
                    }
                }
                return items
            }

            return {
                all,
                filter,
                first,
                paginate,
                with: _with,
                filters
            }
        },

        async update(collection, id, data) {
            await init()

            if (!db[collection]) {
                return null;
            }
            const index = db[collection].findIndex(item => item.id === id);
            if (index !== -1) {
                db[collection][index] = { ...db[collection][index], ...data };
                isDirty = true
                return JSON.parse(JSON.stringify(db[collection][index]));
            }
            return null;
        },

        async remove(collection, id) {
            await init()

            if (!db[collection]) {
                return null;
            }
            const index = db[collection].findIndex(item => item.id === id);
            if (index !== -1) {
                const deleted = db[collection][index];
                db[collection].splice(index, 1);
                isDirty = true
                return JSON.parse(JSON.stringify(deleted));
            }
            return null;
        }
    }
}

const createMongoAdapter = (uri, dbName) => {
    const client = new MongoClient(uri, { });

    let db;
    async function init() {
        if(db) return;
        
        await client.connect();
        db = client.db(dbName);
    }
    

    return {
        async insert(collectionName, data) {
            await init()
            const collection = db.collection(collectionName);
            const result = await collection.insertOne(data);
            return result.insertedId
        },

        query(collectionName) {
            const filters = []

            function applyMongoFilters() {
              // TODO: filters
              let query = {}

              for (const filter of filters) {
                  query[filter.field] = {};
                  switch (filter.operator) {
                      case '=':
                          query[filter.field] = filter.value;
                          break;
                      case 'like':
                          query[filter.field] = new RegExp('.*' + filter.value + '.*', 'i')
                          break;
                        case 'in':
                          query[filter.field]['$in'] = filter.value;
                          break;
                      case 'all':
                          query[filter.field]['$all'] = filter.value;
                          break;
                      case '!=':
                          query[filter.field]['$ne'] = filter.value;
                          break;
                      case '<':
                          query[filter.field]['$lt'] = filter.value;
                          break;
                      case '<=':
                          query[filter.field]['$lte'] = filter.value;
                          break;
                      case '>':
                          query[filter.field]['$gt'] = filter.value;
                          break;
                      case '>=':
                          query[filter.field]['$gte'] = filter.value;
                          break;
                      // Add other conditions as needed
                      default:
                          break;
                  }
              }
    
            //    query = collection.find(query)
            return query
      
            }
            
            function filter(field, operator, value) {
                filters.push({field, operator, value})

                return {
                    filter,
                    all,
                    first,
                    paginate,
                    filters
                }
            }

            async function all() {
                await init()
                const collection = db.collection(collectionName);

                const query = applyMongoFilters()

                return collection.find(query).toArray().map(x => {
                    const id = x._id
                    delete x._id
                    x.id = id
                    return x
                });
            }

            async function first() {
                await init()
                const collection = db.collection(collectionName);

                const query = applyMongoFilters()
                const res = collection.find(query).toArray()[0];
                if(res) {
                    const id = res._id
                    delete res._id
                    res.id = id
                }
                return res
            }

            async function paginate(page = 1, perPage = 0) {
                await init()
                const collection = db.collection(collectionName);

                const query = applyMongoFilters()

                let total = await collection.count(query)
                
                let data;
                if(perPage == 0) {
                    data = await collection.find(query).toArray()
                } else {
                    data = await collection.find(query).skip((page - 1) * perPage)
                        .limit(perPage)
                        .toArray();
                }

                return {
                    data: data.map(x => {
                        const id = x._id
                        delete x['_id']
                        return { id, ...x }
                    }),
                    total,
                    page: page,
                    perPage: perPage === 0 ? total : Math.min(total, perPage)
                };
            }


            return {
                filter,
                all,
                first,
                paginate,
                filters
            }

        },

        async update(collectionName, id, data) {
            await init()

            delete data['id']
            const collection = db.collection(collectionName);
            
            await collection.findOneAndUpdate(
                { _id: id },
                { $set: data },
            );

            return {id: id, ...data}
            // return result.value;
        },

        async remove(collectionName, id) {
            await init()

            const collection = db.collection(collectionName);
            
            const result = await collection.findOneAndDelete({ _id: id });

            return result.value;
        }
    };
};

function applyFilters(items, filters) {
    return filters.reduce((prev, curr) => {
        return prev.filter((x) => applyComparison(x[curr.field], curr.operator, curr.value));
    }, items);
}

function applyComparison(value, operator, compareValue) {
    if(!value) return false;
    switch (operator) {
        case '=':
            return value === compareValue;
        case 'like':
            console.log('like', compareValue, value, compareValue.indexOf(value) >=0)
            return value.indexOf(compareValue) >=0
        case '!=':
            return value !== compareValue;
        case 'in':
            if(Array.isArray(value)) {
                const hasIntersection = compareValue.some(item => value.includes(item));
                return hasIntersection
            } else {
                return (compareValue??[]).includes(value);
            }
        case 'all':
            if(!Array.isArray(value) || value.length == 0) {
                return false
            }
            for(let item of compareValue) {
                if(!value?.includes(item)) {
                    return false
                }
            }
            return true
        case '<':
            return value < compareValue;
        case '<=':
            return value <= compareValue;
        case '>':
            return value > compareValue;
        case '>=':
            return value >= compareValue;
        // Add other conditions as needed
        default:
            return true; // No comparison applied for unknown operators
    }
}