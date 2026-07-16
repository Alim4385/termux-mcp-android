'use strict';
// Termux MCP Server (beta) — 1 alət, sıfır asılılıq

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = '127.0.0.1';
const HOME = '/data/data/com.termux/files/home';
const WS = path.join(HOME, 'claude_workspace');
const TM = 60_000;
const MAX = 15_000;
const SF = path.join(WS, '.mcp_state.json');

if (!fs.existsSync(WS)) fs.mkdirSync(WS, { recursive: true });

let cwd = WS;
try {
  const s = JSON.parse(fs.readFileSync(SF, 'utf8'));
  if (s.cwd && fs.existsSync(s.cwd)) cwd = s.cwd;
} catch {}
let saveTimer = null;
const saveCwd = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try { await fs.promises.writeFile(SF, JSON.stringify({ cwd })); } catch {}
  }, 500);
};
const flushCwd = async () => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  try { await fs.promises.writeFile(SF, JSON.stringify({ cwd })); } catch {}
};

// Token qənaəti üçün uzun çıxışı kəs
const cut = (t) => {
  const s = String(t ?? '');
  if (s.length <= MAX) return s;
  const h = (MAX >> 1) - 40;
  return `${s.slice(0, h)}\n...[${s.length - MAX} kəsildi]...\n${s.slice(-h)}`;
};

// Real cwd izləmək üçün marker — bash özü PWD-ni yazır, biz JS-də əmri parse etmirik
const MARK = '\u0001CWD\u0001';

// Bash əmrini icra et (timeout + kəsilmiş stdout/stderr + real cwd izləməsi)
const run = (cmd) => new Promise((resolve) => {
  let o = '', e = '', done = false;
  const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };

  const full = `${cmd}\nprintf '${MARK}%s' "$PWD"`;
  const p = spawn('bash', ['-c', full], { cwd, env: { ...process.env, HOME, TERM: 'xterm-256color' } });
  p.stdout.on('data', (d) => { if (o.length < MAX * 2) o += d; });
  p.stderr.on('data', (d) => { if (e.length < MAX * 2) e += d; });
  p.on('close', async (c) => {
    const i = o.lastIndexOf(MARK);
    const newCwd = i === -1 ? null : o.slice(i + MARK.length).trim();
    if (i !== -1) o = o.slice(0, i);
    finish({ c: c ?? 1, o: cut(o), e: cut(e), newCwd });
  });
  p.on('error', (x) => finish({ c: 1, o: '', e: x.message, newCwd: null }));

  const timer = setTimeout(() => {
    try { p.kill('SIGKILL'); } catch {}
    finish({ c: 124, o: cut(o), e: `${cut(e)}\n[TIMEOUT]`, newCwd: null });
  }, TM);
});

const text = (t, isError = false) => ({ result: { content: [{ type: 'text', text: t }], isError } });

// MCP protokolu
const handle = async ({ method, params, id }) => {
  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'termux-mcp-beta', version: '1.0' } } };
  }
  if (method === 'notifications/initialized') return null;

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: [{
      name: 'exec',
      description: 'Termux-da istənilən bash əmri icra et (cd, zəncirlənmiş əmrlər ("&&", ";") daxil olmaqla, cwd avtomatik izlənir). Fayl yaz/oxu, paket qur, script işlət. QAYDA: yalnız istifadəçinin açıq şəkildə istədiyi əməliyyatları yerinə yetir; geri dönməzsiz əmrlərdən (rm -rf, mkfs, dd, sistem faylların silinməsi/dəyişdirilməsi) çəkin, əmin olmadıqda əvvəlcə istifadəçidən təsdiq al.',
      inputSchema: { type: 'object', properties: { cmd: { type: 'string', description: 'Bash əmri' } }, required: ['cmd'] },
    }] } };
  }

  if (method === 'tools/call' && params?.name === 'exec') {
    const cmd = params.arguments?.cmd;
    if (!cmd) return { jsonrpc: '2.0', id, ...text('❌ cmd boşdur', true) };

    const { c, o, e, newCwd } = await run(cmd);
    if (newCwd && newCwd !== cwd) {
      try { await fs.promises.access(newCwd); cwd = newCwd; saveCwd(); } catch {}
    }
    return { jsonrpc: '2.0', id, ...text(`[exit ${c}] [cwd: ${cwd}]\n${o}${e ? `\nSTDERR:\n${e}` : ''}`, c !== 0) };
  }

  return { jsonrpc: '2.0', id: id ?? null, error: { code: -32601, message: 'Method not found' } };
};

// HTTP server
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.writeHead(200).end();
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', version: 'beta-1.0', cwd }));
  }
  if (req.method === 'POST' && req.url === '/mcp') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 1e6) body = body.slice(0, 1e6); });
    req.on('end', async () => {
      try {
        const r = await handle(JSON.parse(body));
        if (!r) return res.writeHead(204).end();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(r));
      } catch (e) {
        res.writeHead(400).end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  res.writeHead(404).end();
}).listen(PORT, HOST, () => {
  console.log('⚠️  BETA — Termux MCP Server');
  console.log(`🌐 http://${HOST}:${PORT}/mcp`);
  console.log(`📁 ${cwd}`);
});

process.on('SIGINT', async () => { await flushCwd(); process.exit(0); });
process.on('SIGTERM', async () => { await flushCwd(); process.exit(0); });
