# Orbit Pop — Oyun Tasarım Belgesi

## Ürün özeti

Orbit Pop, 30 saniye ile 5 dakika arasında oynanabilen, her yaştan kullanıcıya yönelik tek dokunuşlu bir refleks oyunudur. Ana amaç, merkezdeki çekirdeğin rengiyle aynı renkteki hareketli yörünge hedefini doğru zamanda vurmaktır.

## Temel oyun döngüsü

1. Oyuncu modu seçer.
2. Nişan çizgisi merkez çevresinde döner.
3. Oyuncu doğru hedef çizgiyle kesiştiğinde ateş eder.
4. Doğru isabet skor ve kombo kazandırır.
5. Kombo eşiklerinde güçlendirme tetiklenir.
6. Oyun hızı skora bağlı olarak artar.
7. Tur sonunda skor, doğruluk, kombo ve süre raporlanır.

## Modlar

### Klasik

- 3 can
- Süre sınırı yok
- Yanlış renk veya boşa atış can kaybettirir
- Ana rekabet modu

### 60 Saniye

- 60 saniye
- Sınırsız can
- Hatalar komboyu sıfırlar
- Hızlı tekrar oynama için ideal

### Günlük Görev

- 45 saniye
- 3 can
- Günün tarihinden üretilen sabit rastgele dizi
- Aynı gün aynı hedef başlangıç düzeni

### Zen

- Süre ve can sınırı yok
- Daha yavaş tempo
- Rahat oynanış

## Puanlama

Temel puan hedefin yörünge uzaklığına göre yükselir. Kombo çarpanları:

- 0–4: ×1
- 5–9: ×2
- 10–19: ×3
- 20+: ×5

Çift puan güçlendirmesi mevcut çarpanı ikiyle çarpar.

## Güçlendirmeler

- **Zaman Yavaşlatma:** Dönüş hızını geçici olarak düşürür.
- **Kalkan:** Bir hatayı can kaybetmeden karşılar.
- **Çift Puan:** Geçici olarak puanı iki katına çıkarır.
- **Renk Dalgası:** Mevcut renkteki en fazla üç hedefi temizler.
- **Hedef Mıknatısı:** İsabet açısını geçici olarak genişletir.

## Erişilebilirlik

- Renk körlüğü için alternatif palet
- Azaltılmış hareket seçeneği
- Klavye, fare ve dokunmatik kontrol
- Görsel HUD ve işitsel geri bildirim
- Düşük cihazlar için kalite ayarı

## Görsel dil

- Koyu uzay arka planı
- Turkuaz, mor, mercan ve altın vurgu renkleri
- Cam yüzeyli paneller
- Hafif neon parlama
- Yüksek kontrastlı büyük skor tipografisi
- Küçük ekranlarda sadeleştirilmiş HUD

## Teknik hedefler

- İlk etkileşim süresi: 2 saniyenin altında
- 60 FPS hedefi
- Düşük kalite modunda 1× DPR çizim
- Harici çalışma zamanı bağımlılığı olmadan çalışma
- PWA ve çevrimdışı destek
