# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start development server on localhost:3000
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Architecture

This is a Next.js 16 application using the App Router with TypeScript and Tailwind CSS 4.

### Key Technologies
- **Framework**: Next.js 16.1.3 with React 19
- **Styling**: Tailwind CSS 4 with PostCSS
- **UI Components**: shadcn/ui (new-york style) with lucide-react icons
- **Language**: TypeScript (strict mode enabled)

### Project Structure
- `src/app/` - Next.js App Router directory (file-based routing)
- `src/app/layout.tsx` - Root layout with Geist fonts and metadata
- `src/app/page.tsx` - Main planner component (client component)
- `src/app/globals.css` - Global styles with Tailwind imports and theme variables
- `src/components/ui/` - shadcn/ui components (Button, Input, Dialog, Select, Textarea)
- `src/lib/utils.ts` - Utility functions (cn helper for className merging)
- `public/` - Static assets

### Planner App Architecture
The main planner is a single-page client component with:
- **Two-column timeline**: Plan (계획) and Execution (실행) columns
- **10-minute time slots**: Grid-based layout with `SLOT_HEIGHT = 16px` per slot
- **Drag-and-drop**: Plan blocks can be dragged vertically to change time
- **Date selection**: Week view calendar with day navigation
- **Multi-day plans**: Plans can span multiple days when creating

Key data structures:
- `PlanBlock`: `{ id, title, start, end, color, date }` where `start`/`end` are minutes from midnight
- `toRow(minutes)`: Converts minutes to grid row number

### Import Alias
Use `@/*` to import from `src/*` (e.g., `import { Component } from '@/components/Component'`).

### Styling
- Tailwind CSS 4 with utility-first approach
- Dark mode via CSS `prefers-color-scheme` media query
- Theme colors defined as CSS custom properties in `globals.css`
- Geist Sans and Geist Mono fonts from `next/font`

### Server Components
Components in the App Router are Server Components by default. Add `'use client'` directive at the top of files that need client-side interactivity.
