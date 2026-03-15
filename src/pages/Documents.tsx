import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Upload, Plus, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { db } from '../services/db';
import { MedicalDocument } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import VoiceInput from '../components/VoiceInput';

export default function Documents() {
  const { patientId } = useParams();
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Prescription');
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');

  useEffect(() => {
    if (patientId) {
      setDocuments(db.getDocuments(patientId));
    }
  }, [patientId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileData(reader.result as string);
        setFileType(file.type);
        if (!title) {
          setTitle(file.name.split('.')[0]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !fileData || !patientId) return;

    try {
      const newDoc = db.addDocument(patientId, {
        timestamp: Date.now(),
        title,
        category,
        fileData,
        fileType
      });

      setDocuments([newDoc, ...documents]);
      setTitle('');
      setFileData(null);
      setFileType('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert("Échec de l'enregistrement du document. Le fichier est peut-être trop volumineux pour le stockage local.");
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId && patientId) {
      db.deleteDocument(deleteId);
      setDocuments(db.getDocuments(patientId));
      setDeleteId(null);
    }
  };

  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Documents médicaux</h1>
        <p className="text-slate-500 dark:text-slate-400">Stockez et organisez vos dossiers médicaux</p>
      </header>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Télécharger un document</h2>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Rechercher un document..."
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Titre du document</label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pr-10"
                  placeholder="Résultats d'analyse de sang"
                />
                <VoiceInput 
                  onResult={(text) => setTitle(text)}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  size="sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catégorie</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Prescription">Ordonnance</option>
                <option value="Lab Report">Rapport d'analyse</option>
                <option value="Medical Note">Note médicale</option>
                <option value="Other">Autre</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fichier</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
                <div className="flex text-sm text-slate-600 dark:text-slate-400 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-slate-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Télécharger un fichier</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={fileInputRef} onChange={handleFileChange} accept="image/*,.pdf" />
                  </label>
                  <p className="pl-1">ou glisser-déposer</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG, PDF jusqu'à 2 Mo (limite de stockage local)</p>
                {fileData && <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">Fichier sélectionné</p>}
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={!fileData}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            <span>Enregistrer le document</span>
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map(doc => (
          <div key={doc.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                {doc.fileType.includes('image') ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                {doc.category}
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1 mb-1">{doc.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{format(doc.timestamp, 'd MMM yyyy', { locale: fr })}</p>
            
            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <a 
                href={doc.fileData} 
                download={doc.title}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Télécharger
              </a>
              <button
                onClick={() => handleDelete(doc.id)}
                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {filteredDocuments.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed transition-colors">
            {searchTerm ? 'Aucun document ne correspond à votre recherche.' : 'Aucun document téléchargé.'}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Supprimer le document"
        message="Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible."
      />
    </div>
  );
}
