import type { WeightExtData } from 'fitdays-api'

import { type SexLabel, sexLabel } from './sex-label.js'

export type BodyTypeLabel =
  | 'Athletic' |
  'Balanced' |
  'Hidden Overweight' |
  'Muscular' |
  'Muscular Overweight' |
  'Muscular Slim' |
  'Obese' |
  'Overweight' |
  'Slightly Underweight' |
  'Slim' |
  'Underweight'

export type WeightExtensionDataSummary = {
  age: number
  bfmControl: number
  bfmMax: number
  bfmMin: number
  bfmStandard: number
  bfpMax: number
  bfpMin: number
  bfpStandard: number
  bmiMax: number
  bmiMin: number
  bmiStandard: number
  bmrMax: number
  bmrMin: number
  bmrStandard: number
  bodyScore: number
  bodyType: 'unknown' | BodyTypeLabel
  boneMax: number
  boneMin: number
  deviceModelExt: string
  deviceNameExt: string
  deviceSoftwareVer: null | string
  ffmControl: number
  ffmStandard: number
  height: number
  muscleMassMax: number
  muscleMassMin: number
  obesityDegree: number
  onlyMeasureWeight: boolean
  proteinMassMax: number
  proteinMassMin: number
  sex: SexLabel
  smi: number
  smmMax: number
  smmMin: number
  smmStandard: number
  targetBodyfatMass: null | number
  targetSMMMass: null | number
  targetWeight: number
  waterMassMax: number
  waterMassMin: number
  weightControl: number
  weightMax: number
  weightMin: number
  weightStandard: number
}

const BODY_TYPE_LABELS: Readonly<Record<number, BodyTypeLabel>> = {
  0: 'Underweight',
  1: 'Slightly Underweight',
  2: 'Muscular Slim',
  3: 'Slim',
  4: 'Muscular',
  5: 'Balanced',
  6: 'Athletic',
  7: 'Muscular Overweight',
  8: 'Obese',
  9: 'Overweight',
  10: 'Hidden Overweight',
}

export const summarizeWeightExtensionData = (
  extensionData: null | WeightExtData,
): null | WeightExtensionDataSummary => {
  if (extensionData === null) return null

  return {
    age: extensionData.age,
    bfmControl: extensionData.bfmControl,
    bfmMax: extensionData.bfmMax,
    bfmMin: extensionData.bfmMin,
    bfmStandard: extensionData.bfmStandard,
    bfpMax: extensionData.bfpMax,
    bfpMin: extensionData.bfpMin,
    bfpStandard: extensionData.bfpStandard,
    bmiMax: extensionData.bmiMax,
    bmiMin: extensionData.bmiMin,
    bmiStandard: extensionData.bmiStandard,
    bmrMax: extensionData.bmrMax,
    bmrMin: extensionData.bmrMin,
    bmrStandard: extensionData.bmrStandard,
    bodyScore: extensionData.bodyScore,
    bodyType: BODY_TYPE_LABELS[extensionData.bodyType] ?? 'unknown',
    boneMax: extensionData.boneMax,
    boneMin: extensionData.boneMin,
    deviceModelExt: extensionData.deviceModelExt,
    deviceNameExt: extensionData.deviceNameExt,
    deviceSoftwareVer: extensionData.deviceSoftwareVer ?? null,
    ffmControl: extensionData.ffmControl,
    ffmStandard: extensionData.ffmStandard,
    height: extensionData.height,
    muscleMassMax: extensionData.muscleMassMax,
    muscleMassMin: extensionData.muscleMassMin,
    obesityDegree: extensionData.obesityDegree,
    onlyMeasureWeight: extensionData.onlyMeasureWeight === '1',
    proteinMassMax: extensionData.proteinMassMax,
    proteinMassMin: extensionData.proteinMassMin,
    sex: sexLabel(extensionData.sex),
    smi: extensionData.smi,
    smmMax: extensionData.smmMax,
    smmMin: extensionData.smmMin,
    smmStandard: extensionData.smmStandard,
    targetBodyfatMass: extensionData.targetBodyfatMass ?? null,
    targetSMMMass: extensionData.targetSMMMass ?? null,
    targetWeight: extensionData.targetWeight,
    waterMassMax: extensionData.waterMassMax,
    waterMassMin: extensionData.waterMassMin,
    weightControl: extensionData.weightControl,
    weightMax: extensionData.weightMax,
    weightMin: extensionData.weightMin,
    weightStandard: extensionData.weightStandard,
  }
}
