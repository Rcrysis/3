import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Syringe, Plus, Trash2, Edit2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { db } from '../services/db';
import { InsulinRecord } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import EditInsulinModal from '../components/EditInsulinModal';

export default function Insulin() {
  const { patientId } = useParams();
  const [records, setRecords] = useState<InsulinRecord[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<InsulinRecord | null>(null);

  useEffect(() => {
    if (patientId) {
      setRecords(db.getInsulinRecords(patientId));
    }
  }, [patientId]);

  const confirmDelete = () => {
    if (deleteId && patientId) {
      db.deleteInsulinRecord(deleteId);
      setRecords(db.getInsulinRecords(patientId));
      setDeleteId(null);
    }
  };

  const handleSave = (id: string | null, data: Partial<InsulinRecord>) => {
    if (!patientId) return;
    if (id) {
      db.updateInsulinRecord(id, data);
    } else {
      db.addInsulinRecord(patientId, data as Omit<InsulinRecord, 'id' | 'patientId'>);
    }
    setRecords(db.getInsulinRecords(patientId));
    setIsModalOpen(false);
    setEditRecord(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Suivi de l'insuline</h1>
          <p className="text-slate-500 dark:text-slate-400">Enregistrez vos doses d'insuline</p>
        </div>
        <button 
          onClick={() => {
            setEditRecord(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Ajouter</span>
        </button>
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
                  <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Syringe className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">{record.dose}</span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Unités</span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                      <span className="font-medium">{record.type}</span>
                      <span>•</span>
                      <span>{record.meal}</span>
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
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
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

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Supprimer l'enregistrement"
        message="Êtes-vous sûr de vouloir supprimer cet enregistrement d'insuline ? Cette action est irréversible."
      />

      <EditInsulinModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditRecord(null);
        }}
        onSave={handleSave}
        record={editRecord}
      />
    </div>
  );
}
