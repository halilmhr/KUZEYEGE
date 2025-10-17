# 🔧 SINIFLAR GÖRÜNMÜYOR - ÇÖZÜM REHBERİ

## ⚠️ Problem
Sınıf ekledikten sonra "Eklenen Sınıflar" listesinde görünmüyor.

## ✅ ÇÖZÜM ADIMLARİ

### Yöntem 1: Hızlı Sıfırlama (ÖNERİLEN)

1. **Ana sayfayı aç:** `index.html`
2. **Sağ üst köşede** "🗑️ Tümünü Sıfırla" butonuna tıkla
3. **Onay ver** ve sayfa yenilenecek
4. **Sıfırdan başla:**
   - Önce sınıf ekle
   - Sonra ders ekle
   - Program oluştur

### Yöntem 2: Test Sayfası ile Kontrol

1. **Test sayfasını aç:** `test.html`
2. **Adım adım ilerle:**
   ```
   1️⃣ Tüm Verileri Sil → Tıkla
   2️⃣ Test Sınıfı Ekle → Tıkla
   3️⃣ Kayıtlı Verileri Göster → Tıkla
   4️⃣ Ana Sayfaya Git → Tıkla
   ```
3. **Ana sayfada:** Test sınıfı görünmeli

### Yöntem 3: Manuel Tarayıcı Temizliği

1. **Tarayıcıda F12** bas (Developer Tools)
2. **Console sekmesine** gel
3. **Bu komutu yaz ve Enter'a bas:**
   ```javascript
   localStorage.clear()
   ```
4. **Sayfayı yenile:** F5 veya Ctrl+R
5. **Sıfırdan başla**

### Yöntem 4: Hard Refresh (Cache Temizle)

1. **Chrome/Edge:** `Ctrl + Shift + R` veya `Ctrl + F5`
2. **Firefox:** `Ctrl + Shift + R`
3. **Sayfa tamamen yenilenecek**

## 🧪 TEST SENARYOSU

Sınıf ekledikten sonra görünüyor mu kontrol et:

### Doğru Kullanım:
```
1. Sınıf Adı: 9-A
2. Günler: Pzt, Sal, Çar, Per, Cum (hepsi seçili)
3. ➕ Sınıf Ekle butonu
4. "Eklenen Sınıflar" bölümüne bak
5. ✅ "🎓 9-A" görünmeli
6. ✅ Altında "📅 Pzt, Sal, Çar, Per, Cum" yazmalı
```

### Hata Durumları:
- ❌ Sınıf adı boş → Uyarı verir
- ❌ Hiç gün seçilmemiş → Uyarı verir
- ❌ Aynı isimde sınıf var → "Bu sınıf zaten mevcut" uyarısı

## 🐛 DEBUG MODU

Tarayıcı konsolunu (F12) aç ve şunları kontrol et:

```javascript
// Console'da çalıştır:
console.log('Sınıflar:', JSON.parse(localStorage.getItem('classes')));
console.log('Dersler:', JSON.parse(localStorage.getItem('lessons')));
```

**Beklenen Çıktı:**
```javascript
Sınıflar: [{name: "9-A", activeDays: [0,1,2,3,4]}]
Dersler: {lessons: [...], nextId: 1}
```

## 🎯 EN HIZLI ÇÖZÜM

1. **test.html** aç
2. **Butonu tıkla:** "1️⃣ TÜM VERİLERİ SİL"
3. **Ana sayfaya dön:** index.html
4. **F5** ile yenile
5. **Yeni sınıf ekle**
6. ✅ Artık görünecek!

## 📞 SORUN DEVAM EDİYORSA

Console'da (F12) şu hataları ara:
- ❌ `Cannot read property 'name'` → Veri yapısı bozuk
- ❌ `JSON.parse error` → LocalStorage bozuk
- ❌ `classList is not defined` → HTML yüklenmemiş

**ÇÖZÜM:** Yukarıdaki yöntemlerden biriyle temizle ve yeniden başla.

---

## ✨ YENİ ÖZELLİKLER

- ✅ **7 gün desteği** (Pazartesi-Pazar)
- ✅ **Hazır ders listesi** (18 ders)
- ✅ **Manuel ders ekleme** ("Diğer" seçeneği)
- ✅ **Gerçek saat dilimleri** (09:00-15:30)
- ✅ **Sınıf günleri seçimi** (Hangi günler aktif)
- ✅ **Sıfırlama butonu** (Sağ üstte)

Başarılar! 🎓📚
