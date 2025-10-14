
import React, { useState, useEffect, createContext, useContext, useMemo, useCallback, Fragment, FC, ReactNode } from 'react';
import { HashRouter, Routes, Route, NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppData, SchoolInfo, AvailabilityStatus, Availability, Teacher, ClassData, Classroom, Assignment, CurriculumItem, LessonTime } from './types';
import { generateId, exportDataAsJSON, generatePdf } from './utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


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

const DataContext = createContext<{ data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>> }>({
  data: INITIAL_DATA,
  setData: () => {},
});

// --- HOOKS ---
const useData = () => useContext(DataContext);
const useTheme = () => useContext(ThemeContext);

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

    return <DataContext.Provider value={{ data, setData }}>{children}</DataContext.Provider>;
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
const Sidebar: FC<{ isMobileOpen: boolean; setMobileOpen: (open: boolean) => void }> = ({ isMobileOpen, setMobileOpen }) => {
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
                `flex items-center gap-4 px-4 py-3 rounded-lg text-lg transition-colors ${
                    isActive
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`
            }
        >
            <Icon icon={icon} className="w-6 h-6" />
            <span>{label}</span>
        </NavLink>
    );

    return (
        <>
            <aside className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 w-64 shadow-lg z-30 transform transition-transform duration-300 md:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6">
                    <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Ders Planlama</h1>
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
    const { data, setData } = useData();
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
}
const AvailabilityGrid: FC<AvailabilityGridProps> = ({ availability, onAvailabilityChange, days, hours, lessonTimes }) => {
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
        
        // O gündeki tüm saatlerin mevcut durumunu kontrol et
        const dayStatuses = Array.from({ length: hours }).map((_, hourIndex) => 
            newAvailability[dayIndex][hourIndex] || AvailabilityStatus.AVAILABLE
        );
        
        // En yaygın durumu bul veya ilk durumu al
        const mostCommonStatus = dayStatuses[0] || AvailabilityStatus.AVAILABLE;
        const nextStatus = cycleStatus(mostCommonStatus);
        
        // Tüm saatleri yeni durumla güncelle
        for (let hourIndex = 0; hourIndex < hours; hourIndex++) {
            newAvailability[dayIndex][hourIndex] = nextStatus;
        }
        
        onAvailabilityChange(newAvailability);
    };

    // Saat başlığına tıklayınca o saatin tüm günlerini değiştir
    const handleHourClick = (hourIndex: number) => {
        const newAvailability = { ...availability };
        
        // O saatteki tüm günlerin mevcut durumunu kontrol et
        const hourStatuses = Array.from({ length: days }).map((_, dayIndex) => 
            newAvailability[dayIndex]?.[hourIndex] || AvailabilityStatus.AVAILABLE
        );
        
        // En yaygın durumu bul veya ilk durumu al
        const mostCommonStatus = hourStatuses[0] || AvailabilityStatus.AVAILABLE;
        const nextStatus = cycleStatus(mostCommonStatus);
        
        // Tüm günleri yeni durumla güncelle
        for (let dayIndex = 0; dayIndex < days; dayIndex++) {
            if (!newAvailability[dayIndex]) {
                newAvailability[dayIndex] = {};
            }
            newAvailability[dayIndex][hourIndex] = nextStatus;
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
                        <th className="p-1 border dark:border-gray-600">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Saat</span>
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
                    {Array.from({ length: hours }).map((_, hourIndex) => (
                        <tr key={hourIndex}>
                            <td 
                                className="p-1 border dark:border-gray-600 font-mono text-xs whitespace-pre-wrap cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                onClick={() => handleHourClick(hourIndex)}
                                title={`${lessonTimes[hourIndex]?.label || `${hourIndex + 1}. Ders`} saatinin tüm günlerini değiştirmek için tıklayın`}
                            >
                                {lessonTimes[hourIndex]?.label.replace(' - ', '\n-\n') || `${hourIndex + 1}. Ders`}
                            </td>
                            {Array.from({ length: days }).map((_, dayIndex) => {
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

    const [autoGen, setAutoGen] = useState({ count: 8, start: '09:00', duration: 40, breakTime: 10 });

    const handleTimeChange = (index: number, field: 'start' | 'end', value: string) => {
        const newTimes = [...lessonTimes];
        newTimes[index] = { ...newTimes[index], [field]: value };
        setLessonTimes(newTimes);
    };

    const addLessonTime = () => {
        setLessonTimes([...lessonTimes, { start: '', end: '' }]);
    };
    
    const removeLessonTime = (index: number) => {
        if (window.confirm("Bu ders saatini silmek istediğinizden emin misiniz?")) {
            setLessonTimes(lessonTimes.filter((_, i) => i !== index));
        }
    };
    
    const handleAutoGen = () => {
        const newTimes = generateDefaultTimes(autoGen.count, autoGen.start, autoGen.duration, autoGen.breakTime);
        setLessonTimes(newTimes);
    };

    return (
      <div className="space-y-6">
          <Card className="bg-gray-50 dark:bg-gray-700/50">
             <h3 className="text-base font-semibold mb-3">Otomatik Zamanlama Oluşturucu</h3>
             <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Ders saatlerini hızlıca oluşturmak için aşağıdaki formu kullanın. Oluşturulan zamanlamayı daha sonra manuel olarak düzenleyebilirsiniz.
             </p>
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <Input label="Ders Sayısı" type="number" min="1" value={autoGen.count} onChange={e => setAutoGen({...autoGen, count: parseInt(e.target.value) || 1})} />
                <Input label="Başlangıç" type="time" value={autoGen.start} onChange={e => setAutoGen({...autoGen, start: e.target.value})} />
                <Input label="Ders Süresi (dk)" type="number" min="1" value={autoGen.duration} onChange={e => setAutoGen({...autoGen, duration: parseInt(e.target.value) || 1})} />
                <Input label="Teneffüs (dk)" type="number" min="0" value={autoGen.breakTime} onChange={e => setAutoGen({...autoGen, breakTime: parseInt(e.target.value) || 0})} />
                <Button onClick={handleAutoGen} variant="secondary" className="w-full">
                    <Icon icon="zap" className="w-5 h-5" /> Oluştur
                </Button>
             </div>
          </Card>
          
          <div>
            <h3 className="text-base font-semibold mb-3">Ders Saatleri (Toplam: {lessonTimes.length} ders)</h3>
            <div className="space-y-3">
              {lessonTimes.map((time, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                  <span className="font-bold w-12 text-center text-gray-600 dark:text-gray-400">{index + 1}.</span>
                  <Input label="Başlangıç Saati" type="time" value={time.start} onChange={e => handleTimeChange(index, 'start', e.target.value)} />
                  <Input label="Bitiş Saati" type="time" value={time.end} onChange={e => handleTimeChange(index, 'end', e.target.value)} />
                  <IconButton icon="trash" label="Sil" onClick={() => removeLessonTime(index)} className="text-red-500 self-end mb-1" />
                </div>
              ))}
            </div>
            <Button onClick={addLessonTime} variant="secondary" className="mt-4">
                <Icon icon="plus" className="w-5 h-5"/> Yeni Ders Saati Ekle
            </Button>
          </div>
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
        if (schoolInfo.lessonTimes.some(t => !t.start || !t.end)) {
            alert("Lütfen tüm ders saatlerinin başlangıç ve bitiş zamanlarını doldurun.");
            return;
        }
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
                </div>
                
                <div className="pt-4 border-t dark:border-gray-600">
                    <LessonTimeEditor 
                        lessonTimes={schoolInfo.lessonTimes} 
                        setLessonTimes={newTimes => setSchoolInfo(prev => ({ ...prev, lessonTimes: newTimes }))} 
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
                        hours={data.schoolInfo.lessonTimes.length}
                        lessonTimes={lessonTimes}
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
            startHour: 0,
            endHour: data.schoolInfo.lessonTimes.length > 0 ? data.schoolInfo.lessonTimes.length - 1 : 0,
            ...item 
        } as ClassData)}
        formFields={(item, onChange) => {
            return (
                <>
                    <Input label="Sınıf Adı" value={item.name || ''} onChange={e => onChange({ name: e.target.value })} />
                    <Input label="Seviye" value={item.level || ''} onChange={e => onChange({ level: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <Select
                            label="Başlangıç Saati"
                            value={(item as ClassData).startHour ?? 0}
                            onChange={e => {
                                const newStartHour = parseInt(e.target.value);
                                const currentEndHour = (item as ClassData).endHour ?? data.schoolInfo.lessonTimes.length - 1;
                                onChange({ 
                                    startHour: newStartHour,
                                    endHour: newStartHour > currentEndHour ? newStartHour : currentEndHour
                                } as Partial<ClassData>);
                            }}
                        >
                            {lessonTimes.map(time => (
                                <option key={time.index} value={time.index}>{time.label}</option>
                            ))}
                        </Select>
                        <Select
                            label="Bitiş Saati"
                            value={(item as ClassData).endHour ?? data.schoolInfo.lessonTimes.length - 1}
                            onChange={e => onChange({ endHour: parseInt(e.target.value) } as Partial<ClassData>)}
                        >
                            {lessonTimes.filter(time => time.index >= ((item as ClassData).startHour ?? 0)).map(time => (
                                <option key={time.index} value={time.index}>{time.label}</option>
                            ))}
                        </Select>
                    </div>
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
    const [isManualAssignModalOpen, setManualAssignModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ day: number; hour: number } | null>(null);
    const [assignmentForm, setAssignmentForm] = useState<Partial<Omit<Assignment, 'id'>>>({});

    const [isResultModalOpen, setResultModalOpen] = useState(false);
    const [assignmentResult, setAssignmentResult] = useState<{ assigned: Assignment[], unassigned: any[] } | null>(null);
    const [clearExisting, setClearExisting] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

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
                Array(item.hours).fill({
                    lessonName: item.lessonName,
                    teacherId: item.teacherId,
                    classId: c.id
                })
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
        if (conflict) {
            alert(`Çakışma Tespit Edildi: ${conflict}`);
            return;
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
        setTimeout(() => {
            const { schoolInfo, teachers, classes, classrooms, assignments } = data;
    
            const requirements = allRequirements;

            const getAvailabilityStatus = (entity: Teacher | ClassData | Classroom, day: number, hour: number) =>
                entity.availability?.[day]?.[hour] || AvailabilityStatus.AVAILABLE;
            
            const getScore = (status: AvailabilityStatus) => {
                if (status === AvailabilityStatus.UNAVAILABLE) return -Infinity;
                if (status === AvailabilityStatus.PREFERRED) return 2;
                return 1;
            };

            const existingAssignments = clearExisting ? [] : [...assignments];
            const occupiedSlots = new Set(existingAssignments.flatMap(a => [
                `t-${a.teacherId}-${a.day}-${a.hour}`,
                `c-${a.classId}-${a.day}-${a.hour}`,
                a.classroomId ? `r-${a.classroomId}-${a.day}-${a.hour}`: null,
            ].filter(Boolean) as string[]));

            const scoredSlotsByReq = requirements.map((req, index) => {
                const possibleSlots: { day: number, hour: number, classroomId?: string, score: number }[] = [];
                const teacher = teachers.find(t => t.id === req.teacherId);
                const classData = classes.find(c => c.id === req.classId);

                if (!teacher || !classData) return { req, index, possibleSlots };

                const classStartHour = classData.startHour ?? 0;
                const classEndHour = classData.endHour ?? (schoolInfo.lessonTimes.length > 0 ? schoolInfo.lessonTimes.length - 1 : 0);

                for (let day = 0; day < schoolInfo.daysInWeek; day++) {
                    for (let hour = classStartHour; hour <= classEndHour; hour++) {
                        const teacherStatus = getAvailabilityStatus(teacher, day, hour);
                        const classStatus = getAvailabilityStatus(classData, day, hour);

                        if (teacherStatus === AvailabilityStatus.UNAVAILABLE || classStatus === AvailabilityStatus.UNAVAILABLE) {
                            continue;
                        }
                        
                        if (occupiedSlots.has(`t-${req.teacherId}-${day}-${hour}`) || occupiedSlots.has(`c-${req.classId}-${day}-${hour}`)) {
                            continue;
                        }

                        const baseScore = getScore(teacherStatus) + getScore(classStatus);

                        if (classrooms.length === 0) {
                            possibleSlots.push({ day, hour, classroomId: undefined, score: baseScore });
                        } else {
                            for (const classroom of classrooms) {
                                const classroomStatus = getAvailabilityStatus(classroom, day, hour);
                                if (classroomStatus !== AvailabilityStatus.UNAVAILABLE && !occupiedSlots.has(`r-${classroom.id}-${day}-${hour}`)) {
                                    const finalScore = baseScore + getScore(classroomStatus);
                                    possibleSlots.push({ day, hour, classroomId: classroom.id, score: finalScore });
                                }
                            }
                        }
                    }
                }
                return { req, index, possibleSlots };
            });

            scoredSlotsByReq.sort((a, b) => a.possibleSlots.length - b.possibleSlots.length);
            
            const newAssignments: Assignment[] = [];
            const unassigned: any[] = [];
            const newOccupiedSlots = new Set(occupiedSlots);

            for (const item of scoredSlotsByReq) {
                item.possibleSlots.sort((a, b) => b.score - a.score);
                
                let placed = false;
                for (const slot of item.possibleSlots) {
                    const teacherKey = `t-${item.req.teacherId}-${slot.day}-${slot.hour}`;
                    const classKey = `c-${item.req.classId}-${slot.day}-${slot.hour}`;
                    const classroomKey = slot.classroomId ? `r-${slot.classroomId}-${slot.day}-${slot.hour}` : undefined;

                    if (!newOccupiedSlots.has(teacherKey) && !newOccupiedSlots.has(classKey) && (!classroomKey || !newOccupiedSlots.has(classroomKey))) {
                        newAssignments.push({ ...item.req, ...slot, id: generateId() });
                        newOccupiedSlots.add(teacherKey);
                        newOccupiedSlots.add(classKey);
                        if (classroomKey) newOccupiedSlots.add(classroomKey);
                        placed = true;
                        break;
                    }
                }

                if (!placed) unassigned.push(item.req);
            }
            
            setAssignmentResult({ assigned: newAssignments, unassigned });
            setResultModalOpen(true);
            setIsLoading(false);
        }, 50);
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

            <h2 className="text-lg font-semibold mt-8 mb-4">Ders Programı Tablosu</h2>
            <div className="overflow-x-auto bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <table className="w-full border-collapse text-center min-w-[1200px]">
                    <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700">
                            <th className="p-2 border dark:border-gray-300 dark:border-gray-600 w-32">Gün</th>
                            <th className="p-2 border dark:border-gray-300 dark:border-gray-600 w-40">Saat</th>
                            {data.classes.map(c => (
                                <th key={c.id} className="p-2 border dark:border-gray-300 dark:border-gray-600 font-semibold">{c.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: data.schoolInfo.daysInWeek }).map((_, dayIndex) => (
                            <Fragment key={dayIndex}>
                                {lessonTimes.map((lessonTime, hourIndex) => {
                                    return (
                                        <tr key={`${dayIndex}-${hourIndex}`} className="h-20">
                                            {hourIndex === 0 && (
                                                <td rowSpan={lessonTimes.length} className="p-2 border dark:border-gray-300 dark:border-gray-600 font-bold align-middle text-lg">
                                                    {DAYS_OF_WEEK[dayIndex]}
                                                </td>
                                            )}
                                            <td className="p-2 border dark:border-gray-300 dark:border-gray-600 font-mono text-sm whitespace-pre-wrap">
                                                 {lessonTime ? (
                                                    <>
                                                        {lessonTime.start}<br/>-<br/>{lessonTime.end}
                                                    </>
                                                ) : `${hourIndex + 1}. Ders`}
                                            </td>
                                            {data.classes.map(c => {
                                                const assignment = assignmentsByClassSlot.get(`${c.id}-${dayIndex}-${hourIndex}`);
                                                const classStartHour = c.startHour ?? 0;
                                                const classEndHour = c.endHour ?? lessonTimes.length - 1;
                                                const isWithinClassHours = hourIndex >= classStartHour && hourIndex <= classEndHour;

                                                if (!isWithinClassHours) {
                                                    return <td key={c.id} className="p-1 border dark:border-gray-300 dark:border-gray-600 align-middle bg-gray-50 dark:bg-gray-900/50" />;
                                                }
                                                
                                                if (assignment) {
                                                    const bgColor = getLessonColor(assignment.lessonName);
                                                    const textColor = getTextColorForBg(bgColor);
                                                    return (
                                                        <td key={c.id} className="p-1 border dark:border-gray-300 dark:border-gray-600 align-middle relative group" style={{ backgroundColor: bgColor, color: textColor }}>
                                                            <div className="flex flex-col items-center justify-center text-center">
                                                                <p className="font-bold">{assignment.lessonName}</p>
                                                                <p className="text-xs">({getEntityName('teachers', assignment.teacherId)})</p>
                                                            </div>
                                                            <button onClick={() => handleDelete(c.id, dayIndex, hourIndex)} className="absolute top-1 right-1 text-black opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/50 rounded-full hover:bg-white/80" aria-label="Sil">
                                                                <Icon icon="trash" className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    );
                                                } else {
                                                    return (
                                                        <td key={c.id} className="p-1 border dark:border-gray-300 dark:border-gray-600 align-middle">
                                                            <button onClick={() => handleOpenManualModal(dayIndex, hourIndex, c.id)} className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors">
                                                                <Icon icon="plus" className="w-6 h-6"/>
                                                            </button>
                                                        </td>
                                                    );
                                                }
                                            })}
                                        </tr>
                                    );
                                })}
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

    const handlePdfExport = () => {
        if (!selectedId) {
            alert("Lütfen bir rapor seçin.");
            return;
        }
        
        const title = `${getEntityName(reportType === 'class' ? 'classes' : 'teachers', selectedId)} Ders Programı`;
        const headers = [['Saat', ...DAYS_OF_WEEK.slice(0, data.schoolInfo.daysInWeek)]];
        const body: string[][] = [];
        
        lessonTimes.forEach((time, hour) => {
            const row = [time.label];
            for (let day = 0; day < data.schoolInfo.daysInWeek; day++) {
                const assignment = reportData.find(a => a.day === day && a.hour === hour);
                if (assignment) {
                    const lesson = assignment.lessonName;
                    const counterpart = reportType === 'class'
                        ? getEntityName('teachers', assignment.teacherId)
                        : getEntityName('classes', assignment.classId);
                    row.push(`${lesson}\n${counterpart}`);
                } else {
                    row.push('');
                }
            }
            body.push(row);
        });
        generatePdf(title, headers, body);
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
                                    <th className="p-2 border dark:border-gray-600">Saat</th>
                                    {Array.from({ length: data.schoolInfo.daysInWeek }).map((_, i) => (
                                        <th key={i} className="p-2 border dark:border-gray-600 min-w-[150px]">{DAYS_OF_WEEK[i]}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {lessonTimes.map((time, hourIndex) => (
                                    <tr key={hourIndex}>
                                        <td className="p-2 border dark:border-gray-600 font-mono h-20">{time.label}</td>
                                        {Array.from({ length: data.schoolInfo.daysInWeek }).map((_, dayIndex) => {
                                            const assignment = reportData.find(a => a.day === dayIndex && a.hour === hourIndex);
                                            return (
                                                <td key={dayIndex} className="p-2 border dark:border-gray-600 align-top text-sm">
                                                    {assignment && (
                                                         <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-left">
                                                            <p className="font-bold">{assignment.lessonName}</p>
                                                            <p>{reportType === 'class' ? getEntityName('teachers', assignment.teacherId) : getEntityName('classes', assignment.classId)}</p>
                                                            {assignment.classroomId && <p className="text-xs text-gray-500">{getEntityName('classrooms', assignment.classroomId)}</p>}
                                                         </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
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
  
  return (
    <ThemeProvider>
        <DataProvider>
            <HashRouter>
                <div className="flex h-screen text-gray-800 dark:text-gray-200">
                    <Sidebar isMobileOpen={isMobileOpen} setMobileOpen={setMobileOpen} />
                    <div className="flex-1 flex flex-col md:ml-64">
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
                        </main>
                    </div>
                </div>
            </HashRouter>
        </DataProvider>
    </ThemeProvider>
  );
}

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