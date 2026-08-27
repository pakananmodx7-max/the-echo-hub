import type { WhoAmICategoryGroup, WhoAmIEntry } from '../types'
import { ONE_PIECE } from './onePiece'
import { DEMON_SLAYER } from './demonSlayer'
import { NARUTO } from './naruto'
import { DRAGON_BALL } from './dragonBall'
import { CONAN } from './conan'
import { MY_HERO_ACADEMIA } from './myHeroAcademia'
import { THAILAND_PROVINCES } from './thailandProvinces'
import { INTERNATIONAL_MUSIC } from './internationalMusic'
import { INTERNATIONAL_90S_MUSIC } from './international90sMusic'
import { THAI_90S_MUSIC } from './thai90sMusic'
import { LUK_THUNG } from './lukThung'
import { THAI_POP_ROCK } from './thaiPopRock'
import { MOVIES } from './movies'
import { SPORTS } from './sports'
import { FOOD } from './food'
import { ANIMALS } from './animals'
import { OCCUPATIONS } from './occupations'
import { FUNNY } from './funny'

export const ALL_ENTRIES: WhoAmIEntry[] = [
  ...ONE_PIECE,
  ...DEMON_SLAYER,
  ...NARUTO,
  ...DRAGON_BALL,
  ...CONAN,
  ...MY_HERO_ACADEMIA,
  ...THAILAND_PROVINCES,
  ...INTERNATIONAL_MUSIC,
  ...INTERNATIONAL_90S_MUSIC,
  ...THAI_90S_MUSIC,
  ...LUK_THUNG,
  ...THAI_POP_ROCK,
  ...MOVIES,
  ...SPORTS,
  ...FOOD,
  ...ANIMALS,
  ...OCCUPATIONS,
  ...FUNNY,
]

/** UI-facing hierarchy: which category groups exist, and which subcategory chips to show. */
export const CATEGORY_GROUPS: WhoAmICategoryGroup[] = [
  {
    id: 'anime',
    label: 'อนิเมะ',
    emoji: '🎌',
    subcategories: [
      { id: 'one-piece', label: 'วันพีซ', emoji: '☠️' },
      { id: 'demon-slayer', label: 'ดาบพิฆาตอสูร', emoji: '⚔️' },
      { id: 'naruto', label: 'นารูโตะ', emoji: '🍥' },
      { id: 'dragon-ball', label: 'ดราก้อนบอล', emoji: '🐉' },
      { id: 'conan', label: 'ยอดนักสืบจิ๋วโคนัน', emoji: '🕵️' },
      { id: 'my-hero-academia', label: 'มายฮีโร่อคาเดเมีย', emoji: '🦸' },
    ],
  },
  {
    id: 'thailand-provinces',
    label: 'ทายจังหวัดไทย',
    emoji: '🇹🇭',
    subcategories: [
      { id: 'north', label: 'ภาคเหนือ', emoji: '⛰️' },
      { id: 'northeast', label: 'ภาคอีสาน', emoji: '🌾' },
      { id: 'central', label: 'ภาคกลาง', emoji: '🏞️' },
      { id: 'east', label: 'ภาคตะวันออก', emoji: '🌊' },
      { id: 'west', label: 'ภาคตะวันตก', emoji: '🌉' },
      { id: 'south', label: 'ภาคใต้', emoji: '🏝️' },
    ],
  },
  {
    id: 'music',
    label: 'ทายเพลง',
    emoji: '🎵',
    supportsMusicMode: true,
    subcategories: [
      { id: 'international', label: 'เพลงสากล', emoji: '🌎' },
      { id: 'international-90s', label: 'เพลงสากลยุค 90s', emoji: '💿' },
      { id: 'thai-90s', label: 'เพลงไทยยุค 90s', emoji: '📼' },
      { id: 'luk-thung', label: 'เพลงลูกทุ่ง', emoji: '🎤' },
      { id: 'thai-pop-rock', label: 'Thai Pop / Rock', emoji: '🎸' },
    ],
  },
  {
    id: 'movies',
    label: 'หนัง / ซีรีส์ / การ์ตูน',
    emoji: '🎬',
    subcategories: [
      { id: 'movies-international', label: 'หนังสากล', emoji: '🌎' },
      { id: 'thai', label: 'หนังไทย', emoji: '🇹🇭' },
      { id: 'korean-series', label: 'ซีรีส์เกาหลี', emoji: '🇰🇷' },
      { id: 'animation', label: 'Animation', emoji: '🧸' },
      { id: 'superhero', label: 'Superhero', emoji: '🦸' },
    ],
  },
  {
    id: 'sports',
    label: 'กีฬา',
    emoji: '⚽',
    subcategories: [{ id: 'sports', label: 'กีฬาทั้งหมด', emoji: '⚽' }],
  },
  {
    id: 'food',
    label: 'อาหาร',
    emoji: '🍜',
    subcategories: [
      { id: 'thai-food', label: 'อาหารไทย', emoji: '🍛' },
      { id: 'dessert', label: 'ขนม', emoji: '🍰' },
      { id: 'international-food', label: 'อาหารต่างประเทศ', emoji: '🍣' },
      { id: 'fruit', label: 'ผลไม้', emoji: '🍉' },
      { id: 'drink', label: 'เครื่องดื่ม', emoji: '🥤' },
    ],
  },
  {
    id: 'animals',
    label: 'สัตว์',
    emoji: '🐾',
    subcategories: [
      { id: 'land', label: 'สัตว์บก', emoji: '🐘' },
      { id: 'sea', label: 'สัตว์ทะเล', emoji: '🐳' },
      { id: 'bird', label: 'สัตว์ปีก', emoji: '🦅' },
      { id: 'exotic', label: 'สัตว์แปลก', emoji: '🦎' },
    ],
  },
  {
    id: 'occupations',
    label: 'อาชีพ',
    emoji: '💼',
    subcategories: [{ id: 'occupations', label: 'อาชีพทั้งหมด', emoji: '💼' }],
  },
  {
    id: 'funny',
    label: 'อะไรก็ได้!',
    emoji: '😂',
    subcategories: [{ id: 'funny', label: 'มุกฮา ๆ ทั้งหมด', emoji: '😂' }],
  },
]

/** Flat lookup: every real (category, subcategory) pair that has at least one entry. */
export function allSubcategoryIds(): string[] {
  const ids = new Set<string>()
  for (const entry of ALL_ENTRIES) {
    ids.add(entry.subcategory ?? entry.category)
  }
  return [...ids]
}

export function entriesForSubcategoryIds(subcategoryIds: string[]): WhoAmIEntry[] {
  const wanted = new Set(subcategoryIds)
  return ALL_ENTRIES.filter((e) => wanted.has(e.subcategory ?? e.category))
}

export function countBySubcategory(subcategoryId: string): number {
  return ALL_ENTRIES.filter((e) => (e.subcategory ?? e.category) === subcategoryId).length
}
