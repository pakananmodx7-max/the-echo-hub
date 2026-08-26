import type {
  GardenAccessory,
  GardenAvatarConfig,
  GardenBottomStyle,
  GardenHairStyle,
  GardenSkinTone,
  GardenTopStyle,
} from '../features/garden/types'

export const SKIN_TONES: { id: GardenSkinTone; hex: string; label: string }[] = [
  { id: 'porcelain', hex: '#f6dfc9', label: 'อ่อน' },
  { id: 'warm', hex: '#e8c19d', label: 'อุ่น' },
  { id: 'tan', hex: '#caa06f', label: 'แทน' },
  { id: 'deep', hex: '#9c6b45', label: 'เข้ม' },
  { id: 'cocoa', hex: '#6b4530', label: 'โกโก้' },
]

export const HAIR_STYLES: { id: GardenHairStyle; label: string }[] = [
  { id: 'short', label: 'สั้น' },
  { id: 'medium', label: 'กลาง' },
  { id: 'tied', label: 'มัดผม' },
  { id: 'wavy', label: 'หยิก' },
  { id: 'long', label: 'ยาว' },
]

export const HAIR_COLORS: string[] = ['#3a3245', '#6b4530', '#8a6a4f', '#d9a441', '#a480f5', '#e0729f']

export const TOP_STYLES: { id: GardenTopStyle; label: string }[] = [
  { id: 'hoodie', label: 'ฮู้ดดี้' },
  { id: 'tshirt', label: 'เสื้อยืด' },
  { id: 'sweater', label: 'สเวตเตอร์' },
  { id: 'shirt', label: 'เชิ้ต' },
]

export const CLOTHING_COLORS: string[] = ['#8b5fe8', '#ff9fc0', '#8fd6b4', '#f2a94a', '#5aa9d6', '#3a3245', '#fdfaf4']

export const BOTTOM_STYLES: { id: GardenBottomStyle; label: string }[] = [
  { id: 'pants', label: 'กางเกงขายาว' },
  { id: 'shorts', label: 'ขาสั้น' },
  { id: 'skirt', label: 'กระโปรง' },
]

export const ACCESSORIES: { id: GardenAccessory; label: string; icon: string }[] = [
  { id: 'none', label: 'ไม่มี', icon: '—' },
  { id: 'glasses', label: 'แว่นตา', icon: '👓' },
  { id: 'cap', label: 'หมวกแก๊ป', icon: '🧢' },
  { id: 'beanie', label: 'หมวกไหมพรม', icon: '🎩' },
  { id: 'headphones', label: 'หูฟัง', icon: '🎧' },
  { id: 'backpack', label: 'เป้', icon: '🎒' },
]

export const DEFAULT_GARDEN_AVATAR_CONFIG: GardenAvatarConfig = {
  skinTone: 'warm',
  hairStyle: 'medium',
  hairColor: '#3a3245',
  topStyle: 'hoodie',
  topColor: '#8b5fe8',
  bottomStyle: 'pants',
  bottomColor: '#3a3245',
  accessory: 'none',
}

/**
 * Mock online members don't have their own saved Avatar Studio config, so we
 * give the small fixed roster (see gardenSeedData.ts) plausible, stable
 * looks keyed by their existing app-wide avatarId, purely for visual variety
 * in the scene.
 */
export const MOCK_MEMBER_AVATAR_CONFIGS: Record<string, GardenAvatarConfig> = {
  moon: {
    skinTone: 'porcelain',
    hairStyle: 'long',
    hairColor: '#3a3245',
    topStyle: 'sweater',
    topColor: '#8fd6b4',
    bottomStyle: 'pants',
    bottomColor: '#3a3245',
    accessory: 'none',
  },
  fox: {
    skinTone: 'tan',
    hairStyle: 'short',
    hairColor: '#8a6a4f',
    topStyle: 'hoodie',
    topColor: '#f2a94a',
    bottomStyle: 'shorts',
    bottomColor: '#3a3245',
    accessory: 'headphones',
  },
  cloud: {
    skinTone: 'warm',
    hairStyle: 'wavy',
    hairColor: '#a480f5',
    topStyle: 'tshirt',
    topColor: '#8b5fe8',
    bottomStyle: 'skirt',
    bottomColor: '#ff9fc0',
    accessory: 'none',
  },
  comet: {
    skinTone: 'deep',
    hairStyle: 'tied',
    hairColor: '#3a3245',
    topStyle: 'shirt',
    topColor: '#5aa9d6',
    bottomStyle: 'pants',
    bottomColor: '#fdfaf4',
    accessory: 'glasses',
  },
  star: {
    skinTone: 'cocoa',
    hairStyle: 'medium',
    hairColor: '#3a3245',
    topStyle: 'hoodie',
    topColor: '#ff9fc0',
    bottomStyle: 'shorts',
    bottomColor: '#3a3245',
    accessory: 'cap',
  },
  bear: {
    skinTone: 'warm',
    hairStyle: 'short',
    hairColor: '#8a6a4f',
    topStyle: 'sweater',
    topColor: '#c98a5f',
    bottomStyle: 'pants',
    bottomColor: '#8a6a4f',
    accessory: 'beanie',
  },
  whale: {
    skinTone: 'porcelain',
    hairStyle: 'wavy',
    hairColor: '#5aa9d6',
    topStyle: 'tshirt',
    topColor: '#5aa9d6',
    bottomStyle: 'shorts',
    bottomColor: '#3a3245',
    accessory: 'none',
  },
  otter: {
    skinTone: 'tan',
    hairStyle: 'long',
    hairColor: '#6b4530',
    topStyle: 'shirt',
    topColor: '#8b5fe8',
    bottomStyle: 'pants',
    bottomColor: '#3a3245',
    accessory: 'backpack',
  },
}

export function mockMemberAvatarConfig(avatarId: string): GardenAvatarConfig {
  return MOCK_MEMBER_AVATAR_CONFIGS[avatarId] ?? DEFAULT_GARDEN_AVATAR_CONFIG
}
