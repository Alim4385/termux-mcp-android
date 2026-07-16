<p align="center">
  <a href="README.en.md">🇬🇧 English</a> •
  <a href="README.az.md">🇦🇿 Azərbaycanca</a> •
  <a href="README.tr.md"><strong>🇹🇷 Türkçe</strong></a>
</p>

<div align="center">

# 📱 Termux MCP Server

<sub>Termux (Android) için sıfır bağımlılıklı Model Context Protocol sunucusu</sub>

<br>

### [📖 Tam Kurulum ve Kullanım Rehberi →](GUIDE.tr.md)

</div>

---

## Bu nedir?

Bu, [Termux](https://termux.dev) (Android için terminal uygulaması) içinde çalışan küçük bir sunucudur ve Claude, ChatGPT gibi AI'lerin harici araçlara bağlanmasını sağlayan açık standart olan [Model Context Protocol](https://modelcontextprotocol.io) ile konuşur.

Basitçe: sunucu çalıştıktan sonra ona bir AI bağlayabilirsin, ve o AI **Android telefonuna gerçek bash shell erişimi** elde eder — dosya okuyabilir/yazabilir, paket kurabilir, script çalıştırabilir, cihaz üzerinde doğrudan işlemler yapabilir.

## Neden var?

Çoğu MCP sunucusu laptop/masaüstü için yazılmıştır. Android/Termux tamamen farklı bir ortamdır — farklı dosya sistemi düzeni, farklı paket yöneticisi, sınırlı kaynaklar, `systemd` veya arka plan servisi kolaylıkları yok. Bu proje tam olarak bu ortam için yazıldı: **tek dosya, sıfır npm bağımlılığı** — yani kırılacak bir şey yok, Node.js dışında ek bir şey kurmana gerek yok.

## Özellikler

- **Sıfır bağımlılık** — yalnızca Node.js'in dahili modülleri (`http`, `child_process`, `fs`, `path`)
- **1 araç**: `exec` — herhangi bir bash komutunu çalıştırır
- **Otomatik çalışma dizini (cwd) takibi** — `cd` ve zincirlenmiş komutlar (`cd x && npm run dev`) gerçek `$PWD` işaretçisiyle doğru şekilde takip edilir, regex tahmini değil
- **Restart-safe** — son çalışma dizini diske yazılır ve sunucu yeniden başlatıldığında geri yüklenir
- **Timeout koruması** — 60 saniyeden uzun süren komutlar otomatik olarak durdurulur
- **Çıktı kısaltma** — çok büyük çıktılar token tasarrufu için kısaltılır

## Test Edildi

| | |
|---|---|
| **Android sürümü** | Android 9'dan 14'e kadar |
| **Cihazlar** | Redmi 6A, Honor X8B |
| **RAM kullanımı (boştayken)** | Testlerde ~28 MB |
| **Önerilen boş RAM** | Minimum 500 MB – 1 GB |

Bu rakamlar geliştiricinin kendi test sonuçlarıdır — evrensel bir garanti değil, referans olarak kabul et.

## ⚠️ Başlamadan önce

Bu sunucunun **hiçbir dahili kimlik doğrulaması yoktur**. Linkine sahip olan herkes telefonunda komut çalıştırabilir. Bu, "sonra düzeltilecek" bir kusur değil — bilerek yapılmış minimalist bir tercihtir, ve bu, **linke kimin ulaşacağından senin sorumlu olduğun** anlamına gelir. [Tam rehber](GUIDE.tr.md) bunu detaylı anlatır, Termux:API kurarsan AI'nin nelere erişebileceği ve rootlanmış bir cihazda riski tam anlamadan neden çalıştırmaman gerektiği dahil.

## Sorumluluk Reddi

Bu beta yazılımdır. Geliştirici, bu sunucunun çalıştırılmasından veya ağa açılmasından kaynaklanan veri kaybı, cihaz hasarı, yetkisiz erişim veya başka herhangi bir sonuç için **hiçbir sorumluluk kabul etmez**. Onu nasıl yapılandırdığından, kime erişim verdiğinden **sen sorumlusun**. Tam yasal metin için [LICENSE](../LICENSE) dosyasına bak.

## Lisans

MIT + ek kullanım koşulları — bkz. [LICENSE](../LICENSE).

<div align="center">

### 👉 Kurmaya hazır mısın? [Tam rehberi aç](GUIDE.tr.md)

</div>
