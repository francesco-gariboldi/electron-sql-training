import React, { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type SchemaEvent = {
  id: number;
  happened_at: string;
  username: string;
  ddl_tag: string;
  object_type?: string | null;
  schema_name?: string | null;
  object_identity?: string | null;
  command?: string | null;
};

type TableCol = { name: string; data_type: string };

type Table = {
  schema: string;
  name: string;
  columns: TableCol[];
  referencedBy: { schema: string; table: string; constraint: string }[];
  references: { schema: string; table: string; constraint: string }[];
};

function tableId(t: { schema: string; name: string }) {
  return `${t.schema}.${t.name}`;
}

export default function App() {
  const [tables, setTables] = useState<Table[]>([]);
  const [events, setEvents] = useState<SchemaEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  async function refreshSchema() {
    const res = await fetch('/api/schema');
    if (!res.ok) throw new Error(`Schema request failed: ${res.status}`);
    const data = (await res.json()) as { tables: Table[] };
    setTables(data.tables);
    setLastRefresh(new Date().toLocaleTimeString());
  }

  async function loadRecentEvents() {
    const res = await fetch('/api/events?limit=50');
    if (!res.ok) throw new Error(`Events request failed: ${res.status}`);
    const data = (await res.json()) as { events: SchemaEvent[] };
    setEvents(data.events);
  }

  useEffect(() => {
    void refreshSchema().catch(() => void 0);
    void loadRecentEvents().catch(() => void 0);

    const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${wsProto}://${location.host}/events`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data as string) as { type: string; event?: SchemaEvent };
        if (payload.type === 'schema_event' && payload.event) {
          setEvents((prev) => [payload.event!, ...prev].slice(0, 50));
          // Refresh schema on DDL.
          void refreshSchema().catch(() => void 0);
        }
      } catch {
        // ignore
      }
    };

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // simple grid layout
    const colCount = Math.max(1, Math.ceil(Math.sqrt(tables.length || 1)));

    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      const id = tableId(t);
      const x = (i % colCount) * 320;
      const y = Math.floor(i / colCount) * 220;

      nodes.push({
        id,
        position: { x, y },
        data: {
          label: (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{id}</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                {t.columns.slice(0, 8).map((c) => (
                  <div key={c.name}>
                    {c.name}: <span style={{ opacity: 0.7 }}>{c.data_type}</span>
                  </div>
                ))}
                {t.columns.length > 8 ? <div style={{ opacity: 0.6 }}>…</div> : null}
              </div>
            </div>
          )
        },
        style: {
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 14,
          color: '#e8eaf0',
          padding: 12,
          width: 280
        }
      });

      for (const r of t.references) {
        const tgt = `${r.schema}.${r.table}`;
        edges.push({
          id: `${id}->${tgt}:${r.constraint}`,
          source: id,
          target: tgt,
          animated: false,
          style: { stroke: 'rgba(140,180,255,0.7)' }
        });
      }
    }

    return { nodes, edges };
  }, [tables]);

  return (
    <div className="app">
      <div className="header">
        <h1>SQL Training — Schema Graph</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge">WS: {connected ? 'connected' : 'disconnected'}</span>
          <span className="badge">Last refresh: {lastRefresh ?? '—'}</span>
          <button onClick={() => void refreshSchema()}>Refresh</button>
        </div>
      </div>

      <div className="content">
        <div style={{ minHeight: 0 }}>
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>

        <aside className="panel">
          <h2>DDL events (live)</h2>
          <div className="events">
            {events.map((e) => (
              <div key={e.id} className="event">
                <div className="meta">
                  <span className="tag">{e.ddl_tag}</span>
                  <span>{new Date(e.happened_at).toLocaleString()}</span>
                  <span style={{ marginLeft: 'auto' }}>{e.username}</span>
                </div>
                <div className="obj">
                  {e.object_identity ?? e.object_type ?? '(unknown)'}
                </div>
              </div>
            ))}
            {events.length === 0 ? <div style={{ opacity: 0.7 }}>No events yet.</div> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
