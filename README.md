# AI Hydrant Detection System

React + Vite + TypeScript frontend with a Node.js + Express satellite data pipeline.

## Project Structure

```text
src/
  assets/       Static assets
  components/   Reusable UI components
  layouts/      Shared page layouts
  lib/          Small application utilities
  pages/        Page-level components
  services/     External service integrations
  App.tsx       Application entry component
  main.tsx      React bootstrap
```

The frontend lets a user draw an area on the Leaflet map, choose Sentinel-1 or Sentinel-2, and submit a date range. The Express API validates the GeoJSON polygon and queries the Copernicus Data Space catalogue. The same geometry can be submitted again with another date range for future change comparison.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

In a second terminal, start the satellite API:

```bash
npm run server
```

Copy `.env.example` to `.env` when local environment configuration is needed. The current catalogue search uses the public Copernicus catalogue endpoint; credentials should only be added later for protected product downloads.

The current home screen is intentionally a minimal placeholder. Product features will be added in later phases.
