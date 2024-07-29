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
                        paginate
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
                    paginate
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
                data._id ??= new UUID();
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
            return data;
        },

        query(collection) {
            let filters = []

            async function paginate(page = 1, perPage = 10) {
                await init()

                let items = applyFilters(db[collection] ?? [], filters)

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
                await init()
                let items = applyFilters(db[collection] ?? [], filters)

                return items[0] 
            }

            function filter(field, operator, value) {
                filters.push({field, operator, value})
                return {
                    filter,
                    all,
                    first,
                    paginate
                }
            }

            async function all() {
                await init()

                let items = applyFilters(db[collection] ?? [], filters)

                return items
            }

            return {
                all,
                filter,
                first,
                paginate
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
                return db[collection][index];
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
                return deleted;
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
            const collection = db.collection(collectionName);

            function applyMongoFilters() {
              // TODO: filters
              let query = {}

              for (const filter of filters) {
                  query[filter.field] = {};
                  switch (filter.operator) {
                      case '=':
                          query[filter.field] = filter.value;
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
                    paginate
                }
            }

            async function all() {
                await init()

                const query = applyMongoFilters()

                return collection.find(query).toArray();
            }

            async function first() {
                await init()

                const query = applyMongoFilters()
                return collection.find(query).toArray()[0];
            }

            async function paginate(page = 1, perPage = 0) {
                await init()

                const query = applyMongoFilters()

                console.log({query})
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
                paginate
            }

        },

        async update(collectionName, id, data) {
            await init()

            delete data['id']
            const collection = db.collection(collectionName);
            
            await collection.findOneAndUpdate(
                { _id: new UUID(id) },
                { $set: data },
            );

            return {id: new UUID(id), ...data}
            // return result.value;
        },

        async remove(collectionName, id) {
            await init()

            const collection = db.collection(collectionName);
            
            const result = await collection.findOneAndDelete({ _id: new UUID(id) });

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
    switch (operator) {
        case '=':
            return value === compareValue;
        case '!=':
            return value !== compareValue;
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