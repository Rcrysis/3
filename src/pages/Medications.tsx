import React, { useState, useEffect } from 'react';
import { Pill, Plus, CheckCircle2, Circle, Trash2, Check } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { db } from '../services/db';
import { Medication } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import VoiceInput from '../components/VoiceInput';

export default function Medications() {
  const { patientId } = useParams();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequencyType, setFrequencyType] = useState<'daily' | 'interval' | 'as_needed' | 'cycle'>('daily');
  const [intervalDays, setIntervalDays] = useState(2);
  const [cycleDays, setCycleDays] = useState<number[]>([1, 2]);
  const [times, setTimes] = useState<string[]>(['08:00']);

  useEffect(() => {
    if (patientId) {
      setMedications(db.getMedications(patientId));
    }
  }, [patientId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dosage || !patientId) return;

    const newMed = db.addMedication(patientId, {
      name,
      dosage,
      active: true,
      times: frequencyType === 'as_needed' ? [] : times,
      frequencyType,
      intervalDays: frequencyType === 'interval' ? intervalDays : undefined,
      cycleDays: frequencyType === 'cycle' ? cycleDays : undefined,
      startDate: Date.now(),
      // Legacy fields for safety
      time: times[0] || '',
      frequency: frequencyType === 'daily' ? 'Quotidien' : frequencyType === 'interval' ? 'Hebdomadaire' : frequencyType === 'cycle' ? 'Cycle' : 'Au besoin'
    });

    setMedications([...medications, newMed]);
    setName('');
    setDosage('');
    setTimes(['08:00']);
    setFrequencyType('daily');
    setIntervalDays(2);
    setCycleDays([1, 2]);
  };

  const toggleMedication = (id: string) => {
    if (!patientId) return;
    db.toggleMedication(id);
    setMedications(db.getMedications(patientId));
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId && patientId) {
      db.deleteMedication(deleteId);
      setMedications(db.getMedications(patientId));
      setDeleteId(null);
    }
  };

  const handleTakeMedication = (id: string) => {
    if (!patientId) return;
    db.logMedicationTaken(id, Date.now());
    setMedications(db.getMedications(patientId));
  };

  const getDosesTakenToday = (med: Medication) => {
    if (!med.takenLog) return 0;
    const today = new Date().toDateString();
    return med.takenLog.filter(t => new Date(t).toDateString() === today).length;
  };

  const formatFrequency = (med: Medication) => {
    const type = med.frequencyType || (med.frequency === 'Au besoin' ? 'as_needed' : 'daily');
    const medTimes = med.times || (med.time ? [med.time] : []);

    if (type === 'as_needed') return 'Au besoin';
    
    const timesStr = medTimes.length > 0 ? `à ${medTimes.join(', ')}` : '';
    
    if (type === 'daily') {
      return `Tous les jours ${timesStr}`;
    } else if (type === 'interval') {
      return `Tous les ${med.intervalDays || 2} jours ${timesStr}`;
    } else if (type === 'cycle') {
      return `Cycle (${med.cycleDays?.join(' puis ')} jours) ${timesStr}`;
    }
    return med.frequency;
  };

  const filteredMedications = medications.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Médicaments</h1>
        <p className="text-slate-500 dark:text-slate-400">Gérez vos ordonnances et rappels</p>
      </header>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Ajouter un médicament</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom du médicament</label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pr-10"
                  placeholder="Metformine"
                />
                <VoiceInput 
                  onResult={(text) => setName(text)}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  size="sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dosage</label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={dosage}
                  onChange={e => setDosage(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pr-10"
                  placeholder="500mg"
                />
                <VoiceInput 
                  onResult={(text) => setDosage(text)}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  size="sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fréquence</label>
              <select 
                value={frequencyType}
                onChange={e => setFrequencyType(e.target.value as any)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="daily">Tous les jours</option>
                <option value="interval">Tous les X jours</option>
                <option value="cycle">Cycle (X jours, puis Y jours...)</option>
                <option value="as_needed">Au besoin</option>
              </select>
            </div>
            {frequencyType === 'interval' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre de jours</label>
                <input 
                  type="number" 
                  min="2"
                  required
                  value={intervalDays}
                  onChange={e => setIntervalDays(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {frequencyType === 'cycle' && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Séquence de jours (qui se suivent)</label>
              <div className="flex flex-wrap gap-2 items-center">
                {cycleDays.map((days, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {idx > 0 && <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">puis</span>}
                    <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                      <input 
                        type="number" 
                        min="1"
                        required
                        value={days}
                        onChange={e => {
                          const newCycle = [...cycleDays];
                          newCycle[idx] = parseInt(e.target.value) || 1;
                          setCycleDays(newCycle);
                        }}
                        className="w-16 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-slate-900 dark:text-white"
                      />
                      <span className="px-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">j</span>
                    </div>
                    {cycleDays.length > 2 && (
                      <button 
                        type="button" 
                        onClick={() => setCycleDays(cycleDays.filter((_, i) => i !== idx))} 
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {cycleDays.length < 5 && (
                  <button 
                    type="button" 
                    onClick={() => setCycleDays([...cycleDays, 1])} 
                    className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 hover:text-blue-700 dark:hover:text-blue-300 transition-colors ml-2"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Exemple: "Tous les 1 jours puis tous les 2 jours" = Prise le Jour 1, attente de 1 jour, Prise le Jour 2, attente de 2 jours, Prise le Jour 4, etc.
              </p>
            </div>
          )}

          {frequencyType !== 'as_needed' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Heures de prise</label>
              <div className="space-y-2">
                {times.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2 max-w-xs">
                    <input 
                      type="time" 
                      required 
                      value={t} 
                      onChange={e => {
                        const newTimes = [...times];
                        newTimes[idx] = e.target.value;
                        setTimes(newTimes);
                      }} 
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" 
                    />
                    {times.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => setTimes(times.filter((_, i) => i !== idx))} 
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                {times.length < 5 && (
                  <button 
                    type="button" 
                    onClick={() => setTimes([...times, '12:00'])} 
                    className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 mt-2 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Ajouter une heure
                  </button>
                )}
              </div>
            </div>
          )}

          <button 
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors mt-4"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter un médicament</span>
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Médicaments actuels</h2>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <VoiceInput 
              onResult={(text) => setSearchTerm(text)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2"
              size="sm"
            />
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredMedications.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">
              {searchTerm ? 'Aucun médicament ne correspond à votre recherche.' : 'Aucun médicament ajouté.'}
            </div>
          ) : (
            filteredMedications.map(med => {
              const type = med.frequencyType || (med.frequency === 'Au besoin' ? 'as_needed' : 'daily');
              const medTimes = med.times || (med.time ? [med.time] : []);
              const totalDoses = medTimes.length;
              const dosesTaken = getDosesTakenToday(med);
              const isFullyTaken = type !== 'as_needed' && dosesTaken >= totalDoses;

              return (
                <div key={med.id} className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-opacity ${!med.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{med.name}</h3>
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                        <span className="font-medium">{med.dosage}</span>
                        <span>•</span>
                        <span>{formatFrequency(med)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    {med.active && type !== 'as_needed' && (
                      <button
                        onClick={() => handleTakeMedication(med.id)}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isFullyTaken 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>{isFullyTaken ? 'Toutes les doses prises' : `Pris (${dosesTaken}/${totalDoses})`}</span>
                      </button>
                    )}
                    <button 
                      onClick={() => toggleMedication(med.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                      title={med.active ? "Marquer comme inactif" : "Marquer comme actif"}
                    >
                      {med.active ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={() => handleDelete(med.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Supprimer le médicament"
        message="Êtes-vous sûr de vouloir supprimer ce médicament ? Cette action est irréversible."
      />
    </div>
  );
}
