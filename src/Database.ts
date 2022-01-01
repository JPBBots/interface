import { MongoClient, Db, Collection } from 'mongodb'
import { EventEmitter } from '@jpbberry/typed-emitter'

export class Database extends EventEmitter<{ started: void }>{
  mongo: MongoClient
  db?: Db

  connected = false

  waitingQueue: {
    collection: string,
    req: any[],
    promise: (any) => any
  }[] = []

  constructor (host: string, public username: string, password: string) {
    super()

    this.mongo = new MongoClient(`mongodb://${username}:${password}@${host}:27017/`, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    this.connect()
  }

  async connect () {
    await this.mongo.connect()

    this.db = this.mongo.db(this.username)
    this.connected = true

    this.waitingQueue.forEach(x => {
      this.collection(x.collection).findOne(...x.req as [any]).then(res => {
        x.promise(res)
      })
    })

    this.emit('started')
  }

  get collection (): (name: string) => Collection {
    if (!this.db) {
      return (name: string) => ({
        findOne: (..._) => {
          return new Promise(resolve => {
            this.waitingQueue.push({
              collection: name,
              req: _,
              promise: resolve
            })
          })
        }
      }) as Collection
    }
    return this.db?.collection.bind(this.db)
  }
}