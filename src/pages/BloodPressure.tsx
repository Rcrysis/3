import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Camera, Plus, Activity, Loader2, Trash2, Edit2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { db } from '../services/db';
import { extractBPFromImage } from '../services/ai';
import { BPRecord, Patient } from '../types';
import CameraModal from '../components/CameraModal';
import ConfirmModal from '../components/ConfirmModal';
import EditBPModal from '../components/EditBPModal';
import { notificationService } from '../services/notifications';

export default function BloodPressure() {
  const { patientId } = useParams();
  const [records, setRecords] = useState<BPRecord[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<BPRecord | null>(null);

  useEffect(() => {
    if (patientId) {
      setRecords(db.getBPRecords(patientId));
      setPatient(db.getPatient(patientId));
    }
  }, [patientId]);

  const handleCapture = async (base64Image: string) => {
    setIsProcessing(true);
    try {
      const result = await extractBPFromImage(base64Image);
      if (result) {
        setEditRecord({
          id: '',
          patientId: patientId || '',
          timestamp: Date.now(),
          systolic: result.systolic || 120,
          diastolic: result.diastolic || 80,
          heartRate: result.heartRate || 70,
          notes: ''
        });
        setIsModalOpen(true);
      } else {
        alert('Impossible de lire les valeurs sur l\'image. Veuillez les saisir manuellement.');
      }
    } catch (e) {
      alert('Erreur lors du traitement de l\'image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = () => {
    if (deleteId && patientId) {
      db.deleteBPRecord(deleteId);
      setRecords(db.getBPRecords(patientId));
      setDeleteId(null);
    }
  };

  const handleSave = (id: string | null, data: Partial<BPRecord>) => {
    if (!patientId) return;
    if (id) {
      db.updateBPRecord(id, data);
    } else {
      db.addBPRecord(patientId, data as Omit<BPRecord, 'id' | 'patientId'>);
      // Check for alerts on new records
      if (data.systolic && data.diastolic) {
        notificationService.checkHealthAlerts('bp', { systolic: data.systolic, diastolic: data.diastolic }, patient?.firstName || 'Patient');
      }
    }
    setRecords(db.getBPRecords(patientId));
    setIsModalOpen(false);
    setEditRecord(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tension Artérielle</h1>
          <p className="text-slate-500 dark:text-slate-400">Suivez vos mesures</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsCameraOpen(true)}
            className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-xl font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span className="hidden sm:inline">Scanner</span>
          </button>
          <button 
            onClick={() => {
              setEditRecord(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors"
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
                    record.systolic > 140 || record.diastolic > 90 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  }`}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">{record.systolic}/{record.diastolic}</span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">mmHg</span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                      <span>HR: {record.heartRate} bpm</span>
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
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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
        title="Scanner le tensiomètre"
      />

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Supprimer l'enregistrement"
        message="Êtes-vous sûr de vouloir supprimer cet enregistrement de tension artérielle ? Cette action est irréversible."
      />

      <EditBPModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditRecord(null);
        }}
        onSave={handleSave}
        record={editRecord}
      />

      {isProcessing && (
        <div className="fixed inset-0 z-[110] bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-lg font-medium text-slate-900 dark:text-white">Extraction des valeurs avec l'IA...</p>
        </div>
      )}
    </div>
  );
}
