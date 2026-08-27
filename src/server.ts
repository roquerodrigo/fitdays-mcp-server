import type { User, WeightRecord } from 'fitdays-api'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import type { FitDaysSession } from './fitdays.js'

const json = (value: unknown) => ({
  content: [{ text: JSON.stringify(value, null, 2), type: 'text' as const }],
})

const joinDescriptionLines = (lines: readonly string[]): string => lines.join('\n')

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
  const server = new McpServer(
    {
      name: 'fitdays-mcp-server',
      version: '1.0.0',
    },
    {
      instructions: joinDescriptionLines([
        'This MCP provides access to FitDays (沃莱 in Chinese) smart-scale data.',
        '',
        'Use this MCP when the user asks about body weight, body fat, fat mass, body composition, smart-scale measurements, or health data related to weight and body composition.',
        '',
        'It provides current and historical personal measurements, including body weight, BMI, body fat percentage, muscle percentage, body water, protein, bone mass, subcutaneous fat, visceral fat, basal metabolic rate, body age, and related body-composition measurements.',
      ]),
    },
  )

  server.registerTool(
    'list_users',
    {
      description: joinDescriptionLines([
        'List the sub-users (people) registered under the FitDays account.',
        'Each user has a unique and stable `suid`, used by other tools to query data for that user. You may save the `suid` in memory for future queries.',
        'A FitDays account has one unique `uid`; all sub-users under the same account share the same `uid`.',
        'If a required `suid` is not already known, call this tool first and use known user information to identify the correct `suid`.',
        'Returns a list where each entry contains `nickname`, `sex` (`male` or `female`, biological sex), `birthday`, `height_cm`, `target_weight_kg` (user-set target weight), `suid`, and `uid` (account uid).',
      ]),
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
      description: joinDescriptionLines([
        'List bounded devices under the FitDays account.',
        'Returns `device_id` (FitDays device identifier), `name`, `model`, `mac` (MAC address), and `firmware_ver` (firmware version) for each device.',
      ]),
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
      description: joinDescriptionLines([
        'Return body-composition / weight measurements, optionally filtered by sub-user (`suid`) and time window.',
        'Data is fetched lazily when no valid cache exists and stored in a global cache shared by all tools for 5 minutes; subsequent queries use that cached snapshot until it expires. Use `refresh_sync` if you are within the 5-minute cache window and fresher data is required.',
        'Returns a list ordered newest first. Each measurement contains `weight_kg`, `weight_lb`, `bmi`, `bfr_pct` (body fat percentage), `rom_pct` (muscle percentage), `vwc_pct` (body water percentage), `pp_pct` (protein percentage), `sfr_pct` (subcutaneous fat percentage), `uvi` (visceral fat index), `bm_kg` (bone mass), `bmr_kcal` (basal metabolic rate), `bodyage` (body age), `measured_at` (ISO 8601 timestamp), `measured_time` (Unix-seconds timestamp), `data_id`, `suid`, `uid`, and `is_deleted`.',
        'By default includes tombstoned records (`is_deleted: 1`); set `include_deleted: false` to hide them.',
      ]),
      inputSchema: {
        include_deleted: z.boolean().optional()
          .describe('Include records with `is_deleted: 1` (server-side tombstones). Default: true.'),
        limit: z.number().int().positive().max(1000).optional()
          .describe('Maximum number of records (newest first). Default: 100.'),
        since: z.number().int().nonnegative().optional()
          .describe('Only include records measured at or after this unix-seconds timestamp.'),
        suid: z.number().int().optional()
          .describe('Sub-user id resolved by `list_users`. Omit to return records for all users.'),
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
      description: joinDescriptionLines([
        'Return the most recent body-composition / weight measurement in the current global cache, optionally for a single sub-user(suid).',
        'Data is fetched lazily when no valid cache exists and stored in a global cache shared by all tools for 5 minutes; subsequent queries use that cached snapshot until it expires. Use `refresh_sync` if you are within the 5-minute cache window and fresher data is required.',
        'Returns exactly one measurement containing `weight_kg`, `weight_lb`, `bmi`, `bfr_pct` (body fat percentage), `rom_pct` (muscle percentage), `vwc_pct` (body water percentage), `pp_pct` (protein percentage), `sfr_pct` (subcutaneous fat percentage), `uvi` (visceral fat index), `bm_kg` (bone mass), `bmr_kcal` (basal metabolic rate), `bodyage` (body age), `measured_at` (ISO 8601 timestamp), `measured_time` (Unix-seconds timestamp), `data_id`, `suid`, `uid`, and `is_deleted`, or `null` if no matching measurement exists.',
        'By default ignores tombstoned records (`is_deleted: 1`).',
      ]),
      inputSchema: {
        include_deleted: z.boolean().optional()
          .describe('Include records with `is_deleted: 1`. Default: false.'),
        suid: z.number().int().optional()
          .describe('Sub-user id resolved by `list_users`. Omit to return the latest record across all users.'),
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
      description: joinDescriptionLines([
        'Force-refresh the global FitDays cache shared by all tools.',
        'FitDays data is loaded lazily: the first tool call that needs synchronized account data fetches a fresh snapshot and stores it in the global cache for 5 minutes. This includes measurement queries such as `get_latest_weight` and `get_weight_history`, as well as account-data queries such as `list_users` and `list_devices`.',
        'Subsequent tool calls within that 5-minute window reuse the same cached snapshot. Use this tool when fresher data is required before the cache expires, such as after a recent measurement, deletion, user change, or device change.',
        'A full resync transfers a large amount of data and is a heavy operation; you should avoid unnecessary refreshes.',
        'Returns synchronized record counts for `devices`, `users`, `height_records`, and `weight_records` (`active`, `deleted`, `total`).',
      ]),
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
