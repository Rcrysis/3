import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, Droplet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { db } from '../services/db';
import { BPRecord, GlucoseRecord } from '../types';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const { theme } = useTheme();
  const { patientId } = useParams();
  const [bpRecords, setBpRecords] = useState<BPRecord[]>([]);
  const [glucoseRecords, setGlucoseRecords] = useState<GlucoseRecord[]>([]);
  const patient = patientId ? db.getPatient(patientId) : null;

  useEffect(() => {
    if (!patientId) return;
    setBpRecords(db.getBPRecords(patientId).slice(0, 14).reverse()); // Last 14 records for chart
    setGlucoseRecords(db.getGlucoseRecords(patientId).slice(0, 14).reverse());
  }, [patientId]);

  const latestBP = bpRecords[bpRecords.length - 1];
  const latestGlucose = glucoseRecords[glucoseRecords.length - 1];

  const isHighBP = latestBP && (latestBP.systolic > 140 || latestBP.diastolic > 90);
  const isHighGlucose = latestGlucose && latestGlucose.value > 180;
  const isLowGlucose = latestGlucose && latestGlucose.value < 70;

  const bpChartData = bpRecords.map(r => ({
    time: format(r.timestamp, 'd MMM', { locale: fr }),
    systolic: r.systolic,
    diastolic: r.diastolic
  }));

  const glucoseChartData = glucoseRecords.map(r => ({
    time: format(r.timestamp, 'd MMM', { locale: fr }),
    glucose: r.value
  }));

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tableau de bord</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Aperçu de la santé de {patient ? `${patient.firstName} ${patient.lastName}` : 'ce patient'}
        </p>
      </header>

      {/* Alerts */}
      {(isHighBP || isHighGlucose || isLowGlucose) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-medium">Alertes de santé</h3>
            <ul className="mt-1 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
              {isHighBP && <li>La tension artérielle est supérieure à la normale ({latestBP.systolic}/{latestBP.diastolic})</li>}
              {isHighGlucose && <li>La glycémie est élevée ({latestGlucose.value} mg/dL)</li>}
              {isLowGlucose && <li>La glycémie est basse ({latestGlucose.value} mg/dL)</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
              <Activity className="w-5 h-5" />
              <h2 className="font-semibold">Dernière Tension</h2>
            </div>
            {latestBP && <span className="text-xs text-slate-400 dark:text-slate-500">{format(latestBP.timestamp, 'd MMM, HH:mm', { locale: fr })}</span>}
          </div>
          {latestBP ? (
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-bold text-slate-900 dark:text-white">{latestBP.systolic}/{latestBP.diastolic}</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">mmHg</span>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">Aucun enregistrement</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400">
              <Droplet className="w-5 h-5" />
              <h2 className="font-semibold">Dernière Glycémie</h2>
            </div>
            {latestGlucose && <span className="text-xs text-slate-400 dark:text-slate-500">{format(latestGlucose.timestamp, 'd MMM, HH:mm', { locale: fr })}</span>}
          </div>
          {latestGlucose ? (
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-bold text-slate-900 dark:text-white">{latestGlucose.value}</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">mg/dL</span>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">Aucun enregistrement</p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Tendances de la tension artérielle</h3>
          <div className="h-64">
            {bpChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bpChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                      color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                    }}
                  />
                  <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" />
                  <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="systolic" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="diastolic" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-600">Pas assez de données</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Tendances de la glycémie</h3>
          <div className="h-64">
            {glucoseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={glucoseChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                      color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                    }}
                  />
                  <ReferenceLine y={180} stroke="#ef4444" strokeDasharray="3 3" />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="glucose" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-600">Pas assez de données</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
