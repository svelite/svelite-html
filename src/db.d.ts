export type DB = any

type MemoryDbOptions = any
type FileDbOptions = any
type MongoDbOptions = any
type HttpDbOptions = any

export const createMemoryDb = (options: MemoryDbOptions) => DB
export const createFileDb = (options: FileDbOptions) => DB
export const createMongoDb = (options: MongoDbOptions) => DB
export const createHttpDb = (options: HttpDbOptions) => DB