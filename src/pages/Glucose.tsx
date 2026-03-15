import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Camera, Plus, Droplet, Loader2, Trash2, Edit2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { db } from '../services/db';
import { extractGlucoseFromImage } from '../services/ai';
import { GlucoseRecord, Patient } from '../types';
import CameraModal from '../components/CameraModal';
import ConfirmModal from '../components/ConfirmModal';
import EditGlucoseModal from '../components/EditGlucoseModal';
import { notificationService } from '../services/notifications';

export default function Glucose() {
  const { patientId } = useParams();
  const [records, setRecords] = useState<GlucoseRecord[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<GlucoseRecord | null>(null);

  useEffect(() => {
    if (patientId) {
      setRecords(db.getGlucoseRecords(patientId));
      setPatient(db.getPatient(patientId));
    }
  }, [patientId]);

  const handleCapture = async (base64Image: string) => {
    setIsProcessing(true);
    try {
      const result = await extractGlucoseFromImage(base64Image);
      if (result && result.glucose) {
        // Open modal with pre-filled value
        setEditRecord({
          id: '',
          patientId: patientId || '',
          timestamp: Date.now(),
          value: result.glucose,
          type: 'fasting',
          notes: ''
        });
        setIsModalOpen(true);
      } else {
        alert('Impossible de lire la valeur sur l\'image. Veuillez la saisir manuellement.');
      }
    } catch (e) {
      alert('Erreur lors du traitement de l\'image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = () => {
    if (deleteId && patientId) {
      db.deleteGlucoseRecord(deleteId);
      setRecords(db.getGlucoseRecords(patientId));
      setDeleteId(null);
    }
  };

  const handleSave = (id: string | null, data: Partial<GlucoseRecord>) => {
    if (!patientId) return;
    if (id) {
      db.updateGlucoseRecord(id, data);
    } else {
      db.addGlucoseRecord(patientId, data as Omit<GlucoseRecord, 'id' | 'patientId'>);
      // Check for alerts on new records
      if (data.value) {
        notificationService.checkHealthAlerts('glucose', data.value, patient?.firstName || 'Patient');
      }
    }
    setRecords(db.getGlucoseRecords(patientId));
    setIsModalOpen(false);
    setEditRecord(null);
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'fasting': return 'À jeun';
      case 'before_meal': return 'Avant le repas';
      case 'after_meal': return 'Après le repas';
      case 'bedtime': return 'Au coucher';
      default: return t;
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Glycémie</h1>
          <p className="text-slate-500 dark:text-slate-400">Suivez votre taux de sucre</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsCameraOpen(true)}
            className="flex items-center space-x-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-4 py-2 rounded-xl font-medium hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span className="hidden sm:inline">Scanner</span>
          </button>
          <button 
            onClick={() => {
              setEditRecord(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historique</h2>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {records.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">Aucun enregistrement.</div>
          ) : (
            records.map(record => (
              <div key={record.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    record.value > 180 || record.value < 70 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                      : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                  }`}>
                    <Droplet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">{record.value}</span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">mg/dL</span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-medium dark:text-slate-300">{getTypeLabel(record.type)}</span>
                      {record.notes && (
                        <>
                          <span>•</span>
                          <span>{record.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <div className="text-sm text-slate-500 dark:text-slate-400 sm:text-right">
                    <div>{format(record.timestamp, 'd MMM yyyy', { locale: fr })}</div>
                    <div>{format(record.timestamp, 'HH:mm', { locale: fr })}</div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditRecord(record);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(record.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleCapture}
        title="Scanner le lecteur"
      />

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Supprimer l'enregistrement"
        message="Êtes-vous sûr de vouloir supprimer cet enregistrement de glycémie ? Cette action est irréversible."
      />

      <EditGlucoseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditRecord(null);
        }}
        onSave={handleSave}
        record={editRecord}
      />

      {isProcessing && (
        <div className="fixed inset-0 z-[110] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
          <p className="text-lg font-medium text-slate-900 dark:text-white">Extraction de la valeur avec l'IA...</p>
        </div>
      )}
    </div>
  );
}
