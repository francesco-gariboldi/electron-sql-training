const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { Client } = require('pg');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

function pgConfig() {
  // Allows running from host (localhost) or from another container.
  return {
    user: process.env.PGUSER || 'myuser',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'mydb',
    password: process.env.PGPASSWORD || 'mypassword',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432
  };
}

async function getSchema() {
  const client = new Client(pgConfig());
  await client.connect();
  try {
    const tablesRes = await client.query(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema NOT IN ('pg_catalog','information_schema')
       ORDER BY table_schema, table_name;`
    );

    const colsRes = await client.query(
      `SELECT table_schema, table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema NOT IN ('pg_catalog','information_schema')
       ORDER BY table_schema, table_name, ordinal_position;`
    );

    const fkRes = await client.query(
      `SELECT
          tc.constraint_name,
          tc.table_schema AS src_schema,
          tc.table_name   AS src_table,
          ccu.table_schema AS tgt_schema,
          ccu.table_name   AS tgt_table
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema NOT IN ('pg_catalog','information_schema');`
    );

    const tables = tablesRes.rows.map((r) => ({
      schema: r.table_schema,
      name: r.table_name,
      columns: [],
      references: [],
      referencedBy: []
    }));

    const tableMap = new Map(tables.map((t) => [`${t.schema}.${t.name}`, t]));

    for (const r of colsRes.rows) {
      const t = tableMap.get(`${r.table_schema}.${r.table_name}`);
      if (t) t.columns.push({ name: r.column_name, data_type: r.data_type });
    }

    for (const r of fkRes.rows) {
      const src = tableMap.get(`${r.src_schema}.${r.src_table}`);
      const tgt = tableMap.get(`${r.tgt_schema}.${r.tgt_table}`);
      if (src) src.references.push({ schema: r.tgt_schema, table: r.tgt_table, constraint: r.constraint_name });
      if (tgt) tgt.referencedBy.push({ schema: r.src_schema, table: r.src_table, constraint: r.constraint_name });
    }

    return { tables };
  } finally {
    await client.end();
  }
}

async function getEvents(limit = 50, afterId = null) {
  const client = new Client(pgConfig());
  await client.connect();
  try {
    const params = [];
    let where = '';
    if (afterId != null) {
      params.push(afterId);
      where = `WHERE id > $${params.length}`;
    }
    params.push(limit);

    const res = await client.query(
      `SELECT id, happened_at, username, ddl_tag, object_type, schema_name, object_identity, command
       FROM public.schema_events
       ${where}
       ORDER BY id DESC
       LIMIT $${params.length};`,
      params
    );
    return res.rows;
  } finally {
    await client.end();
  }
}

const app = express();

// Avoid noisy CSP-related console errors when the browser probes /favicon.ico.
app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/events' });

let lastId = 0;

app.get('/api/schema', async (_req, res) => {
  try {
    const schema = await getSchema();
    res.json(schema);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/events', async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  try {
    const events = await getEvents(limit);
    if (events[0]?.id) lastId = Math.max(lastId, events[0].id);
    res.json({ events });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'hello', lastId }));
});

async function pollAndBroadcast() {
  try {
    const rows = await getEvents(100, lastId || null);
    // rows are DESC, newest first
    const ordered = [...rows].sort((a, b) => a.id - b.id);
    for (const ev of ordered) {
      lastId = Math.max(lastId, ev.id);
      const msg = JSON.stringify({ type: 'schema_event', event: ev });
      for (const client of wss.clients) {
        if (client.readyState === 1) client.send(msg);
      }
    }
  } catch {
    // ignore poll errors
  } finally {
    setTimeout(pollAndBroadcast, 1000);
  }
}

server.listen(PORT, () => {
  console.log(`Schema server listening on http://localhost:${PORT}`);
  pollAndBroadcast();
});
