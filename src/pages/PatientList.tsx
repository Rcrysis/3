import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Edit2, Trash2, Archive, Search, Activity, UserPlus, AlertTriangle, LogOut, Sun, Moon } from 'lucide-react';
import { db } from '../services/db';
import { Patient } from '../types';
import { useTheme } from '../context/ThemeContext';
import ConfirmModal from '../components/ConfirmModal';
import VoiceInput from '../components/VoiceInput';

export default function PatientList() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'M',
    notes: '',
    customFields: [] as { key: string; value: string }[]
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = () => {
    setPatients(db.getPatients());
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    db.logout();
    navigate('/login');
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchive = showArchived ? true : !p.archived;
    return matchesSearch && matchesArchive;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customFieldsObj = formData.customFields.reduce((acc, field) => {
      if (field.key.trim()) acc[field.key] = field.value;
      return acc;
    }, {} as { [key: string]: string });

    db.addPatient({
      ...formData,
      customFields: customFieldsObj
    });
    setIsAddModalOpen(false);
    resetForm();
    loadPatients();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPatient) {
      const customFieldsObj = formData.customFields.reduce((acc, field) => {
        if (field.key.trim()) acc[field.key] = field.value;
        return acc;
      }, {} as { [key: string]: string });

      db.updatePatient(selectedPatient.id, {
        ...formData,
        customFields: customFieldsObj
      });
      setIsEditModalOpen(false);
      setSelectedPatient(null);
      resetForm();
      loadPatients();
    }
  };

  const handleDelete = () => {
    if (selectedPatient) {
      db.deletePatient(selectedPatient.id);
      setIsDeleteModalOpen(false);
      setSelectedPatient(null);
      loadPatients();
    }
  };

  const handleToggleArchive = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    if (patient.archived) {
      db.unarchivePatient(patient.id);
    } else {
      db.archivePatient(patient.id);
    }
    loadPatients();
  };

  const openEditModal = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setFormData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      notes: patient.notes || '',
      customFields: patient.customFields 
        ? Object.entries(patient.customFields).map(([key, value]) => ({ key, value }))
        : []
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setIsDeleteModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'M',
      notes: '',
      customFields: []
    });
  };

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    const age = new Date(diff).getUTCFullYear() - 1970;
    return `${age} ans`;
  };

  const addCustomField = () => {
    setFormData({
      ...formData,
      customFields: [...formData.customFields, { key: '', value: '' }]
    });
  };

  const updateCustomField = (index: number, key: string, value: string) => {
    const newFields = [...formData.customFields];
    newFields[index] = { key, value };
    setFormData({ ...formData, customFields: newFields });
  };

  const removeCustomField = (index: number) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Liste des Patients</h1>
          <p className="text-slate-500 dark:text-slate-400">Gérez vos patients et accédez à leurs dossiers</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Changer le thème"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            <span>Nouveau Patient</span>
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
            title="Déconnexion"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-12 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          <VoiceInput 
            onResult={(text) => setSearchTerm(text)}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            size="sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showArchived"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="showArchived" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
            Afficher les patients archivés
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map(patient => (
          <div 
            key={patient.id}
            onClick={() => navigate(`/patient/${patient.id}`)}
            className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md ${patient.archived ? 'border-slate-200 dark:border-slate-800 opacity-75' : 'border-blue-100 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${patient.archived ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                  {patient.firstName[0]}{patient.lastName[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{patient.firstName} {patient.lastName}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{calculateAge(patient.dateOfBirth)} • {patient.gender === 'M' ? 'Homme' : 'Femme'}</p>
                </div>
              </div>
              {db.getPatientAlerts(patient.id).length > 0 && (
                <div className="flex items-center text-red-600 dark:text-red-400 animate-pulse" title={db.getPatientAlerts(patient.id).join(', ')}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
            </div>
            
            {db.getPatientAlerts(patient.id).length > 0 && (
              <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                <p className="text-xs font-bold text-red-700 dark:text-red-300 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Alertes: {db.getPatientAlerts(patient.id).join(', ')}
                </p>
              </div>
            )}
            
            {patient.notes && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{patient.notes}</p>
            )}

            {patient.customFields && Object.keys(patient.customFields).length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-2">
                {Object.entries(patient.customFields).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="font-bold text-slate-500 dark:text-slate-500 uppercase">{key}:</span>
                    <span className="ml-1 text-slate-700 dark:text-slate-300">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
              <div className="flex space-x-2">
                <button
                  onClick={(e) => openEditModal(patient, e)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleToggleArchive(patient, e)}
                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                  title={patient.archived ? "Désarchiver" : "Archiver"}
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => openDeleteModal(patient, e)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                <span>Dossier</span>
                <Activity className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>
        ))}

        {filteredPatients.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Aucun patient trouvé</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {searchTerm ? "Aucun patient ne correspond à votre recherche." : "Commencez par ajouter votre premier patient."}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isAddModalOpen ? 'Nouveau Patient' : 'Modifier le Patient'}
              </h2>
            </div>
            <form onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prénom</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    />
                    <VoiceInput 
                      onResult={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      size="sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    />
                    <VoiceInput 
                      onResult={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date de naissance</label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={e => setFormData({...formData, dateOfBirth: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sexe</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({...formData, gender: e.target.value})}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes médicales (optionnel)</label>
                <div className="relative">
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    placeholder="Antécédents, allergies..."
                  />
                  <VoiceInput 
                    onResult={(text) => setFormData(prev => ({ ...prev, notes: prev.notes ? `${prev.notes} ${text}` : text }))}
                    className="absolute right-2 top-2"
                    size="sm"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Champs personnalisés</label>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    + Ajouter un champ
                  </button>
                </div>
                {formData.customFields.map((field, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <input
                      type="text"
                      placeholder="Nom (ex: Assurance)"
                      value={field.key}
                      onChange={e => updateCustomField(index, e.target.value, field.value)}
                      className="flex-1 p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                    />
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Valeur"
                        value={field.value}
                        onChange={e => updateCustomField(index, field.key, e.target.value)}
                        className="w-full p-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg pr-8"
                      />
                      <VoiceInput 
                        onResult={(text) => updateCustomField(index, field.key, text)}
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        size="sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCustomField(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  {isAddModalOpen ? 'Ajouter' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-xl p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Supprimer le patient ?</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Êtes-vous sûr de vouloir supprimer <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong> ? Cette action est irréversible et supprimera toutes les données médicales associées.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
        title="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmLabel="Se déconnecter"
        variant="primary"
      />
    </div>
  );
}
