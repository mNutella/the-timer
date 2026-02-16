# Warm Earthy UI Redesign

## Goal
Full aesthetic overhaul of the time-tracking app to match a warm, earthy design reference. Cream backgrounds, warm brown accents, soft shadows, distinct sidebar panel. No structural/layout changes — purely visual.

## Color Palette (OKLCH)

### Light Mode
| Token | Value | Description |
|---|---|---|
| background | oklch(0.96 0.01 75) | Warm cream page bg |
| foreground | oklch(0.25 0.02 55) | Dark brown text |
| card | oklch(0.98 0.008 75) | Light cream card surface |
| primary | oklch(0.45 0.05 60) | Warm brown CTA |
| secondary | oklch(0.93 0.015 70) | Warm light tan |
| muted | oklch(0.92 0.012 70) | Muted warm bg |
| muted-foreground | oklch(0.55 0.03 55) | Secondary text |
| border | oklch(0.88 0.02 70) | Warm borders |
| sidebar | oklch(0.93 0.018 65) | Distinct warm panel |

### Dark Mode
Warm dark tones (espresso/chocolate) instead of cold charcoal.

## Surface Treatment
- Border radius: 0.625rem -> 0.75rem
- Cards: warm-tinted box shadow
- Sidebar: distinct warmer surface, soft right border
- Header: softer border treatment

## Files Changed
1. `src/globals.css` — All color tokens
2. `src/components/ui/card.tsx` — Warm shadow
3. `src/components/site-header.tsx` — Softer header border
