import { Patient, BPRecord, GlucoseRecord, InsulinRecord, Medication, MedicalDocument, UserProfile } from '../types';

const DB_PREFIX = 'smart_health_';

function getItems<T>(key: string): T[] {
  const data = localStorage.getItem(DB_PREFIX + key);
  return data ? JSON.parse(data) : [];
}

function setItems<T>(key: string, items: T[]) {
  localStorage.setItem(DB_PREFIX + key, JSON.stringify(items));
}

export const db = {
  // Patients
  getPatients: () => getItems<Patient>('patients').sort((a, b) => b.createdAt - a.createdAt),
  getPatient: (id: string) => getItems<Patient>('patients').find(p => p.id === id) || null,
  addPatient: (record: Omit<Patient, 'id' | 'createdAt' | 'archived'>) => {
    const items = getItems<Patient>('patients');
    const newItem: Patient = { 
      ...record, 
      id: crypto.randomUUID(), 
      createdAt: Date.now(),
      archived: false 
    };
    setItems('patients', [...items, newItem]);
    return newItem;
  },
  updatePatient: (id: string, record: Partial<Patient>) => {
    const items = getItems<Patient>('patients');
    const updated = items.map(i => i.id === id ? { ...i, ...record } : i);
    setItems('patients', updated);
  },
  deletePatient: (id: string) => {
    const items = getItems<Patient>('patients');
    setItems('patients', items.filter(i => i.id !== id));
    // Also delete all associated records
    setItems('bp', getItems<BPRecord>('bp').filter(r => r.patientId !== id));
    setItems('glucose', getItems<GlucoseRecord>('glucose').filter(r => r.patientId !== id));
    setItems('insulin', getItems<InsulinRecord>('insulin').filter(r => r.patientId !== id));
    setItems('medications', getItems<Medication>('medications').filter(r => r.patientId !== id));
    setItems('documents', getItems<MedicalDocument>('documents').filter(r => r.patientId !== id));
  },
  archivePatient: (id: string) => {
    db.updatePatient(id, { archived: true });
  },
  unarchivePatient: (id: string) => {
    db.updatePatient(id, { archived: false });
  },

  // Blood Pressure
  getBPRecords: (patientId: string) => getItems<BPRecord>('bp').filter(r => r.patientId === patientId).sort((a, b) => b.timestamp - a.timestamp),
  addBPRecord: (patientId: string, record: Omit<BPRecord, 'id' | 'patientId'>) => {
    const items = getItems<BPRecord>('bp');
    const newItem = { ...record, patientId, id: crypto.randomUUID() };
    setItems('bp', [...items, newItem]);
    return newItem;
  },
  updateBPRecord: (id: string, record: Partial<BPRecord>) => {
    const items = getItems<BPRecord>('bp');
    const updated = items.map(i => i.id === id ? { ...i, ...record } : i);
    setItems('bp', updated);
  },
  deleteBPRecord: (id: string) => {
    const items = getItems<BPRecord>('bp');
    setItems('bp', items.filter(i => i.id !== id));
  },

  // Glucose
  getGlucoseRecords: (patientId: string) => getItems<GlucoseRecord>('glucose').filter(r => r.patientId === patientId).sort((a, b) => b.timestamp - a.timestamp),
  addGlucoseRecord: (patientId: string, record: Omit<GlucoseRecord, 'id' | 'patientId'>) => {
    const items = getItems<GlucoseRecord>('glucose');
    const newItem = { ...record, patientId, id: crypto.randomUUID() };
    setItems('glucose', [...items, newItem]);
    return newItem;
  },
  updateGlucoseRecord: (id: string, record: Partial<GlucoseRecord>) => {
    const items = getItems<GlucoseRecord>('glucose');
    const updated = items.map(i => i.id === id ? { ...i, ...record } : i);
    setItems('glucose', updated);
  },
  deleteGlucoseRecord: (id: string) => {
    const items = getItems<GlucoseRecord>('glucose');
    setItems('glucose', items.filter(i => i.id !== id));
  },

  // Insulin
  getInsulinRecords: (patientId: string) => getItems<InsulinRecord>('insulin').filter(r => r.patientId === patientId).sort((a, b) => b.timestamp - a.timestamp),
  addInsulinRecord: (patientId: string, record: Omit<InsulinRecord, 'id' | 'patientId'>) => {
    const items = getItems<InsulinRecord>('insulin');
    const newItem = { ...record, patientId, id: crypto.randomUUID() };
    setItems('insulin', [...items, newItem]);
    return newItem;
  },
  updateInsulinRecord: (id: string, record: Partial<InsulinRecord>) => {
    const items = getItems<InsulinRecord>('insulin');
    const updated = items.map(i => i.id === id ? { ...i, ...record } : i);
    setItems('insulin', updated);
  },
  deleteInsulinRecord: (id: string) => {
    const items = getItems<InsulinRecord>('insulin');
    setItems('insulin', items.filter(i => i.id !== id));
  },

  // Medications
  getMedications: (patientId: string) => getItems<Medication>('medications').filter(r => r.patientId === patientId),
  addMedication: (patientId: string, record: Omit<Medication, 'id' | 'patientId'>) => {
    const items = getItems<Medication>('medications');
    const newItem = { ...record, patientId, id: crypto.randomUUID(), takenLog: [] };
    setItems('medications', [...items, newItem]);
    return newItem;
  },
  toggleMedication: (id: string) => {
    const items = getItems<Medication>('medications');
    const updated = items.map(i => i.id === id ? { ...i, active: !i.active } : i);
    setItems('medications', updated);
  },
  deleteMedication: (id: string) => {
    const items = getItems<Medication>('medications');
    setItems('medications', items.filter(i => i.id !== id));
  },
  logMedicationTaken: (id: string, timestamp: number) => {
    const items = getItems<Medication>('medications');
    const updated = items.map(i => {
      if (i.id === id) {
        return { ...i, takenLog: [...(i.takenLog || []), timestamp] };
      }
      return i;
    });
    setItems('medications', updated);
  },

  // Documents
  getDocuments: (patientId: string) => getItems<MedicalDocument>('documents').filter(r => r.patientId === patientId).sort((a, b) => b.timestamp - a.timestamp),
  addDocument: (patientId: string, record: Omit<MedicalDocument, 'id' | 'patientId'>) => {
    const items = getItems<MedicalDocument>('documents');
    const newItem = { ...record, patientId, id: crypto.randomUUID() };
    setItems('documents', [...items, newItem]);
    return newItem;
  },
  deleteDocument: (id: string) => {
    const items = getItems<MedicalDocument>('documents');
    setItems('documents', items.filter(i => i.id !== id));
  },

  // User Profile (Mock Auth)
  getUser: (): UserProfile | null => {
    const data = localStorage.getItem(DB_PREFIX + 'user');
    if (!data) {
      // Create a default user if none exists
      const defaultUser: UserProfile = {
        name: 'Utilisateur',
        email: 'user@example.com',
        pin: '1234',
        authMethod: 'pin',
        biometricEnabled: false
      };
      localStorage.setItem(DB_PREFIX + 'user', JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(data);
  },
  setUser: (user: UserProfile) => {
    localStorage.setItem(DB_PREFIX + 'user', JSON.stringify(user));
  },
  logout: () => {
    sessionStorage.removeItem('active_session');
  },
  login: (pin: string) => {
    const user = db.getUser();
    if (user && user.pin === pin) {
      sessionStorage.setItem('active_session', 'true');
      return true;
    }
    return false;
  },
  loginWithPattern: (pattern: string) => {
    const user = db.getUser();
    if (user && user.pattern === pattern) {
      sessionStorage.setItem('active_session', 'true');
      return true;
    }
    return false;
  },
  loginWithBiometric: async () => {
    const user = db.getUser();
    if (!user || !user.biometricEnabled) return false;

    try {
      // Check if WebAuthn is supported
      if (window.PublicKeyCredential) {
        // In a real app, we would use navigator.credentials.get()
        // For this mock, we'll simulate a successful biometric check
        // if the user has it enabled.
        sessionStorage.setItem('active_session', 'true');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Biometric auth error:', error);
      return false;
    }
  },
  isLoggedIn: () => {
    return sessionStorage.getItem('active_session') === 'true';
  },
  getPatientAlerts: (patientId: string) => {
    const bp = db.getBPRecords(patientId)[0];
    const glucose = db.getGlucoseRecords(patientId)[0];
    const alerts: string[] = [];

    if (bp) {
      if (bp.systolic >= 140 || bp.diastolic >= 90) alerts.push('Tension élevée');
      if (bp.systolic <= 90 || bp.diastolic <= 60) alerts.push('Tension basse');
    }
    if (glucose) {
      if (glucose.value >= 200) alerts.push('Glycémie élevée');
      if (glucose.value <= 70) alerts.push('Hypoglycémie');
    }
    return alerts;
  },

  // Backup & Restore
  exportData: () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DB_PREFIX)) {
        data[key] = localStorage.getItem(key) || '';
      }
    }
    return JSON.stringify(data, null, 2);
  },
  importData: (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      // Basic validation: check if keys start with DB_PREFIX
      const keys = Object.keys(data);
      if (keys.length === 0 || !keys.every(k => k.startsWith(DB_PREFIX))) {
        throw new Error('Format de fichier invalide');
      }
      
      // Clear current data first
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(DB_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
      
      // Import new data
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, value as string);
      });
      
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  }
};
