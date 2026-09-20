# AI Hydrant Detection System

A screening tool for spotting **potential** unregistered water extraction from satellite imagery, and for confirming those detections on the ground.

1. A user draws an area on a map.
2. The backend fetches a Sentinel-2 image of that area from Copernicus Data Space.
3. Gemini looks at the image and reports visible, evidence-based signs of water infrastructure (reservoirs, channels, pumps, tanks, pipes, disturbed soil, irrigation patterns).
4. Every positive result is saved as a hotspot with its satellite evidence.
5. A field team visits the location, uploads photos, and marks the detection as verified, unverified, or needing further investigation.
6. An investigation dashboard shows all hotspots, their history and their verification status, filterable by country, region and date.

> **Responsible use.** Results are screening signals from imagery. They do not show that any water use is illegal, and they say nothing about ownership or intent. Always confirm on the ground or with records before acting.

## Features

- **Screening page**: draw a rectangle, pick a date range, run the analysis, and see the result with a confidence score, the signs the model saw, and a pin on the map.
- **Saved detections**: each positive result is stored with the exact image sent to Gemini. Repeat detections within about 300 m are grouped under one hotspot, which keeps a detection history.
- **Verification**: field teams add a status, notes, visit time, location (GPS or manual) and up to six photos. The latest verification sets the hotspot status.
- **Investigation dashboard**: status counts, filters (country, region, date, status, confidence, text search), a clustered map, a scrollable list, and CSV export.
- **Hotspot detail page**: scanned area on a map, satellite evidence, detection history, verification history with photo gallery.

### Verification statuses

| Status | Meaning |
| --- | --- |
| Pending | Detected, not visited yet |
| Verified | The team confirmed water-extraction infrastructure or suspicious activity on site |
| Unverified | The team visited and found nothing (the detection was likely a false alarm) |
| Further investigation | Inconclusive, needs another visit or more information |

## Tech stack

- **Frontend**: React, Vite, TypeScript, Leaflet (with marker clustering), React Router
- **Backend**: Node.js, Express, TypeScript, SQLite (better-sqlite3), Vitest
- **Data and AI**: Copernicus Data Space (Sentinel-2), Google Gemini vision

## Project structure

```
src/
  main.tsx            React bootstrap and routes
  App.tsx             Screening page (map, drawing, analysis result)
  Dashboard.tsx       Investigation dashboard
  HotspotDetail.tsx   Hotspot detail, history and verification form
  api.ts              Screening API calls and types
  dashboardApi.ts     Dashboard API calls and types
server/
  index.ts            Express app and routes
  copernicus.ts       Copernicus authentication and imagery
  gemini.ts           Gemini vision analysis
  hotspot.ts          Hotspot creation from analysis results
  seed.ts             Demo data
  tests/              Backend tests
  data/               SQLite database (created at runtime, not committed)
  uploads/            Saved images and field photos (created at runtime, not committed)
```

## Getting started

### Requirements

- Node.js 20 or newer
- A Google AI (Gemini) API key
- A free Copernicus Data Space account (dataspace.copernicus.eu)

### Install

```
npm install
cd server && npm install
```

### Configure

Copy `.env.example` to `server/.env` and fill in the values. The backend reads `server/.env`, not the root file. Restart the backend after any change.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Gemini API key |
| `GEMINI_MODEL` | No | Gemini model name (default `gemini-2.5-flash`) |
| `CDSE_USERNAME` | Yes* | Copernicus Data Space account email |
| `CDSE_PASSWORD` | Yes* | Copernicus Data Space password |
| `CDSE_ACCESS_TOKEN` | No | A ready-made token, used instead of username and password (tokens expire after about 10 minutes) |
| `ADMIN_TOKEN` | No | If set, write requests need `Authorization: Bearer <token>` |

\* Catalogue search is public. Downloading images needs an account.

Never commit `.env`, and never expose secrets through a `VITE_` variable.

### Run

In one terminal, start the backend (port 3001):

```
cd server
npm run dev
```

In a second terminal, start the frontend:

```
npm run dev
```

The frontend proxies `/api` to `http://localhost:3001`.

### Demo data

To try the dashboard without running real analyses:

```
cd server
npm run seed
```

This inserts 15 clearly marked demo hotspots with mixed statuses. Run it once, because running it again adds another 15. The demo locations and country labels are sample data for testing filters only.

### Checks

```
npx tsc --noEmit
npm run build
npm run lint
cd server && npm test
```

## API overview

| Method and path | Purpose |
| --- | --- |
| `POST /api/satellite/analyze` | Fetch the image for the drawn area, analyze it, save the result |
| `GET /api/hotspots` | List hotspots (filters: country, region, status, from, to, minConfidence, q, sort, page) |
| `GET /api/hotspots/stats` | Status counts and filter options |
| `GET /api/hotspots/:id` | Hotspot with detection and verification history |
| `PATCH /api/hotspots/:id` | Edit country and region |
| `POST /api/hotspots/:id/verifications` | Add a field verification with photos (multipart) |
| `GET /api/hotspots/export.csv` | CSV export using the same filters |

## Limitations

- **Resolution.** Sentinel-2 pixels are 10 m wide. The system can notice reservoirs, canals and irrigated fields. It cannot see individual hydrants, pipes or small tanks in city streets. Finding those needs much higher-resolution imagery.
- **Location.** When the model gives no coordinates, the pin is placed at the centre of the scanned area and is marked as approximate. Teams should search the whole scanned area, not just the pin.
- **Clouds and gaps.** Cloudy or partly empty images are reported as "not usable" instead of "no hotspot".
- **False positives.** The model can mistake ordinary land use for water infrastructure. That is why verification exists.

## Security and privacy

- Field photos can show people, homes and number plates. Keep `server/uploads/` and the database out of version control (already ignored) and out of public hosting.
- Set `ADMIN_TOKEN` before exposing the backend beyond your own machine. Real user accounts and roles are future work.
- Uploaded files are checked by type and size, stored under random names, and served with `nosniff`.

## Roadmap

- User accounts and roles for field teams and reviewers
- Pagination on the dashboard list
- Higher-resolution imagery sources
- Change detection by comparing the same area across dates
