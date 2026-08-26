# THE ECHO HUB

> "พื้นที่เล็ก ๆ ที่เราได้ฟัง เข้าใจ และส่งต่อสิ่งดี ๆ ให้กัน"

A warm, safe social & activity hub for students — **Phase 1 visual prototype**.

## Stack

- React + TypeScript + Vite
- React Router (client-side routing)
- Tailwind CSS v4 (design tokens for the cream / lavender / pink / mint palette)
- Mock authentication backed by `localStorage` (no Firebase yet)

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (defaults to `http://localhost:5173`).

## Demo authentication

This phase intentionally has **no backend and no environment variables**.
`src/features/auth/authService.ts` implements an `AuthService` interface
against `localStorage`; any email + a 6+ character password will log in or
register. The interface is designed so a `FirebaseAuthService` can replace
`LocalAuthService` later without touching any component.

To wipe demo data, use "รีเซ็ตข้อมูลทดลองทั้งหมด" on the Profile page, or
clear `localStorage` for the site.

## Project structure

```
src/
  components/   reusable UI (Button, Card, Avatar, MoodPicker, Modal, ...)
  pages/        route-level screens (welcome, login, onboarding, hub/*)
  features/     mock service layer (auth)
  data/         mock data (avatars, moods, online users, missions)
  context/      AuthContext (React Context wrapping the auth service)
  hooks/        useAuth
  types/        shared TypeScript types
```

## Scope

Phase 1 covers the full navigable UI/UX: welcome → login/register →
codename & avatar → mood check-in → Hub home → Echo Space, Hear With
Heart activities, Friend Bond games (Friend Quest, Who Am I?), Someone To
Talk To, and Profile. Realtime chat, presence, and Firebase are **not**
implemented yet — those are Phase 2+.
