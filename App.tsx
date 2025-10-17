
import React, { useState, useEffect, createContext, useContext, useMemo, useCallback, Fragment, FC, ReactNode } from 'react';
import { HashRouter, Routes, Route, NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppData, SchoolInfo, AvailabilityStatus, Availability, Teacher, ClassData, Classroom, Assignment, CurriculumItem, LessonTime } from './types';
import { generateId, exportDataAsJSON, generatePdf } from './utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase, type DatabaseBackup } from './supabase';


// --- CONSTANTS ---
const DAYS_OF_WEEK = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const AVAILABILITY_CONFIG = {
  [AvailabilityStatus.AVAILABLE]: {
    color: 'bg-green-100 dark:bg-green-800/50 border-green-200 dark:border-green-700',
    text: 'Uygun'
  },
  [AvailabilityStatus.UNAVAILABLE]: {
    color: 'bg-red-100 dark:bg-red-800/50 border-red-200 dark:border-red-700',
    text: 'Uygun Değil'
  },
  [AvailabilityStatus.PREFERRED]: {
    color: 'bg-yellow-100 dark:bg-yellow-800/50 border-yellow-200 dark:border-yellow-700',
    text: 'Tercih Edilen'
  },
};

const generateDefaultTimes = (count: number, start: string, duration: number, breakTime: number): LessonTime[] => {
    const times: LessonTime[] = [];
    if (!start || !start.includes(':')) {
        return Array(count).fill({ start: '', end: ''});
    }
    const [startHour, startMinute] = start.split(':').map(Number);
    let currentTime = new Date();
    currentTime.setHours(startHour, startMinute, 0, 0);

    for (let i = 0; i < count; i++) {
        const startTime = new Date(currentTime);
        currentTime.setMinutes(currentTime.getMinutes() + duration);
        const endTime = new Date(currentTime);

        times.push({
            start: startTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            end: endTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        });

        if (i < count - 1) {
            currentTime.setMinutes(currentTime.getMinutes() + breakTime);
        }
    }
    return times;
};


const INITIAL_DATA: AppData = {
  schoolInfo: {
    name: "Benim Okulum",
    director: "Ahmet Yılmaz",
    year: "2024-2025",
    daysInWeek: 5,
    lessonDuration: 40,
    breakDuration: 10,
    lessonTimes: generateDefaultTimes(8, "09:00", 40, 10),
  },
  teachers: [],
  classes: [],
  classrooms: [],
  assignments: [],
};

// --- CONTEXTS ---
type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({
  theme: 'light',
  toggleTheme: () => {},
});

const DataContext = createContext<{ 
    data: AppData; 
    setData: React.Dispatch<React.SetStateAction<AppData>>;
    backups: DatabaseBackup[];
    isLoadingBackups: boolean;
    backupModalOpen: boolean;
    setBackupModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    saveBackup: (name: string) => Promise<void>;
    loadBackups: () => Promise<void>;
    restoreBackup: (backup: DatabaseBackup) => Promise<void>;
    deleteBackup: (backupId: string) => Promise<void>;
}>({
  data: INITIAL_DATA,
  setData: () => {},
  backups: [],
  isLoadingBackups: false,
  backupModalOpen: false,
  setBackupModalOpen: () => {},
  saveBackup: async () => {},
  loadBackups: async () => {},
  restoreBackup: async () => {},
  deleteBackup: async () => {},
});

// --- HOOKS ---
const useData = () => useContext(DataContext);
const useTheme = () => useContext(ThemeContext);

// Belirli bir gün için ders saatlerini getir
const getLessonTimesForDay = (schoolInfo: any, dayIndex: number) => {
    // Eğer o gün için özel ders saatleri varsa onu kullan
    if (schoolInfo.dailyLessonTimes && schoolInfo.dailyLessonTimes[dayIndex]) {
        return schoolInfo.dailyLessonTimes[dayIndex];
    }
    // Yoksa varsayılan ders saatlerini kullan
    return schoolInfo.lessonTimes || [];
};

const useLessonTimes = () => {
    const { data } = useData();
    const { lessonTimes } = data.schoolInfo;
    
    return useMemo(() => {
        if (!lessonTimes || lessonTimes.length === 0) {
            return [];
        }
        
        return lessonTimes.map((time, index) => ({
            index: index,
            start: time.start,
            end: time.end,
            label: `${time.start} - ${time.end}`
        }));
    }, [lessonTimes]);
};

// Güne özel ders saatleri hook'u
const useDayLessonTimes = (dayIndex: number) => {
    const { data } = useData();
    
    return useMemo(() => {
        const dayLessonTimes = getLessonTimesForDay(data.schoolInfo, dayIndex);
        if (!dayLessonTimes || dayLessonTimes.length === 0) {
            return [];
        }
        
        return dayLessonTimes.map((time, index) => ({
            index: index,
            start: time.start,
            end: time.end,
            label: `${time.start} - ${time.end}`
        }));
    }, [data.schoolInfo, dayIndex]);
};

// Tüm günler için ders saatleri hook'u
const useAllDayLessonTimes = () => {
    const { data } = useData();
    
    return useMemo(() => {
        const allDayTimes: { [dayIndex: number]: any[] } = {};
        
        for (let dayIndex = 0; dayIndex < data.schoolInfo.daysInWeek; dayIndex++) {
            const dayLessonTimes = getLessonTimesForDay(data.schoolInfo, dayIndex);
            allDayTimes[dayIndex] = dayLessonTimes || [];
        }
        
        return allDayTimes;
    }, [data.schoolInfo]);
};


// --- PROVIDERS ---
const ThemeProvider: FC<{children: ReactNode}> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(localStorage.getItem('theme') as Theme || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

const DataProvider: FC<{children: ReactNode}> = ({ children }) => {
    const [data, setData] = useState<AppData>(() => {
        try {
            const item = window.localStorage.getItem('appData');
            let parsed = item ? JSON.parse(item) : INITIAL_DATA;

            // Migration logic from old data structure
            if (parsed.lessons && Array.isArray(parsed.lessons)) {
                console.log("Migrating lesson data to new format...");
                const lessonMap = new Map(parsed.lessons.map((l: any) => [l.id, l.name]));

                if (parsed.teachers && parsed.teachers.length > 0 && parsed.teachers[0].lessons === undefined) {
                  parsed.teachers = parsed.teachers.map((t: any) => ({...t, lessons: []}));
                }

                if (parsed.assignments && parsed.assignments.length > 0 && parsed.assignments[0].lessonId) {
                  parsed.assignments = parsed.assignments.map((a: any) => {
                      const newA = {...a};
                      if (newA.lessonId) {
                          newA.lessonName = lessonMap.get(newA.lessonId) || 'Bilinmeyen Ders';
                          delete newA.lessonId;
                      }
                      return newA;
                  });
                }
                delete parsed.lessons;
            }
            
            if (parsed.classes && parsed.classes.length > 0 && parsed.classes[0].curriculum === undefined) {
                console.log("Adding curriculum to classes...");
                parsed.classes = parsed.classes.map((c: any) => ({...c, curriculum: []}));
            }
            
            if (parsed.classes && parsed.classes.length > 0 && parsed.classes[0].startHour === undefined) {
                console.log("Adding start/end hours to classes...");
                const lessonsPerDay = parsed.schoolInfo?.lessonsPerDay || 8;
                parsed.classes = parsed.classes.map((c: any) => ({
                    ...c,
                    startHour: 0,
                    endHour: lessonsPerDay > 0 ? lessonsPerDay - 1 : 0
                }));
            }
            
            // New migration for lessonTimes
            if (parsed.schoolInfo && parsed.schoolInfo.lessonsPerDay && !parsed.schoolInfo.lessonTimes) {
                console.log("Migrating schoolInfo to use lessonTimes...");
                const { lessonsPerDay, schoolStartTime, lessonDuration, breakDuration } = parsed.schoolInfo;
                
                parsed.schoolInfo.lessonTimes = generateDefaultTimes(
                    lessonsPerDay || 8,
                    schoolStartTime || "09:00",
                    lessonDuration || 40,
                    breakDuration || 10
                );
            
                delete parsed.schoolInfo.lessonsPerDay;
                delete parsed.schoolInfo.schoolStartTime;
                delete parsed.schoolInfo.lessonDuration;
                delete parsed.schoolInfo.breakDuration;
            }
            
            // Fallback if lessonTimes is missing
            if (parsed.schoolInfo && !parsed.schoolInfo.lessonTimes) {
                parsed.schoolInfo.lessonTimes = generateDefaultTimes(8, "09:00", 40, 10);
            }

            return { ...INITIAL_DATA, ...parsed };
        } catch (e) {
            console.error("Error initializing data from localStorage:", e);
            return INITIAL_DATA;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem('appData', JSON.stringify(data));
        } catch (e) {
            console.error("Error saving data to localStorage:", e);
        }
    }, [data]);

    // Yedekleme sistemi state'leri
    const [backups, setBackups] = useState<DatabaseBackup[]>([]);
    const [isLoadingBackups, setIsLoadingBackups] = useState(false);
    const [backupModalOpen, setBackupModalOpen] = useState(false);

    // Yedekleme fonksiyonları
    const saveBackup = async (name: string) => {
        try {
            setIsLoadingBackups(true);
            const { data: savedBackup, error } = await supabase
                .from('program_backups')
                .insert({
                    name: name,
                    data: data,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            alert('✅ Yedek başarıyla kaydedildi!');
            loadBackups(); // Yedekler listesini yenile
        } catch (error) {
            console.error('Yedekleme hatası:', error);
            alert('❌ Yedekleme başarısız: ' + (error as Error).message);
        } finally {
            setIsLoadingBackups(false);
        }
    };

    const loadBackups = async () => {
        try {
            setIsLoadingBackups(true);
            const { data: backupData, error } = await supabase
                .from('program_backups')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setBackups(backupData || []);
        } catch (error) {
            console.error('Yedekler yükleme hatası:', error);
        } finally {
            setIsLoadingBackups(false);
        }
    };

    const restoreBackup = async (backup: DatabaseBackup) => {
        try {
            if (confirm(`"${backup.name}" yedeğini geri yüklemek istediğinize emin misiniz? Mevcut veriler kaybolacak!`)) {
                setData(backup.data);
                alert('✅ Yedek başarıyla geri yüklendi!');
                setBackupModalOpen(false);
            }
        } catch (error) {
            console.error('Geri yükleme hatası:', error);
            alert('❌ Geri yükleme başarısız: ' + (error as Error).message);
        }
    };

    const deleteBackup = async (backupId: string) => {
        try {
            if (confirm('Bu yedeği silmek istediğinize emin misiniz?')) {
                const { error } = await supabase
                    .from('program_backups')
                    .delete()
                    .eq('id', backupId);

                if (error) throw error;

                alert('✅ Yedek başarıyla silindi!');
                loadBackups(); // Listeyi yenile
            }
        } catch (error) {
            console.error('Silme hatası:', error);
            alert('❌ Silme başarısız: ' + (error as Error).message);
        }
    };

    // Component mount olduğunda yedekleri yükle
    useEffect(() => {
        loadBackups();
    }, []);

    return <DataContext.Provider value={{ 
        data, 
        setData, 
        backups, 
        isLoadingBackups, 
        backupModalOpen, 
        setBackupModalOpen, 
        saveBackup, 
        loadBackups, 
        restoreBackup, 
        deleteBackup 
    }}>{children}</DataContext.Provider>;
};

// --- ICON COMPONENT ---
interface IconProps extends React.SVGProps<SVGSVGElement> {
    icon: string;
}
const Icon: FC<IconProps> = ({ icon, ...props }) => {
    const icons: {[key: string]: ReactNode} = {
        sun: <path d="M12 1v2m-6.36 1.64l1.41 1.41M1 12h2m1.64 6.36l1.41-1.41M12 21v2m6.36-1.64l-1.41-1.41M21 12h-2m-1.64-6.36l-1.41 1.41M12 12a5 5 0 1 1-5-5 5 5 0 0 1 5 5z" />,
        moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
        menu: <path d="M3 12h18M3 6h18M3 18h18" />,
        x: <path d="M18 6L6 18M6 6l12 12" />,
        home: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
        info: <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />,
        users: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 0v2a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4v-2a4 4 0 0 0-4-4h-2a4 4 0 0 0-4 4z" />,
        class: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
        school: <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
        clipboard: <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m4 0V2a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m6 0h-4" />,
        chart: <path d="M12 20V10M18 20V4M6 20V16" />,
        save: <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" />,
        refresh: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
        plus: <path d="M12 5v14m-7-7h14" />,
        trash: <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
        edit: <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7m-5-6l-6.13 6.13a2 2 0 0 0-.57 1.21l-1 4.88a1 1 0 0 0 1.18 1.18l4.88-1a2 2 0 0 0 1.21-.57L16 9m-5 6h.01" />,
        download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7l-5-5-5 5m5-5v12" />,
        upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7l-5 5-5-5m5 5V3" />,
        zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>,
        'chevron-left': <path d="m15 18-6-6 6-6" />,
        'chevron-right': <path d="m9 18 6-6-6-6" />,
    };

    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            {icons[icon]}
        </svg>
    );
};


// --- COMMON COMPONENTS ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    children: ReactNode;
}
const Button: FC<ButtonProps> = ({ children, variant = 'primary', ...props }) => {
    const baseClasses = "px-4 py-2 rounded-lg font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };
    return (
        <button className={`${baseClasses} ${variantClasses[variant]}`} {...props}>
            {children}
        </button>
    );
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: string;
    label: string;
}
const IconButton: FC<IconButtonProps> = ({ icon, label, ...props }) => (
    <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label={label} {...props}>
        <Icon icon={icon} className="w-6 h-6" />
    </button>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}
const Input: FC<InputProps> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...props}
        />
    </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    children: ReactNode;
}
const Select: FC<SelectProps> = ({ label, children, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            {...props}
        >
            {children}
        </select>
    </div>
);

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}
const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: -20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: -20 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
                            <IconButton icon="x" label="Close" onClick={onClose} />
                        </div>
                        {children}
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

const Card: FC<{children: ReactNode, className?: string}> = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 ${className}`}>
        {children}
    </div>
);

// --- LAYOUT COMPONENTS ---
const Sidebar: FC<{ 
    isMobileOpen: boolean; 
    setMobileOpen: (open: boolean) => void;
    isCollapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}> = ({ isMobileOpen, setMobileOpen, isCollapsed, setCollapsed }) => {
    const navItems = [
        { path: '/', label: 'Anasayfa', icon: 'home' },
        { path: '/info', label: 'Genel Bilgiler', icon: 'info' },
        { path: '/teachers', label: 'Öğretmenler', icon: 'users' },
        { path: '/classes', label: 'Sınıflar', icon: 'class' },
        { path: '/classrooms', label: 'Derslikler', icon: 'school' },
        { path: '/assignments', label: 'Ders Atama', icon: 'clipboard' },
        { path: '/reports', label: 'Raporlar', icon: 'chart' },
    ];

    const NavItem: FC<{ path: string; label: string; icon: string; onClick: () => void }> = ({ path, label, icon, onClick }) => (
        <NavLink
            to={path}
            onClick={onClick}
            className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center' : 'gap-4'} px-4 py-3 rounded-lg text-lg transition-colors ${
                    isActive
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`
            }
            title={isCollapsed ? label : undefined}
        >
            <Icon icon={icon} className="w-6 h-6" />
            {!isCollapsed && <span>{label}</span>}
        </NavLink>
    );

    return (
        <>
            <aside className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 ${isMobileOpen ? 'w-64' : isCollapsed ? 'w-16' : 'w-64'} shadow-lg z-30 transform transition-all duration-300 md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className={`p-6 border-b border-gray-200 dark:border-gray-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isCollapsed && <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Ders Planlama</h1>}
                    <button
                        onClick={() => setCollapsed(!isCollapsed)}
                        className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title={isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
                    >
                        <Icon icon={isCollapsed ? 'chevron-right' : 'chevron-left'} className="w-4 h-4" />
                    </button>
                </div>
                <nav className="p-4 flex flex-col gap-2">
                    {navItems.map(item => <NavItem key={item.path} {...item} onClick={() => setMobileOpen(false)} />)}
                </nav>
            </aside>
            {isMobileOpen && <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setMobileOpen(false)}></div>}
        </>
    );
};

const Header: FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
    const { theme, toggleTheme } = useTheme();
    const { data, setData, setBackupModalOpen } = useData();
    const location = useLocation();

    const pageTitles: {[key: string]: string} = {
        '/': 'Anasayfa',
        '/info': 'Genel Bilgiler',
        '/teachers': 'Öğretmen Yönetimi',
        '/classes': 'Sınıf Yönetimi',
        '/classrooms': 'Derslik Yönetimi',
        '/assignments': 'Ders Atama Ekranı',
        '/reports': 'Raporlama',
    };

    const handleReset = () => {
        if (window.confirm("Tüm verileri silip programı sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
            setData(INITIAL_DATA);
            alert("Uygulama başarıyla sıfırlandı.");
        }
    };
    
    return (
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10 p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="md:hidden p-2">
                    <Icon icon="menu" className="w-6 h-6" />
                </button>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{pageTitles[location.pathname] || 'Ders Planlama'}</h2>
            </div>
            <div className="flex items-center gap-4">
                <Button onClick={() => setBackupModalOpen(true)} variant="secondary">
                    <Icon icon="database" className="w-5 h-5" />
                    <span className="hidden sm:inline">Yedekle</span>
                </Button>
                <Button onClick={handleReset} variant="danger">
                    <Icon icon="refresh" className="w-5 h-5" />
                    <span className="hidden sm:inline">Yeniden Başlat</span>
                </Button>
                <IconButton
                    icon={theme === 'dark' ? 'sun' : 'moon'}
                    label="Toggle Theme"
                    onClick={toggleTheme}
                />
            </div>
        </header>
    );
};


// --- SPECIALIZED COMPONENTS ---
interface AvailabilityGridProps {
    availability: Availability;
    onAvailabilityChange: (newAvailability: Availability) => void;
    days: number;
    hours: number;
    lessonTimes: { index: number; start: string; end: string; label: string}[];
    dayLessonTimes?: { [dayIndex: number]: any[] }; // Her günün ders saatleri
}
const AvailabilityGrid: FC<AvailabilityGridProps> = ({ availability, onAvailabilityChange, days, hours, lessonTimes, dayLessonTimes = {} }) => {
    const cycleStatus = (currentStatus?: AvailabilityStatus): AvailabilityStatus => {
        const statuses = [AvailabilityStatus.AVAILABLE, AvailabilityStatus.PREFERRED, AvailabilityStatus.UNAVAILABLE];
        if (!currentStatus) return statuses[1];
        const currentIndex = statuses.indexOf(currentStatus);
        return statuses[(currentIndex + 1) % statuses.length];
    };

    const handleCellClick = (dayIndex: number, hourIndex: number) => {
        const newAvailability = { ...availability };
        if (!newAvailability[dayIndex]) {
            newAvailability[dayIndex] = {};
        }
        const currentStatus = newAvailability[dayIndex][hourIndex];
        newAvailability[dayIndex][hourIndex] = cycleStatus(currentStatus);
        onAvailabilityChange(newAvailability);
    };

    // Gün başlığına tıklayınca o günün tüm saatlerini değiştir
    const handleDayClick = (dayIndex: number) => {
        const newAvailability = { ...availability };
        if (!newAvailability[dayIndex]) {
            newAvailability[dayIndex] = {};
        }
        
        // Bu günün ders sayısını al - eğer dayLessonTimes yoksa hours'ı kullan
        const dayLessons = dayLessonTimes?.[dayIndex] || [];
        const dayHours = dayLessons.length > 0 ? dayLessons.length : hours;
        
        // O gündeki tüm saatlerin mevcut durumunu kontrol et
        const dayStatuses = Array.from({ length: dayHours }).map((_, hourIndex) => 
            newAvailability[dayIndex][hourIndex] || AvailabilityStatus.AVAILABLE
        );
        
        // En yaygın durumu bul veya ilk durumu al
        const mostCommonStatus = dayStatuses[0] || AvailabilityStatus.AVAILABLE;
        const nextStatus = cycleStatus(mostCommonStatus);
        
        // Sadece bu günün ders saatlerini güncelle
        for (let hourIndex = 0; hourIndex < dayHours; hourIndex++) {
            newAvailability[dayIndex][hourIndex] = nextStatus;
        }
        
        onAvailabilityChange(newAvailability);
    };

    // Saat başlığına tıklayınca o saatin tüm günlerini değiştir
    const handleHourClick = (hourIndex: number) => {
        const newAvailability = { ...availability };
        
        // O saatteki sadece mevcut olan günlerin durumunu kontrol et
        const hourStatuses = Array.from({ length: days })
            .map((_, dayIndex) => {
                const dayLessons = dayLessonTimes?.[dayIndex] || [];
                const dayHours = dayLessons.length > 0 ? dayLessons.length : hours;
                // Bu günde bu saat varsa durumunu al
                return hourIndex < dayHours ? 
                    (newAvailability[dayIndex]?.[hourIndex] || AvailabilityStatus.AVAILABLE) : null;
            })
            .filter(status => status !== null);
        
        if (hourStatuses.length === 0) return; // Hiçbir günde bu saat yoksa işlem yapma
        
        // En yaygın durumu bul veya ilk durumu al
        const mostCommonStatus = hourStatuses[0] || AvailabilityStatus.AVAILABLE;
        const nextStatus = cycleStatus(mostCommonStatus);
        
        // Sadece bu saati olan günleri güncelle
        for (let dayIndex = 0; dayIndex < days; dayIndex++) {
            const dayLessons = dayLessonTimes?.[dayIndex] || [];
            const dayHours = dayLessons.length > 0 ? dayLessons.length : hours;
            
            if (hourIndex < dayHours) {
                if (!newAvailability[dayIndex]) {
                    newAvailability[dayIndex] = {};
                }
                newAvailability[dayIndex][hourIndex] = nextStatus;
            }
        }
        
        onAvailabilityChange(newAvailability);
    };



    return (
        <div className="overflow-x-auto">
            <div className="mb-4 space-y-2">
                <div className="flex gap-4 text-sm">
                    {Object.values(AvailabilityStatus).map(status => (
                         <div key={status} className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${AVAILABILITY_CONFIG[status].color}`}></div>
                            <span>{AVAILABILITY_CONFIG[status].text}</span>
                        </div>
                    ))}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    💡 <strong>İpucu:</strong> Gün başlıklarına tıklayarak tüm günü, saat başlıklarına tıklayarak tüm saati değiştirebilirsiniz.
                </div>
            </div>
            <table className="w-full border-collapse text-center text-sm">
                <thead>
                    <tr>
                        <th className="p-1 border dark:border-gray-600 w-8">
                        </th>
                        {Array.from({ length: days }).map((_, i) => (
                            <th 
                                key={i} 
                                className="p-1 border dark:border-gray-600 min-w-[80px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs"
                                onClick={() => handleDayClick(i)}
                                title={`${DAYS_OF_WEEK[i]} gününün tüm saatlerini değiştirmek için tıklayın`}
                            >
                                {DAYS_OF_WEEK[i]}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: Math.max(...Array.from({ length: days }, (_, dayIndex) => {
                        const dayLessons = dayLessonTimes?.[dayIndex] || [];
                        return dayLessons.length > 0 ? dayLessons.length : hours;
                    })) }).map((_, hourIndex) => (
                        <tr key={hourIndex}>
                            <td 
                                className="p-1 border dark:border-gray-600 w-8 text-xs text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                onClick={() => handleHourClick(hourIndex)}
                                title={`${hourIndex + 1}. ders saatinin tüm günlerini değiştirmek için tıklayın`}
                            >
                                {hourIndex + 1}
                            </td>
                            {Array.from({ length: days }).map((_, dayIndex) => {
                                // Bu günün ders saatleri - eğer dayLessonTimes yoksa hours'ı kullan
                                const dayLessons = dayLessonTimes?.[dayIndex] || [];
                                const dayHours = dayLessons.length > 0 ? dayLessons.length : hours;
                                
                                // Eğer bu saat dilimi bu günde yoksa boş hücre göster
                                if (hourIndex >= dayHours) {
                                    return <td key={dayIndex} className="p-1 border bg-gray-100 dark:bg-gray-700"></td>;
                                }
                                
                                const status = availability?.[dayIndex]?.[hourIndex] || AvailabilityStatus.AVAILABLE;
                                return (
                                    <td
                                        key={dayIndex}
                                        onClick={() => handleCellClick(dayIndex, hourIndex)}
                                        className={`p-1 border cursor-pointer transition-colors ${AVAILABILITY_CONFIG[status].color}`}
                                        title={AVAILABILITY_CONFIG[status].text}
                                    />
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


// --- PAGE COMPONENTS ---
const DashboardPage = () => {
    const { data } = useData();
    const statsData = [
        { name: 'Öğretmenler', count: data.teachers.length },
        { name: 'Sınıflar', count: data.classes.length },
        { name: 'Derslikler', count: data.classrooms.length },
    ];
    
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Hoş Geldiniz, {data.schoolInfo.director}!</h1>
            <p className="text-base text-gray-600 dark:text-gray-400">
                <b>{data.schoolInfo.name}</b> için <b>{data.schoolInfo.year}</b> eğitim yılı ders programını oluşturmaya başlayın.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statsData.map(item => (
                    <Card key={item.name} className="text-center">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{item.name}</h3>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{item.count}</p>
                    </Card>
                ))}
            </div>
             <Card>
                <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Varlıkların Dağılımı</h3>
                 <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={statsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: useTheme().theme === 'dark' ? '#374151' : '#ffffff',
                                    border: '1px solid #6b7280'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="count" fill="#3b82f6" name="Sayı"/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
};

const LessonTimeEditor: FC<{
    lessonTimes: LessonTime[];
    setLessonTimes: React.Dispatch<React.SetStateAction<LessonTime[]>>;
}> = ({ lessonTimes, setLessonTimes }) => {

    const handleTimeChange = (index: number, field: 'start' | 'end', value: string) => {
        const newTimes = [...lessonTimes];
        newTimes[index] = { ...newTimes[index], [field]: value };
        setLessonTimes(newTimes);
    };

    // Otomatik düzenleme için özel handler - Enter tuşuna basıldığında çalışır
    const handleTimeChangeWithAuto = (index: number, field: 'start' | 'end', value: string, event: React.KeyboardEvent) => {
        if (event.key === 'Enter' && value && field === 'end') {
            // Altındaki dersleri otomatik düzenle
            const newTimes = [...lessonTimes];
            newTimes[index] = { ...newTimes[index], [field]: value };
            
            // Bitiş saatinden itibaren altındaki dersleri düzenle
            const endTime = parseTime(value);
            if (endTime) {
                // 10 dakika teneffüs ekleyerek bir sonraki dersin başlangıcını hesapla
                let nextStartTime = addMinutes(endTime, 10);
                
                for (let i = index + 1; i < newTimes.length; i++) {
                    const currentDuration = newTimes[i].start && newTimes[i].end ? 
                        getTimeDifference(newTimes[i].start, newTimes[i].end) : 40; // Varsayılan 40 dakika
                    
                    newTimes[i].start = formatTime(nextStartTime);
                    const nextEndTime = addMinutes(nextStartTime, currentDuration);
                    newTimes[i].end = formatTime(nextEndTime);
                    
                    // Bir sonraki ders için 10 dakika teneffüs ekle
                    nextStartTime = addMinutes(nextEndTime, 10);
                }
            }
            
            setLessonTimes(newTimes);
        } else {
            // Normal değişiklik
            handleTimeChange(index, field, value);
        }
    };

    // Yardımcı fonksiyonlar
    const parseTime = (timeStr: string): Date | null => {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });
    };

    const addMinutes = (date: Date, minutes: number): Date => {
        return new Date(date.getTime() + minutes * 60000);
    };

    const getTimeDifference = (startTime: string, endTime: string): number => {
        const start = parseTime(startTime);
        const end = parseTime(endTime);
        if (!start || !end) return 40; // Varsayılan
        return Math.round((end.getTime() - start.getTime()) / 60000);
    };

    const addLessonTime = () => {
        setLessonTimes([...lessonTimes, { start: '', end: '' }]);
    };
    
    const removeLessonTime = (index: number) => {
        if (window.confirm("Bu ders saatini silmek istediğinizden emin misiniz?")) {
            setLessonTimes(lessonTimes.filter((_, i) => i !== index));
        }
    };
    
    return (
        <div>
            <h3 className="text-base font-semibold mb-3">Ders Saatleri (Toplam: {lessonTimes.length} ders)</h3>
            <div className="space-y-3">
              {lessonTimes.map((time, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                  <span className="font-bold w-12 text-center text-gray-600 dark:text-gray-400">{index + 1}.</span>
                  <Input 
                    label="Başlangıç Saati" 
                    type="time" 
                    value={time.start} 
                    onChange={e => handleTimeChange(index, 'start', e.target.value)}
                    onKeyDown={e => handleTimeChangeWithAuto(index, 'start', e.currentTarget.value, e)}
                  />
                  <Input 
                    label="Bitiş Saati" 
                    type="time" 
                    value={time.end} 
                    onChange={e => handleTimeChange(index, 'end', e.target.value)}
                    onKeyDown={e => handleTimeChangeWithAuto(index, 'end', e.currentTarget.value, e)}
                  />
                  <IconButton icon="trash" label="Sil" onClick={() => removeLessonTime(index)} className="text-red-500 self-end mb-1" />
                </div>
              ))}
            </div>
            <Button onClick={addLessonTime} variant="secondary" className="mt-4">
                <Icon icon="plus" className="w-5 h-5"/> Yeni Ders Saati Ekle
            </Button>
          </div>
    );
};

// Günlük ders saatleri editörü
const DailyLessonTimeEditor: FC<{
    schoolInfo: any;
    setSchoolInfo: React.Dispatch<React.SetStateAction<any>>;
}> = ({ schoolInfo, setSchoolInfo }) => {
    const DAYS_OF_WEEK = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    
    const getDayLessonTimes = (dayIndex: number): LessonTime[] => {
        if (schoolInfo.dailyLessonTimes && schoolInfo.dailyLessonTimes[dayIndex]) {
            return schoolInfo.dailyLessonTimes[dayIndex];
        }
        return [...schoolInfo.lessonTimes]; // Varsayılan saatlerin kopyası
    };
    
    const setDayLessonTimes = (dayIndex: number, times: LessonTime[]) => {
        setSchoolInfo(prev => ({
            ...prev,
            dailyLessonTimes: {
                ...prev.dailyLessonTimes,
                [dayIndex]: times
            }
        }));
    };
    
    const removeDayLessonTimes = (dayIndex: number) => {
        if (schoolInfo.dailyLessonTimes && schoolInfo.dailyLessonTimes[dayIndex]) {
            const newDailyTimes = { ...schoolInfo.dailyLessonTimes };
            delete newDailyTimes[dayIndex];
            setSchoolInfo(prev => ({
                ...prev,
                dailyLessonTimes: newDailyTimes
            }));
        }
    };
    
    const copyFromDefault = (dayIndex: number) => {
        // Okul ayarlarından varsayılan süreleri kullanarak yeni program oluştur
        const lessonCount = schoolInfo.lessonTimes.length || 8;
        const startTime = schoolInfo.lessonTimes.length > 0 ? schoolInfo.lessonTimes[0].start : "09:00";
        const duration = schoolInfo.lessonDuration || 40;
        const breakTime = schoolInfo.breakDuration || 10;
        
        const newTimes = generateDefaultTimes(lessonCount, startTime, duration, breakTime);
        setDayLessonTimes(dayIndex, newTimes);
    };
    
    const hasCustomTimes = (dayIndex: number) => {
        return schoolInfo.dailyLessonTimes && schoolInfo.dailyLessonTimes[dayIndex];
    };
    
    return (
        <div className="space-y-4">
            {/* Günler listesi */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {Array.from({ length: schoolInfo.daysInWeek }, (_, dayIndex) => (
                    <div key={dayIndex} className="space-y-2">
                        <button
                            onClick={() => setSelectedDay(selectedDay === dayIndex ? null : dayIndex)}
                            className={`w-full p-3 rounded-lg border-2 transition-all ${
                                hasCustomTimes(dayIndex)
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                    : selectedDay === dayIndex
                                        ? 'border-gray-400 bg-gray-100 dark:bg-gray-700'
                                        : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
                            }`}
                        >
                            <div className="text-sm font-medium">{DAYS_OF_WEEK[dayIndex]}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {hasCustomTimes(dayIndex) ? 'Özel' : 'Varsayılan'}
                            </div>
                        </button>
                        
                        {hasCustomTimes(dayIndex) && (
                            <Button
                                variant="danger"
                                onClick={() => {
                                    if (window.confirm(`${DAYS_OF_WEEK[dayIndex]} günü için özel ders saatlerini kaldırmak istediğinizden emin misiniz?`)) {
                                        removeDayLessonTimes(dayIndex);
                                        if (selectedDay === dayIndex) setSelectedDay(null);
                                    }
                                }}
                                className="w-full text-xs py-1"
                            >
                                Özel Saatleri Kaldır
                            </Button>
                        )}
                    </div>
                ))}
            </div>
            
            {/* Seçili gün düzenleyicisi */}
            {selectedDay !== null && (
                <Card className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold">
                            {DAYS_OF_WEEK[selectedDay]} Günü Ders Saatleri
                        </h4>
                        {!hasCustomTimes(selectedDay) && (
                            <Button
                                onClick={() => copyFromDefault(selectedDay)}
                                variant="secondary"
                            >
                                <Icon icon="copy" className="w-4 h-4"/> Ders Programı Oluştur
                            </Button>
                        )}
                    </div>
                    
                    {hasCustomTimes(selectedDay) ? (
                        <LessonTimeEditor
                            lessonTimes={getDayLessonTimes(selectedDay)}
                            setLessonTimes={(times) => setDayLessonTimes(selectedDay, times)}
                        />
                    ) : (
                        <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                            <Icon icon="calendar" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="mb-2">Bu gün için henüz ders saatleri ayarlanmamış</p>
                            <p className="text-sm">Ders programı oluşturmak için "Ders Programı Oluştur" butonuna tıklayın</p>
                        </div>
                    )}
                </Card>
            )}
            
            {selectedDay === null && (
                <div className="text-center p-6 text-gray-500 dark:text-gray-400">
                    <Icon icon="clock" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Düzenlemek istediğiniz günü seçin</p>
                </div>
            )}
        </div>
    );
};

const GeneralInfoPage = () => {
    const { data, setData } = useData();
    const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(data.schoolInfo);

    const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setSchoolInfo(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
    };

    const handleSave = () => {
        setData(prev => ({...prev, schoolInfo }));
        alert("Genel bilgiler kaydedildi!");
    };
    
    return (
        <Card>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Okul Adı" name="name" value={schoolInfo.name} onChange={handleInfoChange} />
                  <Input label="Müdür Adı" name="director" value={schoolInfo.director} onChange={handleInfoChange} />
                  <Input label="Eğitim Yılı" name="year" value={schoolInfo.year} onChange={handleInfoChange} />
                  <Input label="Haftalık Gün Sayısı" name="daysInWeek" type="number" min="1" max="7" value={schoolInfo.daysInWeek} onChange={handleInfoChange} />
                  <Input label="Ders Süresi (dk)" name="lessonDuration" type="number" min="1" value={schoolInfo.lessonDuration || 40} onChange={handleInfoChange} />
                  <Input label="Teneffüs Süresi (dk)" name="breakDuration" type="number" min="0" value={schoolInfo.breakDuration || 10} onChange={handleInfoChange} />
                </div>
                
                <div className="pt-4 border-t dark:border-gray-600">
                    <h3 className="text-lg font-semibold mb-4">Ders Saatleri</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Her gün için ders saatlerini ayarlayın. Günleri seçerek farklı saatler belirleyebilirsiniz.
                    </p>
                    <DailyLessonTimeEditor 
                        schoolInfo={schoolInfo}
                        setSchoolInfo={setSchoolInfo}
                    />
                </div>

                <div className="pt-6 border-t dark:border-gray-600">
                    <Button onClick={handleSave}>
                       <Icon icon="save" className="w-5 h-5"/> Değişiklikleri Kaydet
                    </Button>
                </div>
            </div>
        </Card>
    );
};


// Generic CRUD Page Component
interface CrudPageProps<T extends { id: string; name: string; availability: Availability; }> {
    title: string;
    itemType: keyof Omit<AppData, 'schoolInfo' | 'assignments'>;
    formFields: (item: Partial<T>, onChange: (updates: Partial<T>) => void) => ReactNode;
    createItem: (item: Partial<T>) => T;
    displayInfo?: (item: T) => ReactNode;
}

const CrudPage = <T extends { id: string; name: string; availability: Availability; }>({ title, itemType, formFields, createItem, displayInfo }: CrudPageProps<T>) => {
    const { data, setData } = useData();
    const dayLessonTimes = useAllDayLessonTimes();
    
    // Tüm günlerdeki maksimum ders sayısını bul
    const maxHours = Math.max(...Array.from({ length: data.schoolInfo.daysInWeek }, (_, dayIndex) => 
        dayLessonTimes[dayIndex]?.length || 0
    ), data.schoolInfo.lessonTimes.length);
    
    // Uygunluk tablosu için basit etiketler oluştur
    const availabilityLessonTimes = Array.from({ length: maxHours }, (_, index) => ({
        index,
        start: '',
        end: '',
        label: `${index + 1}. Ders`
    }));
    const lessonTimes = useLessonTimes();
    const items = data[itemType] as T[];
    
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<T> | null>(null);

    const handleOpenModal = (item: Partial<T> | null = null) => {
        setEditingItem(item || {});
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingItem(null);
        setModalOpen(false);
    };

    const handleSave = (itemData: Partial<T>) => {
        setData(prevData => {
            const currentItems = prevData[itemType] as T[];
            let newItems;
            if ('id' in itemData && itemData.id) {
                newItems = currentItems.map(item => item.id === itemData.id ? { ...item, ...itemData } as T : item);
            } else {
                const newItem = createItem(itemData);
                newItems = [...currentItems, newItem];
            }
            return { ...prevData, [itemType]: newItems };
        });
        handleCloseModal();
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Bu öğeyi silmek istediğinizden emin misiniz?")) {
            setData(prevData => ({
                ...prevData,
                [itemType]: (prevData[itemType] as T[]).filter(item => item.id !== id),
            }));
        }
    };
    
    const [formData, setFormData] = useState<Partial<T>>({});

    useEffect(() => {
        setFormData(editingItem || {});
    }, [editingItem]);

    const handleFormChange = (updates: Partial<T>) => {
        setFormData(prev => ({...prev, ...updates}));
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">{title}</h1>
                <Button onClick={() => handleOpenModal()}>
                    <Icon icon="plus" className="w-5 h-5" /> Yeni Ekle
                </Button>
            </div>
            <Card>
                {items.length > 0 ? (
                    <div className="space-y-4">
                        {items.map(item => (
                            <div key={item.id} className="p-4 rounded-lg bg-gray-100 dark:bg-gray-700 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-lg">{item.name}</p>
                                    {displayInfo ? displayInfo(item) : ('code' in item && <p className="text-sm text-gray-500 dark:text-gray-400">Kod: {(item as any).code}</p>)}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="secondary" onClick={() => handleOpenModal(item)}><Icon icon="edit" className="w-5 h-5"/> Düzenle</Button>
                                    <Button variant="danger" onClick={() => handleDelete(item.id)}><Icon icon="trash" className="w-5 h-5" /> Sil</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">Henüz hiç öğe eklenmemiş.</p>
                )}
            </Card>
            
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingItem?.id ? "Öğeyi Düzenle" : "Yeni Öğey Ekle"}>
                <div className="space-y-4">
                    {formFields(formData, handleFormChange)}
                    <h3 className="text-base font-semibold mt-6 mb-2">Uygunluk Takvimi</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Bu varlığın (öğretmen, sınıf vb.) ders yapılamayacak zamanlarını işaretleyebilirsiniz.<br/>
                        <strong>Hücreye tıklayın:</strong> O saatin durumunu değiştirir.<br/>
                        <strong>Gün başlığına tıklayın:</strong> O günün tüm saatlerini değiştirir.<br/>
                        <strong>Saat başlığına tıklayın:</strong> O saatin tüm günlerini değiştirir.
                    </p>
                    <AvailabilityGrid
                        availability={formData.availability || {}}
                        onAvailabilityChange={(av) => handleFormChange({ availability: av } as Partial<T>)}
                        days={data.schoolInfo.daysInWeek}
                        hours={maxHours}
                        lessonTimes={availabilityLessonTimes}
                        dayLessonTimes={dayLessonTimes}
                    />
                    <div className="flex justify-end gap-4 pt-4">
                        <Button variant="secondary" onClick={handleCloseModal}>İptal</Button>
                        <Button onClick={() => handleSave(formData)}>Kaydet</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// Component to manage lessons for a teacher
const LessonManager: FC<{ lessons: string[], onChange: (lessons: string[]) => void }> = ({ lessons, onChange }) => {
    const [newLesson, setNewLesson] = useState('');
    const handleAdd = () => {
        if (newLesson.trim() && !lessons.includes(newLesson.trim())) {
            onChange([...lessons, newLesson.trim()]);
            setNewLesson('');
        }
    };
    const handleRemove = (lessonToRemove: string) => {
        onChange(lessons.filter(l => l !== lessonToRemove));
    };

    return (
        <div className="space-y-3 pt-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Verdiği Dersler</label>
            <div className="flex gap-2">
                <input
                    value={newLesson}
                    onChange={e => setNewLesson(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                    placeholder="Yeni ders adı ekle..."
                    className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="button" variant="secondary" onClick={handleAdd}>Ekle</Button>
            </div>
             {lessons.length > 0 && (
                <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {lessons.map(lesson => (
                        <li key={lesson} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm">
                            <span>{lesson}</span>
                            <button type="button" onClick={() => handleRemove(lesson)} className="p-1 text-red-500 hover:text-red-700">
                                <Icon icon="trash" className="w-4 h-4" />
                             </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const CurriculumManager: FC<{ curriculum: CurriculumItem[], onChange: (curriculum: CurriculumItem[]) => void, teachers: Teacher[] }> = ({ curriculum, onChange, teachers }) => {
    const [newItem, setNewItem] = useState<{ teacherId: string, lessonName: string, hours: number }>({ teacherId: '', lessonName: '', hours: 1 });
    const selectedTeacher = useMemo(() => teachers.find(t => t.id === newItem.teacherId), [teachers, newItem.teacherId]);

    const handleAdd = () => {
        if (!newItem.teacherId || !newItem.lessonName || newItem.hours < 1) {
            alert("Lütfen öğretmen, ders ve geçerli bir saat sayısı seçin.");
            return;
        }
        onChange([...curriculum, { ...newItem, id: generateId() }]);
        setNewItem({ teacherId: '', lessonName: '', hours: 1 });
    };

    const handleRemove = (id: string) => {
        onChange(curriculum.filter(item => item.id !== id));
    };

    return (
        <div className="space-y-4 pt-4 border-t dark:border-gray-600">
             <h3 className="text-base font-semibold">Müfredat (Haftalık Ders Gereksinimleri)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="md:col-span-1">
                    <Select label="Öğretmen" value={newItem.teacherId} onChange={e => setNewItem({ ...newItem, teacherId: e.target.value, lessonName: '' })}>
                        <option value="">Seçiniz</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                </div>
                <div className="md:col-span-1">
                    <Select label="Ders" value={newItem.lessonName} onChange={e => setNewItem({ ...newItem, lessonName: e.target.value })} disabled={!newItem.teacherId}>
                        <option value="">Önce Öğretmen Seçin</option>
                        {selectedTeacher?.lessons.map(l => <option key={l} value={l}>{l}</option>)}
                    </Select>
                </div>
                <div className="md:col-span-1">
                     <Input label="Haftalık Saat" type="number" min="1" value={newItem.hours} onChange={e => setNewItem({ ...newItem, hours: parseInt(e.target.value) || 1 })} />
                </div>
                <Button onClick={handleAdd}><Icon icon="plus" /> Ekle</Button>
            </div>
            {curriculum.length > 0 && (
                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {curriculum.map(item => (
                        <li key={item.id} className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                            <div>
                                <p className="font-semibold">{item.lessonName} <span className="font-normal text-sm">({item.hours} saat/hafta)</span></p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{teachers.find(t => t.id === item.teacherId)?.name || 'Bilinmeyen Öğretmen'}</p>
                            </div>
                            <IconButton icon="trash" label="Sil" onClick={() => handleRemove(item.id)} className="text-red-500"/>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


// Instantiations of CrudPage
const TeachersPage = () => (
    <CrudPage<Teacher>
        title="Öğretmenler"
        itemType="teachers"
        createItem={(item) => ({ id: generateId(), availability: {}, name: '', code: '', lessons: [], ...item } as Teacher)}
        formFields={(item, onChange) => (
            <>
                <Input label="Ad Soyad" value={item.name || ''} onChange={e => onChange({ name: e.target.value })} />
                <Input label="Kısa Kod" value={item.code || ''} onChange={e => onChange({ code: e.target.value })} />
                <LessonManager lessons={item.lessons || []} onChange={lessons => onChange({ lessons })} />
            </>
        )}
        displayInfo={item => (
            <>
                <p className="text-sm text-gray-500 dark:text-gray-400">Kod: {item.code}</p>
                {item.lessons && item.lessons.length > 0 &&
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs">
                        Dersler: {item.lessons.join(', ')}
                    </p>
                }
            </>
        )}
    />
);

const ClassesPage = () => {
    const { data } = useData();
    const lessonTimes = useLessonTimes();
    
    return (
    <CrudPage<ClassData>
        title="Sınıflar"
        itemType="classes"
        createItem={(item) => ({ 
            id: generateId(), 
            availability: {}, 
            name: '', 
            level: '', 
            curriculum: [], 
            ...item 
        } as ClassData)}
        formFields={(item, onChange) => {
            return (
                <>
                    <Input label="Sınıf Adı" value={item.name || ''} onChange={e => onChange({ name: e.target.value })} />
                    <Input label="Seviye" value={item.level || ''} onChange={e => onChange({ level: e.target.value })} />
                    <CurriculumManager 
                        curriculum={(item as ClassData).curriculum || []} 
                        onChange={curriculum => onChange({ curriculum } as Partial<ClassData>)}
                        teachers={data.teachers}
                    />
                </>
            );
        }}
        displayInfo={item => {
            const totalHours = item.curriculum.reduce((sum, curr) => sum + curr.hours, 0);
            const start = lessonTimes[item.startHour ?? 0]?.label || '';
            const end = lessonTimes[item.endHour ?? (data.schoolInfo.lessonTimes.length > 0 ? data.schoolInfo.lessonTimes.length - 1 : 0)]?.label || '';

            return (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>Seviye: {item.level}</p>
                    <p>Aktif Saatler: {start.split(' - ')[0]} - {end.split(' - ')[1]}</p>
                    {totalHours > 0 && <p>Müfredat: {item.curriculum.length} ders, {totalHours} saat/hafta</p>}
                </div>
            );
        }}
    />
)};

const ClassroomsPage = () => (
    <CrudPage<Classroom>
        title="Derslikler"
        itemType="classrooms"
        createItem={(item) => ({ id: generateId(), availability: {}, name: '', capacity: 0, ...item } as Classroom)}
        formFields={(item, onChange) => (
            <>
                <Input label="Derslik Adı" value={item.name || ''} onChange={e => onChange({ name: e.target.value })} />
                <Input label="Kapasite" type="number" value={item.capacity || 0} onChange={e => onChange({ capacity: parseInt(e.target.value) || 0 })} />
            </>
        )}
        displayInfo={item => <p className="text-sm text-gray-500 dark:text-gray-400">Kapasite: {item.capacity}</p>}
    />
);

const AssignmentsPage = () => {
    const { data, setData } = useData();
    const lessonTimes = useLessonTimes();
    const dayLessonTimes = useAllDayLessonTimes();
    const [isManualAssignModalOpen, setManualAssignModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ day: number; hour: number } | null>(null);
    const [assignmentForm, setAssignmentForm] = useState<Partial<Omit<Assignment, 'id'>>>({});

    const [isResultModalOpen, setResultModalOpen] = useState(false);
    const [assignmentResult, setAssignmentResult] = useState<{ assigned: Assignment[], unassigned: any[], attemptCount?: number } | null>(null);
    const [clearExisting, setClearExisting] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Drag & Drop state'leri
    const [draggedItem, setDraggedItem] = useState<{
        assignmentId: string;
        sourceClassId: string;
        sourceDay: number;
        sourceHour: number;
    } | null>(null);
    const [dragOverCell, setDragOverCell] = useState<{
        classId: string;
        day: number;
        hour: number;
    } | null>(null);

    // --- Color Generation Logic ---
    const COLORS = useMemo(() => [
        '#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', 
        '#bdb2ff', '#ffc6ff', '#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', 
        '#bae1ff', '#f08080', '#f4a460', '#9acd32', '#6495ed', '#ee82ee'
    ], []);

    const lessonColorCache = useMemo(() => new Map<string, string>(), []);

    const getLessonColor = useCallback((lessonName: string) => {
        if (lessonColorCache.has(lessonName)) {
            return lessonColorCache.get(lessonName)!;
        }
        let hash = 0;
        for (let i = 0; i < lessonName.length; i++) {
            hash = lessonName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = COLORS[Math.abs(hash % COLORS.length)];
        lessonColorCache.set(lessonName, color);
        return color;
    }, [COLORS, lessonColorCache]);

    const getTextColorForBg = useCallback((hexColor: string) => {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#374151' : '#ffffff';
    }, []);
    
    const allRequirements = useMemo(() => {
        return data.classes.flatMap(c => 
            c.curriculum.flatMap(item => 
                Array.from({ length: item.hours }, () => ({
                    lessonName: item.lessonName,
                    teacherId: item.teacherId,
                    classId: c.id
                }))
            )
        );
    }, [data.classes]);

    const assignmentsByClassSlot = useMemo(() => {
        const map = new Map<string, Assignment>();
        data.assignments.forEach(a => map.set(`${a.classId}-${a.day}-${a.hour}`, a));
        return map;
    }, [data.assignments]);

    const handleOpenManualModal = (day: number, hour: number, classId: string) => {
        setSelectedSlot({ day, hour });
        setAssignmentForm({ day, hour, classId });
        setManualAssignModalOpen(true);
    };

    const handleCloseManualModal = () => {
        setManualAssignModalOpen(false);
        setSelectedSlot(null);
        setAssignmentForm({});
    };

    const checkConflict = (assignment: Omit<Assignment, 'id'>, existingAssignments: Assignment[]) => {
        const { day, hour, teacherId, classId, classroomId } = assignment;
        if (existingAssignments.some(a => a.day === day && a.hour === hour && a.teacherId === teacherId)) return `Öğretmen bu saatte dolu.`;
        if (existingAssignments.some(a => a.day === day && a.hour === hour && a.classId === classId)) return `Sınıf bu saatte dolu.`;
        if (classroomId && existingAssignments.some(a => a.day === day && a.hour === hour && a.classroomId === classroomId)) return `Derslik bu saatte dolu.`;
        return null;
    };

    const getConflictDetails = (assignment: Omit<Assignment, 'id'>, existingAssignments: Assignment[]) => {
        const { day, hour, teacherId, classId, classroomId } = assignment;
        const conflicts: string[] = [];

        // Öğretmen çakışması
        const teacherConflict = existingAssignments.find(a => a.day === day && a.hour === hour && a.teacherId === teacherId);
        if (teacherConflict) {
            conflicts.push(
                `🧑‍🏫 ÖĞRETMEN ÇAKIŞMASI:\n` +
                `   • ${getEntityName('teachers', teacherId)} öğretmeni\n` +
                `   • Aynı saatte "${teacherConflict.lessonName}" dersini\n` +
                `   • ${getEntityName('classes', teacherConflict.classId)} sınıfında veriyor`
            );
        }

        // Sınıf çakışması
        const classConflict = existingAssignments.find(a => a.day === day && a.hour === hour && a.classId === classId);
        if (classConflict) {
            conflicts.push(
                `🏫 SINIF ÇAKIŞMASI:\n` +
                `   • ${getEntityName('classes', classId)} sınıfının\n` +
                `   • Aynı saatte "${classConflict.lessonName}" dersi var\n` +
                `   • Öğretmen: ${getEntityName('teachers', classConflict.teacherId)}`
            );
        }

        // Derslik çakışması
        if (classroomId) {
            const classroomConflict = existingAssignments.find(a => a.day === day && a.hour === hour && a.classroomId === classroomId);
            if (classroomConflict) {
                conflicts.push(
                    `🏛️ DERSLİK ÇAKIŞMASI:\n` +
                    `   • ${getEntityName('classrooms', classroomId)} dersliği\n` +
                    `   • Aynı saatte "${classroomConflict.lessonName}" için kullanılıyor\n` +
                    `   • Sınıf: ${getEntityName('classes', classroomConflict.classId)}`
                );
            }
        }

        return conflicts.join('\n\n');
    };

    // Arka arkaya ders kuralı kontrolü
    const checkConsecutiveLessonsRule = (assignment: Omit<Assignment, 'id'>, allAssignments: Assignment[]) => {
        const { day, hour, classId, lessonName } = assignment;
        
        // Bu sınıfın bu dersi için toplam saat sayısını bul
        const classData = data.classes.find(c => c.id === classId);
        if (!classData) return { isValid: true, warning: null };

        const curriculumItem = classData.curriculum?.find(item => item.lessonName === lessonName);
        if (!curriculumItem) return { isValid: true, warning: null };

        const totalHours = curriculumItem.hours;
        
        // Bu sınıfın aynı dersten mevcut atamalarını bul (yeni atama hariç)
        const existingLessons = allAssignments.filter(a => 
            a.classId === classId && 
            a.lessonName === lessonName &&
            !(a.day === day && a.hour === hour)
        );

        // Kural kontrolü: 
        // - 2+ saatlik dersler: ilk 2 ders arka arkaya olmalı
        // - Çift saatlik dersler: ikişerli bloklar halinde olmalı
        
        if (totalHours < 2) {
            return { isValid: true, warning: null }; // 1 saatlik dersler için kural yok
        }

        // Tüm dersleri (mevcut + yeni) topla
        const allLessonsIncludingNew = [...existingLessons, { day, hour, classId, lessonName }];
        
        // Çift saatlik dersler için özel kontrol
        if (totalHours % 2 === 0) {
            // Her gün için çiftli kontrol yap
            const lessonsByDay = new Map<number, any[]>();
            allLessonsIncludingNew.forEach(lesson => {
                if (!lessonsByDay.has(lesson.day)) {
                    lessonsByDay.set(lesson.day, []);
                }
                lessonsByDay.get(lesson.day)!.push(lesson);
            });

            // Her gün içinde çiftli olup olmadığını kontrol et
            for (const [dayNum, dayLessons] of lessonsByDay) {
                if (dayLessons.length === 2) {
                    const hours = dayLessons.map(l => l.hour).sort((a, b) => a - b);
                    if (hours[1] - hours[0] === 1) {
                        return { isValid: true, warning: null }; // Çiftli bulundu
                    }
                }
            }
        }

        // 2+ saatlik dersler için: ilk 2 ders arka arkaya olmalı
        if (totalHours >= 2) {
            // Tüm dersleri saat sırasına göre sırala
            const allSorted = allLessonsIncludingNew
                .map(lesson => ({ ...lesson, datetime: lesson.day * 24 + lesson.hour }))
                .sort((a, b) => a.datetime - b.datetime);

            // İlk 2 dersin arka arkaya olup olmadığını kontrol et
            if (allSorted.length >= 2) {
                const first = allSorted[0];
                const second = allSorted[1];
                
                // Aynı gün ve ardışık saatler mi?
                if (first.day === second.day && second.hour - first.hour === 1) {
                    return { isValid: true, warning: null }; // İlk 2 ders arka arkaya
                }
            }
            
            // Eğer henüz 2 dersten az varsa, sorun yok
            if (allSorted.length < 2) {
                return { isValid: true, warning: null };
            }
        }

        // Kural ihlali, uyarı ver
        const warnings = [];
        if (totalHours >= 2 && totalHours % 2 === 0) {
            warnings.push(`� ÇIFT SAAT KURALI: "${lessonName}" dersi ${totalHours} saat (çift sayı) olduğu için ikişerli bloklar halinde gelmeli`);
        } else if (totalHours >= 2) {
            warnings.push(`� DERS KURALI: "${lessonName}" dersi ${totalHours} saatlik olduğu için ilk 2 ders arka arkaya gelmeli`);
        }

        const existingSchedule = existingLessons.map(lesson => 
            `${DAYS_OF_WEEK[lesson.day]} ${lessonTimes[lesson.hour]?.label || `${lesson.hour + 1}. Ders`}`
        ).join(', ');

        return {
            isValid: false,
            warning: warnings.join('\n') + `\n\n📅 Mevcut "${lessonName}" dersleri: ${existingSchedule}\n\n💡 İpucu: ${totalHours % 2 === 0 ? 'Dersleri ikişerli bloklar halinde' : 'İlk 2 dersi arka arkaya'} yerleştirin`
        };
    };

    const handleManualSave = () => {
        if (!assignmentForm.lessonName || !assignmentForm.teacherId || !assignmentForm.classId || selectedSlot === null) {
            alert("Lütfen Ders, Öğretmen ve Sınıf alanlarını doldurun.");
            return;
        }
        
        const newAssignment: Omit<Assignment, 'id'> = {
            day: selectedSlot.day,
            hour: selectedSlot.hour,
            lessonName: assignmentForm.lessonName,
            teacherId: assignmentForm.teacherId,
            classId: assignmentForm.classId,
            classroomId: assignmentForm.classroomId || undefined,
        };

        const conflict = checkConflict(newAssignment, data.assignments);
        const consecutiveCheck = checkConsecutiveLessonsRule(newAssignment, data.assignments);
        
        if (conflict || !consecutiveCheck.isValid) {
            let warningMessage = '';
            
            if (conflict) {
                const conflictDetails = getConflictDetails(newAssignment, data.assignments);
                warningMessage += `⚠️ ÇAKIŞMA TESPİT EDİLDİ!\n\n${conflictDetails}\n\n`;
            }
            
            if (!consecutiveCheck.isValid) {
                if (conflict) warningMessage += `─────────────────────\n\n`;
                warningMessage += `📋 DERS KURALLARI İHLALİ!\n\n${consecutiveCheck.warning}\n\n`;
            }
            
            if (conflict) {
                alert(`${warningMessage}❌ Çakışma nedeniyle ders eklenemez!`);
                return;
            } else {
                const shouldProceed = window.confirm(`${warningMessage}Yine de bu dersi eklemek istiyor musunuz?`);
                if (!shouldProceed) {
                    return;
                }
            }
        }
        
        setData(prev => ({
            ...prev,
            assignments: [...prev.assignments, { ...newAssignment, id: generateId() }]
        }));
        handleCloseManualModal();
    };
    
    const handleDelete = (classId: string, day: number, hour: number) => {
        if (window.confirm("Bu ders atamasını silmek istediğinizden emin misiniz?")) {
            setData(prev => ({
                ...prev,
                assignments: prev.assignments.filter(a => !(a.classId === classId && a.day === day && a.hour === hour))
            }));
        }
    };

    // Drag & Drop Handler'ları
    const handleDragStart = (e: React.DragEvent, assignment: Assignment, classId: string, day: number, hour: number) => {
        setDraggedItem({
            assignmentId: assignment.id,
            sourceClassId: classId,
            sourceDay: day,
            sourceHour: hour
        });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', '');
    };

    const handleDragOver = (e: React.DragEvent, classId: string, day: number, hour: number) => {
        e.preventDefault();
        
        if (!draggedItem) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }

        // Aynı hücreye sürükleniyorsa
        if (draggedItem.sourceClassId === classId && 
            draggedItem.sourceDay === day && 
            draggedItem.sourceHour === hour) {
            e.dataTransfer.dropEffect = 'none';
            setDragOverCell({ classId, day, hour });
            return;
        }

        // Çakışma ve kural kontrolü yap
        const draggedAssignment = data.assignments.find(a => a.id === draggedItem.assignmentId);
        if (draggedAssignment) {
            const tempAssignment: Omit<Assignment, 'id'> = {
                ...draggedAssignment,
                classId: classId,
                day: day,
                hour: hour
            };

            const otherAssignments = data.assignments.filter(a => 
                a.id !== draggedItem.assignmentId && 
                !(a.classId === classId && a.day === day && a.hour === hour)
            );

            const conflict = checkConflict(tempAssignment, otherAssignments);
            const consecutiveCheck = checkConsecutiveLessonsRule(tempAssignment, otherAssignments);
            
            if (conflict) {
                e.dataTransfer.dropEffect = 'none';
            } else if (!consecutiveCheck.isValid) {
                e.dataTransfer.dropEffect = 'copy'; // Uyarı ile taşınabilir
            } else {
                e.dataTransfer.dropEffect = 'move';
            }
        }
        
        setDragOverCell({ classId, day, hour });
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Sadece hücreden tamamen çıkıldığında dragOver'ı kaldır
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverCell(null);
        }
    };

    const handleDrop = (e: React.DragEvent, targetClassId: string, targetDay: number, targetHour: number) => {
        e.preventDefault();
        setDragOverCell(null);

        if (!draggedItem) return;

        // Aynı hücreye bırakılıyorsa hiçbir şey yapma
        if (draggedItem.sourceClassId === targetClassId && 
            draggedItem.sourceDay === targetDay && 
            draggedItem.sourceHour === targetHour) {
            setDraggedItem(null);
            return;
        }

        // Sürüklenen dersi bul
        const draggedAssignment = data.assignments.find(a => a.id === draggedItem.assignmentId);
        if (!draggedAssignment) {
            setDraggedItem(null);
            return;
        }

        // Hedef hücrede zaten bir ders var mı kontrol et
        const targetAssignment = data.assignments.find(a => 
            a.classId === targetClassId && a.day === targetDay && a.hour === targetHour
        );

        // Taşıma için geçici atama oluştur
        const tempAssignment: Omit<Assignment, 'id'> = {
            ...draggedAssignment,
            classId: targetClassId,
            day: targetDay,
            hour: targetHour
        };

        // Çakışma kontrolü - mevcut atamaları filtrele (sürüklenen ve hedef hariç)
        const otherAssignments = data.assignments.filter(a => 
            a.id !== draggedItem.assignmentId && 
            (targetAssignment ? a.id !== targetAssignment.id : true)
        );

        const conflict = checkConflict(tempAssignment, otherAssignments);
        const consecutiveCheck = checkConsecutiveLessonsRule(tempAssignment, otherAssignments);

        if (conflict || !consecutiveCheck.isValid) {
            let warningMessage = '';
            
            if (conflict) {
                const conflictDetails = getConflictDetails(tempAssignment, otherAssignments);
                warningMessage += `⚠️ ÇAKIŞMA TESPİT EDİLDİ!\n\n`;
                warningMessage += `Taşınacak Ders: "${draggedAssignment.lessonName}"\n`;
                warningMessage += `Hedef: ${DAYS_OF_WEEK[targetDay]} ${lessonTimes[targetHour]?.label || `${targetHour + 1}. Ders`} - ${getEntityName('classes', targetClassId)}\n\n`;
                warningMessage += `ÇAKIŞMA DETAYLARI:\n${conflictDetails}\n\n`;
            }
            
            if (!consecutiveCheck.isValid) {
                if (conflict) warningMessage += `─────────────────────\n\n`;
                warningMessage += `📋 DERS KURALLARI İHLALİ!\n\n`;
                warningMessage += consecutiveCheck.warning + '\n\n';
            }
            
            warningMessage += conflict 
                ? `Bu çakışma ve kural ihlalini göze alarak yine de taşımak istiyor musunuz?\n(Program bütünlüğü bozulabilir!)`
                : `Bu kural ihlalini göze alarak yine de taşımak istiyor musunuz?\n(Ders programı pedagojik açıdan uygun olmayabilir!)`;
            
            const shouldProceed = window.confirm(warningMessage);
            
            if (!shouldProceed) {
                setDraggedItem(null);
                return;
            }
        }

        if (targetAssignment) {
            // Swap işlemi için hedef dersin de çakışma kontrolü
            const tempSwapAssignment: Omit<Assignment, 'id'> = {
                ...targetAssignment,
                classId: draggedItem.sourceClassId,
                day: draggedItem.sourceDay,
                hour: draggedItem.sourceHour
            };

            const swapConflict = checkConflict(tempSwapAssignment, otherAssignments);

            if (swapConflict) {
                // Yer değiştirme çakışması detayları
                const swapConflictDetails = getConflictDetails(tempSwapAssignment, otherAssignments);
                const shouldProceedSwap = window.confirm(
                    `⚠️ YER DEĞİŞTİRME ÇAKIŞMASI!\n\n` +
                    `Yer değiştirilecek ders: "${targetAssignment.lessonName}"\n` +
                    `Yeni konum: ${DAYS_OF_WEEK[draggedItem.sourceDay]} ${lessonTimes[draggedItem.sourceHour]?.label || `${draggedItem.sourceHour + 1}. Ders`} - ${getEntityName('classes', draggedItem.sourceClassId)}\n\n` +
                    `ÇAKIŞMA DETAYLARI:\n${swapConflictDetails}\n\n` +
                    `Bu çakışmayı göze alarak yine de yer değiştirmek istiyor musunuz?`
                );
                
                if (!shouldProceedSwap) {
                    setDraggedItem(null);
                    return;
                }
            }

            // Çakışma yoksa swap işlemini onayla
            if (window.confirm(
                `🔄 YER DEĞİŞTİRME İŞLEMİ\n\n` +
                `Hedef hücrede zaten "${targetAssignment.lessonName}" dersi var.\n\n` +
                `TAKAS DETAYLARı:\n` +
                `📚 "${draggedAssignment.lessonName}" ➡️ ${DAYS_OF_WEEK[targetDay]} ${lessonTimes[targetHour]?.label || `${targetHour + 1}. Ders`} (${getEntityName('classes', targetClassId)})\n` +
                `📚 "${targetAssignment.lessonName}" ➡️ ${DAYS_OF_WEEK[draggedItem.sourceDay]} ${lessonTimes[draggedItem.sourceHour]?.label || `${draggedItem.sourceHour + 1}. Ders`} (${getEntityName('classes', draggedItem.sourceClassId)})\n\n` +
                `✅ Çakışma tespit edilmedi. Dersleri yer değiştirmek istiyor musunuz?`
            )) {
                setData(prev => ({
                    ...prev,
                    assignments: prev.assignments.map(a => {
                        if (a.id === draggedItem.assignmentId) {
                            return { ...a, classId: targetClassId, day: targetDay, hour: targetHour };
                        }
                        if (a.id === targetAssignment.id) {
                            return { ...a, classId: draggedItem.sourceClassId, day: draggedItem.sourceDay, hour: draggedItem.sourceHour };
                        }
                        return a;
                    })
                }));

                // Başarı mesajı
                setTimeout(() => {
                    const message = swapConflict 
                        ? `⚠️ Çakışmalı yer değiştirme tamamlandı!\n\n"${draggedAssignment.lessonName}" ↔️ "${targetAssignment.lessonName}"\n\n⚠️ Lütfen program çakışmalarını kontrol edin!`
                        : `✅ Yer değiştirme başarılı!\n\n"${draggedAssignment.lessonName}" ↔️ "${targetAssignment.lessonName}"`;
                    alert(message);
                }, 100);
            }
        } else {
            // Normal taşıma işlemi - çakışma kontrolü zaten yapıldı
            setData(prev => ({
                ...prev,
                assignments: prev.assignments.map(a => 
                    a.id === draggedItem.assignmentId 
                        ? { ...a, classId: targetClassId, day: targetDay, hour: targetHour }
                        : a
                )
            }));

            // Başarı mesajı
            if (conflict) {
                // Çakışmalı taşıma başarılı
                setTimeout(() => {
                    alert(`⚠️ Çakışmalı taşıma tamamlandı!\n\n"${draggedAssignment.lessonName}" dersi taşındı.\n\n⚠️ Lütfen program çakışmalarını kontrol edin!`);
                }, 100);
            }
        }

        setDraggedItem(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverCell(null);
    };

    const getEntityName = (type: 'teachers' | 'classes' | 'classrooms', id?: string) => {
        if (!id) return 'Bilinmiyor';
        return (data[type] as any[]).find(item => item.id === id)?.name || 'Bilinmiyor';
    };

    const runAutoAssigner = () => {
        if (allRequirements.length === 0) {
            alert("Sınıfların müfredatlarında atanacak ders bulunmuyor. Lütfen 'Sınıflar' sayfasından ders gereksinimlerini ekleyin.");
            return;
        }

        setIsLoading(true);
        console.log('🚀 Otomatik atama başlıyor...');

        setTimeout(() => {
            try {
                const { schoolInfo, teachers, classes, classrooms, assignments } = data;
                const requirements = allRequirements;

                const getAvailabilityStatus = (entity: Teacher | ClassData | Classroom, day: number, hour: number) =>
                    entity.availability?.[day]?.[hour] || AvailabilityStatus.AVAILABLE;

                const getScore = (status: AvailabilityStatus) => {
                    if (status === AvailabilityStatus.UNAVAILABLE) return -Infinity;
                    if (status === AvailabilityStatus.PREFERRED) return 2;
                    return 1;
                };

                const shuffleArray = <T,>(source: T[]): T[] => {
                    const arr = [...source];
                    for (let i = arr.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [arr[i], arr[j]] = [arr[j], arr[i]];
                    }
                    return arr;
                };

                const classMap = new Map<string, ClassData>(classes.map(cls => [cls.id, cls] as [string, ClassData]));
                const teacherMap = new Map<string, Teacher>(teachers.map(t => [t.id, t] as [string, Teacher]));

                const existingAssignments = clearExisting ? [] : [...assignments];
                const occupiedSlots = new Set(existingAssignments.flatMap(a => [
                    `t-${a.teacherId}-${a.day}-${a.hour}`,
                    `c-${a.classId}-${a.day}-${a.hour}`,
                    a.classroomId ? `r-${a.classroomId}-${a.day}-${a.hour}` : null,
                ].filter(Boolean) as string[]));

                const scoredRequirements = requirements.map((req, index) => {
                    const possibleSlots: { day: number; hour: number; classroomId?: string; score: number }[] = [];
                    const teacher = teacherMap.get(req.teacherId);
                    const classData = classMap.get(req.classId);

                    if (!teacher || !classData) {
                        return { req, index, possibleSlots };
                    }

                    let classStartHour = 0;
                    let classEndHour = 0;

                    if (classData.availability) {
                        let minHour = Infinity;
                        let maxHour = -1;
                        for (let day = 0; day < schoolInfo.daysInWeek; day++) {
                            const dayLessons = dayLessonTimes[day] || [];
                            for (let hour = 0; hour < dayLessons.length; hour++) {
                                const status = getAvailabilityStatus(classData, day, hour);
                                if (status !== AvailabilityStatus.UNAVAILABLE) {
                                    minHour = Math.min(minHour, hour);
                                    maxHour = Math.max(maxHour, hour);
                                }
                            }
                        }
                        if (maxHour >= 0) {
                            classStartHour = minHour;
                            classEndHour = maxHour;
                        }
                    } else {
                        const allDayLessonCounts = Array.from({ length: schoolInfo.daysInWeek }, (_, dayIdx) =>
                            (dayLessonTimes[dayIdx] || []).length
                        );
                        const maxLessonsAnyDay = Math.max(...allDayLessonCounts, 0);
                        classStartHour = classData.startHour ?? 0;
                        classEndHour = classData.endHour ?? (maxLessonsAnyDay > 0 ? maxLessonsAnyDay - 1 : 7);
                    }

                    for (let day = 0; day < schoolInfo.daysInWeek; day++) {
                        const dayLessons = dayLessonTimes[day] || [];
                        const maxHourForDay = dayLessons.length - 1;
                        const dayClassStartHour = Math.max(classStartHour, 0);
                        const dayClassEndHour = Math.min(classEndHour, maxHourForDay);

                        if (maxHourForDay < 0 || dayClassStartHour > dayClassEndHour) {
                            continue;
                        }

                        let classHasAvailability = false;
                        for (let hour = dayClassStartHour; hour <= dayClassEndHour; hour++) {
                            if (getAvailabilityStatus(classData, day, hour) !== AvailabilityStatus.UNAVAILABLE) {
                                classHasAvailability = true;
                                break;
                            }
                        }
                        if (!classHasAvailability) {
                            continue;
                        }

                        for (let hour = dayClassStartHour; hour <= dayClassEndHour; hour++) {
                            const teacherStatus = getAvailabilityStatus(teacher, day, hour);
                            const classStatus = getAvailabilityStatus(classData, day, hour);

                            if (teacherStatus === AvailabilityStatus.UNAVAILABLE || classStatus === AvailabilityStatus.UNAVAILABLE) {
                                continue;
                            }

                            if (occupiedSlots.has(`t-${req.teacherId}-${day}-${hour}`) || occupiedSlots.has(`c-${req.classId}-${day}-${hour}`)) {
                                continue;
                            }

                            const baseScore = getScore(teacherStatus) + getScore(classStatus);
                            if (baseScore === -Infinity) {
                                continue;
                            }

                            if (classrooms.length === 0) {
                                possibleSlots.push({ day, hour, score: baseScore });
                            } else {
                                for (const classroom of classrooms) {
                                    const classroomStatus = getAvailabilityStatus(classroom, day, hour);
                                    if (classroomStatus === AvailabilityStatus.UNAVAILABLE) {
                                        continue;
                                    }
                                    if (occupiedSlots.has(`r-${classroom.id}-${day}-${hour}`)) {
                                        continue;
                                    }
                                    const finalScore = baseScore + getScore(classroomStatus);
                                    if (finalScore === -Infinity) {
                                        continue;
                                    }
                                    possibleSlots.push({ day, hour, classroomId: classroom.id, score: finalScore });
                                }
                            }
                        }
                    }

                    return { req, index, possibleSlots };
                });

                const lessonGroupMap = new Map<string, typeof scoredRequirements>();
                for (const item of scoredRequirements) {
                    const key = `${item.req.classId}::${item.req.lessonName}::${item.req.teacherId}`;
                    if (!lessonGroupMap.has(key)) {
                        lessonGroupMap.set(key, []);
                    }
                    lessonGroupMap.get(key)!.push(item);
                }

                type PlacementSlot = { day: number; hour: number; classroomId?: string; score: number };
                type PlacementCandidate = { slots: PlacementSlot[]; totalScore: number };
                type LessonGroupEntry = {
                    key: string;
                    classId: string;
                    teacherId: string;
                    lessonName: string;
                    items: typeof scoredRequirements;
                    blockSize: number;
                    candidates: PlacementCandidate[];
                    randomPriority: number;
                };

                const gatherSlotOptions = (items: typeof scoredRequirements, day: number, hour: number): PlacementSlot[] => {
                    const slotMap = new Map<string, PlacementSlot>();
                    for (const item of items) {
                        for (const slot of item.possibleSlots) {
                            if (slot.day !== day || slot.hour !== hour) {
                                continue;
                            }
                            const key = slot.classroomId ?? '::none';
                            const existing = slotMap.get(key);
                            if (!existing || existing.score < slot.score) {
                                slotMap.set(key, { day: slot.day, hour: slot.hour, classroomId: slot.classroomId, score: slot.score });
                            }
                        }
                    }
                    const result = Array.from(slotMap.values());
                    result.sort((a, b) => b.score - a.score);
                    return result;
                };

                const buildCandidatesForGroup = (entryItems: typeof scoredRequirements): PlacementCandidate[] => {
                    const blockSize = entryItems.length;
                    if (blockSize === 0) {
                        return [];
                    }

                    const candidates: PlacementCandidate[] = [];

                    if (blockSize === 1) {
                        const slotSet = new Map<string, PlacementSlot>();
                        for (const item of entryItems) {
                            for (const slot of item.possibleSlots) {
                                const key = `${slot.day}-${slot.hour}-${slot.classroomId ?? '::none'}`;
                                if (!slotSet.has(key) || slotSet.get(key)!.score < slot.score) {
                                    slotSet.set(key, { day: slot.day, hour: slot.hour, classroomId: slot.classroomId, score: slot.score });
                                }
                            }
                        }
                        const uniqueSlots = Array.from(slotSet.values());
                        uniqueSlots.sort((a, b) => b.score - a.score);
                        for (const slot of uniqueSlots) {
                            candidates.push({ slots: [slot], totalScore: slot.score });
                        }
                        return candidates;
                    }

                    for (let day = 0; day < schoolInfo.daysInWeek; day++) {
                        const dayLessons = dayLessonTimes[day] || [];
                        if (dayLessons.length < blockSize) {
                            continue;
                        }
                        for (let startHour = 0; startHour <= dayLessons.length - blockSize; startHour++) {
                            const slotOptionsPerOffset: PlacementSlot[][] = [];
                            let validBlock = true;
                            for (let offset = 0; offset < blockSize; offset++) {
                                const hour = startHour + offset;
                                const options = gatherSlotOptions(entryItems, day, hour);
                                if (options.length === 0) {
                                    validBlock = false;
                                    break;
                                }
                                slotOptionsPerOffset.push(options.slice(0, 3));
                            }

                            if (!validBlock) {
                                continue;
                            }

                            const current: PlacementSlot[] = [];

                            const buildCombinations = (offset: number) => {
                                if (offset === slotOptionsPerOffset.length) {
                                    const totalScore = current.reduce((sum, slot) => sum + slot.score, 0);
                                    const key = current.map(s => `${s.day}-${s.hour}-${s.classroomId ?? '::none'}`).join('|');
                                    if (!candidates.some(c => c.slots.length === current.length && c.slots.every((slot, idx) => slot.day === current[idx].day && slot.hour === current[idx].hour && slot.classroomId === current[idx].classroomId))) {
                                        candidates.push({ slots: [...current], totalScore });
                                    }
                                    return;
                                }

                                for (const option of slotOptionsPerOffset[offset]) {
                                    current.push(option);
                                    buildCombinations(offset + 1);
                                    current.pop();
                                }
                            };

                            buildCombinations(0);
                        }
                    }

                    candidates.sort((a, b) => b.totalScore - a.totalScore);
                    return candidates;
                };

                const lessonGroupEntries: LessonGroupEntry[] = [];
                for (const [key, items] of lessonGroupMap.entries()) {
                    const [classId, lessonName, teacherId] = key.split('::');
                    const candidates = buildCandidatesForGroup(items);
                    lessonGroupEntries.push({
                        key,
                        classId,
                        teacherId,
                        lessonName,
                        items,
                        blockSize: items.length,
                        candidates,
                        randomPriority: Math.random(),
                    });
                }

                lessonGroupEntries.sort((a, b) => {
                    if (a.candidates.length !== b.candidates.length) {
                        return a.candidates.length - b.candidates.length;
                    }
                    if (b.blockSize !== a.blockSize) {
                        return b.blockSize - a.blockSize;
                    }
                    return a.randomPriority - b.randomPriority;
                });

                const newOccupiedSlots = new Set(occupiedSlots);
                const currentAssignments: Assignment[] = [];
                let solutionAssignments: Assignment[] | null = null;
                let success = false;

                let bestPartialAssignments: Assignment[] = [];
                let bestPartialUnassigned: any[] = [...requirements];
                let bestPartialDepth = -1;

                const updateBestPartial = (depth: number) => {
                    if (success) {
                        return;
                    }
                    if (depth > bestPartialDepth || (depth === bestPartialDepth && currentAssignments.length > bestPartialAssignments.length)) {
                        bestPartialDepth = depth;
                        bestPartialAssignments = [...currentAssignments];
                        const remaining: any[] = [];
                        for (let i = depth; i < lessonGroupEntries.length; i++) {
                            const group = lessonGroupEntries[i];
                            group.items.forEach(item => remaining.push(item.req));
                        }
                        bestPartialUnassigned = remaining;
                    }
                };

                const dfs = (index: number): boolean => {
                    if (index === lessonGroupEntries.length) {
                        success = true;
                        solutionAssignments = [...currentAssignments];
                        return true;
                    }

                    const group = lessonGroupEntries[index];
                    if (group.candidates.length === 0) {
                        updateBestPartial(index);
                        return false;
                    }

                    const orderedCandidates = [...group.candidates].sort((a, b) => {
                        if (b.totalScore !== a.totalScore) {
                            return b.totalScore - a.totalScore;
                        }
                        return Math.random() - 0.5;
                    });

                    for (const candidate of orderedCandidates) {
                        let feasible = true;
                        const addedAssignments: Assignment[] = [];
                        const addedKeys: string[] = [];

                        for (const slot of candidate.slots) {
                            const teacherKey = `t-${group.teacherId}-${slot.day}-${slot.hour}`;
                            const classKey = `c-${group.classId}-${slot.day}-${slot.hour}`;
                            const classroomKey = slot.classroomId ? `r-${slot.classroomId}-${slot.day}-${slot.hour}` : undefined;

                            if (newOccupiedSlots.has(teacherKey) || newOccupiedSlots.has(classKey) || (classroomKey && newOccupiedSlots.has(classroomKey))) {
                                feasible = false;
                                break;
                            }

                            const assignment: Assignment = {
                                ...group.items[0].req,
                                day: slot.day,
                                hour: slot.hour,
                                classroomId: slot.classroomId,
                                id: generateId(),
                            };

                            currentAssignments.push(assignment);
                            addedAssignments.push(assignment);

                            newOccupiedSlots.add(teacherKey);
                            newOccupiedSlots.add(classKey);
                            addedKeys.push(teacherKey, classKey);
                            if (classroomKey) {
                                newOccupiedSlots.add(classroomKey);
                                addedKeys.push(classroomKey);
                            }
                        }

                        if (feasible) {
                            if (dfs(index + 1)) {
                                return true;
                            }
                        }

                        for (let i = 0; i < addedAssignments.length; i++) {
                            currentAssignments.pop();
                        }
                        for (const key of addedKeys) {
                            newOccupiedSlots.delete(key);
                        }
                    }

                    updateBestPartial(index);
                    return false;
                };

                console.log(`📊 Toplam ${requirements.length} ders atanacak (${lessonGroupEntries.length} ders grubu)`);

                const solved = dfs(0);

                const finalAssignments = solved && solutionAssignments ? solutionAssignments : bestPartialAssignments;
                const finalUnassigned = solved ? [] : bestPartialUnassigned;

                if (!solved && finalUnassigned.length > 0) {
                    alert(`⚠️ Otomatik atama tüm dersleri yerleştiremedi. Yerleşmeyen ders sayısı: ${finalUnassigned.length}. Lütfen müsaitlikleri kontrol edin.`);
                }

                console.log(`✅ Sonuç: ${finalAssignments.length}/${requirements.length} ders yerleştirildi${solved ? '' : ' (kısmi)'}`);

                setAssignmentResult({ assigned: finalAssignments, unassigned: finalUnassigned, attemptCount: 1 });
                setResultModalOpen(true);
            } catch (error) {
                console.error('❌ Otomatik atama sırasında hata oluştu:', error);
                alert('Otomatik atama sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
            } finally {
                setIsLoading(false);
            }
        }, 30);
    };
    
    const handleApplyResults = () => {
        if (!assignmentResult) return;
        setData(prev => ({
            ...prev,
            assignments: clearExisting ? assignmentResult.assigned : [...prev.assignments, ...assignmentResult.assigned]
        }));
        setResultModalOpen(false);
        setAssignmentResult(null);
    };

    const selectedTeacherForManual = useMemo(() => data.teachers.find(t => t.id === assignmentForm.teacherId), [data.teachers, assignmentForm.teacherId]);

    const requirementsSummary = useMemo(() => {
        const summary = new Map<string, number>();
        for(const req of allRequirements) {
            const key = `${req.classId}|${req.lessonName}|${req.teacherId}`;
            summary.set(key, (summary.get(key) || 0) + 1);
        }
        return Array.from(summary.entries()).map(([key, hours]) => {
            const [classId, lessonName, teacherId] = key.split('|');
            return { classId, lessonName, teacherId, hours, id: key };
        });
    }, [allRequirements]);

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-lg font-semibold mb-4">Otomatik Atama</h2>
                 <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    Aşağıda, sınıfların müfredatlarına göre atanması gereken tüm derslerin bir özeti bulunmaktadır. Atamayı başlatmak için butona tıklayın. Ders gereksinimlerini değiştirmek için lütfen 'Sınıflar' sayfasına gidin.
                </p>
                {requirementsSummary.length > 0 ? (
                    <div className="mt-6 space-y-2 max-h-60 overflow-y-auto pr-2">
                        <h3 className="font-semibold">Atanacak Ders Grupları:</h3>
                        {requirementsSummary.map(g => (
                            <div key={g.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                <span><b>{g.hours} saat</b> - {getEntityName('classes', g.classId)} - {g.lessonName} - {getEntityName('teachers', g.teacherId)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">Atanacak ders gereksinimi bulunmuyor.</p>
                )}
                 <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Button onClick={runAutoAssigner} disabled={isLoading || allRequirements.length === 0}>
                        <Icon icon="zap" className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}/>
                        {isLoading ? 'Hesaplanıyor...' : 'Otomatik Atamayı Başlat'}
                    </Button>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="clearExisting" checked={clearExisting} onChange={e => setClearExisting(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                        <label htmlFor="clearExisting" className="text-sm">Mevcut atamaları sil</label>
                    </div>
                </div>
            </Card>



            <h2 className="text-lg font-semibold mt-8 mb-2">Ders Programı Tablosu</h2>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p><strong>🎯 Akıllı Sürükle-Bırak Sistemi</strong></p>
                <div className="mt-2 space-y-1">
                    <p>• Dersleri mouse ile sürükleyip istediğiniz yere bırakın</p>
                    <p>• <span className="inline-block w-3 h-3 bg-green-200 border border-green-400 rounded mr-1"></span> <strong>Yeşil:</strong> Güvenli taşıma (çakışma yok)</p>
                    <p>• <span className="inline-block w-3 h-3 bg-blue-200 border border-blue-400 rounded mr-1"></span> <strong>Mavi:</strong> Yer değiştirme (çakışmasız takas)</p>
                    <p>• <span className="inline-block w-3 h-3 bg-red-200 border border-red-400 rounded mr-1"></span> <strong>Kırmızı:</strong> Çakışma uyarısı ile detaylı bilgi</p>
                    <p>• Çakışma olsa bile "Yine de taşı" seçeneği ile zorlama</p>
                    <p>• <Icon icon="plus" className="w-3 h-3 inline" /> Manuel ders ekleme hala mümkün</p>
                </div>
            </div>
            <div className="overflow-x-auto bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md">
                <table className="w-full border-collapse text-center text-sm">
                    <thead>
                        <tr>
                            <th className="p-1 border dark:border-gray-300 dark:border-gray-600 w-20 text-xs">Gün</th>
                            <th className="p-1 border dark:border-gray-300 dark:border-gray-600 w-24 text-xs">Saat</th>
                            {data.classes.map(c => (
                                <th key={c.id} className="p-1 border dark:border-gray-300 dark:border-gray-600 font-semibold text-xs min-w-[80px]">{c.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: data.schoolInfo.daysInWeek }).map((_, dayIndex) => (
                            <Fragment key={dayIndex}>
                                {(() => {
                                    const dayLessons = dayLessonTimes[dayIndex] || [];
                                    return dayLessons.map((lessonTime, hourIndex) => {
                                        return (
                                            <tr key={`${dayIndex}-${hourIndex}`} className="h-12">
                                                {hourIndex === 0 && (
                                                    <td rowSpan={dayLessons.length} className="p-1 border dark:border-gray-300 dark:border-gray-600 font-bold align-middle text-xs">
                                                        {DAYS_OF_WEEK[dayIndex]}
                                                    </td>
                                                )}
                                                <td className="p-1 border dark:border-gray-300 dark:border-gray-600 font-mono text-xs whitespace-pre-wrap">
                                                    <span className="text-xs leading-tight">
                                                        {lessonTime.start}<br/>-<br/>{lessonTime.end}
                                                    </span>
                                                </td>
                                                {data.classes.map(c => {
                                                    const assignment = assignmentsByClassSlot.get(`${c.id}-${dayIndex}-${hourIndex}`);
                                                    
                                                    // Sınıfın çalışma saatlerini müsaitlik tablosuna göre otomatik hesapla
                                                    let classStartHour = 0;
                                                    let classEndHour = 0;
                                                    
                                                    if (c.availability) {
                                                        let minHour = Infinity;
                                                        let maxHour = -1;
                                                        
                                                        for (let day = 0; day < data.schoolInfo.daysInWeek; day++) {
                                                            const dayLessonsForCalc = dayLessonTimes[day] || [];
                                                            for (let hour = 0; hour < dayLessonsForCalc.length; hour++) {
                                                                const status = c.availability?.[day]?.[hour] || AvailabilityStatus.AVAILABLE;
                                                                if (status !== AvailabilityStatus.UNAVAILABLE) {
                                                                    minHour = Math.min(minHour, hour);
                                                                    maxHour = Math.max(maxHour, hour);
                                                                }
                                                            }
                                                        }
                                                        
                                                        if (maxHour >= 0) {
                                                            classStartHour = minHour;
                                                            classEndHour = maxHour;
                                                        }
                                                    } else {
                                                        // Availability yoksa varsayılan değerleri kullan
                                                        const allDayLessonCounts = Array.from({ length: data.schoolInfo.daysInWeek }, (_, dayIdx) => 
                                                            (dayLessonTimes[dayIdx] || []).length
                                                        );
                                                        const maxLessonsAnyDay = Math.max(...allDayLessonCounts, 0);
                                                        classStartHour = c.startHour ?? 0;
                                                        classEndHour = c.endHour ?? (maxLessonsAnyDay > 0 ? maxLessonsAnyDay - 1 : 7);
                                                    }
                                                    
                                                    const isWithinClassHours = hourIndex >= classStartHour && hourIndex <= classEndHour;

                                                    if (!isWithinClassHours) {
                                                        return <td key={c.id} className="p-0.5 border dark:border-gray-300 dark:border-gray-600 align-middle bg-gray-50 dark:bg-gray-900/50 h-12" />;
                                                    }
                                                    
                                                    if (assignment) {
                                                        const bgColor = getLessonColor(assignment.lessonName);
                                                        const textColor = getTextColorForBg(bgColor);
                                                        const isDraggedOver = dragOverCell?.classId === c.id && dragOverCell?.day === dayIndex && dragOverCell?.hour === hourIndex;
                                                        const isDragged = draggedItem?.sourceClassId === c.id && draggedItem?.sourceDay === dayIndex && draggedItem?.sourceHour === hourIndex;
                                                        
                                                        // Çakışma ve kural kontrolü
                                                        let hasConflict = false;
                                                        let hasRuleViolation = false;
                                                        if (isDraggedOver && draggedItem && draggedItem.assignmentId !== assignment.id) {
                                                            const draggedAssignment = data.assignments.find(a => a.id === draggedItem.assignmentId);
                                                            if (draggedAssignment) {
                                                                const tempAssignment: Omit<Assignment, 'id'> = {
                                                                    ...draggedAssignment,
                                                                    classId: c.id,
                                                                    day: dayIndex,
                                                                    hour: hourIndex
                                                                };
                                                                const otherAssignments = data.assignments.filter(a => 
                                                                    a.id !== draggedItem.assignmentId && a.id !== assignment.id
                                                                );
                                                                hasConflict = !!checkConflict(tempAssignment, otherAssignments);
                                                                const consecutiveCheck = checkConsecutiveLessonsRule(tempAssignment, otherAssignments);
                                                                hasRuleViolation = !consecutiveCheck.isValid;
                                                            }
                                                        }
                                                        
                                                        return (
                                                            <td 
                                                                key={c.id} 
                                                                className={`p-1 border dark:border-gray-300 dark:border-gray-600 align-middle relative group cursor-move select-none h-12 transition-all ${
                                                                    isDraggedOver 
                                                                        ? hasConflict 
                                                                            ? 'ring-2 ring-red-400 bg-red-50 dark:bg-red-900/30' 
                                                                            : hasRuleViolation
                                                                            ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/30'
                                                                            : 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-900/30'
                                                                        : ''
                                                                } ${isDragged ? 'opacity-50' : ''}`}
                                                                style={{ backgroundColor: isDraggedOver ? undefined : bgColor, color: isDraggedOver ? undefined : textColor }}
                                                                draggable={true}
                                                                onDragStart={(e) => handleDragStart(e, assignment, c.id, dayIndex, hourIndex)}
                                                                onDragOver={(e) => handleDragOver(e, c.id, dayIndex, hourIndex)}
                                                                onDragLeave={handleDragLeave}
                                                                onDrop={(e) => handleDrop(e, c.id, dayIndex, hourIndex)}
                                                                onDragEnd={handleDragEnd}
                                                            >
                                                                <div className="flex flex-col items-center justify-center text-center text-xs">
                                                                    <p className="font-bold leading-tight">{assignment.lessonName}</p>
                                                                    <p className="text-xs opacity-80">({getEntityName('teachers', assignment.teacherId)})</p>
                                                                </div>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(c.id, dayIndex, hourIndex);
                                                                    }} 
                                                                    className="absolute top-0.5 right-0.5 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-white/80 rounded-full hover:bg-white" 
                                                                    aria-label="Sil"
                                                                >
                                                                    <Icon icon="trash" className="w-3 h-3" />
                                                                </button>
                                                            </td>
                                                        );
                                                    } else {
                                                        const isDraggedOver = dragOverCell?.classId === c.id && dragOverCell?.day === dayIndex && dragOverCell?.hour === hourIndex;
                                                        
                                                        // Boş hücre için çakışma ve kural kontrolü
                                                        let hasConflict = false;
                                                        let hasRuleViolation = false;
                                                        if (isDraggedOver && draggedItem) {
                                                            const draggedAssignment = data.assignments.find(a => a.id === draggedItem.assignmentId);
                                                            if (draggedAssignment) {
                                                                const tempAssignment: Omit<Assignment, 'id'> = {
                                                                    ...draggedAssignment,
                                                                    classId: c.id,
                                                                    day: dayIndex,
                                                                    hour: hourIndex
                                                                };
                                                                const otherAssignments = data.assignments.filter(a => a.id !== draggedItem.assignmentId);
                                                                hasConflict = !!checkConflict(tempAssignment, otherAssignments);
                                                                const consecutiveCheck = checkConsecutiveLessonsRule(tempAssignment, otherAssignments);
                                                                hasRuleViolation = !consecutiveCheck.isValid;
                                                            }
                                                        }
                                                        
                                                        return (
                                                            <td 
                                                                key={c.id} 
                                                                className={`p-1 border dark:border-gray-300 dark:border-gray-600 align-middle h-12 transition-all ${
                                                                    isDraggedOver 
                                                                        ? hasConflict 
                                                                            ? 'ring-2 ring-red-400 bg-red-50 dark:bg-red-900/30' 
                                                                            : hasRuleViolation
                                                                                ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/30'
                                                                                : 'ring-2 ring-green-400 bg-green-50 dark:bg-green-900/30'
                                                                        : ''
                                                                }`}
                                                                onDragOver={(e) => handleDragOver(e, c.id, dayIndex, hourIndex)}
                                                                onDragLeave={handleDragLeave}
                                                                onDrop={(e) => handleDrop(e, c.id, dayIndex, hourIndex)}
                                                            >
                                                                <button 
                                                                    onClick={() => handleOpenManualModal(dayIndex, hourIndex, c.id)} 
                                                                    className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors"
                                                                >
                                                                    <Icon icon="plus" className="w-4 h-4"/>
                                                                </button>
                                                            </td>
                                                        );
                                                    }
                                                })}
                                            </tr>
                                        );
                                    });
                                })()}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <Modal isOpen={isManualAssignModalOpen} onClose={handleCloseManualModal} title={`Ders Ata (${selectedSlot ? `${getEntityName('classes', assignmentForm.classId || '')} - ${DAYS_OF_WEEK[selectedSlot.day]}, ${lessonTimes[selectedSlot.hour]?.label}` : ''})`}>
                <div className="space-y-4">
                    <Select label="Öğretmen" value={assignmentForm.teacherId || ''} onChange={e => setAssignmentForm(p => ({...p, teacherId: e.target.value, lessonName: ''}))}>
                        <option value="">Seçiniz...</option>
                        {data.teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                     <Select label="Ders" value={assignmentForm.lessonName || ''} onChange={e => setAssignmentForm(p => ({...p, lessonName: e.target.value}))} disabled={!assignmentForm.teacherId}>
                        <option value="">Önce Öğretmen Seçin...</option>
                        {selectedTeacherForManual?.lessons.map(l => <option key={l} value={l}>{l}</option>)}
                    </Select>
                    <Select label="Sınıf" value={assignmentForm.classId || ''} onChange={e => setAssignmentForm(p => ({...p, classId: e.target.value}))} disabled={!!assignmentForm.classId && selectedSlot !== null}>
                        <option value="">Seçiniz...</option>
                        {data.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <Select label="Derslik (Opsiyonel)" value={assignmentForm.classroomId || ''} onChange={e => setAssignmentForm(p => ({...p, classroomId: e.target.value}))}>
                        <option value="">Seçiniz...</option>
                        {data.classrooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </Select>
                    <div className="flex justify-end gap-4 pt-4">
                        <Button variant="secondary" onClick={handleCloseManualModal}>İptal</Button>
                        <Button onClick={handleManualSave}>Ata</Button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isResultModalOpen} onClose={() => setResultModalOpen(false)} title="Otomatik Atama Sonuçları">
                {assignmentResult && (
                    <div className="space-y-4">
                        <p className="text-lg">Atama işlemi tamamlandı!</p>
                        {assignmentResult.attemptCount && (
                            <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                                <p className="font-semibold text-blue-800 dark:text-blue-200">
                                    🎯 {assignmentResult.attemptCount} deneme yapıldı
                                    {assignmentResult.unassigned.length === 0 && ' - Tüm dersler başarıyla yerleştirildi! 🎉'}
                                </p>
                            </div>
                        )}
                        <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg">
                            <p className="font-semibold text-green-800 dark:text-green-200">Başarıyla atanan ders saati: {assignmentResult.assigned.length}</p>
                        </div>
                        <div className={`p-4 rounded-lg ${assignmentResult.unassigned.length > 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-gray-100 dark:bg-gray-700'}`}>
                             <p className={`font-semibold ${assignmentResult.unassigned.length > 0 ? 'text-red-800 dark:text-red-200' : ''}`}>Atanamayan ders saati: {assignmentResult.unassigned.length}</p>
                            {assignmentResult.unassigned.length > 0 && (
                                <ul className="list-disc list-inside mt-2 text-sm">
                                    {assignmentResult.unassigned.map((req, i) => (
                                        <li key={i}>{getEntityName('classes', req.classId)} - {req.lessonName} - {getEntityName('teachers', req.teacherId)}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="flex justify-end gap-4 pt-4">
                            <Button variant="secondary" onClick={() => setResultModalOpen(false)}>İptal</Button>
                            <Button onClick={handleApplyResults} disabled={assignmentResult.assigned.length === 0}>Sonuçları Uygula</Button>
                        </div>
                    </div>
                )}
            </Modal>

        </div>
    );
};

const ReportsPage = () => {
    const { data, setData } = useData();
    const lessonTimes = useLessonTimes();
    const dayLessonTimes = useAllDayLessonTimes();
    const [reportType, setReportType] = useState<'class' | 'teacher'>('class');
    const [selectedId, setSelectedId] = useState<string>('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const reportData = useMemo(() => {
        if (!selectedId) return [];
        return data.assignments.filter(a => reportType === 'class' ? a.classId === selectedId : a.teacherId === selectedId);
    }, [selectedId, reportType, data.assignments]);

    const getEntityName = (type: keyof Omit<AppData, 'assignments' | 'schoolInfo'>, id?: string) => {
        if (!id) return '';
        return (data[type] as any[])?.find(item => item.id === id)?.name || id
    };

    const handlePdfExport = async () => {
        if (!selectedId) {
            alert("Lütfen bir rapor seçin.");
            return;
        }
        
        const title = `${getEntityName(reportType === 'class' ? 'classes' : 'teachers', selectedId)} Ders Programı`;
        
        // Hafta içi günler (Pazartesi-Cuma) ve hafta sonu ayrı başlıklar
        const weekdayHeaders: string[] = [];
        const weekendHeaders: string[] = [];
        
        for (let dayIndex = 0; dayIndex < data.schoolInfo.daysInWeek; dayIndex++) {
            if (dayIndex < 5) { // Hafta içi (Pazartesi-Cuma)
                weekdayHeaders.push(DAYS_OF_WEEK[dayIndex]);
            } else { // Hafta sonu
                weekendHeaders.push(DAYS_OF_WEEK[dayIndex]);
            }
        }
        
        // Başlık satırı: Hafta İçi + Hafta Sonu Saatleri + Hafta Sonu
        const headers = [['Hafta İçi Saatleri', ...weekdayHeaders, 'Hafta Sonu Saatleri', ...weekendHeaders]];
        const body: string[][] = [];
        
        // Maksimum ders sayısını bul
        const maxLessons = Math.max(...Array.from({ length: data.schoolInfo.daysInWeek }, (_, dayIndex) => 
            dayLessonTimes[dayIndex]?.length || 0
        ));
        
        // Her ders saati için satır oluştur
        for (let hour = 0; hour < maxLessons; hour++) {
            // Hafta içi saatleri (Pazartesi'nin saatlerini referans al)
            const weekdayTimeSlot = dayLessonTimes[0] && dayLessonTimes[0][hour] 
                ? `${dayLessonTimes[0][hour].start}-${dayLessonTimes[0][hour].end}` 
                : `${hour + 1}. Ders`;
            
            const row = [weekdayTimeSlot];
            
            // Hafta içi günler (Pazartesi-Cuma)
            for (let day = 0; day < 5 && day < data.schoolInfo.daysInWeek; day++) {
                const dayLessons = dayLessonTimes[day] || [];
                
                if (hour >= dayLessons.length) {
                    row.push(''); // Bu günde bu ders saati yok
                } else {
                    const assignment = reportData.find(a => a.day === day && a.hour === hour);
                    
                    let cellContent = '';
                    if (assignment) {
                        const lessonName = assignment.lessonName;
                        const counterpart = reportType === 'class'
                            ? getEntityName('teachers', assignment.teacherId)
                            : getEntityName('classes', assignment.classId);
                        cellContent = `${lessonName}\n${counterpart}`;
                    }
                    
                    row.push(cellContent);
                }
            }
            
            // Hafta sonu saatleri (Cumartesi'nin saatlerini referans al)
            const weekendTimeSlot = data.schoolInfo.daysInWeek > 5 && dayLessonTimes[5] && dayLessonTimes[5][hour] 
                ? `${dayLessonTimes[5][hour].start}-${dayLessonTimes[5][hour].end}` 
                : `${hour + 1}. Ders`;
            
            row.push(weekendTimeSlot);
            
            // Hafta sonu günler (Cumartesi, Pazar)
            for (let day = 5; day < data.schoolInfo.daysInWeek; day++) {
                const dayLessons = dayLessonTimes[day] || [];
                
                if (hour >= dayLessons.length) {
                    row.push(''); // Bu günde bu ders saati yok
                } else {
                    const assignment = reportData.find(a => a.day === day && a.hour === hour);
                    
                    let cellContent = '';
                    if (assignment) {
                        const lessonName = assignment.lessonName;
                        const counterpart = reportType === 'class'
                            ? getEntityName('teachers', assignment.teacherId)
                            : getEntityName('classes', assignment.classId);
                        cellContent = `${lessonName}\n${counterpart}`;
                    }
                    
                    row.push(cellContent);
                }
            }
            
            body.push(row);
        }
        
        try {
            await generatePdf(title, headers, body);
        } catch (error) {
            console.error('PDF oluşturma hatası:', error);
            alert('PDF oluşturulurken bir hata oluştu.');
        }
    };
    
    const handleJsonImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text === 'string') {
                        const importedData = JSON.parse(text);
                        if ('schoolInfo' in importedData && 'teachers' in importedData) {
                            if (window.confirm("Mevcut verileriniz içe aktarılan veri ile değiştirilecektir. Onaylıyor musunuz?")) {
                                setData(importedData);
                                alert("Veriler başarıyla içe aktarıldı.");
                            }
                        } else {
                            throw new Error("Invalid data format");
                        }
                    }
                } catch (err) {
                    alert("Hata: Geçersiz JSON dosyası veya formatı.");
                    console.error(err);
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <h2 className="text-lg font-semibold mb-4">Program Görüntüle ve Dışa Aktar</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Select label="Rapor Türü" value={reportType} onChange={e => { setReportType(e.target.value as any); setSelectedId(''); }}>
                        <option value="class">Sınıf Programı</option>
                        <option value="teacher">Öğretmen Programı</option>
                    </Select>
                    <Select label={reportType === 'class' ? "Sınıf Seç" : "Öğretmen Seç"} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                        <option value="">Seçiniz...</option>
                        {(reportType === 'class' ? data.classes : data.teachers).map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                    </Select>
                    <div className="self-end">
                        <Button onClick={handlePdfExport} disabled={!selectedId}>
                             <Icon icon="download" className="w-5 h-5"/> PDF Olarak İndir
                        </Button>
                    </div>
                </div>
                 {selectedId && (
                     <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-center">
                            <thead>
                                <tr>
                                    <th className="p-2 border dark:border-gray-600">Hafta İçi Saatleri</th>
                                    {Array.from({ length: data.schoolInfo.daysInWeek }).map((_, i) => {
                                        const elements = [];
                                        
                                        // Cuma (4) ile Cumartesi (5) arasında saat sütunu ekle
                                        if (i === 5) { // Cumartesi'den önce
                                            elements.push(
                                                <th key="weekend-hours-header" className="p-2 border dark:border-gray-600 bg-yellow-100 dark:bg-yellow-900/30">
                                                    <div className="text-center">
                                                        <div className="font-bold">Hafta Sonu Saatleri</div>
                                                        {dayLessonTimes[5] && dayLessonTimes[5].length > 0 && (
                                                            <>
                                                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                                    {dayLessonTimes[5][0].start} - {dayLessonTimes[5][dayLessonTimes[5].length - 1].end}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    ({dayLessonTimes[5].length} ders)
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        }
                                        
                                        // Normal gün başlığı
                                        const dayLessons = dayLessonTimes[i] || [];
                                        const startTime = dayLessons.length > 0 ? dayLessons[0].start : '';
                                        const endTime = dayLessons.length > 0 ? dayLessons[dayLessons.length - 1].end : '';
                                        const isWeekend = i >= 5; // Cumartesi (5) ve Pazar (6)
                                        
                                        elements.push(
                                            <th key={i} className={`p-2 border dark:border-gray-600 min-w-[150px] ${isWeekend ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
                                                <div className="text-center">
                                                    <div className="font-bold">{DAYS_OF_WEEK[i]}</div>
                                                    {startTime && endTime && (
                                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                            {startTime} - {endTime}
                                                        </div>
                                                    )}
                                                    {dayLessons.length > 0 && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            ({dayLessons.length} ders)
                                                        </div>
                                                    )}
                                                </div>
                                            </th>
                                        );
                                        
                                        return elements;
                                    }).flat()}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    // Tüm günlerin maksimum ders sayısını bul
                                    const maxLessons = Math.max(...Array.from({ length: data.schoolInfo.daysInWeek }, (_, dayIndex) => 
                                        dayLessonTimes[dayIndex]?.length || 0
                                    ));
                                    
                                    return Array.from({ length: maxLessons }).map((_, hourIndex) => (
                                        <tr key={hourIndex}>
                                            <td className="p-2 border dark:border-gray-600 font-mono h-20 bg-gray-50 dark:bg-gray-800">
                                                <div className="text-center">
                                                    <div className="font-bold">{hourIndex + 1}. Ders</div>
                                                </div>
                                            </td>
                                            {Array.from({ length: data.schoolInfo.daysInWeek }).map((_, dayIndex) => {
                                                // Cuma (4) ile Cumartesi (5) arasında saat sütunu ekle
                                                const elements = [];
                                                
                                                if (dayIndex === 5) { // Cumartesi'den önce
                                                    elements.push(
                                                        <td key="weekend-hours" className="p-2 border dark:border-gray-600 font-mono h-20 bg-yellow-100 dark:bg-yellow-900/30">
                                                            <div className="text-center">
                                                                <div className="font-bold">{hourIndex + 1}. Ders</div>
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                
                                                // Normal gün sütunu
                                                const dayLessons = dayLessonTimes[dayIndex] || [];
                                                const isWeekend = dayIndex >= 5; // Cumartesi (5) ve Pazar (6)
                                                
                                                // Bu günde bu ders saati var mı?
                                                if (hourIndex >= dayLessons.length) {
                                                    elements.push(
                                                        <td key={dayIndex} className={`p-2 border dark:border-gray-600 bg-gray-100 dark:bg-gray-700 ${isWeekend ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
                                                        </td>
                                                    );
                                                } else {
                                                    const lesson = dayLessons[hourIndex];
                                                    const assignment = reportData.find(a => a.day === dayIndex && a.hour === hourIndex);
                                                    
                                                    elements.push(
                                                        <td key={dayIndex} className={`p-2 border dark:border-gray-600 align-top text-sm h-20 ${isWeekend ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
                                                            {/* Atanan ders */}
                                                            {assignment && (
                                                                 <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-left h-full flex flex-col justify-center">
                                                                    <p className="font-bold">{assignment.lessonName}</p>
                                                                    <p>{reportType === 'class' ? getEntityName('teachers', assignment.teacherId) : getEntityName('classes', assignment.classId)}</p>
                                                                    {assignment.classroomId && <p className="text-xs text-gray-500">{getEntityName('classrooms', assignment.classroomId)}</p>}
                                                                 </div>
                                                            )}
                                                        </td>
                                                    );
                                                }
                                                
                                                return elements;
                                            }).flat()}
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                     </div>
                 )}
            </Card>
            
            <Card>
                <h2 className="text-lg font-semibold mb-4">Veri Yönetimi</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={() => exportDataAsJSON(data)}>
                        <Icon icon="download" className="w-5 h-5"/> Tüm Veriyi JSON İndir
                    </Button>
                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                         <Icon icon="upload" className="w-5 h-5"/> JSON Dosyasından Yükle
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleJsonImport}/>
                </div>
                <p className="text-sm text-gray-500 mt-2">Tüm program verilerinizi yedekleyebilir veya başka bir cihazda kullanmak için indirebilirsiniz.</p>
            </Card>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function App() {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);
  
  return (
    <ThemeProvider>
        <DataProvider>
            <HashRouter>
                <div className="flex h-screen text-gray-800 dark:text-gray-200">
                    <Sidebar 
                        isMobileOpen={isMobileOpen} 
                        setMobileOpen={setMobileOpen}
                        isCollapsed={isCollapsed}
                        setCollapsed={setCollapsed}
                    />
                    <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
                        <Header onMenuClick={() => setMobileOpen(true)} />
                        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                            <AnimatePresence mode="wait">
                                <Routes>
                                    <Route path="/" element={<PageLayout><DashboardPage /></PageLayout>} />
                                    <Route path="/info" element={<PageLayout><GeneralInfoPage /></PageLayout>} />
                                    <Route path="/teachers" element={<PageLayout><TeachersPage /></PageLayout>} />
                                    <Route path="/classes" element={<PageLayout><ClassesPage /></PageLayout>} />
                                    <Route path="/classrooms" element={<PageLayout><ClassroomsPage /></PageLayout>} />
                                    <Route path="/assignments" element={<PageLayout><AssignmentsPage /></PageLayout>} />
                                    <Route path="/reports" element={<PageLayout><ReportsPage /></PageLayout>} />
                                </Routes>
                            </AnimatePresence>
                            <BackupModal />
                        </main>
                    </div>
                </div>
            </HashRouter>
        </DataProvider>
    </ThemeProvider>
  );
}

const BackupModal: FC = () => {
    const { 
        backups, 
        isLoadingBackups, 
        backupModalOpen, 
        setBackupModalOpen, 
        saveBackup, 
        restoreBackup, 
        deleteBackup 
    } = useData();
    
    const [backupName, setBackupName] = useState('');

    const handleSaveBackup = async () => {
        if (!backupName.trim()) {
            alert('Lütfen yedek adı girin!');
            return;
        }
        
        await saveBackup(backupName.trim());
        setBackupName('');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('tr-TR');
    };

    if (!backupModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Program Yedekleme</h2>
                    <button 
                        onClick={() => setBackupModalOpen(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <Icon icon="x" className="w-6 h-6" />
                    </button>
                </div>

                {/* Yeni Yedek Oluşturma */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">Yeni Yedek Oluştur</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={backupName}
                            onChange={(e) => setBackupName(e.target.value)}
                            placeholder="Yedek adı girin..."
                            className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveBackup()}
                        />
                        <Button 
                            onClick={handleSaveBackup}
                            disabled={isLoadingBackups || !backupName.trim()}
                        >
                            <Icon icon="save" className="w-4 h-4 mr-2" />
                            Yedekle
                        </Button>
                    </div>
                </div>

                {/* Mevcut Yedekler */}
                <div>
                    <h3 className="text-lg font-semibold mb-3">Kayıtlı Yedekler</h3>
                    {isLoadingBackups ? (
                        <div className="text-center py-4">Yükleniyor...</div>
                    ) : backups.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">Henüz yedek bulunmuyor</div>
                    ) : (
                        <div className="space-y-2">
                            {backups.map((backup) => (
                                <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                    <div>
                                        <div className="font-medium">{backup.name}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(backup.created_at)}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => restoreBackup(backup)}
                                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                        >
                                            <Icon icon="download" className="w-4 h-4 mr-1 inline" />
                                            Geri Yükle
                                        </button>
                                        <button
                                            onClick={() => deleteBackup(backup.id)}
                                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                        >
                                            <Icon icon="trash" className="w-4 h-4 mr-1 inline" />
                                            Sil
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const PageLayout: FC<{children: ReactNode}> = ({ children }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
    >
        {children}
    </motion.div>
);