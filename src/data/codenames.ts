const ADJECTIVES = [
  'Blue', 'Little', 'Green', 'Moon', 'Sunny', 'Purple', 'Tiny', 'Blue',
  'Soft', 'Quiet', 'Golden', 'Misty', 'Gentle', 'Silver', 'Cozy',
]

const NOUNS = [
  'Moon', 'Cloud', 'Fox', 'Bear', 'Whale', 'Star', 'Comet', 'Otter',
  'Sparrow', 'Fern', 'Rabbit', 'Willow', 'Breeze', 'Lantern', 'Pebble',
]

export const SAMPLE_CODENAMES = [
  'BlueMoon17', 'LittleCloud08', 'GreenFox21', 'MoonBear14',
  'SunnyWhale09', 'PurpleStar11', 'TinyComet27', 'BlueOtter16',
]

export function generateCodename(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num = String(Math.floor(Math.random() * 90) + 10)
  return `${adj}${noun}${num}`
}
