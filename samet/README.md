# 📚 Ders Programı Oluşturucu

Modern, web tabanlı çakışmasız ders programı oluşturma sistemi.

## ✨ Özellikler

### 🎯 Temel Özellikler
- ✅ **Kullanıcı Girişi Yok** - Tek kullanıcı için çalışır (ileride eklenebilir)
- 🎨 **Modern Arayüz** - Tailwind CSS ile şık ve renkli tasarım
- 📋 **Ders Yönetimi** - Öğretmen, ders, sınıf ve saat bilgileri
- ⏰ **Uygunluk Ayarları** - Öğretmenler için gün/saat tercihleri
- 🚫 **Çakışma Önleme** - Otomatik çakışma kontrolü
- 📅 **Haftalık Program** - Pazartesi-Cuma, 1-8 saat arası program

### 🔧 Gelişmiş Özellikler
- 🖱️ **Sürükle-Bırak** - Manuel düzenleme imkanı
- ⚠️ **Akıllı Uyarılar** - Yerleştirilemeyen dersler için bildirim
- 📥 **Export** - PNG ve PDF olarak indirme
- 💾 **LocalStorage** - Veriler tarayıcıda saklanır
- 🎨 **Renkli Görselleştirme** - Her ders için farklı renk

## 🚀 Kullanım

### Başlangıç
1. `index.html` dosyasını bir web tarayıcısında açın
2. Hiçbir kurulum gerekmez - tamamen istemci tarafında çalışır!

### Ders Ekleme
1. **Sol paneldeki formu** doldurun:
   - 👨‍🏫 Öğretmen Adı (örn: Ahmet Yılmaz)
   - 📖 Ders Adı (örn: Matematik)
   - 🎓 Sınıf Adı (örn: 9-A)
   - ⏰ Haftalık Ders Saati (örn: 4)
   - 📅 Uygun Günler (isteğe bağlı)
   - 🕐 Uygun Saatler (isteğe bağlı)

2. **"➕ Ekle"** butonuna tıklayın

3. Ders, **"Eklenen Dersler"** listesinde görünecektir

### Program Oluşturma
1. En az bir ders ekledikten sonra **"✨ Ders Programı Oluştur"** butonuna tıklayın

2. Sistem otomatik olarak:
   - ✅ Çakışmaları kontrol eder
   - ✅ Uygun saatlere öncelik verir
   - ✅ Dengeli bir dağılım yapar

3. Program, **sağ paneldeki tabloda** görünür

### Manuel Düzenleme
- 🖱️ Herhangi bir dersi **sürükleyip** başka bir hücreye **bırakabilirsiniz**
- Sistem otomatik olarak yer değiştirir

### İndirme
- 📷 **"PNG İndir"** - Görüntü olarak kaydet
- 📄 **"PDF İndir"** - PDF belgesi olarak kaydet

## 🛠️ Teknolojiler

- **HTML5** - Yapı
- **Tailwind CSS** - Modern stil ve tasarım
- **JavaScript (ES6+)** - İş mantığı ve algoritma
- **html2canvas** - PNG export için
- **jsPDF** - PDF export için
- **LocalStorage API** - Veri saklama

## 📐 Çakışma Kuralları

Sistem otomatik olarak şu kuralları uygular:

1. ❌ **Öğretmen Çakışması** - Aynı öğretmen aynı anda iki farklı derse giremez
2. ❌ **Sınıf Çakışması** - Aynı sınıf aynı anda iki farklı derse giremez
3. ✅ **Uygunluk Önceliği** - Öğretmenlerin belirttiği uygun saatler önceliklidir

## 🏗️ Kod Yapısı (Modüler Tasarım)

```
app.js
├── MODÜL 1: Veri Yönetimi
│   ├── Lesson Class - Ders verilerini temsil eder
│   └── LessonManager Class - Tüm dersleri yönetir
│
├── MODÜL 2: Program Oluşturma
│   └── ScheduleGenerator Class - Akıllı algoritma ile program oluşturur
│
└── MODÜL 3: Kullanıcı Arayüzü
    └── UIManager Class - Tüm UI işlemlerini yönetir
```

### İleride Eklenebilir Özellikler 🔮

Kod, **modüler yapıda** yazılmıştır ve kolayca genişletilebilir:

#### Kullanıcı Sistemi
```javascript
// LessonManager sınıfına eklenebilir:
class UserManager {
    login(username, password) { ... }
    register(userData) { ... }
    getUserLessons(userId) { ... }
}
```

#### Backend Entegrasyonu
```javascript
// API çağrıları eklenebilir:
async saveToServer() {
    await fetch('/api/lessons', {
        method: 'POST',
        body: JSON.stringify(this.lessons)
    });
}
```

#### Veritabanı
- LocalStorage yerine **Firebase**, **MongoDB** veya **PostgreSQL** kullanılabilir
- Sadece `LessonManager` sınıfındaki `saveToStorage()` ve `loadFromStorage()` metodları değiştirilir

## 📊 Algoritma Detayları

### Program Oluşturma Algoritması

```
1. Boş 5x8 tablo oluştur (5 gün, 8 saat)

2. Her ders için:
   a. Gerekli saat sayısı kadar yerleştirme dene
   
   b. Her yerleştirme için:
      - Uygun slotları bul (öncelikli + normal)
      - Çakışma kontrolü yap:
        * Aynı öğretmen var mı?
        * Aynı sınıf var mı?
      - Uygunsa yerleştir
   
   c. Yerleştirilemeyen varsa uyarı listesine ekle

3. Sonucu döndür
```

## 🎨 Kullanıcı Arayüzü

### Renk Paleti
- 🔵 Mavi - Ana tema ve butonlar
- 🟢 Yeşil - Başarı mesajları
- 🟡 Sarı - Uyarılar
- 🔴 Kırmızı - Hata ve silme işlemleri
- 🟣 Mor - Vurgular

### Responsive Tasarım
- 💻 **Desktop** - İki sütunlu layout
- 📱 **Mobile** - Tek sütunlu, responsive tasarım

## 📝 Örnek Kullanım Senaryosu

```
1. Matematik öğretmeni Ahmet Yılmaz:
   - 9-A sınıfına 4 saat/hafta
   - Pazartesi ve Çarşamba günleri uygun
   - Sabah saatleri (1-4) tercih ediyor

2. Fizik öğretmeni Ayşe Demir:
   - 9-A sınıfına 3 saat/hafta
   - Salı ve Perşembe günleri uygun

3. Program oluşturulduğunda:
   - Çakışma olmaz (aynı sınıf, farklı günler)
   - Öğretmenlerin tercihleri dikkate alınır
   - Dengeli dağılım sağlanır
```

## 🐛 Sorun Giderme

### Dersler yerleşmiyor
- ✅ Haftalık ders saatini azaltmayı deneyin
- ✅ Uygunluk kısıtlamalarını gevşetin
- ✅ Çakışan öğretmen/sınıf kontrolü yapın

### Export çalışmıyor
- ✅ İnternet bağlantınızı kontrol edin (CDN için)
- ✅ Modern bir tarayıcı kullanın (Chrome, Firefox, Edge)

### Veriler kayboldu
- ℹ️ LocalStorage temizlenmiş olabilir
- ℹ️ Farklı tarayıcı kullanıyorsanız veriler ayrı tutulur

## 📄 Lisans

Bu proje açık kaynaklıdır ve eğitim amaçlı kullanılabilir.

## 👨‍💻 Geliştirici Notları

### Kod Kalitesi
- ✅ ES6+ modern JavaScript
- ✅ Class-based OOP yapısı
- ✅ Kapsamlı kod yorumları
- ✅ Modüler ve genişletilebilir

### Performans
- ⚡ Tamamen istemci tarafında çalışır
- ⚡ Hızlı algoritma (O(n*m*k) kompleksitesi)
- ⚡ Minimum bağımlılık

### Güvenlik
- 🔒 XSS koruması (DOM manipülasyonu güvenli)
- 🔒 LocalStorage güvenli kullanım
- ℹ️ Backend eklendiğinde CSRF/JWT gerekecek

---

**İyi Kullanımlar! 🎓📚**
