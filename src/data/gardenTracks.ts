export interface GardenTrack {
  id: string
  title: string
  sourceType: 'youtube'
  youtubeVideoId: string
  enabled: boolean
}

export const GARDEN_TRACKS: GardenTrack[] = [
  {
    id: 'garden-ambience-1',
    title: 'Garden Ambience',
    sourceType: 'youtube',
    youtubeVideoId: 'STYh8DmYJp4',
    enabled: true,
  },
]

export const DEFAULT_GARDEN_TRACK: GardenTrack = GARDEN_TRACKS[0]
