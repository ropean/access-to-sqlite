import express from "express";
import multer from "multer";
import { spawn } from "node:child_process";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
// Upload size limit (bytes). Default 256 MB.
const MAX_UPLOAD = Number(process.env.MAX_UPLOAD || 256 * 1024 * 1024);

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({
  dest: tmpdir(),
  limits: { fileSize: MAX_UPLOAD },
});

/**
 * Run a command, return a promise that resolves with stdout (string)
 * and rejects with stderr on non-zero exit. No shell — args passed as array.
 */
function run(cmd, args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} exited ${code}: ${err.trim()}`));
    });
    if (input != null) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

/**
 * Pipe `producer` (mdb-* command) stdout into `sqlite3 <db>` stdin.
 * Resolves when sqlite3 exits 0.
 */
function pipeIntoSqlite(producerCmd, producerArgs, dbPath) {
  return new Promise((resolve, reject) => {
    const producer = spawn(producerCmd, producerArgs);
    const sqlite = spawn("sqlite3", [dbPath]);
    let perr = "";
    let serr = "";
    producer.stderr.on("data", (d) => (perr += d));
    sqlite.stderr.on("data", (d) => (serr += d));
    producer.on("error", reject);
    sqlite.on("error", reject);
    producer.stdout.pipe(sqlite.stdin);
    let done = 0;
    const check = (who, code) => {
      if (code !== 0) {
        reject(
          new Error(
            `${who} failed (code ${code}): ${(who === "sqlite3" ? serr : perr).trim()}`
          )
        );
        return;
      }
      if (++done === 2) resolve();
    };
    producer.on("close", (c) => check(producerCmd, c));
    sqlite.on("close", (c) => check("sqlite3", c));
  });
}

app.post("/api/convert", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const accessPath = req.file.path;
  const baseName = (req.file.originalname || "database").replace(
    /\.(accdb|mdb)$/i,
    ""
  );
  const workDir = await mkdtemp(path.join(tmpdir(), "a2s-"));
  const dbPath = path.join(workDir, "output.sqlite");

  const cleanup = async () => {
    await rm(accessPath, { force: true }).catch(() => {});
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  };

  try {
    // 1. Validate / list tables (also acts as a format sanity check).
    const tablesRaw = await run("mdb-tables", ["-1", accessPath]);
    const tables = tablesRaw
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    if (tables.length === 0) {
      await cleanup();
      return res
        .status(422)
        .json({ error: "No tables found. Is this a valid Access database?" });
    }

    // 2. Schema -> sqlite.
    await pipeIntoSqlite("mdb-schema", [accessPath, "sqlite"], dbPath);

    // 3. Data, table by table.
    for (const table of tables) {
      await pipeIntoSqlite(
        "mdb-export",
        ["-I", "sqlite", accessPath, table],
        dbPath
      );
    }

    const { size } = await stat(dbPath);
    res.setHeader("Content-Type", "application/x-sqlite3");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${baseName}.sqlite"`
    );
    res.setHeader("Content-Length", size);
    res.setHeader("X-Table-Count", tables.length);

    const stream = createReadStream(dbPath);
    stream.pipe(res);
    stream.on("close", cleanup);
    stream.on("error", cleanup);
  } catch (e) {
    await cleanup();
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`access-to-sqlite listening on http://0.0.0.0:${PORT}`);
});
