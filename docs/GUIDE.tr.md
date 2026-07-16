<p align="center">
  <a href="GUIDE.en.md">🇬🇧 English</a> •
  <a href="GUIDE.az.md">🇦🇿 Azərbaycanca</a> •
  <a href="GUIDE.tr.md"><strong>🇹🇷 Türkçe</strong></a>
</p>

<p align="center"><a href="README.tr.md">← Hakkında sayfasına dön</a></p>

# Tam Kurulum ve Kullanım Rehberi

Bu rehber, **Termux hakkında hiçbir şey bilmesen bile** baştan sona adım adım takip edebilesin diye yazıldı. Acele etme, her adımı sırayla yap.

> ⚠️ Bu sunucu, bağlanan herhangi bir AI'ye cihazına **gerçek bash shell erişimi** verir. Linki biriyle paylaşmadan önce aşağıdaki **Güvenlik** bölümünü mutlaka oku.

## İçindekiler

1. [Termux'u kur](#1-termuxu-kur)
2. [Projeyi telefonuna indir](#2-projeyi-telefonuna-indir)
3. [Sunucuyu başlat](#3-sunucuyu-başlat)
4. [İkinci pencere (oturum) aç](#4-i̇kinci-pencere-oturum-aç)
5. [İnternete tünel aç (cloudflared)](#5-i̇nternete-tünel-aç-cloudflared)
6. [AI'ye bağlanma — Claude](#6-aiye-bağlanma--claude)
7. [AI'ye bağlanma — ChatGPT](#7-aiye-bağlanma--chatgpt)
8. [Güvenlik ve Yetenekler](#8-güvenlik-ve-yetenekler)
9. [Sorumluluk Reddi](#9-sorumluluk-reddi)

---

## 1. Termux'u kur

⚠️ **Google Play'deki Termux'u YÜKLEME** — o sürüm artık güncellenmiyor ve düzgün çalışmıyor. Yalnızca şu kaynaklardan birinden kur:

- [F-Droid (önerilir)](https://f-droid.org/packages/com.termux/)
- [GitHub Releases](https://github.com/termux/termux-app/releases)

F-Droid kurulu değilse, önce F-Droid uygulamasını kur (kendisi bir uygulama mağazasıdır), sonra içinden Termux'u arayıp kur. Ya da doğrudan GitHub Releases sayfasından `.apk` dosyasını indirip kurabilirsin (kurarken telefon "bilinmeyen kaynaklara izin ver" diye soracak — bunu kabul et).

Kurduktan sonra Termux'u aç. Siyah ekranda metin göreceksin — bu, terminaldir, komutları buraya yazacaksın.

---

## 2. Projeyi telefonuna indir

Termux açıldığında, aşağıdakileri **tek tek** yaz ve her birinden sonra Enter'a bas (kopyala-yapıştır da olur):

```bash
pkg update && pkg upgrade -y
```
(Bu, Termux'un kendi paketlerini günceller. Biraz zaman alabilir, bekle.)

```bash
pkg install nodejs git -y
```
(Bu, Node.js ve git'i kurar — sunucu bunlar olmadan çalışmaz.)

```bash
git clone https://github.com/Alim4385/termux-mcp.git
```
(Bu, projeyi GitHub'dan telefonuna kopyalar.)

```bash
cd termux-mcp
```
(Bu, oluşturulan klasöre girer.)

---

## 3. Sunucuyu başlat

```bash
npm start
```

Ekranda buna benzer bir şey göreceksin:

```
⚠️  BETA — Termux MCP Server
🌐 http://127.0.0.1:3000/mcp
📁 /data/data/com.termux/files/home/claude_workspace
```

Bunu görüyorsan, **sunucu çalışıyor** demektir ve bu pencere açık kalmalı. **Bu pencereyi kapatma** — sunucu durur. Şimdi bir sonraki adıma geçelim: aynı anda başka komutlar yazmak için ikinci bir pencere (oturum) açman gerekiyor.

---

## 4. İkinci pencere (oturum) aç

Sunucunun çalıştığı pencereyi kapatmadan, Termux'ta **yeni bir oturum** açabilirsin:

1. Ekranın **sol kenarından sağa doğru kaydır (swipe)** — bu, gizli bir yan menü (drawer) açacak
2. Açılan menüde **"NEW SESSION"** (Yeni oturum) yazısını göreceksin — ona dokun
3. Şimdi tamamen yeni, boş bir terminal penceresi açıldı — sunucu hâlâ arka planda ilk pencerede çalışıyor

(Drawer açılmıyorsa, ekranın sol üst köşesinde küçük bir ok/hamburger ikonu olabilir — ona dokunmak da aynı menüyü açar.)

Oturumlar arasında geçiş yapmak için de aynı kaydırma hareketini kullanırsın — açtığın her oturum listede görünecek, birine dokunup geçebilirsin.

---

## 5. İnternete tünel aç (cloudflared)

Şimdi **yeni açtığın ikinci pencerede** şunları yaz:

```bash
pkg install cloudflared -y
```

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

Birkaç saniye bekle, ekranda şu formatta bir satır göreceksin:

```
https://rastgele-kelimeler-buraya.trycloudflare.com
```

**Bu linki kopyala.** Bu, telefonunun internetteki geçici adresidir.

⚠️ **Bu pencereyi de kapatma** — kapatırsan tünel durur, link ölür.

Kopyaladığın linkin **sonuna `/mcp` ekle**. Yani:

```
https://rastgele-kelimeler-buraya.trycloudflare.com/mcp
```

Bu, AI'ye vereceğin tam linktir. Bir yere (notlarına, örneğin) yapıştır ki kaybetme — her `cloudflared`'i yeniden başlattığında bu link **değişir**.

---

## 6. AI'ye bağlanma — Claude

**Gereken:** bir claude.ai hesabı (ücretsiz hesap da çalışır, ama yalnızca 1 özel bağlayıcı ekleyebilirsin; Pro/Max'te limit yoktur).

1. [claude.ai](https://claude.ai)'ye git (tarayıcı veya mobil uygulama)
2. Sol taraftaki menüden **Settings → Connectors** bölümüne git (mobilde: profil ikonuna dokun → **Settings** → **Connectors**)
3. **"+"** düğmesine dokun
4. **"Add custom connector"** seç
5. Açılan pencerede:
   - **Name**: istediğin ad, örn. `Telefonum`
   - **URL**: 5. adımda aldığın linki yapıştır (`.../mcp` ile biten)
6. **"Add"** dokun

Bağlandıktan sonra, her sohbette bunu etkinleştirmen gerekiyor:
1. Sohbet ekranında sol alt köşedeki **"+"** düğmesine dokun
2. **"Connectors"** seç
3. Oluşturduğun bağlayıcının yanındaki düğmeyi aç (toggle)

Şimdi Claude'a yaz, örneğin: *"Telefonumda hangi dosyalar var, bak"* — Claude sunucuna bağlanıp bash komutu çalıştıracak.

---

## 7. AI'ye bağlanma — ChatGPT

**Gereken:** ChatGPT Plus, Pro, Team, Enterprise veya Edu hesabı. **Ücretsiz (Free) hesapta bu özellik yoktur.**

1. [chatgpt.com](https://chatgpt.com)'a git
2. Profil ikonuna dokun (alt sol/sağ köşede) → **Settings**
3. **Connectors** (veya **Apps & Connectors**) bölümüne git
4. Aşağı in, **Advanced** → **Developer mode**'u etkinleştir (toggle) — "özel bağlayıcılar üçüncü taraf kodu çalıştırır" uyarısı çıkacak — kabul et
5. Şimdi **"Add custom connector"** (veya **"Create connector"**) düğmesi görünecek, ona dokun
6. Doldur:
   - **Name**: istediğin ad
   - **URL**: 5. adımda aldığın linki yapıştır (`.../mcp` ile biten)
   - **Authentication**: `No authentication` seç (bu sunucu token kullanmıyor)
7. Kaydet

**Dikkat:** bağlayıcı eklemek yetmiyor — **her yeni sohbette** ayrıca etkinleştirmen gerekiyor:
1. Sohbet kutusunda **"+"** düğmesine dokun
2. **"Developer mode"** (veya **"More"**) seç
3. Bağlayıcını listede bul ve aç (toggle)

Şimdi ChatGPT'ye yaz, o da sunucuna bağlanıp komut çalıştırabilecek. Genellikle her komuttan önce ChatGPT senden onay isteyecek — bu normaldir, "Run"/"Çalıştır" gibi bir düğmeye basman gerekecek.

---

## 8. Güvenlik ve Yetenekler

Bu sunucunun tek aracı `exec`'dir — keyfi bash çalıştırma. Bunun cihazın için *gerçekte* ne anlama geldiği, başka ne kurulu/etkin olduğuna bağlıdır:

**Eğer [Termux:API](https://wiki.termux.com/wiki/Termux:API) kuruluysa** (`pkg install termux-api` + Termux:API uygulaması), bu sunucuya bağlanan herhangi bir AI, prensipte, şu gibi komutları çağırabilir:
- `termux-sms-list` / `termux-sms-send` — SMS okuma/gönderme
- `termux-contact-list` — kişileri okuma
- `termux-camera-photo` — fotoğraf çekme
- `termux-location` — GPS konumu alma
- `termux-clipboard-get/set`, `termux-notification`, `termux-battery-status`, `termux-microphone-record` vb.

Termux:API'yi yalnızca bağlanan AI'nin bunları potansiyel olarak kullanabilmesine gönlün rahatsa kur.

**Eğer cihaz rootlanmışsa:** root shell sistem bölümlerini değiştirebilir, diğer uygulamaların özel verilerine erişebilir, güvenlik duvarı kurallarını değiştirebilir. Bu sunucuyu root olarak çalıştırmak **önerilmez**.

**ADB hakkında:** ADB erişimi bu sunucuyla doğrudan ilgili değildir, ama telefonuna ADB erişimi olan herkes neredeyse tam kontrole sahiptir (uygulama kurma/kaldırma, dosya çekme, ekranı yansıtma). ADB erişimini asla bu sunucunun tünel linkiyle birlikte paylaşma.

**Tünel linki hakkında:** `cloudflared` linki hiçbir şifreyle korunmaz. Onu paylaşma (TikTok/ekran görüntülerinde gösterirken linki mutlaka bulanıklaştır/karart), sunucu açık kaldığı sürece linkin kimde olduğunu bil.

---

## 9. Sorumluluk Reddi

Bu beta yazılımdır. Geliştirici, bu sunucunun çalıştırılmasından, ağa açılmasından veya ona bağlanan herhangi bir AI/istemci tarafından yapılan işlemlerden kaynaklanan veri kaybı, cihaz hasarı, yetkisiz erişim veya başka herhangi bir sonuç için **hiçbir sorumluluk kabul etmez**. Onu nasıl yapılandırdığından, kime erişim verdiğinden **sen sorumlusun**. Tam yasal metin için [LICENSE](../LICENSE) dosyasına bak. Kendi riskinle kullan.

## AI Güvenlik Rehberi

Bu sunucuya bir AI bağlıyorsan, [`prompts/ai-usage-guide.txt`](../prompts/ai-usage-guide.txt) rehberini onun sistem talimatlarının bir parçası olarak ver — bu, AI'den geri dönüşü olmayan işlemlerden önce senden onay istemesini talep eder.

<p align="center"><a href="README.tr.md">← Hakkında sayfasına dön</a></p>
