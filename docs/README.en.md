<p align="center">
  <a href="README.en.md"><strong>🇬🇧 English</strong></a> •
  <a href="README.az.md">🇦🇿 Azərbaycanca</a> •
  <a href="README.tr.md">🇹🇷 Türkçe</a>
</p>

# Termux MCP Server (Beta)

A zero-dependency [Model Context Protocol](https://modelcontextprotocol.io) server that runs inside Termux and gives any connected AI (Claude, ChatGPT, etc.) real bash shell access to your Android device — read/write files, install packages, run scripts, and more.

> ⚠️ **This server has no built-in authentication.** It binds to `127.0.0.1` only by default. If you expose it via a tunnel (e.g. cloudflared), anyone with the link gets shell access to your phone. Read the **Security & Capabilities** section below before doing that.

## Features

- **Zero dependencies** — only Node.js built-in modules (`http`, `child_process`, `fs`, `path`)
- **1 tool**: `exec` — runs any bash command
- **Automatic working-directory tracking** — `cd`, and chained commands (`cd x && npm run dev`) are tracked correctly via a real `$PWD` marker, not regex guessing
- **Restart-safe** — the last working directory is persisted to disk and restored on restart (debounced writes to avoid excessive flash wear)
- **Timeout protection** — commands running longer than 60s are killed automatically
- **Output truncation** — very large outputs are capped to save tokens, showing both the head and tail of the output

## System Requirements & Tested Performance

These numbers come from the developer's own testing — treat them as a reference, not a guarantee for every device:

| | |
|---|---|
| **Android version** | Tested on Android 9 through Android 14 — works reliably |
| **Devices tested** | Redmi 6A, Honor X8B |
| **RAM usage (server idle)** | ~28 MB observed in testing |
| **Recommended free RAM** | 500 MB – 1 GB minimum for comfortable use, especially if the AI runs heavier commands (package installs, builds) |
| **Storage** | Node.js + this script — a few MB; more if you install extra packages via `pkg`/`npm` |

## Installation

```bash
pkg install nodejs git -y
git clone https://github.com/Alim4385/termux-mcp.git
cd termux-mcp
npm start
```

The server starts at `http://127.0.0.1:3000/mcp`.

Health check:
```bash
curl http://127.0.0.1:3000/health
```

## Connecting an AI

### Local (same device / same network, MCP-capable client)

```json
{
  "mcpServers": {
    "termux": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

### Remote (via tunnel, for cloud-based AI clients)

Install and run [cloudflared](https://github.com/cloudflare/cloudflared):

```bash
pkg install cloudflared -y
cloudflared tunnel --url http://127.0.0.1:3000
```

You'll get a random link like `https://xxxx.trycloudflare.com`. Append `/mcp` to it (`https://xxxx.trycloudflare.com/mcp`) and add that as a custom MCP connector in your AI client (for example, ChatGPT's Developer Mode connectors, if your plan supports it, or any client that supports remote MCP servers).

**Notes:**
- The link changes every time you restart `cloudflared` — this is your only real protection, and it is weak (URLs can leak via logs, browser history, screenshots). Don't publish it, and don't leave the tunnel running unattended for long periods.
- If you want stronger protection, consider adding a shared-secret token check in front of `/mcp` yourself — this server intentionally ships without one to stay minimal, but nothing stops you from adding it.

## ⚠️ Capabilities & Security Considerations

This server's only tool is `exec` — arbitrary bash execution. What that *actually* means for your device depends on what else is installed or enabled:

**If [Termux:API](https://wiki.termux.com/wiki/Termux:API) is installed** (`pkg install termux-api` + the Termux:API companion app), any AI connected to this server can, in principle, call commands like:
- `termux-sms-list` / `termux-sms-send` — read/send SMS
- `termux-contact-list` — read contacts
- `termux-camera-photo` — take a photo
- `termux-location` — get GPS location
- `termux-clipboard-get/set`, `termux-notification`, `termux-battery-status`, `termux-microphone-record`, etc.

Only install Termux:API if you're comfortable with a connected AI potentially being able to use these, and always know **who or what has the connection link** before granting it.

**If the device is rooted:** a rooted shell can modify system partitions, access other apps' private data, change firewall rules, and generally bypass Android's normal app sandboxing. Running this server as root significantly increases the blast radius of any mistake or malicious use — **not recommended** unless you fully understand the risk.

**Regarding ADB:** ADB access is unrelated to this server directly, but is worth understanding if you're securing your device generally — anyone with ADB access to your phone has close to full control (install/uninstall apps, pull files, read logs, mirror the screen). Never share ADB access alongside this server's tunnel link.

## Disclaimer

This is beta software. The author takes **no responsibility** for data loss, device damage, unauthorized access, or any other consequence resulting from running this server, exposing it to a network, or actions taken by any AI or client connected to it. **You are responsible** for how you configure it, who you give access to, and what you allow to run through it. See [LICENSE](../LICENSE) for the full legal text. Use at your own risk.

## AI Safety Guide

If you're connecting an AI to this server, consider giving it the guide in [`prompts/ai-usage-guide.txt`](../prompts/ai-usage-guide.txt) as part of its system instructions — it asks the AI to confirm with you before destructive actions.

## License

MIT with an additional usage disclaimer — see [LICENSE](../LICENSE).
