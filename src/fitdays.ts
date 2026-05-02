import type { Region, SyncFromServerData } from 'fitdays-api'

import { FitDaysClient } from 'fitdays-api'

const SYNC_TTL_MS = 5 * 60 * 1000

export class FitDaysSession {
  private cache: null | { data: SyncFromServerData, fetchedAt: number } = null
  private client: FitDaysClient | null = null
  private loginPromise: null | Promise<void> = null

  constructor(
    private readonly email: string,
    private readonly password: string,
    private readonly region: Region = 'us',
  ) {}

  public getSync = async (force = false): Promise<SyncFromServerData> => {
    const now = Date.now()
    if (!force && this.cache && now - this.cache.fetchedAt < SYNC_TTL_MS) {
      return this.cache.data
    }
    const client = await this.getClient()
    const res = await client.syncAll()
    if (!res.data) {
      throw new Error(`syncAll returned no data (code=${String(res.code)})`)
    }
    this.cache = { data: res.data, fetchedAt: now }
    return res.data
  }

  private getClient = async (): Promise<FitDaysClient> => {
    if (this.client?.session) return this.client
    if (!this.loginPromise) {
      this.loginPromise = (async () => {
        const c = new FitDaysClient({ region: this.region })
        await c.login(this.email, this.password)
        this.client = c
      })().finally(() => {
        this.loginPromise = null
      })
    }
    await this.loginPromise
    if (!this.client) throw new Error('FitDays client not initialized after login')
    return this.client
  }
}
