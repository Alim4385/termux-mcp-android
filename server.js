'use strict';
// Termux MCP Server (beta) — 4 alət (bash/view/create_file/str_replace), sıfır asılılıq

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { StringDecoder } = require('string_decoder');

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

// Yalnız bu server tərəfindən başladılmış proseslər (process list üçün) — pid -> { cmd, log, startTime }
const procs = new Map();

// Böyük/böyüyən log fayllarını hər dəfə tam oxumamaq üçün yalnız son hissəsini oxu
const TAIL_CAP = 65536; // 64KB
const readTail = async (filePath) => {
  const st = await fs.promises.stat(filePath);
  if (st.size <= TAIL_CAP) return fs.promises.readFile(filePath, 'utf8');
  const fh = await fs.promises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(TAIL_CAP);
    await fh.read(buf, 0, TAIL_CAP, st.size - TAIL_CAP);
    return buf.toString('utf8');
  } finally {
    await fh.close();
  }
};

// Bash əmrini icra et (timeout + kəsilmiş stdout/stderr + real cwd izləməsi + stdin dəstəyi)
const run = (cmd, stdin, timeoutMs) => new Promise((resolve) => {
  let o = '', e = '', done = false;
  const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };

  const full = `${cmd}\nprintf '${MARK}%s' "$PWD"`;
  const p = spawn('bash', ['-c', full], { cwd, env: { ...process.env, HOME, TERM: 'xterm-256color' } });
  if (stdin) p.stdin.write(stdin);
  p.stdin.end(); // VACİB: bağlanmasa, stdin gözləyən əmr heç vaxt EOF almaz, timeout-a qədər asılı qalar
  const outDec = new StringDecoder('utf8');
  const errDec = new StringDecoder('utf8');
  p.stdout.on('data', (d) => { const s = outDec.write(d); if (o.length < MAX * 2) o += s; });
  p.stderr.on('data', (d) => { const s = errDec.write(d); if (e.length < MAX * 2) e += s; });
  p.on('close', async (c) => {
    o += outDec.end();
    e += errDec.end();
    const i = o.lastIndexOf(MARK);
    const newCwd = i === -1 ? null : o.slice(i + MARK.length).trim();
    if (i !== -1) o = o.slice(0, i);
    finish({ c: c ?? 1, o: cut(o), e: cut(e), newCwd });
  });
  p.on('error', (x) => finish({ c: 1, o: '', e: x.message, newCwd: null }));

  const timer = setTimeout(() => {
    try { p.kill('SIGKILL'); } catch {}
    finish({ c: 124, o: cut(o), e: `${cut(e)}\n[TIMEOUT]`, newCwd: null });
  }, timeoutMs || TM);
});

const text = (t, isError = false) => ({ result: { content: [{ type: 'text', text: t }], isError } });
const image = (data, mimeType) => ({ result: { content: [{ type: 'image', data, mimeType }], isError: false } });

// Nisbi yolu cari cwd-yə görə tam yola çevir
const resolvePath = (p) => (path.isAbsolute(p) ? p : path.resolve(cwd, p));
const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const MAX_IMG = 8 * 1024 * 1024; // 8MB

const GUARD = 'QAYDA: yalnız istifadəçinin açıq şəkildə istədiyi əməliyyatları yerinə yetir; geri dönməzsiz əməliyyatlardan (fayl silmə, sistem faylların dəyişdirilməsi) çəkin, əmin olmadıqda əvvəlcə istifadəçidən təsdiq al.';

// MCP protokolu
const handle = async ({ method, params, id }) => {
  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'termux-mcp-beta', version: '2.0' } } };
  }
  if (method === 'notifications/initialized') return null;

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: [
      {
        name: 'bash',
        description: `Termux-da istənilən bash əmri icra et (cd, zəncirlənmiş əmrlər ("&&", ";") daxil olmaqla, cwd avtomatik izlənir). Paket qurmaq, script işlətmək, sistem məlumatı almaq üçün istifadə et. Sadə fayl yazma/oxuma/düzəliş üçün bunun əvəzinə view/create_file/str_replace alətlərini üstün tut — onlar daha etibarlıdır. Kod bazasında mətn axtarışı üçün "grep -rn pattern ." işlət. Uzun müddət işləyəcək (dəqiqələrlə) əmrlər üçün bunun əvəzinə "process" alətini (start+wait) istifadə et — bash burda bloklanır, process arxa fonda işlədir. ${GUARD}`,
        inputSchema: { type: 'object', properties: {
          cmd: { type: 'string', description: 'Bash əmri' },
          stdin: { type: 'string', description: 'Əmrə göndəriləcək stdin mətni (interaktiv sual üçün, məs. "Y\\n"). Boş buraxıla bilər.' },
          timeout: { type: 'number', description: 'Maksimum gözləmə müddəti (ms), default 60000, maks 120000' },
        }, required: ['cmd'] },
      },
      {
        name: 'view',
        description: 'Fayl və ya qovluğa bax. Qovluqdursa məzmununu sadalayır. Mətn fayldırsa sətir nömrələri ilə göstərir (view_range ilə müəyyən sətirlər seçilə bilər). Şəkil fayldırsa (jpg/png/gif/webp) birbaşa göstərir.',
        inputSchema: { type: 'object', properties: {
          path: { type: 'string', description: 'Fayl və ya qovluq yolu (nisbi və ya tam)' },
          view_range: { type: 'array', items: { type: 'number' }, description: '[başlanğıc, son] sətir nömrələri, istəyə bağlı' },
        }, required: ['path'] },
      },
      {
        name: 'create_file',
        description: `Yeni fayl yarat. Fayl artıq varsa default olaraq xəta verir — kiçik dəyişiklik üçün str_replace, faylı TAM YENİDƏN yazmaq üçün overwrite:true istifadə et. ${GUARD}`,
        inputSchema: { type: 'object', properties: {
          path: { type: 'string', description: 'Yaradılacaq faylın yolu' },
          content: { type: 'string', description: 'Faylın məzmunu' },
          overwrite: { type: 'boolean', description: 'true olsa, mövcud faylın üzərinə tam yazır (default: false — mövcud fayl varsa xəta verir)' },
        }, required: ['path', 'content'] },
      },
      {
        name: 'str_replace',
        description: `Mövcud fayl daxilində konkret mətni dəyişdir. old_str faylda DƏQIQ BİR DƏFƏ görünməlidir — əgər bir neçə dəfə görünürsə, mövqe seçmək əvəzinə old_str-ə daha çox ətraf mətn (kontekst) əlavə edərək onu unikal et, bu daha etibarlıdır. ${GUARD}`,
        inputSchema: { type: 'object', properties: {
          path: { type: 'string', description: 'Dəyişdiriləcək faylın yolu' },
          old_str: { type: 'string', description: 'Dəyişdiriləcək mətn (faylda bir dəfə olmalıdır)' },
          new_str: { type: 'string', description: 'Yeni mətn (boş buraxılsa old_str silinir)' },
        }, required: ['path', 'old_str'] },
      },
      {
        name: 'process',
        description: `Uzun müddət işləyən arxa fon prosesini idarə et (məs. bir dev server). "start" əmri arxa fonda başladır, PID və log fayl yolu qaytarır — cmd-in özündə "&" YAZMA, alət onsuz da arxa fona keçirir. "wait" log faylında müəyyən söz/mətn (pattern) görünənə qədər gözləyir. "list" YALNIZ bu alətlə başladılmış (hələ işləyən) prosesləri göstərir — bütün sistem prosesləri üçün bunun əvəzinə bash ilə "ps aux" işlət. "kill" PID vasitəsilə prosesi (və onun bütün alt-proseslərini) dayandırır. ${GUARD}`,
        inputSchema: { type: 'object', properties: {
          action: { type: 'string', enum: ['start', 'wait', 'list', 'kill'], description: 'Əməliyyat' },
          cmd: { type: 'string', description: 'start üçün bash əmri (arxa fonda işə salınacaq, "&" əlavə etmə)' },
          pid: { type: 'number', description: 'kill üçün proses ID-si (start-ın qaytardığı pid)' },
          signal: { type: 'string', enum: ['SIGTERM', 'SIGKILL'], description: 'kill üçün siqnal, default SIGTERM (mülayim dayandırma)' },
          log: { type: 'string', description: 'wait üçün log fayl yolu (start-ın qaytardığı log)' },
          pattern: { type: 'string', description: 'wait üçün gözlənilən mətn/söz' },
          timeout: { type: 'number', description: 'wait üçün maksimum gözləmə müddəti (ms), default 30000, maks 55000' },
          interval: { type: 'number', description: 'wait üçün yoxlama tezliyi (ms), default 500, min 200, maks 5000' },
        }, required: ['action'] },
      },
    ] } };
  }

  if (method === 'tools/call' && params?.name === 'bash') {
    const cmd = params.arguments?.cmd;
    if (!cmd) return { jsonrpc: '2.0', id, ...text('❌ cmd boşdur', true) };
    const reqTimeout = Number(params.arguments?.timeout);
    const timeoutMs = reqTimeout > 0 ? Math.min(reqTimeout, 120000) : TM;

    const { c, o, e, newCwd } = await run(cmd, params.arguments?.stdin, timeoutMs);
    if (newCwd && newCwd !== cwd) {
      try { await fs.promises.access(newCwd); cwd = newCwd; saveCwd(); } catch {}
    }
    return { jsonrpc: '2.0', id, ...text(`[exit ${c}] [cwd: ${cwd}]\n${o}${e ? `\nSTDERR:\n${e}` : ''}`, c !== 0) };
  }

  if (method === 'tools/call' && params?.name === 'view') {
    const p = params.arguments?.path;
    if (!p) return { jsonrpc: '2.0', id, ...text('❌ path boşdur', true) };
    const full = resolvePath(p);
    try {
      const st = await fs.promises.stat(full);
      if (st.isDirectory()) {
        const items = await fs.promises.readdir(full, { withFileTypes: true });
        const listing = items
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((it) => (it.isDirectory() ? `${it.name}/` : it.name))
          .join('\n');
        return { jsonrpc: '2.0', id, ...text(listing || '(boş qovluq)') };
      }
      if (st.size > MAX_IMG) return { jsonrpc: '2.0', id, ...text(`❌ Fayl çox böyükdür (${(st.size / 1024 / 1024).toFixed(1)}MB, limit 8MB)`, true) };

      const ext = path.extname(full).toLowerCase();
      if (IMG_EXT.has(ext)) {
        const buf = await fs.promises.readFile(full);
        const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' }[ext];
        return { jsonrpc: '2.0', id, ...image(buf.toString('base64'), mime) };
      }

      let content = await fs.promises.readFile(full, 'utf8');
      let lines = content.split('\n');
      const range = params.arguments?.view_range;
      let offset = 0;
      if (Array.isArray(range) && range.length === 2) {
        const [start, end] = range;
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1) {
          return { jsonrpc: '2.0', id, ...text('❌ view_range düzgün deyil: [başlanğıc, son] formatında olmalı, başlanğıc >= 1 tam ədəd olmalıdır', true) };
        }
        if (start > lines.length) {
          return { jsonrpc: '2.0', id, ...text(`❌ Fayl yalnız ${lines.length} sətirdən ibarətdir, ${start}-cü sətir yoxdur`, true) };
        }
        if (end !== -1 && end < start) {
          return { jsonrpc: '2.0', id, ...text('❌ view_range-də son sətir başlanğıcdan kiçik ola bilməz', true) };
        }
        offset = start - 1;
        lines = lines.slice(offset, end === -1 ? undefined : end);
      }
      const numbered = lines.map((l, i) => `${String(offset + i + 1).padStart(5)}\t${l}`).join('\n');
      return { jsonrpc: '2.0', id, ...text(cut(numbered)) };
    } catch (err) {
      return { jsonrpc: '2.0', id, ...text(`❌ ${err.code === 'ENOENT' ? 'Tapılmadı: ' + full : err.message}`, true) };
    }
  }

  if (method === 'tools/call' && params?.name === 'create_file') {
    const p = params.arguments?.path;
    const content = params.arguments?.content ?? '';
    const overwrite = params.arguments?.overwrite === true;
    if (!p) return { jsonrpc: '2.0', id, ...text('❌ path boşdur', true) };
    const full = resolvePath(p);
    try {
      const exists = fs.existsSync(full);
      if (exists && !overwrite) return { jsonrpc: '2.0', id, ...text(`❌ Fayl artıq mövcuddur: ${full} — dəyişmək üçün str_replace, tam yenidən yazmaq üçün overwrite:true istifadə et`, true) };
      await fs.promises.mkdir(path.dirname(full), { recursive: true });
      await fs.promises.writeFile(full, content, 'utf8');
      return { jsonrpc: '2.0', id, ...text(`✅ ${exists ? 'Üzərinə yazıldı' : 'Yaradıldı'}: ${full}`) };
    } catch (err) {
      return { jsonrpc: '2.0', id, ...text(`❌ ${err.message}`, true) };
    }
  }

  if (method === 'tools/call' && params?.name === 'str_replace') {
    const p = params.arguments?.path;
    const oldStr = params.arguments?.old_str;
    const newStr = params.arguments?.new_str ?? '';
    if (!p || oldStr === undefined) return { jsonrpc: '2.0', id, ...text('❌ path və ya old_str boşdur', true) };
    const full = resolvePath(p);
    try {
      const content = await fs.promises.readFile(full, 'utf8');
      const count = content.split(oldStr).length - 1;

      if (count === 0) {
        // Ağıllı uğursuzluq: sliding-window ilə oxşar bloku faylda tap və AI-ya dəqiq mətni təklif et
        // normLine: boşluq/CRLF fərqlərini əridir (trim() \r-i də təmizləyir)
        const normLine = (l) => l.trim().replace(/\s+/g, ' ');
        // normBlock: boş sətirləri də görməzdən gəlir ki, əlavə/əskik boş sətir uyğunluğu pozmasın
        const normBlock = (arr) => arr.map(normLine).filter((l) => l.length > 0).join('\n');

        const oldLines = oldStr.split('\n');
        const fileLines = content.split('\n');
        const normOld = normBlock(oldLines);
        const baseLen = oldLines.length;
        // ±2 sətir aralığında da yoxla (boş sətir fərqlərini tutmaq üçün), amma DP/Levenshtein işlətmə
        const candidateLens = [...new Set([baseLen, baseLen - 1, baseLen + 1, baseLen - 2, baseLen + 2])]
          .filter((n) => n >= 1 && n <= fileLines.length);

        const suggestions = [];
        const seen = new Set(); // eyni başlanğıc sətri fərqli uzunluqla iki dəfə əlavə etməsin
        outer:
        for (const wl of candidateLens) {
          for (let i = 0; i + wl <= fileLines.length; i++) {
            const window = fileLines.slice(i, i + wl);
            if (normBlock(window) === normOld) {
              if (seen.has(i)) continue;
              seen.add(i);
              const cs = Math.max(0, i - 1);
              const ce = Math.min(fileLines.length, i + wl + 1);
              const context = fileLines.slice(cs, ce)
                .map((l, idx) => `${String(cs + idx + 1).padStart(5)}\t${l}`)
                .join('\n');
              suggestions.push({ line: i + 1, exact: window.join('\n'), context });
              if (suggestions.length >= 3) break outer;
            }
          }
        }

        let msg = '❌ old_str faylda dəqiq tapılmadı (boşluq/girinti fərqi ola bilər).\n';
        if (suggestions.length > 0) {
          msg += '\n📌 Oxşar yer(lər) tapıldı. Aşağıdakı "Dəqiq mətn"i old_str kimi kopyala:\n\n';
          suggestions.forEach((s, idx) => {
            msg += `--- Namizəd ${idx + 1} (sətir ${s.line}) ---\n${s.context}\n\n⬆️ Dəqiq mətn:\n${s.exact}\n\n`;
          });
        } else {
          msg += '\n💡 Oxşar mətn tapılmadı. view ilə faylı yoxla.';
        }
        return { jsonrpc: '2.0', id, ...text(cut(msg), true) };
      }

      if (count > 1) {
        const lineNums = [];
        content.split('\n').forEach((l, i) => { if (l.includes(oldStr.split('\n')[0])) lineNums.push(i + 1); });
        return { jsonrpc: '2.0', id, ...text(`❌ old_str faylda ${count} dəfə görünür (ilk sətri uyğun gələn sətirlər: ${lineNums.join(', ') || 'naməlum'}), unikal etmək üçün ətraf mətn əlavə et`, true) };
      }

      await fs.promises.writeFile(full, content.replace(oldStr, newStr), 'utf8');
      return { jsonrpc: '2.0', id, ...text(`✅ Dəyişdirildi: ${full}`) };
    } catch (err) {
      return { jsonrpc: '2.0', id, ...text(`❌ ${err.code === 'ENOENT' ? 'Tapılmadı: ' + full : err.message}`, true) };
    }
  }

  if (method === 'tools/call' && params?.name === 'process') {
    const action = params.arguments?.action;

    if (action === 'start') {
      const cmd = params.arguments?.cmd;
      if (!cmd) return { jsonrpc: '2.0', id, ...text('❌ start üçün cmd tələb olunur', true) };
      const logPath = path.join(WS, `.proc-${Date.now()}-${Math.floor(Math.random() * 1000)}.log`);
      try {
        const p = spawn('bash', ['-c', `( ${cmd} ) > '${logPath}' 2>&1`], { cwd, detached: true, stdio: 'ignore' });
        p.unref();
        procs.set(p.pid, { cmd, log: logPath, startTime: Date.now() });
        return { jsonrpc: '2.0', id, ...text(JSON.stringify({ pid: p.pid, cmd, log: logPath, status: 'started' })) };
      } catch (err) {
        return { jsonrpc: '2.0', id, ...text(`❌ ${err.message}`, true) };
      }
    }

    if (action === 'wait') {
      const logPath = params.arguments?.log;
      const pattern = params.arguments?.pattern;
      if (!logPath || !pattern) return { jsonrpc: '2.0', id, ...text('❌ wait üçün log və pattern tələb olunur', true) };
      const maxWait = Math.min(Number(params.arguments?.timeout) || 30000, 55000);
      const pollMs = Math.min(Math.max(Number(params.arguments?.interval) || 500, 200), 5000);
      const deadline = Date.now() + maxWait;
      let lastContent = '';
      while (Date.now() < deadline) {
        try {
          lastContent = await readTail(logPath);
          if (lastContent.includes(pattern)) {
            return { jsonrpc: '2.0', id, ...text(JSON.stringify({ found: true, log: logPath, content: cut(lastContent) })) };
          }
        } catch { /* fayl hələ yaranmayıb ola bilər, gözləməyə davam et */ }
        await new Promise((r) => setTimeout(r, pollMs));
      }
      return { jsonrpc: '2.0', id, ...text(JSON.stringify({ found: false, log: logPath, content: cut(lastContent) }), true) };
    }

    if (action === 'list') {
      const out = [];
      for (const [pid, info] of procs) {
        let alive = true;
        try { process.kill(pid, 0); } catch { alive = false; }
        if (!alive) { procs.delete(pid); continue; } // ölü qeydləri avtomatik təmizlə
        out.push({ pid, cmd: info.cmd, log: info.log, uptime_ms: Date.now() - info.startTime });
      }
      return { jsonrpc: '2.0', id, ...text(JSON.stringify(out, null, 2)) };
    }

    if (action === 'kill') {
      const pid = params.arguments?.pid;
      const signal = params.arguments?.signal === 'SIGKILL' ? 'SIGKILL' : 'SIGTERM';
      if (!Number.isInteger(pid) || pid <= 1) {
        return { jsonrpc: '2.0', id, ...text('❌ pid düzgün deyil (1-dən böyük tam ədəd olmalıdır)', true) };
      }
      if (pid === process.pid) {
        return { jsonrpc: '2.0', id, ...text('❌ Bu, serverin öz prosesidir — öldürülə bilməz', true) };
      }
      try {
        process.kill(-pid, signal); // bütün proses qrupunu öldür (alt-proseslər daxil)
        procs.delete(pid);
        return { jsonrpc: '2.0', id, ...text(JSON.stringify({ pid, signal, status: 'killed' })) };
      } catch {
        try {
          process.kill(pid, signal); // qrup kill uğursuzdursa, tək prosesi sına
          procs.delete(pid);
          return { jsonrpc: '2.0', id, ...text(JSON.stringify({ pid, signal, status: 'killed (tək proses)' })) };
        } catch (err2) {
          const msg = err2.code === 'ESRCH' ? `Proses tapılmadı (PID: ${pid}) — artıq bitmiş ola bilər` : err2.message;
          return { jsonrpc: '2.0', id, ...text(`❌ ${msg}`, true) };
        }
      }
    }

    return { jsonrpc: '2.0', id, ...text('❌ Naməlum action (start, wait, list, kill olmalıdır)', true) };
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
    return res.end(JSON.stringify({ status: 'ok', version: 'beta-2.0', cwd }));
  }
  if (req.method === 'POST' && req.url === '/mcp') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 1e6) body = body.slice(0, 1e6); });
    req.on('end', async () => {
      const safeSend = (code, payload) => {
        if (res.writableEnded || res.destroyed) return; // bağlantı artıq bağlıdır, yazma
        try {
          res.writeHead(code, code === 204 ? undefined : { 'Content-Type': 'application/json' });
          res.end(payload);
        } catch { /* soket bağlanıb, təhlükəsiz şəkildə görməzdən gəl */ }
      };
      try {
        const r = await handle(JSON.parse(body));
        if (!r) return safeSend(204);
        safeSend(200, JSON.stringify(r));
      } catch (e) {
        safeSend(400, JSON.stringify({ error: e.message }));
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
