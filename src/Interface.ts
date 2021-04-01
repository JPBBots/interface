import { Api } from './Api'
import { Database } from './Database'

export class Interface {
  api = new Api()

  createDb (username: string, password: string, host: string = '127.0.0.1') {
    return new Database(host, username, password)
  }
}
