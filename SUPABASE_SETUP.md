# 🗄️ Supabase Yedekleme Sistemi Kurulumu

## 1. Supabase Hesabı Oluşturma
1. [Supabase.com](https://supabase.com) adresine gidin
2. "Start your project" butonuna tıklayın
3. GitHub hesabınızla giriş yapın
4. "New project" butonuna tıklayın
5. Proje adını girin (örn: "ders-planlama-backup")
6. Database şifresini belirleyin (güçlü bir şifre seçin)
7. Region seçin (Europe West (Ireland) önerilir)
8. "Create new project" butonuna tıklayın

## 2. Veritabanı Tablosu Oluşturma
1. Supabase dashboard'da sol menüden "SQL Editor" seçin
2. "+ New query" butonuna tıklayın
3. Aşağıdaki SQL kodunu yapıştırın:

```sql
CREATE TABLE program_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS (Row Level Security) etkinleştir
ALTER TABLE program_backups ENABLE ROW LEVEL SECURITY;

-- Herkesin okuma/yazma yapmasına izin ver (geliştirme amaçlı)
-- Üretim ortamında daha kısıtlayıcı politikalar kullanın
CREATE POLICY "Enable all access for program_backups" ON program_backups
FOR ALL USING (true);
```

4. "Run" butonuna tıklayın

## 3. API Anahtarlarını Alma
1. Sol menüden "Settings" > "API" seçin
2. "Project URL" değerini kopyalayın
3. "anon" anahtarını kopyalayın (API Keys bölümünden)

## 4. Uygulamayı Yapılandırma
1. `supabase.ts` dosyasını açın
2. `supabaseUrl` değerini Project URL ile değiştirin
3. `supabaseKey` değerini anon anahtarı ile değiştirin

Örnek:
```typescript
const supabaseUrl = 'https://abcdefghijklmnop.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

## 5. Test Etme
1. Uygulamayı başlatın
2. Sağ üst köşedeki "Yedekle" butonuna tıklayın
3. Yedek adı girin ve "Yedekle" butonuna tıklayın
4. Başarılı mesajı alırsanız kurulum tamamdır! 🎉

## 6. Güvenlik Notları
- Üretim ortamında RLS politikalarını daha kısıtlayıcı yapın
- API anahtarlarınızı güvenli bir şekilde saklayın
- Düzenli olarak yedeklerinizi kontrol edin

## Kullanım
- **Yedekleme**: Header'daki "Yedekle" butonuna tıklayın
- **Geri Yükleme**: Yedek listesinden "Geri Yükle" butonuna tıklayın
- **Silme**: Yedek listesinden "Sil" butonuna tıklayın

## Sorun Giderme
- Bağlantı hatası alıyorsanız URL ve anahtarları kontrol edin
- Tablo hatası alıyorsanız SQL sorgusunu tekrar çalıştırın
- CORS hatası alıyorsanız Supabase dashboard'da CORS ayarlarını kontrol edin