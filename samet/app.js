// ============================================
// MODÜL 1: ZAMAN YÖNETİMİ
// ============================================

/**
 * Ders saatlerini ve zamanlarını yöneten sınıf
 */
class TimeManager {
    constructor() {
        // Başlangıç saati: 08:50
        this.startHour = 8;
        this.startMinute = 50;
        
        // Her ders 40 dakika
        this.lessonDuration = 40;
        
        // Teneffüs 10 dakika
        this.breakDuration = 10;
    }

    /**
     * Belirli bir ders saati için başlangıç ve bitiş zamanını hesapla (varsayılan)
     * @param {number} lessonNumber - Kaçıncı ders (0-7)
     * @returns {string} - Örn: "09:00 - 09:40"
     */
    getTimeSlot(lessonNumber) {
        return this.getTimeSlotForClass(lessonNumber, null);
    }

    /**
     * Sınıfa özel ders saati hesapla
     * @param {number} lessonNumber - Kaçıncı ders (0-7)
     * @param {Object} classInfo - Sınıf bilgileri (null ise varsayılan kullan)
     * @returns {string} - Örn: "09:00 - 09:40"
     */
    getTimeSlotForClass(lessonNumber, classInfo) {
        let startHour, startMinute, lessonDuration, breakDuration;
        
        if (classInfo) {
            // Sınıf bilgilerinden al
            const [h, m] = classInfo.startTime.split(':').map(Number);
            startHour = h;
            startMinute = m;
            lessonDuration = classInfo.lessonDuration;
            breakDuration = classInfo.breakDuration;
        } else {
            // Varsayılan değerler
            startHour = this.startHour;
            startMinute = this.startMinute;
            lessonDuration = this.lessonDuration;
            breakDuration = this.breakDuration;
        }
        
        // Toplam geçen dakika: (ders süresi + teneffüs) * ders numarası
        const totalMinutes = startMinute + (lessonDuration + breakDuration) * lessonNumber;
        
        // Başlangıç zamanı
        const startTotalMinutes = startHour * 60 + totalMinutes;
        const startH = Math.floor(startTotalMinutes / 60);
        const startM = startTotalMinutes % 60;
        
        // Bitiş zamanı
        const endTotalMinutes = startTotalMinutes + lessonDuration;
        const endH = Math.floor(endTotalMinutes / 60);
        const endM = endTotalMinutes % 60;
        
        return `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    /**
     * Tüm ders saatlerini döndür
     */
    getAllTimeSlots() {
        const slots = [];
        for (let i = 0; i < 8; i++) {
            slots.push({
                lessonNumber: i + 1,
                timeRange: this.getTimeSlot(i)
            });
        }
        return slots;
    }

    /**
     * Sınıf için maksimum ders saati sayısını hesapla
     * @param {Object} classInfo - Sınıf bilgileri
     * @returns {number} - Maksimum ders saati sayısı
     */
    getMaxHoursForClass(classInfo) {
        if (!classInfo) return 8; // Varsayılan 8 saat
        
        // Başlangıç ve bitiş saatlerini parse et
        const [startH, startM] = classInfo.startTime.split(':').map(Number);
        const [endH, endM] = classInfo.endTime.split(':').map(Number);
        
        // Toplam dakika hesapla
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const totalMinutes = endMinutes - startMinutes;
        
        // Her ders + teneffüs süresi
        const lessonAndBreak = classInfo.lessonDuration + classInfo.breakDuration;
        
        // Kaç ders sığar?
        const maxLessons = Math.floor(totalMinutes / lessonAndBreak);
        
        return Math.max(1, Math.min(maxLessons, 12)); // En az 1, en fazla 12 saat
    }
}

// ============================================
// MODÜL 2: SINIF YÖNETİMİ
// ============================================

/**
 * Sınıf bilgilerini tutan sınıf
 */
class ClassInfo {
    constructor(name, activeDays, startTime = '09:00', endTime = '15:30', lessonDuration = 40, breakDuration = 10) {
        this.name = name; // Sınıf adı (örn: 9-A)
        this.activeDays = activeDays; // Hangi günler aktif (0-6: Pzt-Paz)
        this.startTime = startTime; // Başlangıç saati (HH:MM formatında)
        this.endTime = endTime; // Bitiş saati (HH:MM formatında)
        this.lessonDuration = lessonDuration; // Ders süresi (dakika)
        this.breakDuration = breakDuration; // Teneffüs süresi (dakika)
    }
}

/**
 * Sınıfları yöneten sınıf
 */
class ClassManager {
    constructor() {
        this.classes = []; // ClassInfo nesneleri dizisi
        this.loadFromStorage();
    }

    /**
     * Yeni sınıf ekle
     */
    addClass(className, activeDays, startTime = '09:00', endTime = '15:30', lessonDuration = 40, breakDuration = 10) {
        if (!className || className.trim() === '') {
            return { success: false, message: 'Sınıf adı boş olamaz!' };
        }

        if (activeDays.length === 0) {
            return { success: false, message: 'En az bir gün seçmelisiniz!' };
        }

        // Aynı isimde sınıf var mı kontrol et
        if (this.classes.some(c => c.name === className.trim())) {
            return { success: false, message: 'Bu sınıf zaten mevcut!' };
        }

        const classInfo = new ClassInfo(className.trim(), activeDays, startTime, endTime, lessonDuration, breakDuration);
        this.classes.push(classInfo);
        this.saveToStorage();
        return { success: true, message: 'Sınıf başarıyla eklendi!' };
    }

    /**
     * Sınıf sil
     */
    removeClass(className) {
        console.log('ClassManager.removeClass çağrıldı:', className);
        console.log('Mevcut sınıflar:', this.classes);
        
        const beforeCount = this.classes.length;
        this.classes = this.classes.filter(c => c.name !== className);
        const afterCount = this.classes.length;
        
        console.log('Silme öncesi sayı:', beforeCount, 'Silme sonrası sayı:', afterCount);
        console.log('Güncel sınıflar:', this.classes);
        
        this.saveToStorage();
        console.log('Storage\'a kaydedildi');
    }

    /**
     * Tüm sınıfları getir
     */
    getAllClasses() {
        return this.classes;
    }

    /**
     * Sınıf bilgisini getir
     */
    getClassInfo(className) {
        return this.classes.find(c => c.name === className);
    }

    /**
     * Sınıf güncelle
     */
    updateClass(oldName, newName, activeDays, startTime, endTime, lessonDuration, breakDuration) {
        const classIndex = this.classes.findIndex(c => c.name === oldName);
        if (classIndex === -1) {
            return { success: false, message: 'Sınıf bulunamadı!' };
        }

        // Yeni isim farklıysa ve başka bir sınıf tarafından kullanılıyorsa hata ver
        if (oldName !== newName && this.classes.some(c => c.name === newName)) {
            return { success: false, message: 'Bu sınıf adı zaten kullanılıyor!' };
        }

        // Sınıfı güncelle
        this.classes[classIndex] = new ClassInfo(newName, activeDays, startTime, endTime, lessonDuration, breakDuration);
        this.saveToStorage();
        return { success: true, message: 'Sınıf başarıyla güncellendi!' };
    }

    /**
     * Sınıf bilgisini getir (ESKİ)
     */
    getClassInfo(className) {
        return this.classes.find(c => c.name === className);
    }

    /**
     * Sınıfın aktif günlerini getir
     */
    getClassActiveDays(className) {
        const classInfo = this.getClassInfo(className);
        return classInfo ? classInfo.activeDays : [0, 1, 2, 3, 4]; // Varsayılan: tüm günler
    }

    /**
     * LocalStorage'a kaydet
     */
    saveToStorage() {
        const classesData = this.classes.map(c => ({
            name: c.name,
            activeDays: c.activeDays
        }));
        localStorage.setItem('classes', JSON.stringify(classesData));
    }

    /**
     * LocalStorage'dan yükle
     */
    loadFromStorage() {
        const data = localStorage.getItem('classes');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.classes = parsed.map(c => new ClassInfo(
                    c.name, 
                    c.activeDays, 
                    c.startTime || '09:00', 
                    c.endTime || '15:30', 
                    c.lessonDuration || 40, 
                    c.breakDuration || 10
                ));
            } catch (e) {
                console.error('Sınıf verileri yüklenemedi:', e);
                this.classes = [];
            }
        }
    }

    /**
     * Boş program tablosu oluştur - Kullanıcı ders yerlerini işaretleyebilir
     */
    createEmptySchedule(className) {
        const classInfo = this.getClassInfo(className);
        if (!classInfo) return null;

        const timeManager = new TimeManager();
        const maxHours = timeManager.getMaxHoursForClass(classInfo);
        
        // Boş program oluştur
        const schedule = [];
        for (let hour = 0; hour < maxHours; hour++) {
            const dayRow = [];
            for (let day = 0; day < 7; day++) {
                dayRow.push(null); // Boş hücre
            }
            schedule.push(dayRow);
        }

        // Kayıtlı kısıtları yükle
        const savedConstraints = this.loadScheduleConstraints();
        
        return {
            className: className,
            schedule: schedule,
            maxHours: maxHours,
            activeDays: classInfo.activeDays,
            blockedCells: savedConstraints.blockedCells[className] || [], // Kullanıcının işaretlediği "ders yok" hücreleri
            teacherConstraints: savedConstraints.teacherConstraints || {} // Öğretmen kısıtları
        };
    }

    /**
     * Program kısıtlarını localStorage'a kaydet
     */
    saveScheduleConstraints(constraints) {
        localStorage.setItem('scheduleConstraints', JSON.stringify(constraints));
    }

    /**
     * Program kısıtlarını localStorage'dan yükle
     */
    loadScheduleConstraints() {
        const data = localStorage.getItem('scheduleConstraints');
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {
                console.error('Kısıt verileri yüklenemedi:', e);
            }
        }
        return {
            blockedCells: {}, // className -> [cellKeys]
            teacherConstraints: {} // teacherName -> [cellKeys]
        };
    }

    /**
     * Tüm sınıfları temizle
     */
    clearAll() {
        this.classes = [];
        this.saveToStorage();
    }
}

// ============================================
// MODÜL 3: VERİ YÖNETİMİ
// ============================================

/**
 * Ders adına göre sabit renk ataması
 */
const LESSON_COLORS = {
    'Matematik': 'bg-blue-500',
    'Fizik': 'bg-green-500',
    'Kimya': 'bg-yellow-500',
    'Biyoloji': 'bg-lime-500',
    'Türkçe': 'bg-red-500',
    'Edebiyat': 'bg-pink-500',
    'Tarih': 'bg-purple-500',
    'Coğrafya': 'bg-indigo-500',
    'Felsefe': 'bg-violet-500',
    'İngilizce': 'bg-cyan-500',
    'Almanca': 'bg-teal-500',
    'Fransızca': 'bg-sky-500',
    'Din Kültürü': 'bg-amber-500',
    'Beden Eğitimi': 'bg-orange-500',
    'Müzik': 'bg-fuchsia-500',
    'Görsel Sanatlar': 'bg-rose-500',
    'Rehberlik': 'bg-emerald-500',
    'Bilişim Teknolojileri': 'bg-slate-500'
};

/**
 * DERS RENKLERİ: Her ders için bağımsız renk ataması
 */
const LESSON_COLOR_PALETTE = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-amber-500',
    'bg-emerald-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-rose-500',
    'bg-sky-500', 'bg-slate-500', 'bg-zinc-500', 'bg-stone-500',
    'bg-blue-600', 'bg-green-600', 'bg-yellow-600', 'bg-red-600',
    'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600',
    'bg-orange-600', 'bg-cyan-600', 'bg-lime-600', 'bg-amber-600',
    'bg-emerald-600', 'bg-violet-600', 'bg-fuchsia-600', 'bg-rose-600',
    'bg-sky-600', 'bg-slate-600', 'bg-zinc-600', 'bg-stone-600'
];

const LESSON_COLOR_MAP = {};
function getIndependentLessonColor(lessonName) {
    if (!LESSON_COLOR_MAP[lessonName]) {
        // Renk havuzundan random seç, atanmış renkleri tekrar etme
        const usedColors = Object.values(LESSON_COLOR_MAP);
        const availableColors = LESSON_COLOR_PALETTE.filter(c => !usedColors.includes(c));
        let color;
        if (availableColors.length > 0) {
            color = availableColors[Math.floor(Math.random() * availableColors.length)];
        } else {
            // Tüm renkler kullanıldıysa, paletten random seç
            color = LESSON_COLOR_PALETTE[Math.floor(Math.random() * LESSON_COLOR_PALETTE.length)];
        }
        LESSON_COLOR_MAP[lessonName] = color;
    }
    return LESSON_COLOR_MAP[lessonName];
}

/**
 * Ders verilerini tutan ana sınıf
 */
class Lesson {
    constructor(id, teacherName, lessonName, className, weeklyHours, availableDays = [], consecutive = true) {
        this.id = id;
        this.teacherName = teacherName;
        this.lessonName = lessonName;
        this.className = className;
        this.weeklyHours = weeklyHours; // Haftalık kaç saat
        this.availableDays = availableDays; // Hangi günlerde olabilir (0-6)
        this.consecutive = consecutive; // Arka arkaya mı yerleştirilsin (2+ saat için)
        this.color = this.getLessonColor();
    }

    /**
     * Ders adına göre sabit renk döndür
     */
    getLessonColor() {
        return getIndependentLessonColor(this.lessonName);
    }
}

/**
 * Tüm dersleri yöneten ana sınıf
 */
class LessonManager {
    constructor() {
        this.lessons = [];
        this.nextId = 1;
        this.loadFromStorage();
    }

    /**
     * Yeni ders ekle
     */
    addLesson(teacherName, lessonName, className, weeklyHours, availableDays, consecutive = true) {
        console.log(`🔵 Ders ekleniyor: ${lessonName}, Sınıf: ${className}, Haftalık Saat: ${weeklyHours} (tip: ${typeof weeklyHours})`);
        const parsedHours = parseInt(weeklyHours);
        console.log(`🔵 Parse edildi: ${parsedHours}`);
        
        const lesson = new Lesson(
            this.nextId++,
            teacherName,
            lessonName,
            className,
            parsedHours,
            availableDays,
            consecutive
        );
        console.log(`🔵 Oluşturulan ders objesi:`, lesson);
        this.lessons.push(lesson);
        this.saveToStorage();
        return lesson;
    }

    /**
     * Dersi güncelle
     */
    updateLesson(id, teacherName, lessonName, className, weeklyHours, availableDays, consecutive) {
        const lessonIndex = this.lessons.findIndex(l => l.id === id);
        if (lessonIndex === -1) {
            return { success: false, message: 'Ders bulunamadı!' };
        }

        const parsedHours = parseInt(weeklyHours);
        this.lessons[lessonIndex] = new Lesson(
            id,
            teacherName,
            lessonName,
            className,
            parsedHours,
            availableDays,
            consecutive
        );
        this.saveToStorage();
        return { success: true, message: 'Ders başarıyla güncellendi!' };
    }

    /**
     * Ders sil
     */
    removeLesson(id) {
        this.lessons = this.lessons.filter(lesson => lesson.id !== id);
        this.saveToStorage();
    }

    /**
     * Tüm dersleri getir
     */
    getAllLessons() {
        return this.lessons;
    }

    /**
     * Belirli bir sınıfın derslerini getir
     */
    getLessonsByClass(className) {
        return this.lessons.filter(lesson => lesson.className === className);
    }

    /**
     * LocalStorage'a kaydet
     */
    saveToStorage() {
        localStorage.setItem('lessons', JSON.stringify({
            lessons: this.lessons,
            nextId: this.nextId
        }));
    }

    /**
     * LocalStorage'dan yükle
     */
    loadFromStorage() {
        const data = localStorage.getItem('lessons');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                console.log('🔵 LocalStorage\'dan yüklenen ders verileri:', parsed.lessons);
                this.lessons = parsed.lessons.map(l => {
                    console.log(`🔵 Ders yükleniyor: ${l.lessonName}, weeklyHours: ${l.weeklyHours}, tip: ${typeof l.weeklyHours}`);
                    return new Lesson(l.id, l.teacherName, l.lessonName, l.className, 
                              l.weeklyHours || 1, l.availableDays || [], l.consecutive !== false); // Varsayılan true
                });
                this.nextId = parsed.nextId;
                console.log('🔵 Yüklenen dersler:', this.lessons);
            } catch (e) {
                console.error('Ders verileri yüklenemedi:', e);
                this.lessons = [];
                this.nextId = 1;
            }
        }
    }

    /**
     * Tüm dersleri temizle
     */
    clearAll() {
        this.lessons = [];
        this.nextId = 1;
        this.saveToStorage();
    }
}

// ============================================
// MODÜL 4: DERS PROGRAMI OLUŞTURMA MOTORU
// ============================================

/**
 * Ders programı oluşturma algoritması
 */
class ScheduleGenerator {
    constructor(lessons) {
        this.lessons = lessons;
        this.maxHours = this.calculateMaxHours(lessons);
        this.schedule = this.createEmptySchedule();
        this.unplacedLessons = [];
    }

    /**
     * Sınıfların en uzun ders saati sayısını hesapla
     */
    calculateMaxHours(lessons) {
        let maxHours = 8; // varsayılan
        
        if (lessons.length > 0 && window.uiManager) {
            const className = lessons[0].className;
            const classInfo = window.uiManager.classManager.getClassInfo(className);
            
            if (classInfo) {
                const [startH, startM] = classInfo.startTime.split(':').map(Number);
                const [endH, endM] = classInfo.endTime.split(':').map(Number);
                
                const startMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;
                
                // Bitiş saatine kadar kaç ders sığar?
                let lessonCount = 0;
                let currentTime = startMinutes;
                
                while (true) {
                    const lessonEnd = currentTime + classInfo.lessonDuration;
                    
                    // Bu ders bitiş saatinden önce bitecek mi?
                    if (lessonEnd <= endMinutes) {
                        lessonCount++;
                        // Bir sonraki ders için zaman hesapla (ders + teneffüs)
                        currentTime = lessonEnd + classInfo.breakDuration;
                    } else {
                        // Artık ders sığmaz
                        break;
                    }
                }
                
                maxHours = lessonCount;
                console.log(`📊 ${className} için hesaplama: ${classInfo.startTime}-${classInfo.endTime}, ${lessonCount} ders sığıyor`);
            }
        }
        
        return Math.max(1, Math.min(maxHours, 12)); // 1-12 arası sınırla (daha esnek)
    }

    /**
     * Boş program tablosu oluştur (7 gün)
     */
    createEmptySchedule() {
        const schedule = [];
        for (let hour = 0; hour < this.maxHours; hour++) {
            schedule[hour] = [];
            for (let day = 0; day < 7; day++) {
                schedule[hour][day] = null;
            }
        }
        return schedule;
    }

    /**
     * Ana program oluşturma fonksiyonu - Akıllı Yerleştirme
     */
    generate() {
        this.unplacedLessons = [];
        
        // console.log(`🔵 Program oluşturma başladı. Toplam ${this.lessons.length} ders, MaxHours: ${this.maxHours}`);
        
        for (const lesson of this.lessons) {
            let placed = 0;
            const hoursNeeded = lesson.weeklyHours;
            
            // Ders "arka arkaya" özelliği açık mı ve 2+ saat mi?
            if (lesson.consecutive && hoursNeeded >= 2) {
                // EVET: Arka arkaya yerleştir
                const consecutiveSlots = this.findConsecutiveSlots(lesson, 2);
                
                if (consecutiveSlots) {
                    // İlk 2 saati arka arkaya yerleştir
                    this.schedule[consecutiveSlots.hour][consecutiveSlots.day] = lesson;
                    this.schedule[consecutiveSlots.hour + 1][consecutiveSlots.day] = lesson;
                    placed = 2;
                    console.log(`  ✅ Arka arkaya yerleştirildi: Gün ${consecutiveSlots.day}, Saatler ${consecutiveSlots.hour}-${consecutiveSlots.hour + 1}`);
                    
                    // Kalan saatleri farklı günlere yerleştir
                    for (let attempt = 2; attempt < hoursNeeded; attempt++) {
                        const slot = this.findAvailableSlot(lesson, placed, consecutiveSlots.day);
                        
                        if (slot) {
                            this.schedule[slot.hour][slot.day] = lesson;
                            placed++;
                            console.log(`  ✅ Yerleştirildi: Gün ${slot.day}, Saat ${slot.hour}`);
                        } else {
                            console.log(`  ❌ Slot bulunamadı (${placed}/${hoursNeeded})`);
                            break;
                        }
                    }
                } else {
                    // Arka arkaya slot bulunamadı, normal yerleştirme yap
                    console.log(`  ⚠️ Arka arkaya slot bulunamadı, normal yerleştirme yapılıyor...`);
                    for (let attempt = 0; attempt < hoursNeeded; attempt++) {
                        const slot = this.findAvailableSlot(lesson, placed);
                        
                        if (slot) {
                            this.schedule[slot.hour][slot.day] = lesson;
                            placed++;
                            console.log(`  ✅ Yerleştirildi: Gün ${slot.day}, Saat ${slot.hour}`);
                        } else {
                            console.log(`  ❌ Slot bulunamadı (${placed}/${hoursNeeded})`);
                            break;
                        }
                    }
                }
            } else {
                // HAYIR: Normal yerleştir (arka arkaya değil) VEYA 1 saat
                console.log(`  ℹ️ Normal yerleştirme (arka arkaya değil)...`);
                for (let attempt = 0; attempt < hoursNeeded; attempt++) {
                    const slot = this.findAvailableSlot(lesson, placed);
                    
                    if (slot) {
                        this.schedule[slot.hour][slot.day] = lesson;
                        placed++;
                        console.log(`  ✅ Yerleştirildi: Gün ${slot.day}, Saat ${slot.hour}`);
                    } else {
                        console.log(`  ❌ Slot bulunamadı (${placed}/${hoursNeeded})`);
                        break;
                    }
                }
            }
            
            if (placed < hoursNeeded) {
                console.log(`  ⚠️ Eksik yerleştirildi: ${placed}/${hoursNeeded}`);
                this.unplacedLessons.push({
                    lesson: lesson,
                    placed: placed,
                    needed: hoursNeeded
                });
            } else {
                console.log(`  ✅ Tamamen yerleştirildi: ${placed}/${hoursNeeded}`);
            }
        }
        
        if (this.unplacedLessons.length > 0) {
            console.warn(`⚠️ UYARI: ${this.unplacedLessons.length} ders yerleştirilemedi!`, this.unplacedLessons);
        } else {
            console.log(`✅ Tüm dersler başarıyla yerleştirildi!`);
        }
        
        return {
            success: this.unplacedLessons.length === 0,
            schedule: this.schedule,
            unplacedLessons: this.unplacedLessons
        };
    }



    /**
     * Arka arkaya N adet boş slot bul - SIRAYLI ALGORİTMA
     * İlk saatlerden başlayarak arka arkaya slot ara
     */
    findConsecutiveSlots(lesson, count) {
        const classActiveDays = lesson.classActiveDays || [0, 1, 2, 3, 4];
        
        // İLK SAATLERDEN BAŞLAYARAK ARKA ARKAYA SLOT ARA
        for (let hour = 0; hour < this.maxHours - count + 1; hour++) {
            for (let day = 0; day < 7; day++) {
                if (!classActiveDays.includes(day)) {
                    continue;
                }
                
                let allFree = true;
                
                // Arka arkaya N saat boş mu kontrol et
                for (let i = 0; i < count; i++) {
                    if (!this.canPlaceLesson(lesson, day, hour + i)) {
                        allFree = false;
                        break;
                    }
                }
                
                if (allFree) {
                    console.log(`    ✅ Arka arkaya slot bulundu: Gün ${day}, Saatler ${hour}-${hour + count - 1}`);
                    return { day, hour };
                }
            }
        }
        
        console.log(`    ❌ Arka arkaya ${count} slot bulunamadı`);
        return null;
    }

    /**
     * Belirli bir ders için uygun slot bul (excludeDay: bu günü atla)
     * SIRAYLI ALGORİTMA: İlk dersten son derse doğru sıralı olarak yerleştir
     */
    findAvailableSlot(lesson, alreadyPlaced, excludeDay = null) {
        // Sınıfın aktif günlerini al (varsayılan: hafta içi)
        const classActiveDays = lesson.classActiveDays || [0, 1, 2, 3, 4];
        
        console.log(`    🔍 Slot aranıyor: ${lesson.lessonName}, Aktif günler: ${classActiveDays}, Hariç gün: ${excludeDay}, MaxHours: ${this.maxHours}`);
        
        // İLK DERSTEN SON DERSE DOĞRU SIRALAMA
        // Önce saatlere göre, sonra günlere göre tarama yap
        for (let hour = 0; hour < this.maxHours; hour++) {
            for (let day = 0; day < 7; day++) {
                // Sınıfın aktif olmadığı günleri atla
                if (!classActiveDays.includes(day)) {
                    continue;
                }
                
                // Belirtilen günü atla (arka arkaya derslerden sonraki dersler için)
                if (excludeDay !== null && day === excludeDay) {
                    continue;
                }
                
                // Bu slot boş mu ve yerleştirilebilir mi?
                if (this.schedule[hour][day] === null && this.canPlaceLesson(lesson, day, hour)) {
                    console.log(`    ✅ İlk uygun slot bulundu: Gün ${day}, Saat ${hour}`);
                    return { day, hour };
                }
            }
        }
        
        console.log(`    ❌ Hiç uygun slot bulunamadı`);
        return null;
    }

    /**
     * Bu slot öğretmen için öncelikli mi?
     */
    isPrioritySlot(lesson, day, hour) {
        if (lesson.availableDays.length === 0) {
            return true;
        }
        
        const dayOk = lesson.availableDays.length === 0 || lesson.availableDays.includes(day);
        
        return dayOk;
    }

    /**
     * Dersin bu slota yerleştirilebilir mi kontrol et
     */
    canPlaceLesson(lesson, day, hour) {
        // Bu slot zaten dolu mu?
        if (this.schedule[hour][day] !== null) {
            return false;
        }
        
        // Sınıfın zaman dilimi kontrolü - bu saat slotu sınıfın aktif aralığında mı?
        if (hour >= this.maxHours) {
            return false;
        }
        
        // KISIIT KONTROLÜ 1: Sınıf kısıtları - Bu hücre kapalı mı?
        if (window.uiManager && window.uiManager.emptySchedules) {
            const classSchedule = window.uiManager.emptySchedules[lesson.className];
            if (classSchedule && classSchedule.blockedCells) {
                const cellKey = `${day}-${hour}`;
                if (classSchedule.blockedCells.includes(cellKey)) {
                    console.log(`  ⛔ SINIF KISITI ENGELLEDI: ${lesson.className} - ${lesson.lessonName} -> Gün ${day+1}, Saat ${hour+1} KAPALI!`);
                    return false;
                }
            } else {
                // Debug: Neden kontrol edilmedi?
                if (!classSchedule) {
                    console.warn(`  ⚠️ ${lesson.className} için classSchedule bulunamadı!`);
                } else if (!classSchedule.blockedCells) {
                    console.warn(`  ⚠️ ${lesson.className} için blockedCells yok!`);
                }
            }
        } else {
            console.warn(`  ⚠️ uiManager veya emptySchedules yok! Kısıt kontrolü yapılamıyor!`);
        }
        
        // KISIIT KONTROLÜ 2: Öğretmen kısıtları - Bu öğretmen bu saatte müsait mi?
        if (window.uiManager && window.uiManager.teacherConstraints) {
            const teacherConstraints = window.uiManager.teacherConstraints[lesson.teacherName];
            if (teacherConstraints && teacherConstraints.length > 0) {
                const timeKey = `${day}-${hour}`;
                if (teacherConstraints.includes(timeKey)) {
                    console.log(`  ⛔ ÖĞRETMEN KISITI ENGELLEDI: ${lesson.teacherName} - ${lesson.lessonName} -> Gün ${day+1}, Saat ${hour+1} MÜSAİT DEĞİL!`);
                    return false;
                }
            }
        }
        
        // ÖNEMLİ: Öğretmen çakışması kontrolü
        // Bu öğretmen aynı gün aynı saatte başka bir sınıfta ders veriyor mu?
        if (window.uiManager && window.uiManager.allSchedules) {
            for (const [otherClassName, otherResult] of Object.entries(window.uiManager.allSchedules)) {
                // Aynı sınıfı kontrol etmeyelim (henüz oluşturuluyor)
                if (otherClassName === lesson.className) continue;
                
                const otherSchedule = otherResult.schedule;
                if (otherSchedule[hour] && otherSchedule[hour][day]) {
                    const otherLesson = otherSchedule[hour][day];
                    if (otherLesson && otherLesson.teacherName === lesson.teacherName) {
                        // Aynı öğretmen aynı saatte başka sınıfta var!
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
}

// ============================================
// MODÜL 5: KULLANICI ARAYÜZÜ YÖNETİMİ
// ============================================

/**
 * UI yönetimi ve kullanıcı etkileşimleri
 */
class UIManager {
    constructor() {
        this.timeManager = new TimeManager();
        this.classManager = new ClassManager();
        this.lessonManager = new LessonManager();
        this.allSchedules = {}; // Her sınıf için ayrı program
        this.emptySchedules = {}; // Boş program tabloları
        this.selectedTeacher = null; // Seçili öğretmen (kısıtlama için)
        this.selectedTeacherFilter = null; // Seçili öğretmen (filtreleme için)
        this.teacherConstraints = new Set(); // Öğretmen kısıtlamaları
        this.currentViewClass = 'all';
        
        this.initializeEventListeners();
        this.renderClassList();
        this.renderLessonsList();
        this.updateClassSelects();
    }

    /**
     * Tüm event listener'ları başlat
     */
    initializeEventListeners() {
        // Sınıf ekleme formu
        document.getElementById('classForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddClass();
        });

        // Ders adı değişikliği - "Diğer" seçildiğinde manuel giriş göster
        document.getElementById('lessonName').addEventListener('change', (e) => {
            const customInput = document.getElementById('customLessonName');
            if (e.target.value === 'other') {
                customInput.classList.remove('hidden');
                customInput.required = true;
            } else {
                customInput.classList.add('hidden');
                customInput.required = false;
                customInput.value = '';
            }
        });



        // Form gönderimi
        document.getElementById('lessonForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddLesson();
        });

        // Formu temizle
        document.getElementById('clearForm').addEventListener('click', () => {
            this.clearForm();
        });

        // Boş program göster
        document.getElementById('showEmptySchedule').addEventListener('click', () => {
            this.showEmptySchedule();
        });

        // Program oluştur
        document.getElementById('generateSchedule').addEventListener('click', () => {
            this.generateAllSchedules();
        });

        // Export butonları
        document.getElementById('exportPNG').addEventListener('click', () => {
            this.exportToPNG();
        });

        document.getElementById('exportPDF').addEventListener('click', () => {
            this.exportToPDF();
        });

        // Sol panel toggle
        document.getElementById('toggleLeftPanel').addEventListener('click', () => {
            this.toggleLeftPanel();
        });
    }

    /**
     * Sol paneli aç/kapat
     */
    toggleLeftPanel() {
        const leftPanel = document.getElementById('leftPanel');
        const rightPanel = document.getElementById('rightPanel');
        const toggleBtn = document.getElementById('toggleLeftPanel');
        
        if (leftPanel.style.display === 'none') {
            // Aç
            leftPanel.style.display = 'block';
            rightPanel.classList.remove('lg:col-span-3');
            rightPanel.classList.add('lg:col-span-2');
            toggleBtn.innerHTML = '◀ Formu Gizle';
        } else {
            // Kapat
            leftPanel.style.display = 'none';
            rightPanel.classList.remove('lg:col-span-2');
            rightPanel.classList.add('lg:col-span-3');
            toggleBtn.innerHTML = '▶ Formu Göster';
        }
    }

    /**
     * Yeni sınıf ekle
     */
    handleAddClass() {
        const className = document.getElementById('newClassName').value.trim();
        const startTime = document.getElementById('classStartTime').value;
        const endTime = document.getElementById('classEndTime').value;
        const lessonDuration = parseInt(document.getElementById('lessonDuration').value);
        const breakDuration = parseInt(document.getElementById('breakDuration').value);
        const editingClassName = document.getElementById('editingClassName').value;
        
        if (!className) {
            this.showNotification('⚠️ Lütfen sınıf adı girin!', 'warning');
            return;
        }

        // Seçili günleri al
        const activeDays = Array.from(document.querySelectorAll('.class-day-checkbox:checked'))
            .map(cb => parseInt(cb.value));

        if (activeDays.length === 0) {
            this.showNotification('⚠️ En az bir gün seçmelisiniz!', 'warning');
            return;
        }

        let result;
        
        // Düzenleme modunda mı yoksa yeni ekleme mi?
        if (editingClassName) {
            // Güncelleme
            result = this.classManager.updateClass(editingClassName, className, activeDays, startTime, endTime, lessonDuration, breakDuration);
        } else {
            // Yeni ekleme
            result = this.classManager.addClass(className, activeDays, startTime, endTime, lessonDuration, breakDuration);
        }
        
        if (result.success) {
            // Form ve düzenleme modunu temizle
            this.cancelEditClass();
            this.renderClassList();
            this.updateClassSelects();
            this.showNotification('✅ ' + result.message, 'success');
        } else {
            this.showNotification('⚠️ ' + result.message, 'warning');
        }
    }

    /**
     * Sınıf listesini render et
     */
    renderClassList() {
        const container = document.getElementById('classList');
        const classes = this.classManager.getAllClasses();

        if (classes.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Henüz sınıf eklenmedi</p>';
            return;
        }

        const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

        container.innerHTML = classes.map(classInfo => {
            const activeDaysText = classInfo.activeDays
                .sort((a, b) => a - b)
                .map(d => dayNames[d])
                .join(', ');
            const sanitizedName = classInfo.name.replace(/'/g, "\\'");

            return `
                <details class="group bg-white border border-indigo-100 rounded-lg px-3 py-2 shadow-sm hover:shadow transition">
                    <summary class="flex items-center justify-between cursor-pointer list-none">
                        <div class="flex items-center space-x-2">
                            <span class="text-gray-400 transition-transform group-open:rotate-90">▸</span>
                            <span class="text-lg">🎓</span>
                            <span class="font-semibold text-gray-800">${classInfo.name}</span>
                        </div>
                        <div class="flex items-center space-x-2 text-xs text-gray-500">
                            <span class="hidden sm:inline">${activeDaysText}</span>
                            <button onclick="event.stopPropagation(); window.uiManager.editClass('${sanitizedName}')" 
                                    class="text-blue-500 hover:text-blue-700 font-bold" title="Düzenle">
                                ✏️
                            </button>
                            <button onclick="event.stopPropagation(); window.uiManager.removeClass('${sanitizedName}')" 
                                    class="text-red-500 hover:text-red-700 font-bold" title="Sil">
                                ✕
                            </button>
                        </div>
                    </summary>
                    <div class="mt-2 pl-9 text-xs text-gray-600 space-y-1 border-t border-gray-100 pt-2">
                        <div class="flex items-center space-x-2">
                            <span>📅</span>
                            <span>${activeDaysText}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span>⏰</span>
                            <span>${classInfo.startTime}-${classInfo.endTime}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span>⏳</span>
                            <span>${classInfo.lessonDuration}dk ders · ${classInfo.breakDuration}dk teneffüs</span>
                        </div>
                    </div>
                </details>
            `;
        }).join('');
    }

    /**
     * Sınıf düzenle
     */
    editClass(className) {
        console.log('editClass çağrıldı:', className);
        
        const classInfo = this.classManager.getClassInfo(className);
        if (!classInfo) {
            this.showNotification('⚠️ Sınıf bulunamadı!', 'warning');
            return;
        }
        
        // Formu düzenleme moduna geçir
        document.getElementById('editingClassName').value = className;
        document.getElementById('newClassName').value = classInfo.name;
        document.getElementById('classStartTime').value = classInfo.startTime;
        document.getElementById('classEndTime').value = classInfo.endTime;
        document.getElementById('lessonDuration').value = classInfo.lessonDuration;
        document.getElementById('breakDuration').value = classInfo.breakDuration;
        
        // Aktif günleri seç
        document.querySelectorAll('.class-day-checkbox').forEach((cb, index) => {
            cb.checked = classInfo.activeDays.includes(index);
        });
        
        // Buton ve başlığı güncelle
        document.getElementById('classSubmitBtn').innerHTML = '✏️ Sınıfı Güncelle';
        document.getElementById('classSubmitBtn').className = 'flex-1 px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition shadow-md';
        document.getElementById('classCancelBtn').classList.remove('hidden');
        
        this.showNotification('✏️ Düzenleme moduna geçildi', 'info');
    }

    /**
     * Sınıf düzenlemeyi iptal et
     */
    cancelEditClass() {
        // Formu temizle
        document.getElementById('classForm').reset();
        document.getElementById('editingClassName').value = '';
        
        // Varsayılan değerleri geri yükle
        document.getElementById('classStartTime').value = '09:00';
        document.getElementById('classEndTime').value = '15:30';
        document.getElementById('lessonDuration').value = '40';
        document.getElementById('breakDuration').value = '10';
        document.querySelectorAll('.class-day-checkbox').forEach((cb, index) => {
            cb.checked = index < 5; // Pzt-Cum seçili
        });
        
        // Buton ve başlığı geri al
        document.getElementById('classSubmitBtn').innerHTML = '➕ Sınıf Ekle';
        document.getElementById('classSubmitBtn').className = 'flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition shadow-md';
        document.getElementById('classCancelBtn').classList.add('hidden');
        
        this.showNotification('✅ Düzenleme iptal edildi', 'info');
    }

    /**
     * Sınıf sil
     */
    removeClass(className) {
        console.log('removeClass çağrıldı:', className);
        
        if (confirm(`"${className}" sınıfını silmek istediğinizden emin misiniz?\nBu sınıfa ait tüm dersler de silinecektir!`)) {
            console.log('Silme onaylandı');
            
            // Önce bu sınıfa ait dersleri sil
            const lessons = this.lessonManager.getLessonsByClass(className);
            console.log('Silinecek dersler:', lessons);
            lessons.forEach(lesson => this.lessonManager.removeLesson(lesson.id));
            
            // Sonra sınıfı sil
            console.log('Sınıf siliniyor:', className);
            this.classManager.removeClass(className);
            
            console.log('Render işlemleri başlıyor');
            this.renderClassList();
            this.renderLessonsList();
            this.updateClassSelects();
            this.showNotification('🗑️ Sınıf ve dersleri silindi!', 'info');
            
            console.log('removeClass tamamlandı');
        } else {
            console.log('Silme iptal edildi');
        }
    }

    /**
     * Sınıf select'lerini güncelle
     */
    updateClassSelects() {
        const classes = this.classManager.getAllClasses();
        
        // Sınıf seçim container'ını güncelle
        const classContainer = document.getElementById('classSelectionContainer');
        if (classContainer) {
            if (classes.length === 0) {
                classContainer.innerHTML = '<p class="text-gray-500 text-sm col-span-2 text-center">Henüz sınıf eklenmedi</p>';
            } else {
                classContainer.innerHTML = classes.map(classInfo => `
                    <label class="flex items-center space-x-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-indigo-50 transition">
                        <input type="checkbox" value="${classInfo.name}" class="lesson-class-checkbox rounded text-indigo-600">
                        <span class="text-sm font-medium">${classInfo.name}</span>
                    </label>
                `).join('');
            }
        }
    }

    /**
     * Yeni ders ekle
     */
    handleAddLesson() {
        const form = document.getElementById('lessonForm');
        const editingId = form.dataset.editingId;
        
        const teacherName = document.getElementById('teacherName').value.trim();
        const lessonSelect = document.getElementById('lessonName').value;
        const customLessonName = document.getElementById('customLessonName').value.trim();
        const weeklyHours = parseInt(document.getElementById('weeklyHours').value);

        // Ders adını belirle
        let lessonName = '';
        if (lessonSelect === 'other') {
            lessonName = customLessonName;
            if (!lessonName) {
                this.showNotification('⚠️ Lütfen ders adını yazın!', 'warning');
                return;
            }
        } else {
            lessonName = lessonSelect;
        }

        // Seçili sınıfları al
        const selectedClasses = Array.from(document.querySelectorAll('.lesson-class-checkbox:checked'))
            .map(cb => cb.value);

        if (selectedClasses.length === 0) {
            this.showNotification('⚠️ Lütfen en az bir sınıf seçin!', 'warning');
            return;
        }

        if (!teacherName) {
            this.showNotification('⚠️ Lütfen öğretmen adı girin!', 'warning');
            return;
        }

        if (isNaN(weeklyHours) || weeklyHours < 1) {
            this.showNotification('⚠️ Lütfen haftalık saat sayısını seçin!', 'warning');
            return;
        }

        const availableDays = Array.from(document.querySelectorAll('.available-day:checked'))
            .map(cb => parseInt(cb.value));

        if (availableDays.length === 0) {
            this.showNotification('⚠️ Lütfen en az bir gün seçin!', 'warning');
            return;
        }

        // Arka arkaya özelliğini al
        const consecutive = document.getElementById('consecutiveLessons').checked;

        // DÜZENLEME MODU
        if (editingId) {
            const result = this.lessonManager.updateLesson(
                parseInt(editingId),
                teacherName,
                lessonName,
                selectedClasses[0], // Düzenlemede tek sınıf
                weeklyHours,
                availableDays,
                consecutive
            );
            
            if (result.success) {
                this.cancelEditLesson();
                this.renderLessonsList();
                this.showNotification('✅ ' + result.message, 'success');
            } else {
                this.showNotification('⚠️ ' + result.message, 'warning');
            }
            return;
        }

        // YENİ EKLEME MODU
        // Kullanıcıya bilgi ver
        if (selectedClasses.length > 1) {
            const confirmMsg = `${selectedClasses.length} sınıf seçtiniz.\nHer sınıfa ${weeklyHours} saat/hafta ${lessonName} dersi eklenecek.\n\nDevam etmek istiyor musunuz?`;
            if (!confirm(confirmMsg)) {
                this.showNotification('❌ İşlem iptal edildi', 'info');
                return;
            }
        }

        // Her seçili sınıf için ayrı ders ekle
        selectedClasses.forEach(className => {
            this.lessonManager.addLesson(
                teacherName,
                lessonName,
                className,
                weeklyHours,
                availableDays,
                consecutive
            );
        });

        this.renderLessonsList();
        this.clearForm();
        this.showNotification(`✅ ${selectedClasses.length} sınıf için ders eklendi! (Her sınıfa ${weeklyHours} saat/hafta)`, 'success');
    }

    /**
     * Formu temizle
     */
    clearForm() {
        document.getElementById('lessonForm').reset();
        document.getElementById('customLessonName').classList.add('hidden');
        document.getElementById('customLessonName').required = false;
        document.querySelectorAll('.available-day').forEach(cb => cb.checked = false);
        document.querySelectorAll('.lesson-class-checkbox').forEach(cb => cb.checked = false);
    }

    /**
     * Eklenen dersleri listele
     */
    renderLessonsList() {
        const container = document.getElementById('lessonsList');
        const lessons = this.lessonManager.getAllLessons();

        if (lessons.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Henüz ders eklenmedi</p>';
            return;
        }

        // Sınıflara göre grupla
        const grouped = {};
        lessons.forEach(lesson => {
            if (!grouped[lesson.className]) {
                grouped[lesson.className] = [];
            }
            grouped[lesson.className].push(lesson);
        });

        let html = '';
        for (const [className, classLessons] of Object.entries(grouped)) {
            html += `<div class="mb-3">
                <h4 class="font-bold text-indigo-700 mb-2">🎓 ${className}</h4>`;
            
            classLessons.forEach(lesson => {
                // Bu sınıfın zaman bilgilerini al
                const classInfo = this.classManager.getClassInfo(lesson.className);
                let timeInfo = '';
                if (classInfo) {
                    timeInfo = `⏰ ${classInfo.startTime}-${classInfo.endTime} (${classInfo.lessonDuration}dk ders)`;
                } else {
                    timeInfo = '⏰ 09:00-15:30 (40dk ders)';
                }
                
                const consecutiveIcon = lesson.consecutive ? '📌' : '📍';
                const consecutiveText = lesson.consecutive ? 'Arka arkaya' : 'Dağıtık';
                
                html += `
                    <div class="bg-gray-50 p-2 rounded-lg border border-gray-200 hover:shadow-md transition mb-2">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <p class="font-semibold text-gray-800 text-sm">${lesson.lessonName}</p>
                                <p class="text-xs text-gray-600">👨‍🏫 ${lesson.teacherName}</p>
                                <p class="text-xs text-gray-600">📊 ${lesson.weeklyHours} saat/hafta ${consecutiveIcon} ${consecutiveText}</p>
                                <p class="text-xs text-gray-500">${timeInfo}</p>
                            </div>
                            <div class="flex gap-1">
                                <button onclick="window.uiManager.editLesson(${lesson.id})" 
                                        class="text-blue-500 hover:text-blue-700 font-bold text-sm px-2" title="Düzenle">
                                    ✏️
                                </button>
                                <button onclick="window.uiManager.removeLesson(${lesson.id})" 
                                        class="text-red-500 hover:text-red-700 font-bold text-sm px-2" title="Sil">
                                    ✕
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }

        container.innerHTML = html;
    }

    /**
     * Ders düzenle
     */
    editLesson(id) {
        const lessons = this.lessonManager.getAllLessons();
        const lesson = lessons.find(l => l.id === id);
        
        if (!lesson) {
            this.showNotification('⚠️ Ders bulunamadı!', 'warning');
            return;
        }

        // Formu doldur
        document.getElementById('teacherName').value = lesson.teacherName;
        
        // Ders adı seçimi
        const lessonSelect = document.getElementById('lessonName');
        const lessonOptions = Array.from(lessonSelect.options).map(opt => opt.value);
        
        if (lessonOptions.includes(lesson.lessonName)) {
            lessonSelect.value = lesson.lessonName;
        } else {
            lessonSelect.value = 'other';
            const customInput = document.getElementById('customLessonName');
            customInput.classList.remove('hidden');
            customInput.required = true;
            customInput.value = lesson.lessonName;
        }
        
        document.getElementById('weeklyHours').value = lesson.weeklyHours;
        document.getElementById('consecutiveLessons').checked = lesson.consecutive !== false;

        // Sınıf seçimi - sadece bu dersin sınıfını seç
        document.querySelectorAll('.lesson-class-checkbox').forEach(cb => {
            cb.checked = (cb.value === lesson.className);
        });

        // Uygun günleri işaretle
        document.querySelectorAll('.available-day').forEach(cb => {
            cb.checked = lesson.availableDays.includes(parseInt(cb.value));
        });

        // Düzenleme moduna geç
        const submitBtn = document.querySelector('#lessonForm button[type="submit"]');
        submitBtn.textContent = '💾 Güncelle';
        submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        submitBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');

        // Düzenleme ID'sini sakla
        document.getElementById('lessonForm').dataset.editingId = id;

        // İptal butonu ekle
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.id = 'cancelEditLesson';
        cancelBtn.className = 'flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition duration-200';
        cancelBtn.textContent = '❌ İptal';
        cancelBtn.onclick = () => this.cancelEditLesson();
        
        const buttonContainer = submitBtn.parentElement;
        if (!document.getElementById('cancelEditLesson')) {
            buttonContainer.insertBefore(cancelBtn, submitBtn);
        }

        this.showNotification('✏️ Ders düzenleme modunda', 'info');
        document.getElementById('lessonForm').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Ders düzenlemeyi iptal et
     */
    cancelEditLesson() {
        const form = document.getElementById('lessonForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Formu temizle
        this.clearForm();
        
        // Düzenleme ID'sini kaldır
        delete form.dataset.editingId;
        
        // Buton metnini geri al
        submitBtn.textContent = '➕ Ekle';
        submitBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        submitBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
        
        // İptal butonunu kaldır
        const cancelBtn = document.getElementById('cancelEditLesson');
        if (cancelBtn) {
            cancelBtn.remove();
        }
    }

    /**
     * Ders sil
     */
    removeLesson(id) {
        if (confirm('Bu dersi silmek istediğinizden emin misiniz?')) {
            this.lessonManager.removeLesson(id);
            this.renderLessonsList();
            this.showNotification('🗑️ Ders silindi!', 'info');
        }
    }

    /**
     * Tüm sınıflar için program oluştur
     */
    generateAllSchedules() {
        console.log('generateAllSchedules çağrıldı');
        
        const classes = this.classManager.getAllClasses();
        console.log('Sınıflar:', classes);

        if (classes.length === 0) {
            this.showNotification('⚠️ Lütfen önce sınıf ekleyin!', 'warning');
            return;
        }

        const allLessons = this.lessonManager.getAllLessons();
        console.log('Dersler:', allLessons);
        
        if (allLessons.length === 0) {
            this.showNotification('⚠️ Lütfen önce ders ekleyin!', 'warning');
            return;
        }

        // KISITLARı YÜKLE - Program oluştururken kullanılacak
        console.log('🔄 Kısıtlar yükleniyor...');
        this.loadScheduleConstraints();
        
        // Boş programları oluştur (eğer yoksa)
        if (!this.emptySchedules || Object.keys(this.emptySchedules).length === 0) {
            console.log('🔄 Boş programlar oluşturuluyor...');
            this.emptySchedules = {};
            classes.forEach(classInfo => {
                const emptySchedule = this.classManager.createEmptySchedule(classInfo.name);
                if (emptySchedule) {
                    this.emptySchedules[classInfo.name] = emptySchedule;
                }
            });
            // Kısıtları tekrar yükle
            this.loadScheduleConstraints();
        }
        
        console.log('📋 ====== YÜKLENEN KISITLAR ======');
        console.log('Boş Programlar:', this.emptySchedules);
        console.log('Öğretmen Kısıtları:', this.teacherConstraints);
        
        // Her sınıf için kısıt detayları
        Object.keys(this.emptySchedules).forEach(className => {
            const schedule = this.emptySchedules[className];
            console.log(`  ${className}: ${schedule.blockedCells.length} kısıt ->`, schedule.blockedCells);
        });
        
        // Her öğretmen için kısıt detayları
        if (this.teacherConstraints) {
            Object.keys(this.teacherConstraints).forEach(teacherName => {
                const constraints = this.teacherConstraints[teacherName];
                console.log(`  ${teacherName}: ${constraints.length} kısıt ->`, constraints);
            });
        }
        console.log('=====================================');

        // Loading mesajı göster
        this.showNotification('⏳ Program oluşturuluyor... Lütfen bekleyin.', 'info');

        // Maksimum deneme sayısı
        const maxAttempts = 50;
        let bestSchedules = null;
        let bestScore = -Infinity; // -1 yerine -Infinity (daha güvenli)

        console.log('🔄 Program oluşturma başlıyor...', maxAttempts, 'deneme yapılacak');

        // Birden fazla kez dene, en iyisini seç
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const tempSchedules = {};
            let totalUnplaced = 0;
            let allSuccess = true;

            // ÖNEMLİ: Her denemede geçici schedules'ı global'e ata
            // Böylece öğretmen çakışması kontrolü çalışır
            this.allSchedules = {};

            // Her sınıf için program oluştur
            classes.forEach(classInfo => {
                const className = classInfo.name;
                const classLessons = this.lessonManager.getLessonsByClass(className);
                
                if (classLessons.length > 0) {
                    // Her derse sınıfın aktif günlerini ekle
                    classLessons.forEach(lesson => {
                        lesson.classActiveDays = classInfo.activeDays;
                    });
                    
                    const generator = new ScheduleGenerator(classLessons);
                    const result = generator.generate();
                    tempSchedules[className] = result;
                    
                    // Geçici schedules'ı hemen global'e ekle
                    // Sonraki sınıflar bu öğretmenleri görsün
                    this.allSchedules[className] = result;
                    
                    totalUnplaced += result.unplacedLessons.length;
                    if (!result.success) {
                        allSuccess = false;
                    }
                }
            });

            // Skor hesapla (yerleştirilemeyen ders sayısı - az olanı tercih et)
            const score = -totalUnplaced;
            
            console.log(`📊 Deneme ${attempt}: Toplam ${totalUnplaced} ders yerleştirilemedi, Skor: ${score}`);

            // Bu deneme daha iyi mi?
            if (score > bestScore) {
                console.log(`✨ Yeni en iyi skor! ${bestScore} → ${score}`);
                bestScore = score;
                bestSchedules = tempSchedules;
            }

            // MÜKEMMEL PROGRAM BULUNDU!
            if (allSuccess && totalUnplaced === 0) {
                console.log(`✅ Mükemmel program bulundu! Deneme: ${attempt}/${maxAttempts}`);
                this.allSchedules = bestSchedules;
                this.renderCurrentView();
                this.showNotification(`✨ Program başarıyla oluşturuldu! (${attempt} denemede)`, 'success');
                return;
            }

            // İlerleme göster (her 10 denemede bir)
            if (attempt % 10 === 0) {
                console.log(`Deneme ${attempt}/${maxAttempts}, En iyi skor: ${-bestScore} yerleştirilemeyen ders`);
            }
        }

        // Maksimum deneme sonunda en iyi sonucu kullan
        console.log(`🏁 ${maxAttempts} deneme tamamlandı. En iyi skor: ${bestScore}`);
        
        if (!bestSchedules) {
            console.error('❌ Hiçbir geçerli program oluşturulamadı! bestSchedules = null');
            console.error('📋 Analiz:');
            console.error('  • Tüm sınıfların ders listesi:', classes.map(c => c.name));
            console.error('  • Tüm dersler:', allLessons.map(l => `${l.className}: ${l.lessonName} (${l.weeklyHours}h)`));
            
            this.showNotification(`❌ Program oluşturulamadı!\n\n🔍 Olası nedenler:\n• Çok fazla kısıtlama (❌ ve 👨‍🏫)\n• Sınıf saatleri çok az\n• Öğretmen çakışması\n\n💡 Console'u (F12) açıp detayları inceleyin.`, 'error');
            return;
        }

        this.allSchedules = bestSchedules;
        this.renderCurrentView();
        
        if (bestScore === 0) {
            this.showNotification('✨ Tüm dersler başarıyla yerleştirildi!', 'success');
        } else {
            // Yerleştirilemeyen derslerin detaylarını topla
            let unplacedDetails = [];
            
            try {
                Object.keys(bestSchedules).forEach(className => {
                    const result = bestSchedules[className];
                    if (result && result.unplacedLessons && result.unplacedLessons.length > 0) {
                        result.unplacedLessons.forEach(unplaced => {
                            const lesson = unplaced.lesson;
                            const missing = unplaced.needed - unplaced.placed;
                            unplacedDetails.push(`${className}: ${lesson.lessonName} (${lesson.teacherName}) - ${missing} saat eksik`);
                        });
                    }
                });
                
                console.warn('📋 Yerleştirilemeyen dersler:', unplacedDetails);
                
                const detailMsg = unplacedDetails.length > 0 ? 
                    `\n\nDetaylar:\n${unplacedDetails.join('\n')}` : '';
                
                this.showNotification(`⚠️ En iyi program oluşturuldu (${-bestScore} ders yerleştirilemedi).\n\n🔧 Çözüm önerileri:\n• Kısıtlamaları azaltın (❌ ve 👨‍🏫 işaretlerini)\n• Sınıf ders saatlerini artırın\n• Öğretmen çakışmalarını kontrol edin${detailMsg}`, 'warning');
            } catch (error) {
                console.error('Hata detayları alınırken:', error);
                this.showNotification(`⚠️ En iyi program oluşturuldu (${-bestScore} ders yerleştirilemedi). Kısıtlamaları gevşetmeyi deneyin.`, 'warning');
            }
        }
    }

    /**
     * Mevcut görünümü render et
     */
    renderCurrentView() {
        console.log('renderCurrentView çağrıldı');
        this.renderMasterScheduleView();
    }

    /**
     * Boş program tablosu göster - Kullanıcı ders yerlerini işaretleyebilir
     */
    showEmptySchedule() {
        const classes = this.classManager.getAllClasses();
        if (classes.length === 0) {
            this.showNotification('⚠️ Önce sınıf eklemelisiniz!', 'warning');
            return;
        }

        this.emptySchedules = {};
        
        // Her sınıf için boş program oluştur
        classes.forEach(classInfo => {
            const emptySchedule = this.classManager.createEmptySchedule(classInfo.name);
            if (emptySchedule) {
                this.emptySchedules[classInfo.name] = emptySchedule;
            }
        });

        // Kısıtları yükle
        this.loadScheduleConstraints();

        this.renderEmptyScheduleView();
        this.updateTeacherList();
        this.showNotification('📋 Boş program gösteriliyor. Hücrelere tıklayarak "ders yok" işareti koyabilirsiniz.', 'info');
    }

    /**
     * Boş program tablosunu render et
     */
    renderEmptyScheduleView() {
    const masterScheduleContainer = document.getElementById('masterScheduleView');
        const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        
        const classNames = Object.keys(this.emptySchedules);
        if (classNames.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Boş program oluşturulamadı</p>';
            return;
        }

        // Maksimum saat sayısını bul
        let maxHours = 0;
        classNames.forEach(className => {
            const schedule = this.emptySchedules[className];
            if (schedule.maxHours > maxHours) {
                maxHours = schedule.maxHours;
            }
        });

        let html = `
            <div class="overflow-x-auto">
                <div class="inline-block min-w-full">
                    <table class="w-full border-collapse table-fixed" style="min-width: ${(classNames.length + 2) * 150}px;">
                        <thead>
                            <tr class="bg-indigo-600 text-white">
                                <th class="border-2 border-gray-600 p-2 w-20 sticky left-0 z-20 bg-indigo-600">GÜN</th>
                                <th class="border-2 border-gray-600 p-2 w-20">SAAT</th>`;
                                
        classNames.forEach(className => {
            html += `<th class="border-2 border-gray-600 p-2 text-center font-bold">${className}</th>`;
        });
        
        html += `</tr></thead><tbody>`;

        // Her gün için satırlar
        days.forEach((dayName, dayIndex) => {
            let dayRowIndex = 0;
            
            // Bu günde aktif olan sınıf var mı kontrol et
            let hasActiveClassThisDay = false;
            classNames.forEach(className => {
                const schedule = this.emptySchedules[className];
                if (schedule.activeDays.includes(dayIndex)) {
                    hasActiveClassThisDay = true;
                }
            });
            
            if (!hasActiveClassThisDay) return;
            
            const isWeekend = dayIndex >= 5;
            const hoursThisDay = [];
            
            // Bu günde ders olan saatleri bul
            for (let hour = 0; hour < maxHours; hour++) {
                let hasLessonThisHour = false;
                classNames.forEach(className => {
                    const schedule = this.emptySchedules[className];
                    if (schedule.activeDays.includes(dayIndex)) {
                        hasLessonThisHour = true;
                    }
                });
                if (hasLessonThisHour) {
                    hoursThisDay.push(hour);
                }
            }
            
            if (hoursThisDay.length === 0) return;
            
            // Her saat dilimi için bir satır
            hoursThisDay.forEach((hour, hourIndex) => {
                const rowBg = dayRowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white';
                
                html += `<tr class="${rowBg} hover:bg-indigo-50 transition">`;
                
                // İLK SATIR: Gün adı (rowspan ile tüm saatleri kapsa)
                if (hourIndex === 0) {
                    html += `
                        <td rowspan="${hoursThisDay.length}" class="border-2 border-gray-600 px-2 py-2 text-center font-bold sticky left-0 z-10 align-middle ${isWeekend ? 'bg-orange-100' : 'bg-gray-100'}" style="writing-mode: vertical-rl; text-orientation: upright;">
                            <div class="${isWeekend ? 'text-orange-700' : 'text-gray-700'} text-base font-bold">${dayName.toUpperCase()}</div>
                        </td>`;
                }
                
                // Saat bilgisi
                const firstClassName = classNames[0];
                const firstSchedule = this.emptySchedules[firstClassName];
                const firstClassInfo = this.classManager.getClassInfo(firstClassName);
                const timeSlot = this.timeManager.getTimeSlotForClass(hour, firstClassInfo);
                
                html += `<td class="border-2 border-gray-600 px-1 py-1 text-center font-semibold text-gray-700 ${rowBg}" style="font-size: 9px; line-height: 1.2;">${timeSlot}</td>`;
                
                // Her sınıf için hücre
                classNames.forEach(className => {
                    const schedule = this.emptySchedules[className];
                    const cellKey = `${dayIndex}-${hour}`;
                    const isBlocked = schedule.blockedCells.includes(cellKey);
                    const isActiveDay = schedule.activeDays.includes(dayIndex);
                    
                    // SADECE SEÇİLİ ÖĞRETMENİN kısıtlarını kontrol et
                    let hasTeacherConstraint = false;
                    const timeKey = `${dayIndex}-${hour}`;
                    
                    if (this.selectedTeacher && this.teacherConstraints && this.teacherConstraints[this.selectedTeacher]) {
                        const constraints = this.teacherConstraints[this.selectedTeacher];
                        if (constraints.includes(timeKey)) {
                            hasTeacherConstraint = true;
                        }
                    }
                    
                    let cellClasses = `border-2 border-gray-600 p-3 align-middle cursor-pointer ${isWeekend ? 'bg-orange-50' : ''} transition w-32`;
                    let cellContent = '';
                    
                    if (!isActiveDay) {
                        cellClasses += ' bg-gray-200';
                        cellContent = `<div class="text-center text-gray-400 text-xs">-</div>`;
                    } else if (isBlocked && hasTeacherConstraint) {
                        // Hem sınıf hem öğretmen kısıtı var
                        cellClasses += ' bg-purple-200 hover:bg-purple-300';
                        cellContent = `<div class="text-center text-purple-700 text-sm font-bold" title="Hem sınıf hem öğretmen kısıtı">❌👨‍🏫</div>`;
                    } else if (hasTeacherConstraint) {
                        // Sadece öğretmen kısıtı
                        cellClasses += ' bg-pink-100 hover:bg-pink-200';
                        cellContent = `<div class="text-center text-red-600 text-sm font-bold" title="${this.selectedTeacher} müsait değil">👨‍🏫</div>`;
                    } else if (isBlocked) {
                        // Sadece sınıf kısıtı
                        cellClasses += ' bg-red-200 hover:bg-red-300';
                        cellContent = `<div class="text-center text-red-600 text-sm font-bold" title="Sınıf kısıtı">❌</div>`;
                    } else {
                        cellClasses += ' hover:bg-blue-100';
                        cellContent = `<div class="text-center text-gray-300 text-xs">Boş</div>`;
                    }
                    
                    html += `<td class="${cellClasses}" 
                                data-class="${className}" 
                                data-day="${dayIndex}" 
                                data-hour="${hour}"
                                onclick="window.scheduleManager.toggleEmptyCell('${className}', ${dayIndex}, ${hour})">
                                ${cellContent}
                             </td>`;
                });
                
                html += `</tr>`;
                dayRowIndex++;
            });
        });
        
        html += `</tbody></table></div></div>`;
        container.innerHTML = html;
        
        // Öğretmen panelini göster
        document.getElementById('teacherPanel').classList.remove('hidden');
    }

    /**
     * Boş hücreyi "ders yok" olarak işaretle/işareti kaldır
     */
    toggleEmptyCell(className, day, hour) {
        // Eğer öğretmen seçiliyse, öğretmen kısıtını işaretle
        if (this.selectedTeacher) {
            this.toggleTeacherConstraint(day, hour);
            this.renderEmptyScheduleView(); // Tabloyu yeniden çiz
            return;
        }

        const schedule = this.emptySchedules[className];
        if (!schedule) return;

        const cellKey = `${day}-${hour}`;
       
        const index = schedule.blockedCells.indexOf(cellKey);
        
        if (index === -1) {
            // Kısıt ekle
            schedule.blockedCells.push(cellKey);
            this.showNotification(`❌ ${className} - Gün ${day+1}, Saat ${hour+1}: DERS YOK işareti konuldu`, 'success');
        } else {
            // Kısıt kaldır
            schedule.blockedCells.splice(index, 1);
            this.showNotification(`✅ ${className} - Gün ${day+1}, Saat ${hour+1}: DERS YOK işareti KALDIRILDI`, 'info');
        }
        
        // Kısıtları localStorage'a kaydet
        this.saveScheduleConstraints();
        
        this.renderEmptyScheduleView();
        
        console.log(`📋 ${className} kısıtları:`, schedule.blockedCells);
    }

    /**
     * Program kısıtlarını kaydet
     */
    saveScheduleConstraints() {
        const constraints = {
            blockedCells: {},
            teacherConstraints: this.teacherConstraints || {}
        };

        // Her sınıf için engellenen hücreleri topla
        Object.keys(this.emptySchedules || {}).forEach(className => {
            const schedule = this.emptySchedules[className];
            if (schedule && schedule.blockedCells && schedule.blockedCells.length > 0) {
                constraints.blockedCells[className] = schedule.blockedCells;
            }
        });

        this.classManager.saveScheduleConstraints(constraints);
        console.log('📋 Kısıtlar kaydedildi:', constraints);
        this.showNotification('💾 Kısıtlar kaydedildi', 'success');
    }

    /**
     * Program kısıtlarını yükle
     */
    loadScheduleConstraints() {
        console.log('🔍 localStorage\'dan kısıtlar yükleniyor...');
        const constraints = this.classManager.loadScheduleConstraints();
        
        console.log('📦 localStorage\'dan gelen veri:', constraints);
        
        this.teacherConstraints = constraints.teacherConstraints || {};
        
        // Sınıf kısıtlarını da yükle
        if (constraints.blockedCells && this.emptySchedules) {
            console.log('🔄 Sınıf kısıtları emptySchedules\'a aktarılıyor...');
            Object.keys(constraints.blockedCells).forEach(className => {
                if (this.emptySchedules[className]) {
                    this.emptySchedules[className].blockedCells = constraints.blockedCells[className] || [];
                    console.log(`  ✅ ${className}: ${this.emptySchedules[className].blockedCells.length} kısıt yüklendi`);
                } else {
                    console.warn(`  ⚠️ ${className} için emptySchedule bulunamadı!`);
                }
            });
        } else {
            if (!constraints.blockedCells) {
                console.warn('⚠️ localStorage\'da blockedCells yok!');
            }
            if (!this.emptySchedules) {
                console.warn('⚠️ emptySchedules henüz oluşturulmamış!');
            }
        }
        
        console.log('✅ Kısıtlar yükleme tamamlandı');
        return constraints;
    }

    /**
     * Öğretmen listesini güncelle
     */
    updateTeacherList() {
        const teacherList = document.getElementById('teacherList');
        const lessons = this.lessonManager.getAllLessons();
        
        // Benzersiz öğretmenleri bul
        const teachers = [...new Set(lessons.map(lesson => lesson.teacherName))];
        
        if (teachers.length === 0) {
            teacherList.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center">Henüz öğretmen eklenmedi</p>';
            return;
        }

        let html = `
            <div class="col-span-full flex justify-between items-center mb-2">
                <span class="text-sm font-semibold text-gray-700">Öğretmen seç:</span>
                <button onclick="window.scheduleManager.clearTeacherConstraints()" 
                        class="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold transition">
                    🗑️ Tüm Kısıtları Temizle
                </button>
            </div>
        `;
        
        teachers.forEach(teacherName => {
            const constraintCount = (this.teacherConstraints && this.teacherConstraints[teacherName]) 
                ? this.teacherConstraints[teacherName].length 
                : 0;
            
            const isSelected = this.selectedTeacher === teacherName;
            const btnClass = isSelected 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-100 hover:bg-blue-200 text-blue-800';
            
            html += `
                <button class="teacher-btn px-3 py-2 ${btnClass} rounded-lg font-semibold text-sm transition shadow-sm"
                        onclick="window.scheduleManager.selectTeacher('${teacherName}')" 
                        data-teacher="${teacherName}">
                    ${teacherName} ${constraintCount > 0 ? `<span class="text-xs">(${constraintCount})</span>` : ''}
                </button>
            `;
        });
        
        teacherList.innerHTML = html;
    }

    /**
     * Öğretmen seç - kısıtları ayarlamak için
     */
    selectTeacher(teacherName) {
        // Aynı öğretmene tekrar tıklanırsa seçimi kaldır
        if (this.selectedTeacher === teacherName) {
            this.selectedTeacher = null;
            document.querySelectorAll('.teacher-btn').forEach(btn => {
                btn.classList.remove('bg-red-500', 'text-white');
                btn.classList.add('bg-blue-100', 'text-blue-800');
            });
            this.showNotification('👨‍🏫 Öğretmen seçimi kaldırıldı. Artık sınıf kısıtlarını işaretleyebilirsiniz.', 'info');
            
            // Tabloyu yeniden çiz - öğretmen kısıtlarını gizle
            this.renderEmptyScheduleView();
            return;
        }
        
        // Tüm öğretmen butonlarının seçimini kaldır
        document.querySelectorAll('.teacher-btn').forEach(btn => {
            btn.classList.remove('bg-red-500', 'text-white');
            btn.classList.add('bg-blue-100', 'text-blue-800');
        });
        
        // Seçilen öğretmeni işaretle
        const selectedBtn = document.querySelector(`[data-teacher="${teacherName}"]`);
        if (selectedBtn) {
            selectedBtn.classList.remove('bg-blue-100', 'text-blue-800');
            selectedBtn.classList.add('bg-red-500', 'text-white');
        }
        
        this.selectedTeacher = teacherName;
        
        // Öğretmen kısıtları initialize et
        if (!this.teacherConstraints) {
            this.teacherConstraints = {};
        }
        if (!this.teacherConstraints[teacherName]) {
            this.teacherConstraints[teacherName] = [];
        }
        
        // Mevcut kısıt sayısını göster
        const currentConstraints = this.teacherConstraints[teacherName].length;
        this.showNotification(`👨‍🏫 ${teacherName} seçildi (${currentConstraints} kısıt var). SADECE BU ÖĞRETMEN için müsait olmadığı hücrelere tıklayın. Tekrar tıklayarak kaldırabilirsiniz.`, 'info');
        
        // Tabloyu yeniden çiz - seçili öğretmenin kısıtlarını göster
        this.renderEmptyScheduleView();
    }

    /**
     * Tüm öğretmen kısıtlarını temizle
     */
    clearTeacherConstraints() {
        if (!this.teacherConstraints || Object.keys(this.teacherConstraints).length === 0) {
            this.showNotification('⚠️ Temizlenecek kısıt yok!', 'warning');
            return;
        }
        
        if (confirm('Tüm öğretmen kısıtları silinecek. Emin misiniz?')) {
            this.teacherConstraints = {};
            this.selectedTeacher = null;
            this.saveScheduleConstraints();
            this.updateTeacherList();
            this.renderEmptyScheduleView();
            this.showNotification('🗑️ Tüm öğretmen kısıtları temizlendi!', 'success');
        }
    }

    /**
     * Öğretmen kısıtlarını hücre işaretlemede kullan
     */
    toggleTeacherConstraint(day, hour) {
        if (!this.selectedTeacher) {
            this.showNotification('⚠️ Önce bir öğretmen seçin!', 'warning');
            return;
        }

        const cellKey = `${day}-${hour}`;
        
        // Öğretmen kısıtlarını initialize et
        if (!this.teacherConstraints[this.selectedTeacher]) {
            this.teacherConstraints[this.selectedTeacher] = [];
        }
        
        const constraints = this.teacherConstraints[this.selectedTeacher];
        const index = constraints.indexOf(cellKey);
        
        if (index === -1) {
            // Kısıt ekle
            constraints.push(cellKey);
            this.showNotification(`👨‍🏫 ${this.selectedTeacher} - Gün ${day+1}, Saat ${hour+1}: MÜSAİT DEĞİL işareti konuldu`, 'success');
        } else {
            // Kısıt kaldır
            constraints.splice(index, 1);
            this.showNotification(`✅ ${this.selectedTeacher} - Gün ${day+1}, Saat ${hour+1}: MÜSAİT DEĞİL işareti KALDIRILDI`, 'info');
        }
        
        this.teacherConstraints[this.selectedTeacher] = constraints;
        
        // Kısıtları kaydet
        this.saveScheduleConstraints();
        
        console.log(`📋 ${this.selectedTeacher} kısıtları:`, constraints);
    }

    /**
     * Öğretmene göre filtrele
     */
    filterByTeacher(teacherName) {
        this.selectedTeacherFilter = teacherName;
        this.renderMasterScheduleView();
        
        if (teacherName) {
            this.showNotification(`🧑‍🏫 ${teacherName} öğretmenin dersleri gösteriliyor`, 'info');
        } else {
            this.showNotification('📚 Tüm dersler gösteriliyor', 'info');
        }
    }

    /**
     * Master program görünümü - Tek tabloda tüm sınıflar
     */
    renderMasterScheduleView() {
        console.log('renderMasterScheduleView çağrıldı');
        console.log('allSchedules:', this.allSchedules);
        
        const container = document.getElementById('masterScheduleView');
        
        // Güvenli kontrol - allSchedules var mı ve obje mi?
        if (!this.allSchedules || typeof this.allSchedules !== 'object') {
            console.log('allSchedules tanımlı değil, boş mesaj gösteriliyor');
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Henüz program oluşturulmadı</p>';
            return;
        }
        
        if (Object.keys(this.allSchedules).length === 0) {
            console.log('allSchedules boş, boş mesaj gösteriliyor');
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Henüz program oluşturulmadı</p>';
            return;
        }

        const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        
        // Sınıfları al
        const classNames = Object.keys(this.allSchedules).sort();
        
        // Tüm öğretmenleri topla
        const allTeachers = new Set();
        Object.values(this.allSchedules).forEach(result => {
            const schedule = result.schedule;
            for (let hour = 0; hour < schedule.length; hour++) {
                for (let day = 0; day < 7; day++) {
                    const lesson = schedule[hour][day];
                    if (lesson && lesson.teacherName) {
                        allTeachers.add(lesson.teacherName);
                    }
                }
            }
        });
        const teacherList = Array.from(allTeachers).sort();
        
        // Hangi günlerde en az bir sınıfın dersi var?
        const activeDays = new Set();
        let maxHours = 0;
        
        for (const [className, result] of Object.entries(this.allSchedules)) {
            const schedule = result.schedule;
            if (schedule.length > maxHours) {
                maxHours = schedule.length;
            }
            
            for (let hour = 0; hour < schedule.length; hour++) {
                for (let day = 0; day < 7; day++) {
                    if (schedule[hour][day]) {
                        activeDays.add(day);
                    }
                }
            }
        }
        
        // Ders olan günleri sıralı al
        const daysToShow = Array.from(activeDays).sort((a, b) => a - b);
        
        let html = `
        <div class="mb-2 bg-white">
            <!-- Minimal Öğretmen Filtresi -->
            <div class="mb-2 flex items-center gap-2 text-sm">
                <span class="text-gray-600 font-medium">Öğretmen:</span>
                <button onclick="window.scheduleManager.filterByTeacher(null)" 
                        class="px-2 py-1 text-xs rounded transition
                               ${!this.selectedTeacherFilter ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}">
                    Tümü
                </button>`;
                    
        teacherList.forEach(teacher => {
            const isSelected = this.selectedTeacherFilter === teacher;
            html += `
                <button onclick="window.scheduleManager.filterByTeacher('${teacher}')" 
                        class="px-2 py-1 text-xs rounded transition
                               ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}">
                    ${teacher}
                </button>`;
        });
        
        html += `
            </div>
            <div class="overflow-x-auto">
                <table class="w-full border-collapse text-xs">
                    <thead>
                        <tr class="bg-gray-800">
                            <th class="border border-gray-300 px-1 py-1 text-xs font-medium text-white w-8">GÜN</th>
                            <th class="border border-gray-300 px-1 py-1 text-xs font-medium text-white w-16">SAAT</th>`;
        
        // Sütun başlıkları: SINIFLAR - Minimal
        classNames.forEach(className => {
            html += `<th class="border border-gray-300 px-1 py-1 text-xs font-medium text-white w-24">${className}</th>`;
        });
        
        html += `</tr></thead><tbody>`;
        
        // Her gün için satırlar
        daysToShow.forEach((dayIndex, dayRowIndex) => {
            const dayName = days[dayIndex];
            const isWeekend = dayIndex >= 5;
            
            // Bu günde hangi saatlerde ders var - önce ders olanlar, sonra boşlar
            const hoursWithLessons = [];
            const hoursEmpty = [];
            
            for (let hour = 0; hour < maxHours; hour++) {
                let hasAnyLesson = false;
                classNames.forEach(className => {
                    const result = this.allSchedules[className];
                    const schedule = result.schedule;
                    if (hour < schedule.length && schedule[hour][dayIndex]) {
                        hasAnyLesson = true;
                    }
                });
                
                if (hasAnyLesson) {
                    hoursWithLessons.push(hour);
                } else {
                    hoursEmpty.push(hour);
                }
            }
            
            // Önce ders olanları, sonra boş saatleri birleştir
            const hoursThisDay = [...hoursWithLessons, ...hoursEmpty];
            
            if (hoursThisDay.length === 0) return;
            
            // Her saat dilimi için bir satır
            hoursThisDay.forEach((hour, hourIndex) => {
                const rowBg = dayRowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white';
                
                html += `<tr class="${rowBg} hover:bg-indigo-50 transition">`;
                
                // İLK SATIR: Gün adı - Minimal
                if (hourIndex === 0) {
                    html += `
                        <td rowspan="${hoursThisDay.length}" class="border border-gray-300 px-1 py-1 text-center font-medium align-middle bg-gray-100 text-xs">
                            ${dayName}
                        </td>`;
                }
                
                // Saat bilgisi - Minimal
                const firstClassName = classNames[0];
                const firstClassInfo = this.classManager.getClassInfo(firstClassName);
                const timeSlotForHour = this.timeManager.getTimeSlotForClass(hour, firstClassInfo);
                
                html += `<td class="border border-gray-300 px-1 py-1 text-center text-gray-600 text-xs">${timeSlotForHour}</td>`;
                
                // Her sınıf için hücre
                classNames.forEach(className => {
                    const result = this.allSchedules[className];
                    const classInfo = this.classManager.getClassInfo(className);
                    const schedule = result.schedule;
                    
                    // Bu hücreye ders yerleştirilmiş mi?
                    const lesson = (hour < schedule.length) ? schedule[hour][dayIndex] : null;
                    
                    const cellId = `cell-${className}-${dayIndex}-${hour}`;
                    let cellClasses = `border border-gray-300 p-1 text-center align-middle transition cursor-pointer min-h-[32px]`;
                    let cellContent = '';
                    
                    if (lesson) {
                        // Öğretmen filtrelemesi
                        const teacherName = lesson.teacherName || lesson.teacher || 'Öğretmen';
                        const isFiltered = this.selectedTeacherFilter && this.selectedTeacherFilter !== teacherName;
                        
                        if (isFiltered) {
                            // Filtrelenmiş - gri göster
                            cellClasses += ' bg-gray-100';
                            cellContent = `<div class="text-gray-400 text-xs">Gizli</div>`;
                        } else {
                            // DERS VAR - Minimal renkli göster (sürüklenebilir)
                            const color = getIndependentLessonColor(lesson.lessonName);
                            cellClasses += ` ${color} text-white hover:opacity-80 cursor-move`;
                            cellContent = `
                                <div class="text-xs font-medium leading-tight h-8 flex flex-col justify-center" 
                                     draggable="true" 
                                     data-lesson="${lesson.lessonName}" 
                                     data-teacher="${teacherName}" 
                                     data-class="${className}" 
                                     data-day="${dayIndex}" 
                                     data-hour="${hour}">
                                    <div>${lesson.lessonName}</div>
                                    <div class="text-xs opacity-75">${teacherName}</div>
                                </div>
                            `;
                        }
                    } else {
                        // DERS YOK - Boş hücre (drop zone)
                        // Eğer bu saat tamamen boşsa (hiçbir sınıfta ders yok), farklı stil
                        const isCompletelyEmpty = !hoursWithLessons.includes(hour);
                        if (isCompletelyEmpty) {
                            cellClasses += ' hover:bg-blue-50 drop-zone bg-gray-50 border-dashed';
                            cellContent = `<div class="text-gray-400 text-xs h-8 flex items-center justify-center drop-target" 
                                                data-class="${className}" 
                                                data-day="${dayIndex}" 
                                                data-hour="${hour}">Boş Saat</div>`;
                        } else {
                            cellClasses += ' hover:bg-blue-50 drop-zone bg-white';
                            cellContent = `<div class="text-gray-300 text-xs h-8 flex items-center justify-center drop-target" 
                                                data-class="${className}" 
                                                data-day="${dayIndex}" 
                                                data-hour="${hour}">-</div>`;
                        }
                    }
                    
                    html += `<td id="${cellId}" class="${cellClasses}">${cellContent}</td>`;
                });
                
                html += `</tr>`;
            });
        });
        
        html += `</tbody></table></div>`;
        
        container.innerHTML = html;
        
        // Sürükle-bırak olaylarını başlat
        this.setupDragAndDropForSchedule();
    }

    /**
     * Ana programa sürükle-bırak özelliği ekle
     */
    setupDragAndDropForSchedule() {
        const container = document.getElementById('masterScheduleView');
        
        // Sürüklenebilir ders hücreleri
        container.addEventListener('dragstart', (e) => {
            const draggable = e.target.closest('[draggable="true"]');
            if (draggable) {
                console.log('Drag start:', draggable.dataset);
                draggable.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    lesson: draggable.dataset.lesson,
                    teacher: draggable.dataset.teacher,
                    fromClass: draggable.dataset.class,
                    fromDay: draggable.dataset.day,
                    fromHour: draggable.dataset.hour
                }));
            }
        });

        container.addEventListener('dragend', (e) => {
            const draggable = e.target.closest('[draggable="true"]');
            if (draggable) {
                draggable.style.opacity = '1';
            }
        });

        // Drop zone'lar için dragover
        container.addEventListener('dragover', (e) => {
            const dropTarget = e.target.closest('.drop-target');
            if (dropTarget) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                dropTarget.closest('td').classList.add('bg-blue-100');
            }
        });

        // Drop zone'dan ayrılırken
        container.addEventListener('dragleave', (e) => {
            const dropTarget = e.target.closest('.drop-target');
            if (dropTarget) {
                dropTarget.closest('td').classList.remove('bg-blue-100');
            }
        });

        // Drop işlemi
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const dropTarget = e.target.closest('.drop-target');
            if (dropTarget) {
                console.log('Drop target:', dropTarget.dataset);
                dropTarget.closest('td').classList.remove('bg-blue-100');
                
                try {
                    const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
                    console.log('Drag data:', dragData);
                    console.log('Drop data:', dropTarget.dataset);
                    
                    // Dersi taşı
                    this.moveLessonInSchedule(dragData, dropTarget.dataset);
                } catch (error) {
                    console.error('Drop error:', error);
                    this.showNotification('❌ Sürükle-bırak işleminde hata!', 'error');
                }
            }
        });
    }

    /**
     * Programda ders taşıma
     */
    moveLessonInSchedule(from, to) {
        const fromClass = from.fromClass;
        const toClass = to.class;
        const fromDay = parseInt(from.fromDay);
        const fromHour = parseInt(from.fromHour);
        const toDay = parseInt(to.day);
        const toHour = parseInt(to.hour);
        
        // Kaynak ve hedef programları al
        const fromSchedule = this.allSchedules[fromClass].schedule;
        const toSchedule = this.allSchedules[toClass].schedule;
        
        // Ders objesini al
        const lesson = fromSchedule[fromHour][fromDay];
        
        if (lesson && !toSchedule[toHour][toDay]) {
            // Çakışma kontrolü yap
            const conflicts = this.checkMoveConflicts(lesson, toClass, toDay, toHour);
            
            if (conflicts.length > 0) {
                // Çakışma var, uyarı göster
                let message = '⚠️ Çakışma tespit edildi!\n\n';
                conflicts.forEach(conflict => {
                    message += `• ${conflict}\n`;
                });
                message += '\n❓ Yine de taşımak istiyor musunuz?';
                
                if (confirm(message)) {
                    // Kullanıcı onayladıysa taşı
                    this.performMove(lesson, fromSchedule, toSchedule, fromHour, fromDay, toHour, toDay, toClass);
                    this.showNotification(`⚠️ ${lesson.lessonName} dersi çakışma riskiyle taşındı!`, 'warning');
                }
            } else {
                // Çakışma yok, güvenle taşı
                this.performMove(lesson, fromSchedule, toSchedule, fromHour, fromDay, toHour, toDay, toClass);
                this.showNotification(`✅ ${lesson.lessonName} dersi başarıyla taşındı`, 'success');
            }
        } else if (toSchedule[toHour][toDay]) {
            this.showNotification('❌ Hedef hücre dolu!', 'warning');
        }
    }

    /**
     * Dersi taşıma işlemini gerçekleştir
     */
    performMove(lesson, fromSchedule, toSchedule, fromHour, fromDay, toHour, toDay, toClass) {
        // Dersi taşı
        toSchedule[toHour][toDay] = lesson;
        fromSchedule[fromHour][fromDay] = null;
        
        // Ders nesnesinin sınıf bilgisini güncelle
        lesson.className = toClass;
        
        // Tabloyu yeniden render et
        this.renderMasterScheduleView();
    }

    /**
     * Ders taşıma çakışmalarını kontrol et
     */
    checkMoveConflicts(lesson, targetClass, targetDay, targetHour) {
        const conflicts = [];
        const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        
        // Öğretmen çakışması kontrolü
        if (lesson.teacherName) {
            // Tüm sınıfları kontrol et
            Object.keys(this.allSchedules).forEach(className => {
                if (className === targetClass) return; // Aynı sınıf ise atla
                
                const schedule = this.allSchedules[className].schedule;
                if (targetHour < schedule.length && schedule[targetHour][targetDay]) {
                    const otherLesson = schedule[targetHour][targetDay];
                    if (otherLesson && otherLesson.teacherName === lesson.teacherName) {
                        conflicts.push(`${lesson.teacherName} öğretmeni ${days[targetDay]} günü ${targetHour + 1}. saatte ${className} sınıfında ${otherLesson.lessonName} dersi veriyor!`);
                    }
                }
            });
        }
        
        // Sınıf kısıtlamaları kontrolü (❌ işareti)
        const classInfo = this.classManager.getClassInfo(targetClass);
        if (classInfo && classInfo.blockedCells) {
            const cellKey = `${targetDay}-${targetHour}`;
            if (classInfo.blockedCells.has(cellKey)) {
                conflicts.push(`${targetClass} sınıfının ${days[targetDay]} günü ${targetHour + 1}. saati kısıtlanmış (❌ işareti var)!`);
            }
        }

        // Öğretmen kısıtlamaları kontrolü (👨‍🏫 işareti)
        if (lesson.teacherName && this.teacherConstraints && this.teacherConstraints instanceof Set) {
            const constraintKey = `${lesson.teacherName}-${targetDay}-${targetHour}`;
            if (this.teacherConstraints.has(constraintKey)) {
                conflicts.push(`${lesson.teacherName} öğretmeni ${days[targetDay]} günü ${targetHour + 1}. saatte kısıtlanmış (👨‍🏫 işareti var)!`);
            }
        }
        
        return conflicts;
    }

    /**
     * Uyarı HTML'i oluştur
     */
    getWarningHTML(unplacedLessons) {
        let html = '<div class="mb-3 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded text-sm">';
        html += '<p class="font-semibold">⚠️ Dikkat!</p>';
        html += '<ul class="list-disc list-inside mt-1 text-xs">';
        
        unplacedLessons.forEach(item => {
            const lesson = item.lesson;
            html += `<li>${lesson.lessonName} (${lesson.teacherName}) - ${item.placed}/${item.needed} saat yerleştirildi</li>`;
        });
        
        html += '</ul></div>';
        return html;
    }

    /**
     * Yerleştirilemeyen dersler için uyarı göster
     */
    showUnplacedWarning(unplacedLessons) {
        const warningDiv = document.getElementById('warningMessage');
        const warningList = document.getElementById('warningList');

        let html = '';
        unplacedLessons.forEach(item => {
            const lesson = item.lesson;
            html += `<li>${lesson.lessonName} (${lesson.className}) - ${item.placed}/${item.needed} saat yerleştirildi</li>`;
        });

        warningList.innerHTML = html;
        warningDiv.classList.remove('hidden');
    }

    /**
     * Tüm sınıflar için sürükle-bırak
     */
    enableDragAndDropForAll() {
        this.setupDragAndDrop();
    }

    /**
     * Tek sınıf için sürükle-bırak
     */
    enableDragAndDrop(className) {
        this.setupDragAndDrop();
    }

    /**
     * Sürükle-bırak özelliğini kur
     */
    setupDragAndDrop() {
        let draggedElement = null;
        let draggedData = null;

        // Sürüklenebilir dersleri ayarla
        document.querySelectorAll('.draggable').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedElement = e.currentTarget;
                draggedData = {
                    className: draggedElement.dataset.class,
                    day: parseInt(draggedElement.dataset.day),
                    hour: parseInt(draggedElement.dataset.hour)
                };
                e.currentTarget.classList.add('opacity-50');
            });

            item.addEventListener('dragend', (e) => {
                e.currentTarget.classList.remove('opacity-50');
                draggedElement = null;
                draggedData = null;
            });
        });

        // Bırakılabilir hücreleri ayarla
        document.querySelectorAll('td[data-class]').forEach(cell => {
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (draggedData) {
                    cell.classList.add('bg-blue-200', 'ring-2', 'ring-blue-400');
                }
            });

            cell.addEventListener('dragleave', (e) => {
                cell.classList.remove('bg-blue-200', 'ring-2', 'ring-blue-400');
            });

            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.classList.remove('bg-blue-200', 'ring-2', 'ring-blue-400');

                if (draggedData) {
                    const targetClass = cell.dataset.class;
                    const targetDay = parseInt(cell.dataset.day);
                    const targetHour = parseInt(cell.dataset.hour);

                    // Aynı sınıf içinde takas
                    if (targetClass === draggedData.className) {
                        // swapLessons metodu kendi çakışma kontrolünü yapacak ve bildirim gösterecek
                        this.swapLessons(draggedData.className, draggedData.day, draggedData.hour, targetDay, targetHour);
                    } else {
                        this.showNotification('⚠️ Sadece aynı sınıf içinde taşıma yapabilirsiniz', 'warning');
                    }
                }
            });
        });
    }

    /**
     * İki dersin yerini değiştir
     */
    swapLessons(className, sourceDay, sourceHour, targetDay, targetHour) {
        if (!this.allSchedules[className]) return;

        const schedule = this.allSchedules[className].schedule;
        const sourceLesson = schedule[sourceHour][sourceDay];
        const targetLesson = schedule[targetHour][targetDay];
        
        // Çakışma kontrolü yap
        const conflicts = this.checkSwapConflicts(className, sourceLesson, targetLesson, sourceDay, sourceHour, targetDay, targetHour);
        
        if (conflicts.length > 0) {
            // Çakışma var, uyarı göster
            let message = '⚠️ ÇAKIŞMA TESPİT EDİLDİ!\n\n';
            conflicts.forEach(conflict => {
                message += `• ${conflict}\n`;
            });
            message += '\nYine de değiştirmek istiyor musunuz?';
            
            if (!confirm(message)) {
                this.showNotification('❌ İşlem iptal edildi', 'info');
                return;
            }
        }
        
        // Takas yap
        schedule[sourceHour][sourceDay] = targetLesson;
        schedule[targetHour][targetDay] = sourceLesson;

        this.renderCurrentView();
        
        if (conflicts.length > 0) {
            this.showNotification('⚠️ Çakışmalı takas yapıldı! Lütfen programı kontrol edin.', 'warning');
        } else {
            this.showNotification('✅ Ders yeri başarıyla değiştirildi!', 'success');
        }
    }
    
    /**
     * Takas işleminde çakışmaları kontrol et
     */
    checkSwapConflicts(className, sourceLesson, targetLesson, sourceDay, sourceHour, targetDay, targetHour) {
        const conflicts = [];
        const schedule = this.allSchedules[className].schedule;
        const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        
        // Kaynak dersi hedef konuma taşıyoruz, kontrol et
        if (sourceLesson) {
            // Aynı öğretmen aynı saatte başka bir sınıfta ders veriyor mu?
            for (const [otherClassName, otherResult] of Object.entries(this.allSchedules)) {
                if (otherClassName === className) continue; // Aynı sınıfı atla
                
                const otherSchedule = otherResult.schedule;
                if (otherSchedule[targetHour] && otherSchedule[targetHour][targetDay]) {
                    const otherLesson = otherSchedule[targetHour][targetDay];
                    if (otherLesson.teacherName === sourceLesson.teacherName) {
                        conflicts.push(`${sourceLesson.teacherName} öğretmeni ${days[targetDay]} günü ${targetHour + 1}. saatte ${otherClassName} sınıfında ${otherLesson.lessonName} dersi veriyor!`);
                    }
                }
            }
            
            // Aynı gün aynı saatte (farklı sınıflar için) - bu sınıf için zaten baktık
        }
        
        // Hedef dersi kaynak konuma taşıyoruz, kontrol et
        if (targetLesson) {
            // Aynı öğretmen aynı saatte başka bir sınıfta ders veriyor mu?
            for (const [otherClassName, otherResult] of Object.entries(this.allSchedules)) {
                if (otherClassName === className) continue; // Aynı sınıfı atla
                
                const otherSchedule = otherResult.schedule;
                if (otherSchedule[sourceHour] && otherSchedule[sourceHour][sourceDay]) {
                    const otherLesson = otherSchedule[sourceHour][sourceDay];
                    if (otherLesson.teacherName === targetLesson.teacherName) {
                        conflicts.push(`${targetLesson.teacherName} öğretmeni ${days[sourceDay]} günü ${sourceHour + 1}. saatte ${otherClassName} sınıfında ${otherLesson.lessonName} dersi veriyor!`);
                    }
                }
            }
        }
        
        return conflicts;
    }

    /**
     * Bildirim göster
     */
    showNotification(message, type = 'info') {
        const colors = {
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            error: 'bg-red-500',
            info: 'bg-blue-500'
        };

        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 slide-in`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * PNG olarak indir
     */
    async exportToPNG() {
        const container = document.getElementById('masterScheduleView');
        
        // Program oluşturulmamışsa uyar
        if (!container.querySelector('table')) {
            this.showNotification('⚠️ Önce program oluşturun!', 'warning');
            return;
        }
        
        try {
            this.showNotification('📷 PNG oluşturuluyor... Lütfen bekleyin.', 'info');
            
            // Export için dikey yazıları yatay yap
            const dayColumns = container.querySelectorAll('td[style*="writing-mode"]');
            const originalStyles = [];
            
            dayColumns.forEach((col, index) => {
                originalStyles[index] = col.style.cssText;
                col.style.writingMode = 'horizontal-tb';
                col.style.textOrientation = 'mixed';
            });
            
            // Kısa bir gecikme ekle - DOM'un tam render olması için
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Yüksek çözünürlük ile render
            const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 4,
                logging: true,
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: false,
                imageTimeout: 0,
                removeContainer: false
            });
            
            // Orijinal stilleri geri yükle
            dayColumns.forEach((col, index) => {
                col.style.cssText = originalStyles[index];
            });

            // Canvas boş mu kontrol et
            if (canvas.width === 0 || canvas.height === 0) {
                throw new Error('Canvas boş oluşturuldu!');
            }

            const link = document.createElement('a');
            link.download = 'ders-programi.png';
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();

            this.showNotification('📷 PNG başarıyla indirildi!', 'success');
        } catch (error) {
            this.showNotification('❌ PNG indirme başarısız! Konsolu kontrol edin.', 'error');
            console.error('PNG Export Hatası:', error);
        }
    }

    /**
     * PDF olarak gerçek tablo indir (resim değil)
     */
    async exportToPDF() {
        // Program oluşturulmamışsa uyar
        if (!this.allSchedules || Object.keys(this.allSchedules).length === 0) {
            this.showNotification('⚠️ Önce program oluşturun!', 'warning');
            return;
        }
        
        try {
            this.showNotification('📄 PDF tablosu oluşturuluyor... Lütfen bekleyin.', 'info');
            
            // PDF oluştur - Landscape A4
            const pdf = new jspdf.jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // Türkçe karakter desteği için font ayarla
            pdf.setFont("helvetica");
            
            // Başlık ve tarih yok - Direkt tablo

            // Tablo verilerini hazırla - Türkçe karaktersiz
            const days = ['Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi', 'Pazar'];
            const classNames = Object.keys(this.allSchedules).sort();
            
            // Hangi günlerde ders var?
            const activeDays = new Set();
            let maxHours = 0;
            
            for (const [className, result] of Object.entries(this.allSchedules)) {
                const schedule = result.schedule;
                if (schedule.length > maxHours) {
                    maxHours = schedule.length;
                }
                
                for (let hour = 0; hour < schedule.length; hour++) {
                    for (let day = 0; day < 7; day++) {
                        if (schedule[hour][day]) {
                            activeDays.add(day);
                        }
                    }
                }
            }
            
            const daysToShow = Array.from(activeDays).sort((a, b) => a - b);

            // Sınıf sayısına göre font boyutunu ayarla - Ultra kompakt (EN BAŞTA TANIMLA)
            const classCount = classNames.length;
            let baseFontSize = 4;
            let headFontSize = 5;
            let cellPadding = 0.2; // Ultra küçük padding
            let minCellHeight = 3; // Ultra küçük hücre yüksekliği
            
            if (classCount <= 3) {
                baseFontSize = 6;
                headFontSize = 7;
                cellPadding = 0.5;
                minCellHeight = 4;
            } else if (classCount <= 5) {
                baseFontSize = 5;
                headFontSize = 6;
                cellPadding = 0.3;
                minCellHeight = 3.5;
            } else {
                baseFontSize = 3.5;
                headFontSize = 4;
                cellPadding = 0.1;
                minCellHeight = 2.5;
            }

            // Tablo başlıklarını oluştur
            const tableHeaders = ['Gün', 'Saat'];
            classNames.forEach(className => {
                tableHeaders.push(className);
            });

            // Tablo verilerini oluştur - Gün hücrelerini birleştir
            const tableData = [];
            
            daysToShow.forEach(dayIndex => {
                const dayName = days[dayIndex];
                
                // Bu günde hangi saatler var?
                const hoursThisDay = [];
                for (let hour = 0; hour < maxHours; hour++) {
                    let hasLessonThisHour = false;
                    classNames.forEach(className => {
                        const result = this.allSchedules[className];
                        const schedule = result.schedule;
                        if (hour < schedule.length && schedule[hour][dayIndex]) {
                            hasLessonThisHour = true;
                        }
                    });
                    
                    if (hasLessonThisHour) {
                        hoursThisDay.push(hour);
                    }
                }
                
                // Her saat için bir satır oluştur
                hoursThisDay.forEach((hour, hourIndex) => {
                    const row = [];
                    
                    // Gün adı - Sadece ilk satırda dikey yazı olarak, diğerleri boş
                    if (hourIndex === 0) {
                        // Dikey gün adı - aşağıdan yukarıya ve harfler yan çevrilmiş
                        const rotatedDayName = this.rotateTextVertical(dayName);
                        row.push({
                            content: rotatedDayName,
                            rowSpan: hoursThisDay.length,
                            styles: {
                                fillColor: [59, 130, 246], // Mavi arka plan - daha belirgin
                                fontStyle: 'bold',
                                halign: 'center',
                                valign: 'middle',
                                fontSize: baseFontSize + 3, // Daha da büyük
                                lineHeight: 0.2, // Daha sıkı
                                cellPadding: 0.5,
                                textColor: [255, 255, 255], // Beyaz yazı - kontrast için
                                lineColor: [0, 0, 0], // Siyah çerçeve
                                lineWidth: 0.3 // Kalın çerçeve
                            }
                        });
                    }
                    // Diğer satırlarda gün sütunu otomatik olarak span edilecek
                    
                    // Saat bilgisi
                    const firstClassName = classNames[0];
                    const firstClassInfo = this.classManager.getClassInfo(firstClassName);
                    const timeSlot = this.timeManager.getTimeSlotForClass(hour, firstClassInfo);
                    row.push(timeSlot);
                    
                    // Her sınıf için ders bilgisi
                    classNames.forEach(className => {
                        const result = this.allSchedules[className];
                        const schedule = result.schedule;
                        
                        const lesson = (hour < schedule.length) ? schedule[hour][dayIndex] : null;
                        
                        if (lesson) {
                            const teacherName = lesson.teacherName || lesson.teacher || 'Ogretmen';
                            
                            // Öğretmen filtresi varsa kontrol et
                            if (this.selectedTeacherFilter && this.selectedTeacherFilter !== teacherName) {
                                row.push('Gizli');
                            } else {
                                // Türkçe karakterleri basit harflere çevir ve kısalt
                                const lessonNameClean = this.cleanTurkishChars(lesson.lessonName);
                                const teacherNameClean = this.cleanTurkishChars(teacherName);
                                
                                // Çok sınıf varsa ders adını kısalt
                                let shortLessonName = lessonNameClean;
                                if (classNames.length > 5 && lessonNameClean.length > 8) {
                                    shortLessonName = lessonNameClean.substring(0, 8) + '.';
                                }
                                
                                // Öğretmen adını kısalt
                                let shortTeacherName = teacherNameClean;
                                if (teacherNameClean.length > 10) {
                                    shortTeacherName = teacherNameClean.substring(0, 8) + '.';
                                }
                                
                                row.push(`${shortLessonName}\n(${shortTeacherName})`);
                            }
                        } else {
                            row.push('Bos');
                        }
                    });
                    
                    tableData.push(row);
                });
            });

            // Sütun genişliklerini hesapla - Ders hücreleri daha dar
            const availableWidth = 297; // A4 landscape tam genişlik - hiç margin yok
            const dayColumnWidth = 8; // Gün sütunu biraz genişlet (belirginlik için)
            const timeColumnWidth = 15; // Saat sütunu biraz genişlet
            const remainingWidth = availableWidth - dayColumnWidth - timeColumnWidth;
            const classColumnWidth = Math.min(remainingWidth / classCount, 30); // Maksimum 30mm genişlik - daha dar

            // autoTable ile tabloyu oluştur - Tam sayfa kaplama
            pdf.autoTable({
                head: [tableHeaders],
                body: tableData,
                startY: 0, // Sayfanın tam üstünden başla
                styles: {
                    fontSize: baseFontSize,
                    cellPadding: cellPadding,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.05,
                    textColor: [0, 0, 0],
                    overflow: 'hidden', // Taşan metni kes
                    halign: 'center',
                    valign: 'middle',
                    font: 'helvetica',
                    minCellHeight: minCellHeight, // Dinamik minimum hücre yüksekliği
                    lineHeight: 0.9 // Ultra küçük satır aralığı
                },
                headStyles: {
                    fillColor: [79, 70, 229],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: headFontSize,
                    halign: 'center',
                    cellPadding: cellPadding + 0.1, // Başlık padding'i minimum
                    minCellHeight: minCellHeight + 0.5,
                    lineHeight: 0.8 // Başlık satır aralığı ultra sıkı
                },
                columnStyles: {
                    0: { 
                        fillColor: [243, 244, 246], 
                        fontStyle: 'bold', 
                        halign: 'center',
                        valign: 'middle',
                        cellWidth: dayColumnWidth,
                        fontSize: baseFontSize - 0.5,
                        lineHeight: 0.8 // Dikey yazı için sıkı satır aralığı
                    },
                    1: { 
                        fillColor: [229, 231, 235], // Daha koyu gri - belirgin
                        fontSize: baseFontSize - 1, 
                        halign: 'center', 
                        cellWidth: timeColumnWidth,
                        fontStyle: 'bold', // Saat de kalın
                        textColor: [55, 65, 81] // Koyu gri yazı
                    }
                },
                tableWidth: 'wrap',
                alternateRowStyles: {
                    fillColor: [249, 250, 251]
                },
                tableLineColor: [0, 0, 0],
                tableLineWidth: 0.05,
                margin: { top: 0, right: 0, bottom: 0, left: 0 }, // Hiç margin yok - tam sayfa
                pageBreak: 'avoid',
                showHead: 'firstPage',
                theme: 'grid',
                didParseCell: function(data) {
                    // Gün sütunu artık rowspan ile otomatik hallediliyor
                    
                    // Sınıf sütunları için dar genişlik ayarı
                    if (data.section === 'head' && data.column.index > 1) {
                        data.cell.styles.cellWidth = classColumnWidth;
                        data.cell.styles.fontSize = baseFontSize - 1; // Başlık da küçük
                    }
                    if (data.section === 'body' && data.column.index > 1) {
                        data.cell.styles.cellWidth = classColumnWidth;
                        data.cell.styles.fontSize = baseFontSize - 1; // Ders yazıları küçük
                        
                        // Ders hücreleri için renk ataması
                        const cellText = data.cell.text[0];
                        if (cellText && cellText !== 'Bos' && cellText !== 'Gizli') {
                            // Ders adını al (parantezden önceki kısım)
                            const lessonName = cellText.split('\n')[0];
                            // Orijinal ders adından renk al (Türkçe karakterli halinden)
                            const originalLessonName = this.getOriginalLessonName(lessonName);
                            const color = this.getRGBFromBgClass(getIndependentLessonColor(originalLessonName));
                            if (color) {
                                data.cell.styles.fillColor = color;
                                data.cell.styles.textColor = [255, 255, 255];
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    }
                }.bind(this)
            });

            // PDF'i kaydet
            pdf.save('ders-programi.pdf');
            this.showNotification('📄 PDF tablosu başarıyla indirildi!', 'success');
            
        } catch (error) {
            this.showNotification('❌ PDF oluşturma başarısız!', 'error');
            console.error('PDF Export Error:', error);
        }
    }
    
    /**
     * Normal harflerle yukarıdan aşağıya dikey yaz
     */
    rotateTextVertical(text) {
        // Normal harfleri yukarıdan aşağıya alt alta diz
        return text.split('').join('\n');
    }

    /**
     * Türkçe karakterleri PDF uyumlu karakterlere çevir
     */
    cleanTurkishChars(text) {
        if (!text) return text;
        
        const charMap = {
            'ç': 'c', 'Ç': 'C',
            'ğ': 'g', 'Ğ': 'G',
            'ı': 'i', 'İ': 'I',
            'ö': 'o', 'Ö': 'O',
            'ş': 's', 'Ş': 'S',
            'ü': 'u', 'Ü': 'U'
        };
        
        return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, function(char) {
            return charMap[char] || char;
        });
    }

    /**
     * Temizlenmiş ders adından orijinal ders adını bul
     */
    getOriginalLessonName(cleanedName) {
        // Tüm dersleri gez ve temizlenmiş halini karşılaştır
        const allLessons = this.lessonManager.getAllLessons();
        for (const lesson of allLessons) {
            if (this.cleanTurkishChars(lesson.lessonName) === cleanedName) {
                return lesson.lessonName;
            }
        }
        return cleanedName; // Bulamazsa temizlenmiş halini döndür
    }

    /**
     * Tailwind bg-* class'ından RGB değeri çıkar
     */
    getRGBFromBgClass(bgClass) {
        const colorMap = {
            'bg-blue-500': [59, 130, 246],
            'bg-green-500': [34, 197, 94],
            'bg-yellow-500': [234, 179, 8],
            'bg-red-500': [239, 68, 68],
            'bg-purple-500': [168, 85, 247],
            'bg-pink-500': [236, 72, 153],
            'bg-indigo-500': [99, 102, 241],
            'bg-teal-500': [20, 184, 166],
            'bg-orange-500': [249, 115, 22],
            'bg-cyan-500': [6, 182, 212],
            'bg-lime-500': [132, 204, 22],
            'bg-amber-500': [245, 158, 11],
            'bg-emerald-500': [16, 185, 129],
            'bg-violet-500': [139, 92, 246],
            'bg-fuchsia-500': [217, 70, 239],
            'bg-rose-500': [244, 63, 94],
            'bg-sky-500': [14, 165, 233],
            'bg-slate-500': [100, 116, 139],
            'bg-zinc-500': [113, 113, 122],
            'bg-stone-500': [120, 113, 108],
            // 600 tonları
            'bg-blue-600': [37, 99, 235],
            'bg-green-600': [22, 163, 74],
            'bg-yellow-600': [202, 138, 4],
            'bg-red-600': [220, 38, 38],
            'bg-purple-600': [147, 51, 234],
            'bg-pink-600': [219, 39, 119],
            'bg-indigo-600': [79, 70, 229],
            'bg-teal-600': [13, 148, 136],
            'bg-orange-600': [234, 88, 12],
            'bg-cyan-600': [8, 145, 178],
            'bg-lime-600': [101, 163, 13],
            'bg-amber-600': [217, 119, 6],
            'bg-emerald-600': [5, 150, 105],
            'bg-violet-600': [124, 58, 237],
            'bg-fuchsia-600': [192, 38, 211],
            'bg-rose-600': [225, 29, 72],
            'bg-sky-600': [2, 132, 199],
            'bg-slate-600': [71, 85, 105],
            'bg-zinc-600': [82, 82, 91],
            'bg-stone-600': [87, 83, 78]
        };
        
        return colorMap[bgClass] || [99, 102, 241]; // Default indigo
    }
}

// ============================================
// UYGULAMA BAŞLATMA
// ============================================

let uiManager;

document.addEventListener('DOMContentLoaded', () => {
    // Debug: LocalStorage'ı temizle (geliştirme aşamasında)
    // localStorage.clear(); // Sorun olursa bu satırın yorumunu kaldırın
    
    uiManager = new UIManager();
    
    // Global scope'a ekle (inline onclick için)
    window.uiManager = uiManager;
    window.scheduleManager = uiManager;
    
    console.log('📚 Ders Programı Oluşturucu hazır!');
    console.log('🕐 Başlangıç: 09:00, Her ders: 40dk, Teneffüs: 10dk');
    
    // Debug bilgileri
    console.log('Yüklenen sınıflar:', uiManager.classManager.getAllClasses());
    console.log('Yüklenen dersler:', uiManager.lessonManager.getAllLessons());
});
