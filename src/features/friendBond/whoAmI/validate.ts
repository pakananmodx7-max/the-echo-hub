import type { WhoAmIEntry } from './types'
import { ALL_ENTRIES } from './data'
import { THAILAND_PROVINCES } from './data/thailandProvinces'

export interface ValidationIssue {
  level: 'error' | 'warning'
  message: string
}

export interface ValidationReport {
  totalEntries: number
  countByCategory: Record<string, number>
  countBySubcategory: Record<string, number>
  duplicateAnswers: string[]
  duplicateIds: string[]
  missingRequiredFields: string[]
  thailandProvinceCount: number
  thailandProvinceUniqueCount: number
  issues: ValidationIssue[]
  ok: boolean
}

const VALID_DIFFICULTIES = new Set(['easy', 'normal', 'hard'])

export function validateWhoAmIData(entries: WhoAmIEntry[] = ALL_ENTRIES): ValidationReport {
  const issues: ValidationIssue[] = []

  const countByCategory: Record<string, number> = {}
  const countBySubcategory: Record<string, number> = {}
  const seenIds = new Map<string, number>()
  const seenAnswers = new Map<string, number>()
  const missingRequiredFields: string[] = []

  for (const entry of entries) {
    countByCategory[entry.category] = (countByCategory[entry.category] ?? 0) + 1
    const subKey = entry.subcategory ?? entry.category
    countBySubcategory[subKey] = (countBySubcategory[subKey] ?? 0) + 1

    seenIds.set(entry.id, (seenIds.get(entry.id) ?? 0) + 1)
    const answerKey = `${entry.category}::${entry.subcategory ?? ''}::${entry.answer.trim().toLowerCase()}`
    seenAnswers.set(answerKey, (seenAnswers.get(answerKey) ?? 0) + 1)

    if (!entry.id || !entry.answer || !entry.category || !entry.difficulty) {
      missingRequiredFields.push(entry.id || '(no id)')
    }
    if (!VALID_DIFFICULTIES.has(entry.difficulty)) {
      issues.push({ level: 'error', message: `Entry ${entry.id} has invalid difficulty: ${entry.difficulty}` })
    }
  }

  const duplicateIds = [...seenIds.entries()].filter(([, count]) => count > 1).map(([id]) => id)
  const duplicateAnswers = [...seenAnswers.entries()].filter(([, count]) => count > 1).map(([key]) => key)

  const provinceIds = new Set(THAILAND_PROVINCES.map((p) => p.id))
  const thailandProvinceCount = THAILAND_PROVINCES.length
  const thailandProvinceUniqueCount = provinceIds.size

  if (thailandProvinceUniqueCount !== 77) {
    issues.push({
      level: 'error',
      message: `Thailand provinces must be exactly 77 unique, found ${thailandProvinceUniqueCount}`,
    })
  }
  if (duplicateIds.length > 0) {
    issues.push({ level: 'error', message: `Duplicate IDs found: ${duplicateIds.join(', ')}` })
  }
  if (duplicateAnswers.length > 0) {
    issues.push({ level: 'warning', message: `Duplicate answers within the same subcategory: ${duplicateAnswers.join(', ')}` })
  }
  if (missingRequiredFields.length > 0) {
    issues.push({ level: 'error', message: `Entries missing required fields: ${missingRequiredFields.join(', ')}` })
  }

  const ok = issues.filter((i) => i.level === 'error').length === 0

  return {
    totalEntries: entries.length,
    countByCategory,
    countBySubcategory,
    duplicateAnswers,
    duplicateIds,
    missingRequiredFields,
    thailandProvinceCount,
    thailandProvinceUniqueCount,
    issues,
    ok,
  }
}
