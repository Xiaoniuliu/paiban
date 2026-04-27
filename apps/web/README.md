# Pilot Roster Web

React + TypeScript + Vite frontend for the pilot rostering system.

## Decisions

- Reuses the light visual theme and UI components from `浅色系前端设计.zip`.
- Business menus and pages follow the current FRD/Phase 1 plan, not the old zip structure.
- Legacy pages are available only under `Legacy Reference`.
- Default language is `zh-CN`; `en-US` is switchable.
- Default display timezone is `UTC+8`; `UTC` is switchable.

## Scripts

```powershell
npm install
npm run dev
npm run build
npm run test:e2e
```

The Vite dev server runs on `127.0.0.1:5180` and proxies `/api` to `http://localhost:8088`.
