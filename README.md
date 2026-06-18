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

Then open `http://<host>:3000`.

### Configuration

| Env var      | Default        | Description                         |
| ------------ | -------------- | ----------------------------------- |
| `PORT`       | `3000`         | Listen port                         |
| `MAX_UPLOAD` | `268435456`    | Max upload size in bytes (256 MB)   |

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

Open `http://localhost:3000`.

## API

```bash
curl -F "file=@database.mdb" http://localhost:3000/api/convert -o output.sqlite
```

Response is the SQLite file; `X-Table-Count` header reports the number of tables converted.

## Notes

- Supports both legacy `.mdb` (JET) and modern `.accdb` files.
- Table data, primary keys, and UTF-8 text (incl. CJK) are preserved.
- mdbtools is read-only on the Access side — your source file is never modified.
