type FilterOperators = "=" | '!=' | '>' | '>=' | '<' | '<='
type QueryFilters = { field: string, operator: FilterOperators, value: any}

type QueryParams = { filters: QueryFilters[], page: number, perPage: number }
type QueryResult<T> = { page: number, perPage: number, total: number, data: T[] }
type InsertParams<T> = T
type WithId<T> = {id: string} & T;

type DB = <T extends object>(collectionName: string) => {
    query: (params: QueryParams) => Promise<QueryResult<T>>,
    insert: (data: InsertParams<T>) => Promise<WithId<T>>,
    update: (data: WithId<T>) => Promise<WithId<T>>,
    remove: (id: string) => Promise<boolean>,
}

type MemoryDbOptions = any
type FileDbOptions = { path: string }
type MongoDbOptions = { uri: string, db: string }
type HttpDbOptions = any

export type createMemoryDbType = (options: MemoryDbOptions) => DB
export type createFileDbType = (options: FileDbOptions) => DB
export type createMongoDbType = (options: MongoDbOptions) => DB
export type createHttpDbType = (options: HttpDbOptions) => DB