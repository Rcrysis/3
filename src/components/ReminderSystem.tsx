import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/db';
import { Medication } from '../types';
import { Bell, Check } from 'lucide-react';

interface ReminderItem {
  med: Medication;
  timeStr: string;
  notificationKey: string;
}

export default function ReminderSystem() {
  const { patientId } = useParams();
  const [activeReminders, setActiveReminders] = useState<ReminderItem[]>([]);
  const [handledState, setHandledState] = useState<Record<string, boolean>>({});
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const data = localStorage.getItem('smart_health_handled_reminders');
    if (data) {
      try {
        setHandledState(JSON.parse(data));
      } catch (e) {
        console.error("Failed to parse handled reminders", e);
      }
    }
  }, []);

  const markAsHandled = (key: string) => {
    const updated = { ...handledState, [key]: true };
    
    // Cleanup old entries to prevent localStorage from growing indefinitely
    const todayStr = new Date().toDateString();
    const cleaned = Object.keys(updated).reduce((acc, k) => {
      if (k.includes(todayStr)) acc[k] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    localStorage.setItem('smart_health_handled_reminders', JSON.stringify(cleaned));
    setHandledState(cleaned);
  };

  useEffect(() => {
    if (!patientId) return;

    const checkReminders = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const todayStr = now.toDateString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      const medications = db.getMedications(patientId).filter(m => m.active);
      const newReminders: ReminderItem[] = [];

      medications.forEach(med => {
        const type = med.frequencyType || (med.frequency === 'Au besoin' ? 'as_needed' : 'daily');
        if (type === 'as_needed') return;

        if (type === 'interval' && med.intervalDays && med.startDate) {
           const start = new Date(med.startDate);
           const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
           const diffDays = Math.floor((todayStart - startDay) / (1000 * 60 * 60 * 24));
           if (diffDays % med.intervalDays !== 0) return; // Not today
        }

        if (type === 'cycle' && med.cycleDays && med.cycleDays.length > 0 && med.startDate) {
           const start = new Date(med.startDate);
           const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
           const diffDays = Math.floor((todayStart - startDay) / (1000 * 60 * 60 * 24));
           
           if (diffDays < 0) return; // Not started yet

           const totalCycleLength = med.cycleDays.reduce((a, b) => a + b, 0);
           const takeDaysInCycle = [0];
           let currentDay = 0;
           for (let i = 0; i < med.cycleDays.length - 1; i++) {
             currentDay += med.cycleDays[i];
             takeDaysInCycle.push(currentDay);
           }
           
           const dayInCycle = diffDays % totalCycleLength;
           if (!takeDaysInCycle.includes(dayInCycle)) return; // Not today
        }

        const medTimes = med.times || (med.time ? [med.time] : []);
        // Sort times chronologically
        const sortedTimes = [...medTimes].sort();
        const dosesTakenToday = med.takenLog ? med.takenLog.filter(t => new Date(t).toDateString() === todayStr).length : 0;
        
        sortedTimes.forEach((timeStr, idx) => {
           // If this dose index has already been taken today, skip it
           if (dosesTakenToday > idx) return;

           const [h, m] = timeStr.split(':').map(Number);
           const medMinutes = h * 60 + m;

           // If time has passed today and not handled
           if (currentMinutes >= medMinutes) {
              const notificationKey = `${med.id}-${timeStr}-${todayStr}`;
              if (!handledState[notificationKey]) {
                 newReminders.push({ med, timeStr, notificationKey });
              }
           }
        });
      });

      setActiveReminders(prev => {
        // Keep only reminders that are still valid (in newReminders)
        const validPrev = prev.filter(r => newReminders.some(nr => nr.notificationKey === r.notificationKey));
        
        const combined = [...validPrev];
        let changed = validPrev.length !== prev.length;
        
        newReminders.forEach(nr => {
          if (!combined.some(r => r.notificationKey === nr.notificationKey)) {
            combined.push(nr);
            changed = true;
          }
        });
        
        return changed ? combined : prev;
      });
    };

    const interval = setInterval(checkReminders, 10000); // Check every 10s
    checkReminders();
    return () => clearInterval(interval);
  }, [handledState, patientId]);

  // Alarm Loop
  useEffect(() => {
    if (activeReminders.length === 0) {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      return;
    }

    let isVoiceTurn = false;

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.5);
      } catch (e) {
        console.error("Audio playback failed", e);
      }
    };

    const readNotificationMessage = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance("C'est l'heure de prendre votre médicament.");
        utterance.lang = 'fr-FR';
        window.speechSynthesis.speak(utterance);
      }
    };

    const playAlarm = () => {
      if (isVoiceTurn) {
        readNotificationMessage();
      } else {
        playNotificationSound();
      }
      isVoiceTurn = !isVoiceTurn;
    };

    // Start loop
    playAlarm();
    alarmIntervalRef.current = setInterval(playAlarm, 4000); // Alternate every 4 seconds

    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [activeReminders.length]);

  const handleTakeMedication = (item: ReminderItem) => {
    db.logMedicationTaken(item.med.id, Date.now());
    markAsHandled(item.notificationKey);
    setActiveReminders(prev => prev.filter(r => r.notificationKey !== item.notificationKey));
  };

  const handleDismiss = (item: ReminderItem) => {
    markAsHandled(item.notificationKey);
    setActiveReminders(prev => prev.filter(r => r.notificationKey !== item.notificationKey));
  };

  if (activeReminders.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full">
      {activeReminders.map(item => (
        <div key={item.notificationKey} className="bg-white rounded-2xl shadow-2xl border-2 border-blue-500 p-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg">Rappel de médicament</h3>
              <p className="text-slate-600 mt-1">
                Il est <strong className="text-blue-600">{item.timeStr}</strong>, temps de prendre :<br/>
                <strong className="text-slate-900 text-lg">{item.med.name}</strong> ({item.med.dosage}).
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleTakeMedication(item)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  <Check className="w-5 h-5" />
                  Pris
                </button>
                <button
                  onClick={() => handleDismiss(item)}
                  className="flex-1 bg-slate-100 text-slate-700 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
