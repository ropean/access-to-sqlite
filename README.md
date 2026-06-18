# Access → SQLite (Web)

Convert Microsoft Access (`.mdb` / `.accdb`) databases to SQLite from your browser.
Upload (or drag & drop) a database, get a `.sqlite` file back.

No Windows, no Microsoft Access Database Engine — conversion is powered by
[**mdbtools**](https://github.com/mdbtools/mdbtools), so it runs anywhere,
including Linux containers.

## Stack

- **Node.js + Express** — HTTP server and file upload
- **mdbtools** (`mdb-schema`, `mdb-tables`, `mdb-export`) — reads Access files
- **sqlite3** CLI — writes the output database
- **Docker** — single-container deployment

## How it works

1. Browser uploads the Access file to `POST /api/convert`.
2. Server lists tables with `mdb-tables`, builds the schema with
   `mdb-schema … sqlite`, then streams each table's rows via
   `mdb-export -I sqlite … | sqlite3 output.sqlite`.
3. The resulting `.sqlite` file streams back as a download.

Uploaded files and intermediate output live in a temp dir that is deleted after
each request. With Docker, `/tmp` is mounted as `tmpfs` (RAM) — nothing persists.

## Run with Docker (recommended)

```bash
docker compose up -d --build
```

Then open `http://<host>:5014`.

### Configuration

| Env var      | Default        | Description                         |
| ------------ | -------------- | ----------------------------------- |
| `PORT`       | `5014`         | Listen port                         |
| `MAX_UPLOAD` | `20971520`     | Max upload size in bytes (20 MB)    |

## Deploy to a VPS (CI/CD)

`.github/workflows/deploy-ssh-docker.yml` builds the image, pushes it to GHCR,
copies `docker-compose.yml` to the server, and runs `docker compose up -d` over SSH.

- **Trigger**: push to a `release` / `release*` branch, or run manually via
  *Actions → Deploy via SSH (Docker) → Run workflow*. Pushing `main` does **not**
  deploy.
- **Image**: `ghcr.io/ropean/access-to-sqlite` (the server pulls this tag).

Required repository secrets (under the `VPS` environment):

| Secret            | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `SSH_HOST`        | Server hostname / IP                             |
| `SSH_USERNAME`    | SSH user                                         |
| `SSH_PRIVATE_KEY` | SSH private key                                  |
| `SSH_PORT`        | SSH port (defaults to 22)                        |
| `SSH_DEPLOY_PATH` | Dir on server holding `docker-compose.yml`       |
| `GHCR_PAT`        | GHCR token with `read:packages` (server pull)    |

> The service has no authentication. Put it behind a reverse proxy with auth, or
> bind it to a private/VPN interface before exposing it publicly.

## Run locally (dev)

Requires `mdbtools` and `sqlite3` on `PATH`:

```bash
# macOS
brew install mdbtools sqlite3
# Debian/Ubuntu
sudo apt-get install mdbtools sqlite3

pnpm install
pnpm start            # or: pnpm dev  (auto-reload)
```

Open `http://localhost:5014`.

## API

```bash
curl -F "file=@database.mdb" http://localhost:5014/api/convert -o output.sqlite
```

Response is the SQLite file; `X-Table-Count` header reports the number of tables converted.

## Notes

- Supports both legacy `.mdb` (JET) and modern `.accdb` files.
- Table data, primary keys, and UTF-8 text (incl. CJK) are preserved.
- mdbtools is read-only on the Access side — your source file is never modified.
- Default upload limit is 20 MB; raise it with the `MAX_UPLOAD` env var (bytes).
