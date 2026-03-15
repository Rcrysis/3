import { db } from './db';
import { Medication, Patient } from '../types';

class NotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) return 'denied';
    
    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission;
  }

  get hasPermission() {
    return this.permission === 'granted';
  }

  sendNotification(title: string, options?: NotificationOptions) {
    if (this.permission !== 'granted') return;

    // Use service worker for background if available, otherwise fallback to standard Notification
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          icon: '/vite.svg',
          badge: '/vite.svg',
          ...options
        });
      });
    } else {
      new Notification(title, {
        icon: '/vite.svg',
        ...options
      });
    }
  }

  checkMedicationReminders() {
    if (this.permission !== 'granted') return;

    const patients = db.getPatients().filter(p => !p.archived);
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const today = now.toDateString();

    patients.forEach(patient => {
      const medications = db.getMedications(patient.id).filter(m => m.active);
      
      medications.forEach(med => {
        const times = med.times || (med.time ? [med.time] : []);
        const frequencyType = med.frequencyType || (med.frequency === 'Au besoin' ? 'as_needed' : 'daily');

        if (frequencyType === 'as_needed') return;

        // Check if current time matches any scheduled time
        if (times.includes(currentTime)) {
          // Check if already taken in the last hour to avoid duplicate notifications
          const lastTaken = med.takenLog && med.takenLog.length > 0 
            ? new Date(med.takenLog[med.takenLog.length - 1]) 
            : null;
          
          const isRecentlyTaken = lastTaken && (now.getTime() - lastTaken.getTime() < 60 * 60 * 1000);

          if (!isRecentlyTaken) {
            this.sendNotification(`Rappel Médicament: ${patient.firstName}`, {
              body: `Il est temps de prendre ${med.name} (${med.dosage}).`,
              tag: `med-${med.id}-${currentTime}`,
              renotify: true
            } as any);
          }
        }
      });
    });
  }

  checkHealthAlerts(type: 'bp' | 'glucose', value: any, patientName: string) {
    if (this.permission !== 'granted') return;

    if (type === 'bp') {
      const { systolic, diastolic } = value;
      if (systolic > 140 || diastolic > 90) {
        this.sendNotification(`Alerte Tension: ${patientName}`, {
          body: `Mesure critique détectée: ${systolic}/${diastolic} mmHg. Veuillez consulter un médecin si nécessaire.`,
          tag: 'health-alert-bp',
          vibrate: [200, 100, 200]
        } as any);
      }
    } else if (type === 'glucose') {
      const glucoseValue = value;
      if (glucoseValue > 200) {
        this.sendNotification(`Alerte Glycémie: ${patientName}`, {
          body: `Hyperglycémie détectée: ${glucoseValue} mg/dL.`,
          tag: 'health-alert-glucose-high',
          vibrate: [200, 100, 200]
        } as any);
      } else if (glucoseValue < 70) {
        this.sendNotification(`Alerte Glycémie: ${patientName}`, {
          body: `Hypoglycémie détectée: ${glucoseValue} mg/dL. Veuillez consommer du sucre rapidement.`,
          tag: 'health-alert-glucose-low',
          vibrate: [200, 100, 200]
        } as any);
      }
    }
  }
}

export const notificationService = new NotificationService();
