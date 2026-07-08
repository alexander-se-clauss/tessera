# Tile Map Editor

A browser-based tile map editor for 2D games. Create projects, import tilesets, paint maps, place objects and events, configure a player, and preview the result in a built-in canvas game engine.

## Versions

| Layer | Version |
|---|---|
| Java | `25` LTS |
| Spring Boot | `4.0.6` |
| PostgreSQL | `17` |
| React | `19` |
| TypeScript | `6` |
| Vite | `8` |

## Stack

**Backend** (`tessera.tile.backend`) — Spring Boot REST API
- Spring Security + OAuth2 resource server (JWT)
- Spring Data JPA + Flyway (15 migrations)
- Multipart asset upload and tile extraction pipeline

**Frontend** — React + Vite SPA
- MUI 9 for UI components
- Redux Toolkit + RTK Query for state and API
- React Router 7
- Vitest for unit tests

## Features

**Editor**
- Projects with create / load / delete
- Maps with configurable dimensions and tile layers (stored as JSON)
- Map groups — arrange maps on an overworld grid with neighbor traversal
- Tileset import wizard: upload an image → extract tiles → assign collision boxes → review
- Tileset group organizer for categorizing tiles
- Object types with custom sprites and collision data
- Map events placed on tiles (triggers, transitions)
- Player configurator: sprite selection, collision box, movement speed, mirror movements

**In-browser game preview** (canvas, 160×144 viewport)
- Camera tracking, tile renderer, animated tile support
- Player entity with movement and collision
- Object collision map
- HUD and menu renderer
- Screen transitions between connected maps

## Start

1. Make sure Docker Desktop is running.
2. Start PostgreSQL:

```bash
docker compose up postgres
```

3. Run the backend from your IDE or locally. The default local database settings are in `backend/src/main/resources/application.properties`; override them with environment variables if your PostgreSQL setup differs.
4. In another terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` to the backend on `http://localhost:8080`.

For IDE/local backend runs, Flyway is configured to read migrations from both:

- `src/main/resources/db/migration` on the filesystem
- the packaged classpath resources

That avoids stale resource-copy issues during local development.

## Demo account

- Username: `testuser`
- Password: `pass123`

The backend seeds this user automatically on startup if it does not already exist.
