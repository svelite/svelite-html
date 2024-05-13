export type DB = any

type MemoryDbOptions = any
type FileDbOptions = any
type MongoDbOptions = any
type HttpDbOptions = any

export type createMemoryDb = (options: MemoryDbOptions) => DB
export type createFileDb = (options: FileDbOptions) => DB
export type createMongoDb = (options: MongoDbOptions) => DB
export type createHttpDb = (options: HttpDbOptions) => DB