import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { GlucoseRecord } from '../types';
import VoiceInput from './VoiceInput';

interface EditGlucoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string | null, data: Partial<GlucoseRecord>) => void;
  record: GlucoseRecord | null;
}

export default function EditGlucoseModal({ isOpen, onClose, onSave, record }: EditGlucoseModalProps) {
  const [value, setValue] = useState('');
  const [type, setType] = useState<GlucoseRecord['type']>('fasting');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (record) {
      setValue(record.value.toString());
      setType(record.type);
      setNotes(record.notes || '');
      
      const d = new Date(record.timestamp);
      setDate(format(d, 'yyyy-MM-dd'));
      setTime(format(d, 'HH:mm'));
    } else if (isOpen) {
      setValue('');
      setType('fasting');
      setNotes('');
      const d = new Date();
      setDate(format(d, 'yyyy-MM-dd'));
      setTime(format(d, 'HH:mm'));
    }
  }, [record, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timestamp = new Date(`${date}T${time}`).getTime();
    onSave(record ? record.id : null, {
      value: parseInt(value),
      type,
      notes,
      timestamp
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{record ? 'Modifier la mesure' : 'Ajouter une mesure'}</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Heure</label>
                <input 
                  type="time" 
                  required
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Glucose (mg/dL)</label>
                <input 
                  type="number" 
                  required
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                <select 
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="fasting">À jeun</option>
                  <option value="before_meal">Avant le repas</option>
                  <option value="after_meal">Après le repas</option>
                  <option value="bedtime">Au coucher</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
              <div className="relative">
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y bg-white dark:bg-slate-800 text-slate-900 dark:text-white pr-10"
                />
                <VoiceInput 
                  onResult={(text) => setNotes(prev => prev ? `${prev} ${text}` : text)}
                  className="absolute right-2 top-2"
                  size="sm"
                />
              </div>
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-xl transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
