export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  notes?: string;
  archived: boolean;
  createdAt: number;
  customFields?: { [key: string]: string };
}

export interface BPRecord {
  id: string;
  patientId: string;
  timestamp: number;
  systolic: number;
  diastolic: number;
  heartRate: number;
  notes: string;
  photoUrl?: string;
}

export interface GlucoseRecord {
  id: string;
  patientId: string;
  timestamp: number;
  value: number;
  type: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime';
  notes: string;
  photoUrl?: string;
}

export interface InsulinRecord {
  id: string;
  patientId: string;
  timestamp: number;
  type: string;
  dose: number;
  meal: string;
  notes?: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  active: boolean;
  takenLog?: number[]; // Array of timestamps when the medication was taken
  
  // New modular frequency fields
  times?: string[]; // Array of times e.g. ["08:00", "20:00"]
  frequencyType?: 'daily' | 'interval' | 'as_needed' | 'cycle';
  intervalDays?: number; // e.g. every 2 days
  cycleDays?: number[]; // Array of days for cycle frequency (e.g., [1, 2, 3])
  startDate?: number; // Timestamp of when the medication schedule started

  // Legacy fields for backward compatibility
  time?: string;
  frequency?: string;
}

export interface MedicalDocument {
  id: string;
  patientId: string;
  timestamp: number;
  title: string;
  category: string;
  fileData: string; // base64
  fileType: string;
}

export interface UserProfile {
  name: string;
  email: string;
  pin: string;
  pattern?: string; // Android pattern lock
  biometricEnabled?: boolean; // Fingerprint/FaceID
  authMethod?: 'pin' | 'pattern' | 'biometric';
}
