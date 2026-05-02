import type { User, WeightRecord } from 'fitdays-api'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import type { FitDaysSession } from './fitdays.js'

const json = (value: unknown) => ({
  content: [{ text: JSON.stringify(value, null, 2), type: 'text' as const }],
})

const summarizeUser = (u: User) => ({
  birthday: u.birthday,
  height_cm: u.height,
  nickname: u.nickname,
  sex: u.sex === 0 ? 'female' : 'male',
  suid: u.suid,
  target_weight_kg: u.target_weight,
  uid: u.uid,
})

const summarizeWeight = (r: WeightRecord) => ({
  bfr_pct: r.bfr,
  bm_kg: r.bm,
  bmi: r.bmi,
  bmr_kcal: r.bmr,
  bodyage: r.bodyage,
  data_id: r.data_id,
  is_deleted: r.is_deleted,
  measured_at: new Date(r.measured_time * 1000).toISOString(),
  measured_time: r.measured_time,
  pp_pct: r.pp,
  rom_pct: r.rom,
  sfr_pct: r.sfr,
  suid: r.suid,
  uid: r.uid,
  uvi: r.uvi,
  vwc_pct: r.vwc,
  weight_kg: r.weight_kg,
  weight_lb: r.weight_lb,
})

export const buildServer = (session: FitDaysSession): McpServer => {
  const server = new McpServer({ name: 'fitdays-mcp-server', version: '1.0.0' })

  server.registerTool(
    'list_users',
    {
      description: 'List the sub-users (people) registered under the FitDays account.',
      inputSchema: {},
      title: 'List FitDays users',
    },
    async () => {
      const data = await session.getSync()
      return json(data.users.filter((u) => u.is_deleted === 0).map(summarizeUser))
    },
  )

  server.registerTool(
    'list_devices',
    {
      description: 'List the FitDays-compatible devices known to the account.',
      inputSchema: {},
      title: 'List FitDays devices',
    },
    async () => {
      const data = await session.getSync()
      return json(data.devices.map((d) => ({
        device_id: d.device_id,
        firmware_ver: d.firmware_ver,
        mac: d.mac,
        model: d.model,
        name: d.name,
      })))
    },
  )

  server.registerTool(
    'get_weight_history',
    {
      description: 'Return body-composition / weight measurements, optionally filtered by sub-user (`suid`) and time window. Times are unix seconds. By default includes records the server marks `is_deleted: 1` (tombstones from the mobile app) — set `include_deleted: false` to hide them.',
      inputSchema: {
        include_deleted: z.boolean().optional()
          .describe('Include records with `is_deleted: 1` (server-side tombstones). Default: true.'),
        limit: z.number().int().positive().max(1000).optional()
          .describe('Maximum number of records (newest first). Default: 100.'),
        since: z.number().int().nonnegative().optional()
          .describe('Only include records measured at or after this unix-seconds timestamp.'),
        suid: z.number().int().optional()
          .describe('Sub-user id (from list_users). Omit to return records for all users.'),
        until: z.number().int().nonnegative().optional()
          .describe('Only include records measured at or before this unix-seconds timestamp.'),
      },
      title: 'Weight history',
    },
    async ({ include_deleted, limit, since, suid, until }) => {
      const includeDeleted = include_deleted ?? true
      const data = await session.getSync()
      const records = data.weight_list
        .filter((r) => includeDeleted || r.is_deleted === 0)
        .filter((r) => suid === undefined || r.suid === suid)
        .filter((r) => since === undefined || r.measured_time >= since)
        .filter((r) => until === undefined || r.measured_time <= until)
        .sort((a, b) => b.measured_time - a.measured_time)
        .slice(0, limit ?? 100)
        .map(summarizeWeight)
      return json(records)
    },
  )

  server.registerTool(
    'get_latest_weight',
    {
      description: 'Return the most recent weight measurement, optionally for a single sub-user. By default ignores tombstoned records (`is_deleted: 1`).',
      inputSchema: {
        include_deleted: z.boolean().optional()
          .describe('Include records with `is_deleted: 1`. Default: false.'),
        suid: z.number().int().optional()
          .describe('Sub-user id. Omit to return the latest record across all users.'),
      },
      title: 'Latest weight',
    },
    async ({ include_deleted, suid }) => {
      const includeDeleted = include_deleted ?? false
      const data = await session.getSync()
      const latest = data.weight_list
        .filter((r) => includeDeleted || r.is_deleted === 0)
        .filter((r) => suid === undefined || r.suid === suid)
        .reduce<null | WeightRecord>((acc, r) => {
          return acc === null || r.measured_time > acc.measured_time ? r : acc
        }, null)
      return json(latest ? summarizeWeight(latest) : null)
    },
  )

  server.registerTool(
    'refresh_sync',
    {
      description: 'Force-refresh the cached FitDays sync data. Returns counts per record type.',
      inputSchema: {},
      title: 'Refresh sync cache',
    },
    async () => {
      const data = await session.getSync(true)
      const activeWeight = data.weight_list.filter((r) => r.is_deleted === 0).length
      return json({
        devices: data.devices.length,
        height_records: data.height_list.length,
        users: data.users.length,
        weight_records: {
          active: activeWeight,
          deleted: data.weight_list.length - activeWeight,
          total: data.weight_list.length,
        },
      })
    },
  )

  return server
}
