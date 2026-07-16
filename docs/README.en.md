<p align="center">
  <a href="README.en.md"><strong>🇬🇧 English</strong></a> •
  <a href="README.az.md">🇦🇿 Azərbaycanca</a> •
  <a href="README.tr.md">🇹🇷 Türkçe</a>
</p>

<div align="center">

# 📱 Termux MCP Server

<sub>Zero-dependency Model Context Protocol server for Termux (Android)</sub>

<br>

### [📖 Full Installation & Usage Guide →](GUIDE.en.md)

</div>

---

## What is this?

This is a tiny server that runs inside [Termux](https://termux.dev) (a terminal app for Android) and speaks the [Model Context Protocol](https://modelcontextprotocol.io) — the open standard that lets AI assistants like Claude and ChatGPT connect to external tools.

In plain terms: once it's running, you can connect an AI to it, and that AI gets **real bash shell access to your Android phone** — it can read and write files, install packages, run scripts, check on things, and more, directly on your device.

## Why does it exist?

Most MCP servers are built for laptops and desktops. Android/Termux is a different environment — different filesystem layout, different package manager, limited resources, and no `systemd` or background service niceties. This project is written specifically for that environment: **one file, zero npm dependencies**, so there's nothing to break and nothing extra to install beyond Node.js itself.

## Features

- **Zero dependencies** — only Node.js built-in modules (`http`, `child_process`, `fs`, `path`)
- **1 tool**: `exec` — runs any bash command
- **Automatic working-directory tracking** — `cd`, and chained commands (`cd x && npm run dev`) are tracked correctly via a real `$PWD` marker, not regex guessing
- **Restart-safe** — the last working directory is persisted to disk and restored on restart
- **Timeout protection** — commands running longer than 60s are killed automatically
- **Output truncation** — very large outputs are capped to save tokens

## Tested On

| | |
|---|---|
| **Android version** | Android 9 through Android 14 |
| **Devices** | Redmi 6A, Honor X8B |
| **RAM usage (idle)** | ~28 MB observed in testing |
| **Recommended free RAM** | 500 MB – 1 GB minimum |

These are the developer's own test results — treat them as a reference, not a universal guarantee.

## ⚠️ Before you start

This server has **no built-in authentication**. Anyone with a link to it can run commands on your phone. That's not a flaw to be fixed later — it's a deliberate minimalism trade-off, and it means **you** are responsible for who gets that link. The [full guide](GUIDE.en.md) covers this in detail, including what an AI could access if you also install Termux:API, and why you shouldn't run this on a rooted device unless you understand the risk.

## Disclaimer

This is beta software. The author takes **no responsibility** for data loss, device damage, unauthorized access, or any other consequence resulting from running this server or exposing it to a network. **You are responsible** for how you configure it and who you give access to. See [LICENSE](../LICENSE) for the full legal text.

## License

MIT with an additional usage disclaimer — see [LICENSE](../LICENSE).

<div align="center">

### 👉 Ready to set it up? [Open the full guide](GUIDE.en.md)

</div>
