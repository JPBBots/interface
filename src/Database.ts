import { MongoClient, Db, Collection, Document } from 'mongodb'
import { EventEmitter } from '@jpbberry/typed-emitter'

export class Database extends EventEmitter<{ started: void }> {
  mongo: MongoClient
  db?: Db

  connected = false

  waitingQueue: {
    collection: string
    req: any[]
    promise: (any) => any
  }[] = []

  constructor(
    host: string,
    public username: string,
    password: string,
    production: boolean
  ) {
    super()

    this.mongo = new MongoClient(
      `mongodb://${
        production && password ? `${username}:${password}@` : ''
      }${host}:27017/`
    )

    this.connect()
  }

  async connect() {
    await this.mongo.connect()

    this.db = this.mongo.db(this.username)
    this.connected = true

    this.waitingQueue.forEach((x) => {
      this.collection(x.collection)
        .findOne(...(x.req as [any]))
        .then((res) => {
          x.promise(res)
        })
    })

    this.emit('started')
  }

  get collection(): <Schema extends Document = any>(name: string) => Collection<Schema> {
    if (!this.db) {
      return (name: string) =>
        ({
          findOne: (..._) => {
            return new Promise((resolve) => {
              this.waitingQueue.push({
                collection: name,
                req: _,
                promise: resolve,
              })
            })
          },
        } as any)
    }
    return this.db?.collection.bind(this.db)
  }
}
