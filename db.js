import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {MongoClient} from 'mongodb'

import {customAlphabet} from 'nanoid';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const getId = customAlphabet(alphabet, 8);

// TODO: Cleanup structure of db
// Use one function and multiple adapters.
// Add Mongodb adapter
export function createMemoryDb(initialData = {}) {
    const _data = initialData

    return (table = "") => {
        return {
            async query({ filters, page, perPage }) {
                if (!_data[table]) return []

                return {
                    data: _data[table]
                }

            },
            async insert(data) {

                console.log('insert: ', data)
                if(!_data[table])
                    _data[table] = []
                
                data.id ??= getId();
                data.createdAt = new Date().valueOf()
                data.updatedAt = 0

                console.log('insert: ', data)

                _data[table].push(data)

                return data
            },
            async update(data) {

                if (!_data[table]) {
                    return;
                }

                _data[table] = _data[table].map(x => {

                    if (x.id === data.id)
                        data.updatedAt = new Date().valueOf()
                        return { ...x, ...data }

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

export function createHttpDb(base_url, token) {
    return (table = "") => {
        async function call(path, body) {

            console.log('db:', `${base_url}/${token}/${table}/${path}`, body)
            const response = await fetch(`${base_url}/${token}/${table}/${path}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }).then(res => res.json())
            return response;
        }

        return {
            async query({ filters, page, perPage }) {
                return call('query', { filters, page, perPage })
            },
            async insert(data) {
                return call('insert', data)
            },
            async update(data) {
                return call('update', data)
            },
            async remove(id) {
                return call('remove', { id })
            }
        }
    }
}

export function createFileDb(path) {

    const adapter = createFileAdapter(path)

	return (collectionName) => {
		return {
			query({filters = [], page = 1, perPage= 0} = {}) {
                
                return adapter.query(collectionName, {
                    filters, 
                    pagination: {page, perPage}
                })
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

const createFileAdapter = (path) => {
    if(!existsSync(path)) {
        writeFileSync(path, '{}')
    }

    let db = {}

    function read() {
        const file = readFileSync(path);
        db = JSON.parse(file)
    }
    read()

    function write() {
        writeFileSync(path, JSON.stringify(db));
    }

    let isDirty = false;

    setInterval(() => {
        if(isDirty) {
            write()
        }
        isDirty = false
    }, 2000)

    return {
        async insert(collection, data) {
            if (!db[collection]) {
                db[collection] = [];
            }
            db[collection].push(data);
            isDirty = true
            return data;
        },

        async query(collection, {pagination = {page: 1, perPage: 0}, filters = []}) {
            if (!db[collection]) {
                return {data:[], total: 0, page: 1, perPage: 0};
            }

            let items = applyFilters(db[collection], filters)

            return {
                data: pagination.perPage === 0 ? items : items.slice(
                    (pagination.page - 1) * pagination.perPage,
                    pagination.page * pagination.perPage
                ),
                total: items.length,
                page: pagination.page,
                perPage: pagination.perPage === 0 ? items.length : Math.min(items.length, pagination.perPage)
            }
        },

        async update(collection, id, data) {
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

function applyFilters(items, filters) {
    return filters.reduce((prev, curr) => {
        return prev.filter((x) => applyComparison(x[curr.field], curr.operator, curr.value));
    }, items);
}


function applyComparison(value, operator, compareValue) {
    switch (operator) {
        case '=':
            return value === compareValue;
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

const createMongoAdapter = async (uri, dbName) => {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    const db = client.db(dbName);

    return {
        async insert(collectionName, data) {
            const collection = db.collection(collectionName);
            const result = await collection.insertOne(data);
            return result.insertedId
        },

        async query(collectionName, { pagination: { page = 1, perPage = 0 }, filters = {} }) {
            const collection = db.collection(collectionName);

            // TODO: filters
            let query = {}

            for (const filter of filters) {
                query[filter.field] = {};
                switch (filter.operator) {
                    case '=':
                        query[filter.field] = filter.value;
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

            query = collection.find(query)

            let total = query.countDocuments;
            let data;
            if (perPage > 0) {
                data = await query.skip((page - 1) * perPage)
                                   .limit(perPage)
                                   .toArray();
            } else {
                data = await query.toArray();
            }

            return {
                data,
                total,
                page: page,
                perPage: perPage === 0 ? total : Math.min(total, perPage)
            };
        },

        async update(collectionName, id, data) {
            const collection = db.collection(collectionName);
            const result = await collection.findOneAndUpdate(
                { _id: id },
                { $set: data },
                { returnOriginal: false }
            );
            return result.value;
        },

        async remove(collectionName, id) {
            const collection = db.collection(collectionName);
            const result = await collection.findOneAndDelete({ _id: id });
            return result.value;
        }
    };
};

export async function createMongoDb(uri, db) {

    let adapter = await createMongoAdapter(uri, db)
  
    console.log({adapter})
	return (collectionName) => {
		return {
			query({filters = [], page = 1, perPage= 0} = {}) {
                
                return adapter.query(collectionName, {
                    filters, 
                    pagination: {page, perPage}
                })
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