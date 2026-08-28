import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import type { FitDaysSession } from './fitdays.js'

import { summarizeUser, summarizeWeight } from './type.js'

const json = (value: unknown) => ({
  content: [{ text: JSON.stringify(value, null, 2), type: 'text' as const }],
})

const joinDescriptionLines = (lines: readonly string[]): string => lines.join('\n')

const extensionDataDescriptionLines = [
  '`ext_data` contains the measured person\'s context and FitDays reference values for interpreting the weight metrics. Treat these as informational rather than authoritative, and adjust them to the person\'s actual situation.',
  'Context fields describe the person and measurement state, including `age`, `height`, `sex` (`female` or `male`), and `onlyMeasureWeight` (whether the record contains weight only).',
  'Range and standard fields provide reference targets: `Min` and `Max` define the reference range, while `Standard` is the recommended value. They include body-fat mass, body-fat percentage, BMI, basal metabolic rate, bone mass, muscle mass, skeletal muscle mass, protein mass, water mass, and weight fields.',
  'Control fields indicate the suggested adjustment toward the corresponding `Standard` value, including `bfmControl` (body-fat mass), `ffmControl` (fat-free mass), and `weightControl` (weight).',
  'Fat-free-mass reference fields provide the recommended fat-free mass, including `ffmStandard`.',
  'Index fields provide skeletal-muscle indexing, including `smi` (skeletal muscle index).',
  'Classification fields describe body-composition status, including `bodyScore`, `bodyType`, and `obesityDegree`.',
  'Target fields describe target body-composition values, including `targetWeight`, `targetBodyfatMass`, and `targetSMMMass`; unavailable target-mass values are `null`.',
  'Device fields identify the source device, including `deviceModelExt`, `deviceNameExt`, and `deviceSoftwareVer`.',
] as const

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
        'Returns a list ordered newest first. Each measurement contains `weight_kg`, `weight_lb`, `bmi`, `bfr_pct` (body fat percentage), `rom_pct` (muscle percentage), `rosm_pct` (skeletal muscle percentage), `vwc_pct` (body water percentage), `pp_pct` (protein percentage), `sfr_pct` (subcutaneous fat percentage), `uvi` (visceral fat index), `bm_kg` (bone mass), `bmr_kcal` (basal metabolic rate), `bodyage` (body age), `measured_at` (ISO 8601 timestamp), `measured_time` (Unix-seconds timestamp), `data_id`, `suid`, `uid`, `is_deleted`, and `ext_data`',
        ...extensionDataDescriptionLines,
        'By default includes tombstoned records (`is_deleted: 1`); set `include_deleted: false` to hide them.',
      ]),
      inputSchema: {
        include_deleted: z.boolean().optional()
          .describe('Include records with `is_deleted: 1` (server-side tombstones). Default: true.'),
        include_ext_data: z.boolean().optional()
          .describe('Include the `ext_data` reference/context object. Set to false when only the measurement data is needed or the context already contains sufficient `ext_data` information; useful for plotting historical trends. Default: true.'),
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
    async ({ include_deleted, include_ext_data, limit, since, suid, until }) => {
      const includeDeleted = include_deleted ?? true
      const includeExtensionData = include_ext_data ?? true
      const data = await session.getSync()
      const records = data.weight_list
        .filter((r) => includeDeleted || r.is_deleted === 0)
        .filter((r) => suid === undefined || r.suid === suid)
        .filter((r) => since === undefined || r.measured_time >= since)
        .filter((r) => until === undefined || r.measured_time <= until)
        .sort((a, b) => b.measured_time - a.measured_time)
        .slice(0, limit ?? 100)
        .map((weightRecord) => summarizeWeight(weightRecord, includeExtensionData))
      return json(records)
    },
  )

  server.registerTool(
    'get_latest_weight',
    {
      description: joinDescriptionLines([
        'Return the most recent body-composition / weight measurement in the current global cache, optionally for a single sub-user(suid).',
        'Data is fetched lazily when no valid cache exists and stored in a global cache shared by all tools for 5 minutes; subsequent queries use that cached snapshot until it expires. Use `refresh_sync` if you are within the 5-minute cache window and fresher data is required.',
        'Returns exactly one measurement containing `weight_kg`, `weight_lb`, `bmi`, `bfr_pct` (body fat percentage), `rom_pct` (muscle percentage), `rosm_pct` (skeletal muscle percentage), `vwc_pct` (body water percentage), `pp_pct` (protein percentage), `sfr_pct` (subcutaneous fat percentage), `uvi` (visceral fat index), `bm_kg` (bone mass), `bmr_kcal` (basal metabolic rate), `bodyage` (body age), `measured_at` (ISO 8601 timestamp), `measured_time` (Unix-seconds timestamp), `data_id`, `suid`, `uid`, `is_deleted`, and `ext_data`, or `null` if no matching measurement exists.',
        ...extensionDataDescriptionLines,
        'By default ignores tombstoned records (`is_deleted: 1`).',
      ]),
      inputSchema: {
        include_deleted: z.boolean().optional()
          .describe('Include records with `is_deleted: 1`. Default: false.'),
        include_ext_data: z.boolean().optional()
          .describe('Include the `ext_data` reference/context object. Set to false to omit it. Default: true.'),
        suid: z.number().int().optional()
          .describe('Sub-user id resolved by `list_users`. Omit to return the latest record across all users.'),
      },
      title: 'Latest weight',
    },
    async ({ include_deleted, include_ext_data, suid }) => {
      const includeDeleted = include_deleted ?? false
      const includeExtensionData = include_ext_data ?? true
      const data = await session.getSync()
      const latest = data.weight_list
        .filter((r) => includeDeleted || r.is_deleted === 0)
        .filter((r) => suid === undefined || r.suid === suid)
        .reduce<(typeof data.weight_list)[number] | null>((acc, r) => {
          return acc === null || r.measured_time > acc.measured_time ? r : acc
        }, null)
      return json(latest ? summarizeWeight(latest, includeExtensionData) : null)
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
