<p align="center">
  <a href="README.en.md">🇬🇧 English</a> •
  <a href="README.az.md">🇦🇿 Azərbaycanca</a> •
  <a href="README.tr.md"><strong>🇹🇷 Türkçe</strong></a>
</p>

# Termux MCP Server (Beta)

Sıfır bağımlılıklı [Model Context Protocol](https://modelcontextprotocol.io) sunucusu — Termux içinde çalışır ve bağlanan herhangi bir AI'ye (Claude, ChatGPT vb.) Android cihazında gerçek bash shell erişimi verir: dosya yaz/oku, paket kur, script çalıştır ve daha fazlası.

> ⚠️ **Bu sunucunun herhangi bir dahili kimlik doğrulaması yoktur.** Varsayılan olarak yalnızca `127.0.0.1`'e bağlıdır. Eğer onu bir tünel (örn. cloudflared) ile internete açarsan, linki ele geçiren HERKES telefonunda shell erişimi elde eder. Bunu yapmadan önce aşağıdaki **Güvenlik ve Yetenekler** bölümünü oku.

## Özellikler

- **Sıfır bağımlılık** — yalnızca Node.js'in dahili modülleri (`http`, `child_process`, `fs`, `path`)
- **1 araç**: `exec` — herhangi bir bash komutunu çalıştırır
- **Otomatik çalışma dizini (cwd) takibi** — `cd` ve zincirlenmiş komutlar (`cd x && npm run dev`) doğru şekilde takip edilir, çünkü regex tahmini değil, gerçek `$PWD` işaretçisi kullanılır
- **Restart-safe** — son çalışma dizini diske yazılır ve sunucu yeniden başlatıldığında geri yüklenir (flash belleği korumak için yazmalar debounce edilir)
- **Timeout koruması** — 60 saniyeden uzun süren komutlar otomatik olarak durdurulur
- **Çıktı kısaltma** — çok büyük çıktılar token tasarrufu için kısaltılır, hem başlangıç hem son kısım gösterilir

## Sistem Gereksinimleri ve Test Sonuçları

Bu rakamlar geliştiricinin kendi testlerinden alınmıştır — her cihaz için garanti değil, referans olarak kabul et:

| | |
|---|---|
| **Android sürümü** | Android 9'dan 14'e kadar test edildi — güvenilir çalışıyor |
| **Test edilen cihazlar** | Redmi 6A, Honor X8B |
| **RAM kullanımı (sunucu boştayken)** | Testlerde ~28 MB gözlemlendi |
| **Önerilen boş RAM** | Rahat kullanım için minimum 500 MB – 1 GB, özellikle AI daha ağır komutlar çalıştıracaksa (paket kurma, build vb.) |
| **Depolama** | Node.js + bu script — birkaç MB; ek paketler (`pkg`/`npm`) kurarsan artar |

## Kurulum

```bash
pkg install nodejs git -y
git clone https://github.com/Alim4385/termux-mcp.git
cd termux-mcp
npm start
```

Sunucu `http://127.0.0.1:3000/mcp` adresinde başlar.

Sağlık kontrolü:
```bash
curl http://127.0.0.1:3000/health
```

## AI'ye Bağlanma

### Yerel (aynı cihaz / aynı ağ, MCP destekleyen istemci)

```json
{
  "mcpServers": {
    "termux": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

### Uzaktan (tünel ile, bulut tabanlı AI istemcileri için)

[cloudflared](https://github.com/cloudflare/cloudflared) kur ve çalıştır:

```bash
pkg install cloudflared -y
cloudflared tunnel --url http://127.0.0.1:3000
```

Sana `https://xxxx.trycloudflare.com` gibi rastgele bir link verilecek. Sonuna `/mcp` ekle (`https://xxxx.trycloudflare.com/mcp`) ve bunu AI istemcinde özel MCP bağlayıcısı olarak ekle (örneğin, ChatGPT'nin Developer Mode bağlayıcıları, planın destekliyorsa, ya da uzak MCP sunucularını destekleyen herhangi bir istemci).

**Notlar:**
- Link her `cloudflared`'i yeniden başlattığında değişir — bu senin tek gerçek korumandır ve zayıftır (URL'ler loglara, tarayıcı geçmişine, ekran görüntülerine sızabilir). Onu paylaşma ve tüneli uzun süre gözetimsiz açık bırakma.
- Daha güçlü koruma istersen, `/mcp`'nin önüne kendin bir paylaşılan-gizli-anahtar (shared-secret token) kontrolü ekleyebilirsin — bu sunucu minimalist kalmak için bilerek onsuz gönderilir, ama eklemene hiçbir şey engel değildir.

## ⚠️ Güvenlik ve Yetenekler

Bu sunucunun tek aracı `exec`'dir — keyfi bash çalıştırma. Bunun cihazın için *gerçekte* ne anlama geldiği, başka ne kurulu/etkin olduğuna bağlıdır:

**Eğer [Termux:API](https://wiki.termux.com/wiki/Termux:API) kuruluysa** (`pkg install termux-api` + Termux:API uygulaması), bu sunucuya bağlanan herhangi bir AI, prensipte, şu gibi komutları çağırabilir:
- `termux-sms-list` / `termux-sms-send` — SMS okuma/gönderme
- `termux-contact-list` — kişileri okuma
- `termux-camera-photo` — fotoğraf çekme
- `termux-location` — GPS konumu alma
- `termux-clipboard-get/set`, `termux-notification`, `termux-battery-status`, `termux-microphone-record` vb.

Termux:API'yi yalnızca bağlanan AI'nin bunları potansiyel olarak kullanabilmesine gönlün rahatsa kur, ve linke **kimin/neyin sahip olduğunu her zaman bil**.

**Eğer cihaz rootlanmışsa:** root shell sistem bölümlerini değiştirebilir, diğer uygulamaların özel verilerine erişebilir, güvenlik duvarı kurallarını değiştirebilir ve genel olarak Android'in normal uygulama sandbox'ını aşabilir. Bu sunucuyu root olarak çalıştırmak herhangi bir hatanın veya kötü niyetli kullanımın etki alanını ciddi şekilde artırır — riski tam olarak anlamıyorsan **önerilmez**.

**ADB hakkında:** ADB erişimi bu sunucuyla doğrudan ilgili değildir, ama cihazını genel olarak güvence altına almak için bilmeye değer — telefonuna ADB erişimi olan herkes neredeyse tam kontrole sahiptir (uygulama kurma/kaldırma, dosya çekme, logları okuma, ekranı yansıtma). ADB erişimini asla bu sunucunun tünel linkiyle birlikte paylaşma.

## Sorumluluk Reddi

Bu beta yazılımdır. Geliştirici, bu sunucunun çalıştırılmasından, ağa açılmasından veya ona bağlanan herhangi bir AI/istemci tarafından yapılan işlemlerden kaynaklanan veri kaybı, cihaz hasarı, yetkisiz erişim veya başka herhangi bir sonuç için **hiçbir sorumluluk kabul etmez**. Onu nasıl yapılandırdığından, kime erişim verdiğinden ve üzerinden neyin çalıştırılmasına izin verdiğinden **sen sorumlusun**. Tam yasal metin için [LICENSE](../LICENSE) dosyasına bak. Kendi riskinle kullan.

## AI Güvenlik Rehberi

Bu sunucuya bir AI bağlıyorsan, [`prompts/ai-usage-guide.txt`](../prompts/ai-usage-guide.txt) rehberini onun sistem talimatlarının bir parçası olarak ver — bu, AI'den geri dönüşü olmayan işlemlerden önce senden onay istemesini talep eder.

## Lisans

MIT + ek kullanım koşulları — bkz. [LICENSE](../LICENSE).
