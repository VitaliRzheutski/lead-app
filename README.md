## Lead App Monorepo

This is a minimal monorepo with:
- `apps/web`: React + TypeScript + Vite + Tailwind
- `apps/api`: Node.js + Express + TypeScript

### Prerequisites

- Node.js (LTS or newer)
- npm

### Install dependencies

From the repo root:

```bash
npm install
```

This will install dependencies for both `apps/web` and `apps/api` via npm workspaces.

### Running the web app

From the repo root:

```bash
npm run dev:web
```

Then open the URL shown in the terminal (typically `http://localhost:5173`).

### Running the API

1. Copy the example environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

2. Start the API dev server from the repo root:

```bash
npm run dev:api
```

The API will listen on the port defined in `apps/api/.env` (default `3000`).

### Health check endpoint

The API exposes a simple health check route:

- **Method**: `GET`
- **Path**: `/health`
- **Response body**:

```json
{ "ok": true }
```

