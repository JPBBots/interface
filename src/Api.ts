import fetch from 'node-fetch'

import { Snowflake } from 'discord-api-types'

export class Api {
  url = 'https://jpbbots.org/api'

  public _request (method: 'GET' | 'POST', url: string, headers?: any, body?: any) {
    return fetch(`${this.url}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {})
      },
      body
    }).then(x => x.text())
  }

  public async isAdmin (id: Snowflake) {
    const req = await this._request('GET', `/admin/${id}`)

    return !!Number(req)
  }

  public async getPremium (id: Snowflake) {
    const req = await this._request('GET', `/premium/${id}`)

    return Number(req)
  }
}
