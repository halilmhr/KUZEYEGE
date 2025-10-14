export enum AvailabilityStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  PREFERRED = 'preferred',
}

export type Availability = {
  [dayIndex: number]: {
    [hourIndex: number]: AvailabilityStatus;
  };
};

export interface LessonTime {
  start: string;
  end: string;
}

export interface SchoolInfo {
  name: string;
  director: string;
  year: string;
  daysInWeek: number;
  lessonTimes: LessonTime[];
}

export interface Teacher {
  id: string;
  name: string;
  code: string;
  lessons: string[];
  availability: Availability;
}

export interface CurriculumItem {
  id: string;
  lessonName: string;
  hours: number;
  teacherId: string;
}

export interface ClassData {
  id: string;
  name: string;
  level: string;
  availability: Availability;
  curriculum: CurriculumItem[];
  startHour: number;
  endHour: number;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  availability: Availability;
}

export interface Assignment {
  id:string;
  lessonName: string;
  teacherId: string;
  classId: string;
  classroomId?: string;
  day: number;
  hour: number;
}

export interface AppData {
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  classes: ClassData[];
  classrooms: Classroom[];
  assignments: Assignment[];
}