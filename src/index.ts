#!/usr/bin/env node
import type { Region } from 'fitdays-api'

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { FitDaysSession } from './fitdays.js'
import { buildServer } from './server.js'

const main = async (): Promise<void> => {
  const email = process.env.FITDAYS_EMAIL
  const password = process.env.FITDAYS_PASSWORD
  const region = (process.env.FITDAYS_REGION ?? 'us') as Region

  if (!email || !password) {
    console.error('FITDAYS_EMAIL and FITDAYS_PASSWORD must be set in the environment.')
    process.exit(1)
  }

  const session = new FitDaysSession(email, password, region)
  const server = buildServer(session)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
