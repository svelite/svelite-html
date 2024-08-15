type FilterOperators = "=" | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'like'
type QueryFilters = { field: string, operator: FilterOperators, value: any}
 
type QueryPaginatedResult<T> = { page: number, perPage: number, total: number, data: T[] }
type InsertParams<T> = T
type WithId<T> = {id: string} & T;

type QueryFirstType = () => Promise<WithId<T>>
type QueryAllType = () => Promise<Array<WithId<T>>>
type QueryPaginateType = (page: number, perPage: number) => Promise<QueryPaginatedResult<T>>
type QueryFilterType = (field: string, operator: FilterOperators, value: any) => QueryType
type QueryType = { 
    first: QueryFirstType, 
    all: QueryAllType, 
    paginate: QueryPaginateType
    filter: QueryFilterType
}

type DB = <T extends object>(collectionName: string) => {
    query: () => QueryType,
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