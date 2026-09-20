# AI Hydrant Detection System

React + Vite + TypeScript frontend with a Node.js + Express satellite data pipeline and Gemini vision analysis.

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

The frontend lets a user draw an area on the Leaflet map, choose Sentinel-1 or Sentinel-2, and submit a date range. The Express API validates the GeoJSON polygon and queries the Copernicus Data Space catalogue. When a product is selected, the frontend sends only the selected area and product metadata to the backend. The backend authenticates with Copernicus, fetches the official preview image, sends it to Gemini for cautious visual analysis, and converts a positive result into a map-ready `Potential Water Extraction Hotspot` with evidence, confidence, and coordinates. The same geometry can be submitted again with another date range for change comparison.

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

Copy `.env.example` to `server/.env`, then add the Gemini API key and Copernicus Data Space credentials on the backend only. Never commit `.env` or expose `GEMINI_API_KEY` through a `VITE_` variable. `GEMINI_MODEL` is configurable; the default is `gemini-2.5-flash`. Copernicus catalogue search is public, while protected preview assets require `CDSE_ACCESS_TOKEN` or `CDSE_USERNAME` and `CDSE_PASSWORD`; client credentials are retained as a fallback for catalogue-compatible access.

The backend loads `server/.env`, not the root `.env.example`. After changing credentials, restart the backend process so dotenv reloads them.

Gemini receives the Copernicus preview as inline base64 image data. The backend uses the Gemini `generateContent` API and requests JSON output.

The Gemini prompt requires JSON output and instructs the model to identify only visible, evidence-based signs such as reservoirs, channels, pumps, tanks, pipes, disturbed soil, or irrigation patterns. It must avoid claiming illegality or certainty from imagery alone.

