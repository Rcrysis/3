import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Shield, Trash2, LogOut, Bell, BellOff, Fingerprint, Grid3X3, Lock, Download, Upload, Database } from 'lucide-react';
import { db } from '../services/db';
import { Patient, UserProfile } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { notificationService } from '../services/notifications';
import PatternLock from '../components/PatternLock';

export default function Settings() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const [user, setUser] = useState<UserProfile | null>(db.getUser());
  const [patient, setPatient] = useState<Patient | null>(null);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [showDeletePatientModal, setShowDeletePatientModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPatternSetup, setShowPatternSetup] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  useEffect(() => {
    if (patientId) {
      setPatient(db.getPatient(patientId) || null);
    }
  }, [patientId]);

  const handleRequestPermission = async () => {
    const permission = await notificationService.requestPermission();
    setNotifPermission(permission);
  };

  const handleToggleBiometric = () => {
    if (!user) return;
    const updatedUser = { ...user, biometricEnabled: !user.biometricEnabled };
    db.setUser(updatedUser);
    setUser(updatedUser);
  };

  const handlePatternComplete = (pattern: string) => {
    if (!user) return;
    const updatedUser = { ...user, pattern, authMethod: 'pattern' as const };
    db.setUser(updatedUser);
    setUser(updatedUser);
    setShowPatternSetup(false);
  };

  const handlePinChange = () => {
    if (!user) return;
    if (newPin.length < 4) {
      setPinError('Le code PIN doit comporter au moins 4 chiffres');
      return;
    }
    const updatedUser = { ...user, pin: newPin, authMethod: 'pin' as const };
    db.setUser(updatedUser);
    setUser(updatedUser);
    setShowPinSetup(false);
    setNewPin('');
    setPinError('');
  };

  const handleSetDefaultAuth = (method: 'pin' | 'pattern' | 'biometric') => {
    if (!user) return;
    const updatedUser = { ...user, authMethod: method };
    db.setUser(updatedUser);
    setUser(updatedUser);
  };

  const handleClearData = () => {
    if (!patientId) return;
    
    // Clear all data for this patient
    const bpRecords = db.getBPRecords(patientId);
    bpRecords.forEach(r => db.deleteBPRecord(r.id));
    
    const glucoseRecords = db.getGlucoseRecords(patientId);
    glucoseRecords.forEach(r => db.deleteGlucoseRecord(r.id));
    
    const insulinRecords = db.getInsulinRecords(patientId);
    insulinRecords.forEach(r => db.deleteInsulinRecord(r.id));
    
    const meds = db.getMedications(patientId);
    meds.forEach(m => db.deleteMedication(m.id));
    
    const docs = db.getDocuments(patientId);
    docs.forEach(d => db.deleteDocument(d.id));
    
    setShowClearDataModal(false);
    window.location.reload();
  };

  const handleDeletePatient = () => {
    if (!patientId) return;
    db.deletePatient(patientId);
    navigate('/');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleExport = () => {
    const data = db.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_health_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (db.importData(content)) {
        alert('Restauration réussie ! L\'application va redémarrer.');
        window.location.href = '/';
      } else {
        alert('Erreur lors de la restauration. Fichier invalide.');
      }
    };
    reader.readAsText(file);
  };

  const confirmLogout = () => {
    db.logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Paramètres du patient</h1>
        <p className="text-slate-500 dark:text-slate-400">Gérez le dossier de {patient?.firstName} {patient?.lastName}</p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{patient?.firstName} {patient?.lastName}</h2>
            <p className="text-slate-500 dark:text-slate-400">Dossier patient</p>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center">
              <Lock className="w-4 h-4 mr-2" />
              Authentification
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Code PIN</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Code de sécurité à 4 chiffres.</p>
                  </div>
                  <button
                    onClick={() => setShowPinSetup(!showPinSetup)}
                    className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Modifier
                  </button>
                </div>

                {showPinSetup && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nouveau Code PIN</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="****"
                      />
                      {pinError && <p className="mt-1 text-xs text-red-500">{pinError}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handlePinChange}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => {
                          setShowPinSetup(false);
                          setNewPin('');
                          setPinError('');
                        }}
                        className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Biométrie (Empreinte/Facial)</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Utiliser les capteurs de l'appareil.</p>
                  </div>
                  <button
                    onClick={handleToggleBiometric}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${user?.biometricEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user?.biometricEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">Schéma (Screen-lock)</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user?.pattern ? 'Schéma configuré' : 'Non configuré'}</p>
                  </div>
                  <button
                    onClick={() => setShowPatternSetup(true)}
                    className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {user?.pattern ? 'Modifier' : 'Configurer'}
                  </button>
                </div>

                {showPatternSetup && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col items-center">
                    <p className="text-sm font-medium text-slate-900 dark:text-white mb-4">Dessinez votre nouveau schéma</p>
                    <PatternLock onComplete={handlePatternComplete} />
                    <button 
                      onClick={() => setShowPatternSetup(false)}
                      className="mt-4 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-3">Méthode par défaut</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleSetDefaultAuth('pin')}
                      className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${user?.authMethod === 'pin' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}
                    >
                      <Lock className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold uppercase">PIN</span>
                    </button>
                    <button
                      onClick={() => handleSetDefaultAuth('pattern')}
                      disabled={!user?.pattern}
                      className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${user?.authMethod === 'pattern' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-400'} ${!user?.pattern ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Grid3X3 className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold uppercase">Schéma</span>
                    </button>
                    <button
                      onClick={() => handleSetDefaultAuth('biometric')}
                      disabled={!user?.biometricEnabled}
                      className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${user?.authMethod === 'biometric' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-400'} ${!user?.biometricEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Fingerprint className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold uppercase">Bio</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Rappels et alertes</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Recevoir des notifications pour les médicaments et les alertes de santé.</p>
                </div>
                <button
                  onClick={handleRequestPermission}
                  disabled={notifPermission === 'granted'}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    notifPermission === 'granted'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {notifPermission === 'granted' ? 'Activé' : 'Activer'}
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center">
              <Database className="w-4 h-4 mr-2" />
              Sauvegarde et Restauration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleExport}
                className="flex items-center justify-center space-x-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-blue-700 dark:text-blue-400 font-bold"
              >
                <Download className="w-5 h-5" />
                <span>Sauvegarder</span>
              </button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex items-center justify-center space-x-2 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-bold">
                  <Upload className="w-5 h-5" />
                  <span>Restaurer</span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Exportez vos données dans un fichier JSON pour les sauvegarder ou les transférer vers un autre appareil.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Sécurité et données
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Stockage local</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Vos données sont stockées en toute sécurité sur cet appareil.</p>
                </div>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">Actif</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-4">Zone de danger</h3>
            <div className="space-y-3">
              <button 
                onClick={() => setShowClearDataModal(true)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">Effacer les données de santé</p>
                  <p className="text-sm text-red-500 dark:text-red-500/80">Supprimer tous les dossiers, médicaments et documents pour ce patient.</p>
                </div>
                <Trash2 className="w-5 h-5 text-red-400 dark:text-red-500/50" />
              </button>

              <button 
                onClick={() => setShowDeletePatientModal(true)}
                className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-left"
              >
                <div>
                  <p className="font-bold text-red-700 dark:text-red-400">Supprimer le dossier patient</p>
                  <p className="text-sm text-red-600 dark:text-red-500/80">Supprimer définitivement ce patient et toutes ses données.</p>
                </div>
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </button>
            </div>
          </section>

          <section className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 p-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion de l'application</span>
            </button>
          </section>
        </div>
      </div>

      <ConfirmModal
        isOpen={showClearDataModal}
        onClose={() => setShowClearDataModal(false)}
        onConfirm={handleClearData}
        title="Effacer les données de santé"
        message={`Êtes-vous sûr de vouloir supprimer TOUTES les données de santé pour ${patient?.firstName} ${patient?.lastName} ? Cette action est irréversible.`}
      />

      <ConfirmModal
        isOpen={showDeletePatientModal}
        onClose={() => setShowDeletePatientModal(false)}
        onConfirm={handleDeletePatient}
        title="Supprimer le dossier patient"
        message={`Êtes-vous sûr de vouloir supprimer le dossier de ${patient?.firstName} ${patient?.lastName} et TOUTES ses données ?`}
      />

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        title="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmLabel="Se déconnecter"
        variant="primary"
      />
    </div>
  );
}
