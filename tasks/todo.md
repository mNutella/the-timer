# Timeline View for Analytics Page

## Implementation Steps

- [x] 1. Layout algorithm (`timeline-view/layout.ts`) — time-to-pixel mapping, overlap detection, color assignment
- [x] 2. Timeline block (`timeline-view/timeline-block.tsx`) — positioned entry block with tooltip + click handler
- [x] 3. Entry edit popover (`timeline-view/entry-edit-popover.tsx`) — inline editing with mutation hooks
- [x] 4. Day column (`timeline-view/day-column.tsx`) — hour markers, positioned blocks, current time indicator
- [x] 5. Main timeline component (`timeline-view/index.tsx`) — week nav, data fetching, grid layout
- [x] 6. Analytics page integration — add Tabs wrapping table + timeline
- [x] 7. Verification — visual check in browser

## Review
- TypeScript: zero new errors
- Vite build: succeeds
- Visual verification: all 10 acceptance criteria pass
  - Tab switching, week nav, positioned blocks, overlaps, edit popover, filters, colors, today highlight, auto-scroll
