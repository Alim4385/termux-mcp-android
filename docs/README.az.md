<p align="center">
  <a href="README.en.md">🇬🇧 English</a> •
  <a href="README.az.md"><strong>🇦🇿 Azərbaycanca</strong></a> •
  <a href="README.tr.md">🇹🇷 Türkçe</a>
</p>

<div align="center">

# 📱 Termux MCP Server

<sub>Sıfır asılılıqlı Model Context Protocol server — Termux (Android) üçün</sub>

<br>

### [📖 Tam Quraşdırma və İstifadə Təlimatı →](GUIDE.az.md)

</div>

---

## Bu nədir?

Bu, [Termux](https://termux.dev) (Android üçün terminal tətbiqi) daxilində işləyən kiçik bir serverdir və [Model Context Protocol](https://modelcontextprotocol.io) — Claude və ChatGPT kimi AI-lərin xarici alətlərə qoşulmasına imkan verən açıq standart — ilə danışır.

Sadə dillə: server işə düşdükdən sonra ona bir AI qoşa bilərsən, və həmin AI **Android telefonuna real bash shell girişi** əldə edir — fayl oxuya/yaza bilər, paket qura bilər, script işlədə bilər, cihazın üzərində birbaşa əməliyyatlar apara bilər.

## Niyə yaradılıb?

Əksər MCP server-lər laptop/masaüstü üçün yazılıb. Android/Termux tam fərqli mühitdir — fərqli fayl sistemi düzülüşü, fərqli paket meneceri, məhdud resurslar, `systemd` və ya arxa fon xidməti rahatlıqları yoxdur. Bu layihə məhz bu mühit üçün yazılıb: **bir fayl, sıfır npm asılılığı** — yəni sınmalı heç nə yoxdur, Node.js-dən başqa əlavə heç nə quraşdırmaq lazım deyil.

## Xüsusiyyətlər

- **Sıfır asılılıq** — yalnız Node.js-in daxili modulları (`http`, `child_process`, `fs`, `path`)
- **1 alət**: `exec` — istənilən bash əmrini icra edir
- **Avtomatik işçi qovluq (cwd) izləmə** — `cd` və zəncirlənmiş əmrlər (`cd x && npm run dev`) real `$PWD` markeri ilə düzgün izlənir, regex təxmini deyil
- **Restart-safe** — son işçi qovluq diskə yazılır və server yenidən başlayanda bərpa olunur
- **Timeout qoruması** — 60 saniyədən uzun sürən əmrlər avtomatik dayandırılır
- **Output kəsilməsi** — çox böyük çıxışlar token qənaəti üçün kəsilir

## Sınaqdan Keçib

| | |
|---|---|
| **Android versiyası** | Android 9-dan 14-ə qədər |
| **Cihazlar** | Redmi 6A, Honor X8B |
| **RAM istifadəsi (boşdaykən)** | Testlərdə ~28 MB |
| **Tövsiyə olunan boş RAM** | Minimum 500 MB – 1 GB |

Bu rəqəmlər developer-in öz test nəticələridir — universal zəmanət kimi yox, istinad kimi qəbul et.

## ⚠️ Başlamazdan əvvəl

Bu serverin **heç bir daxili authentication-i yoxdur**. Linkinə sahib olan hər kəs telefonunda əmr işlədə bilər. Bu, "sonra düzəldiləcək" bir qüsur deyil — bilərəkdən edilmiş minimalist bir seçimdir, və bu deməkdir ki, **linkə kimin çatacağına sən cavabdehsən**. [Tam təlimat](GUIDE.az.md) bunu detallı izah edir, o cümlədən Termux:API quraşdırsan AI-nin nələrə çata biləcəyini, və root olunmuş cihazda niyə riski tam anlamadan işlətməməli olduğunu.

## Məsuliyyətin Rədd Edilməsi

Bu beta proqram təminatıdır. Müəllif bu serverin işlədilməsindən və ya şəbəkəyə açılmasından yaranan data itkisi, cihaz zədəsi, icazəsiz giriş və ya hər hansı başqa nəticəyə görə **heç bir məsuliyyət daşımır**. Onu necə konfiqurasiya etdiyinə, kimə giriş verdiyinə görə **sən məsuliyyət daşıyırsan**. Tam hüquqi mətn üçün [LICENSE](../LICENSE) faylına bax.

## Lisenziya

MIT + əlavə istifadə şərtləri — bax [LICENSE](../LICENSE).

<div align="center">

### 👉 Qurmağa hazırsan? [Tam təlimatı aç](GUIDE.az.md)

</div>
