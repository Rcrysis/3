import React, { useState, useMemo, useEffect } from 'react';
import { Download, Mail, Calendar, Activity, Droplet, Loader2, Pill, Syringe } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { db } from '../services/db';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, AreaChart, Area
} from 'recharts';
import { Patient, GlucoseRecord, BPRecord, InsulinRecord, Medication } from '../types';

export default function Reports() {
  const { patientId } = useParams();
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 14), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedTypes, setSelectedTypes] = useState({
    glucose: true,
    bp: true,
    insulin: true
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);

  const [allGlucose, setAllGlucose] = useState<GlucoseRecord[]>([]);
  const [allBP, setAllBP] = useState<BPRecord[]>([]);
  const [allInsulin, setAllInsulin] = useState<InsulinRecord[]>([]);
  const [allMeds, setAllMeds] = useState<Medication[]>([]);

  useEffect(() => {
    if (patientId) {
      setPatient(db.getPatient(patientId) || null);
      setAllGlucose(db.getGlucoseRecords(patientId));
      setAllBP(db.getBPRecords(patientId));
      setAllInsulin(db.getInsulinRecords(patientId));
      setAllMeds(db.getMedications(patientId));
    }
  }, [patientId]);

  const filteredGlucose = useMemo(() => {
    const start = startOfDay(new Date(dateRange.start)).getTime();
    const end = endOfDay(new Date(dateRange.end)).getTime();
    return allGlucose.filter(r => r.timestamp >= start && r.timestamp <= end).sort((a, b) => a.timestamp - b.timestamp);
  }, [allGlucose, dateRange]);

  const filteredBP = useMemo(() => {
    const start = startOfDay(new Date(dateRange.start)).getTime();
    const end = endOfDay(new Date(dateRange.end)).getTime();
    return allBP.filter(r => r.timestamp >= start && r.timestamp <= end).sort((a, b) => a.timestamp - b.timestamp);
  }, [allBP, dateRange]);

  const filteredInsulin = useMemo(() => {
    const start = startOfDay(new Date(dateRange.start)).getTime();
    const end = endOfDay(new Date(dateRange.end)).getTime();
    return allInsulin.filter(r => r.timestamp >= start && r.timestamp <= end).sort((a, b) => a.timestamp - b.timestamp);
  }, [allInsulin, dateRange]);

  // Correlation logic for Glucose table
  const glucoseWithTreatments = useMemo(() => {
    return [...filteredGlucose].reverse().map(g => {
      // Find insulin within 4 hours before or 1 hour after
      const relatedInsulin = allInsulin.filter(i => 
        i.timestamp >= g.timestamp - 4 * 3600 * 1000 && 
        i.timestamp <= g.timestamp + 3600 * 1000
      );
      
      // Find meds taken on the same day
      const gDate = new Date(g.timestamp).toDateString();
      const relatedMeds = allMeds.filter(m => 
        m.takenLog?.some(log => new Date(log).toDateString() === gDate)
      );

      return {
        ...g,
        insulin: relatedInsulin,
        meds: relatedMeds
      };
    });
  }, [filteredGlucose, allInsulin, allMeds]);

  // Glucose Stats
  const glucoseStats = useMemo(() => {
    if (filteredGlucose.length === 0) return null;
    const values = filteredGlucose.map(g => g.value);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const inRange = values.filter(v => v >= 70 && v <= 180).length;
    const hypo = values.filter(v => v < 70).length;
    const hyper = values.filter(v => v > 180).length;
    
    const tir = Math.round((inRange / values.length) * 100);
    const hypoPct = Math.round((hypo / values.length) * 100);
    const hyperPct = Math.round((hyper / values.length) * 100);

    return { avg, min, max, tir, hypoPct, hyperPct, count: values.length };
  }, [filteredGlucose]);

  // BP Stats
  const bpStats = useMemo(() => {
    if (filteredBP.length === 0) return null;
    const sys = filteredBP.map(b => b.systolic);
    const dia = filteredBP.map(b => b.diastolic);
    const hr = filteredBP.map(b => b.heartRate);
    
    return {
      sysAvg: Math.round(sys.reduce((a, b) => a + b, 0) / sys.length),
      sysMin: Math.min(...sys),
      sysMax: Math.max(...sys),
      diaAvg: Math.round(dia.reduce((a, b) => a + b, 0) / dia.length),
      diaMin: Math.min(...dia),
      diaMax: Math.max(...dia),
      hrAvg: Math.round(hr.reduce((a, b) => a + b, 0) / hr.length),
      count: filteredBP.length
    };
  }, [filteredBP]);

  const glucoseChartData = filteredGlucose.map(g => ({
    date: format(g.timestamp, 'dd/MM HH:mm'),
    value: g.value
  }));

  const bpChartData = filteredBP.map(b => ({
    date: format(b.timestamp, 'dd/MM HH:mm'),
    systolic: b.systolic,
    diastolic: b.diastolic,
    heartRate: b.heartRate
  }));

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const element = document.getElementById('report-content');
      if (!element) return;

      // Temporarily force light mode for PDF generation if needed, 
      // but html-to-image usually captures current state.
      // We'll just ensure the background is white for the report.
      
      const imgData = await toPng(element, { 
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          color: '#000000'
        }
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const elementWidth = element.offsetWidth;
      const elementHeight = element.offsetHeight;
      const pdfHeight = (elementHeight * pdfWidth) / elementWidth;
      
      // If height exceeds one page, we might need multiple pages, 
      // but for now let's stick to one long page or standard A4 if it fits.
      // Standard A4 height is ~297mm.
      
      if (pdfHeight > 297) {
        // Multi-page logic
        let heightLeft = pdfHeight;
        let position = 0;
        const pageHeight = 297;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      const selectedNames = Object.entries(selectedTypes)
        .filter(([_, selected]) => selected)
        .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1))
        .join('_');

      pdf.save(`Rapport_Sante_${selectedNames}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Échec de la génération du rapport PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmail = () => {
    const selectedNames = Object.entries(selectedTypes)
      .filter(([_, selected]) => selected)
      .map(([name]) => name === 'glucose' ? 'Glycémie' : name === 'bp' ? 'Tension' : 'Insuline')
      .join(', ');
    
    const subject = `Rapport de santé (${selectedNames}) - ${patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}`;
    const body = `Bonjour Docteur,\n\nVeuillez trouver ci-joint mon rapport de santé (${selectedNames.toLowerCase()}) pour la période du ${format(new Date(dateRange.start), 'dd/MM/yyyy')} au ${format(new Date(dateRange.end), 'dd/MM/yyyy')}.\n\n(Note: Veuillez attacher le fichier PDF exporté à cet e-mail avant de l'envoyer)\n\nCordialement,\n${patient ? `${patient.firstName} ${patient.lastName}` : ''}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'fasting': return 'À jeun';
      case 'before_meal': return 'Avant repas';
      case 'after_meal': return 'Après repas';
      case 'bedtime': return 'Coucher';
      default: return t;
    }
  };

  return (
    <div className="space-y-6 min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rapport de santé</h1>
          <p className="text-slate-500 dark:text-slate-400">Analysez et exportez vos données</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm gap-2 sm:gap-0 transition-colors">
            <div className="flex items-center w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2 shrink-0" />
              <input 
                type="date" 
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="text-sm bg-transparent border-none focus:ring-0 p-0 text-slate-700 dark:text-slate-300 w-full"
              />
            </div>
            <span className="hidden sm:block mx-2 text-slate-400 dark:text-slate-600">-</span>
            <div className="flex items-center w-full sm:w-auto border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-2 sm:pt-0">
              <span className="sm:hidden text-xs text-slate-400 dark:text-slate-500 mr-2 w-4 shrink-0">à</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="text-sm bg-transparent border-none focus:ring-0 p-0 text-slate-700 dark:text-slate-300 w-full"
              />
            </div>
          </div>

          <button 
            onClick={generatePDF}
            disabled={isGenerating}
            className="flex items-center space-x-2 bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-xl font-medium hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button 
            onClick={handleEmail}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Envoyer au médecin</span>
          </button>
        </div>
      </header>

      {/* Selection Section */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Données à inclure</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center space-x-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedTypes.glucose ? 'bg-teal-600 border-teal-600' : 'border-slate-300 dark:border-slate-700'}`}>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={selectedTypes.glucose}
                onChange={() => setSelectedTypes(prev => ({ ...prev, glucose: !prev.glucose }))}
              />
              {selectedTypes.glucose && <Activity className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-teal-600 transition-colors">Glycémie</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedTypes.bp ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-700'}`}>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={selectedTypes.bp}
                onChange={() => setSelectedTypes(prev => ({ ...prev, bp: !prev.bp }))}
              />
              {selectedTypes.bp && <Activity className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">Tension Artérielle</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedTypes.insulin ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-700'}`}>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={selectedTypes.insulin}
                onChange={() => setSelectedTypes(prev => ({ ...prev, insulin: !prev.insulin }))}
              />
              {selectedTypes.insulin && <Syringe className="w-3 h-3 text-white" />}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">Insuline</span>
          </label>
        </div>
      </div>

      {/* Printable Report Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div id="report-content" className="p-8 bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors">
          
          {/* Report Header */}
          <div className="text-center mb-10 border-b border-slate-200 dark:border-slate-800 pb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Rapport de Suivi Médical
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Période du {format(new Date(dateRange.start), 'd MMMM yyyy', { locale: fr })} au {format(new Date(dateRange.end), 'd MMMM yyyy', { locale: fr })}
            </p>
            {patient && <p className="text-lg font-medium mt-4 text-slate-800 dark:text-slate-200">Patient : {patient.firstName} {patient.lastName}</p>}
          </div>

          {/* SECTION 1: GLUCOSE */}
          {selectedTypes.glucose && (
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
                <Droplet className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Glycémie & Traitements</h2>
            </div>

            {glucoseStats ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Moyenne</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{glucoseStats.avg} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">mg/dL</span></div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Min / Max</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{glucoseStats.min} / {glucoseStats.max}</div>
                  </div>
                  <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-xl border border-teal-100 dark:border-teal-900/30">
                    <div className="text-sm text-teal-600 dark:text-teal-400 mb-1">Dans la cible (70-180)</div>
                    <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">{glucoseStats.tir}%</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                    <div className="text-sm text-red-600 dark:text-red-400 mb-1">Hypo / Hyper</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">{glucoseStats.hypoPct}% / {glucoseStats.hyperPct}%</div>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-64 w-full mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={glucoseChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGlucose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} />
                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} domain={['dataMin - 20', 'dataMax + 20']} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-bg-opacity)' }}
                        itemStyle={{ color: '#0d9488' }}
                      />
                      <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Hypo (70)', fill: '#ef4444', fontSize: 12 }} />
                      <ReferenceLine y={180} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Hyper (180)', fill: '#f59e0b', fontSize: 12 }} />
                      <Area type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorGlucose)" name="Glycémie" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Date & Heure</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Glycémie</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Contexte</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Insuline (±4h)</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Médicaments (Jour)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {glucoseWithTreatments.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {format(r.timestamp, 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="p-3">
                            <span className={`font-bold ${r.value < 70 ? 'text-red-600 dark:text-red-400' : r.value > 180 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600 dark:text-teal-400'}`}>
                              {r.value} mg/dL
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{getTypeLabel(r.type)}</td>
                          <td className="p-3">
                            {r.insulin.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {r.insulin.map(i => (
                                  <span key={i.id} className="inline-flex items-center text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md">
                                    <Syringe className="w-3 h-3 mr-1" />
                                    {i.dose}U {i.type}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-slate-400 dark:text-slate-600">-</span>}
                          </td>
                          <td className="p-3">
                            {r.meds.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {r.meds.map(m => (
                                  <span key={m.id} className="inline-flex items-center text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-md">
                                    <Pill className="w-3 h-3 mr-1" />
                                    {m.name}
                                  </span>
                                ))}
                              </div>
                            ) : <span className="text-slate-400 dark:text-slate-600">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 italic">Aucune donnée de glycémie pour cette période.</p>
            )}
          </div>
          )}

          {/* SECTION 2: BLOOD PRESSURE */}
          {selectedTypes.bp && (
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Activity className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tension Artérielle</h2>
            </div>

            {bpStats ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Moyenne (SYS/DIA)</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{bpStats.sysAvg}/{bpStats.diaAvg}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Min (SYS/DIA)</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{bpStats.sysMin}/{bpStats.diaMin}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Max (SYS/DIA)</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{bpStats.sysMax}/{bpStats.diaMax}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Fréq. Cardiaque Moy.</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{bpStats.hrAvg} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">bpm</span></div>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-64 w-full mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bpChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                      <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} />
                      <YAxis tick={{fontSize: 12, fill: '#64748b'}} domain={['dataMin - 10', 'dataMax + 10']} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-bg-opacity)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" />
                      <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="systolic" stroke="#2563eb" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} name="Systolique" />
                      <Line type="monotone" dataKey="diastolic" stroke="#60a5fa" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} name="Diastolique" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Date & Heure</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Tension (SYS/DIA)</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Pouls</th>
                        <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[...filteredBP].reverse().map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {format(r.timestamp, 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="p-3">
                            <span className={`font-bold ${r.systolic >= 140 || r.diastolic >= 90 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                              {r.systolic}/{r.diastolic} mmHg
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{r.heartRate} bpm</td>
                          <td className="p-3 text-slate-500 dark:text-slate-500">{r.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 italic">Aucune donnée de tension artérielle pour cette période.</p>
            )}
          </div>
          )}

          {/* SECTION 3: INSULIN */}
          {selectedTypes.insulin && (
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Syringe className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Injections d'Insuline</h2>
            </div>

            {filteredInsulin.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800">
                      <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Date & Heure</th>
                      <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Type</th>
                      <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Dose</th>
                      <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Repas</th>
                      <th className="p-3 font-semibold text-slate-700 dark:text-slate-300">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[...filteredInsulin].reverse().map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {format(r.timestamp, 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">{r.type}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{r.dose} Unités</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{r.meal}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-500">{r.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 italic">Aucune donnée d'insuline pour cette période.</p>
            )}
          </div>
          )}

          <div className="mt-16 text-center text-sm text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-8">
            <p>Ce rapport a été généré automatiquement par Smart Health Tracker.</p>
            <p>Veuillez consulter votre professionnel de la santé pour toute décision médicale.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
