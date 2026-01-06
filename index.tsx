import React, { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';

/**
 * 📝 PASTE YOUR TEXT FILE CONTENT HERE
 * The application will use this specific text as the primary source for all recommendations.
 */
const GUIDELINES_KNOWLEDGE_BASE = `
[PLEASE PASTE THE CONTENT OF YOUR MEDICAL TEXT FILE HERE]

Emergency Triage Rules (Default if not provided):
- Heart Rate: <50 or >120 bpm at rest is critical.
- SpO2: <92% is critical, <94% requires observation.
- Blood Pressure: >180/120 (Hypertensive Crisis) requires immediate ER.
- Temperature: >103°F (39.4°C) is high grade fever.
- Chest pain, shortness of breath, or sudden slurred speech are emergencies.
`;

// --- Types ---
interface PatientProfile {
  fullName: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  bloodGroup: string;
  heartRate: string;
  systolicBP: string;
  diastolicBP: string;
  temp: string;
  spo2: string;
}

interface VitalsStatus {
  label: string;
  value: string;
  status: 'normal' | 'warning' | 'danger' | 'unknown';
  icon: string;
}

const App: React.FC = () => {
  const [profile, setProfile] = useState<PatientProfile>({
    fullName: '',
    age: '',
    gender: '',
    weight: '',
    height: '',
    bloodGroup: '',
    heartRate: '',
    systolicBP: '',
    diastolicBP: '',
    temp: '',
    spo2: '',
  });
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Instant deterministic check for common ranges
  const vitalsAnalysis = useMemo(() => {
    const analysis: VitalsStatus[] = [];
    
    if (profile.heartRate) {
      const hr = parseInt(profile.heartRate);
      analysis.push({
        label: 'Heart Rate',
        value: `${hr} bpm`,
        status: hr > 110 || hr < 50 ? 'danger' : hr > 100 || hr < 60 ? 'warning' : 'normal',
        icon: 'fa-heart-pulse'
      });
    }
    
    if (profile.spo2) {
      const s = parseInt(profile.spo2);
      analysis.push({
        label: 'Oxygen Sat.',
        value: `${s}%`,
        status: s < 92 ? 'danger' : s < 95 ? 'warning' : 'normal',
        icon: 'fa-wind'
      });
    }

    if (profile.systolicBP && profile.diastolicBP) {
      const s = parseInt(profile.systolicBP);
      const d = parseInt(profile.diastolicBP);
      analysis.push({
        label: 'Blood Pressure',
        value: `${s}/${d}`,
        status: (s > 160 || d > 100) ? 'danger' : (s > 130 || d > 85) ? 'warning' : 'normal',
        icon: 'fa-droplet'
      });
    }

    return analysis;
  }, [profile]);

  const handleAnalyze = async () => {
    if (!profile.fullName && !symptoms && !profile.heartRate) {
      alert("Please enter patient information or symptoms to begin analysis.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        You are a senior Clinical Advisor. 
        Analyze the patient data strictly using the provided guidelines.

        ### CLINICAL GUIDELINES (SOURCE OF TRUTH):
        ${GUIDELINES_KNOWLEDGE_BASE}

        ### PATIENT CONTEXT:
        - Name: ${profile.fullName || 'Anonymous'}
        - Profile: ${profile.age}y, ${profile.gender}, ${profile.weight}kg, ${profile.height}cm, Blood: ${profile.bloodGroup}
        - Vitals: HR ${profile.heartRate} bpm, BP ${profile.systolicBP}/${profile.diastolicBP} mmHg, SpO2 ${profile.spo2}%, Temp ${profile.temp}
        - Symptoms: ${symptoms || 'None specified'}

        ### OUTPUT REQUIREMENTS:
        1. Clinical Impression: A brief summary of the status based on the guidelines.
        2. Detailed Assessment: Break down each vital and symptom relative to the reference text.
        3. Recommended Actions: Precise steps for the user to take.
        4. Triage Status: (Normal / Monitor / Urgent / Emergency).
        5. Clear Medical Disclaimer.

        Format: Professional clinical report style using Markdown. Use bolding for critical terms.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 4000 }
        }
      });

      setResult(response.text || "No analysis could be generated.");
    } catch (error) {
      console.error("Analysis Error:", error);
      setResult("### System Error\nUnable to process analysis at this time. Please ensure clinical data is formatted correctly.");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = (field: keyof PatientProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const resetData = () => {
    if (confirm("Clear all entry data?")) {
      setProfile({
        fullName: '', age: '', gender: '', weight: '', height: '', bloodGroup: '',
        heartRate: '', systolicBP: '', diastolicBP: '', temp: '', spo2: ''
      });
      setSymptoms('');
      setResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 selection:bg-indigo-100 pb-20">
      {/* Top Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <i className="fa-solid fa-stethoscope text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Clinical Advisor</h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Guideline-Based Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={resetData}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors uppercase tracking-wider"
            >
              Reset All
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100 text-[10px] font-black uppercase">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Encrypted Session
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto mt-8 px-4 sm:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input Form */}
          <div className="xl:col-span-5 space-y-6">
            
            {/* Patient Identity */}
            <section className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-user-circle"></i>
                </div>
                <h2 className="font-bold text-slate-800">Patient Profile</h2>
              </div>
              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-6">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    value={profile.fullName}
                    onChange={(e) => updateProfile('fullName', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                    placeholder="Enter patient name"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Age</label>
                  <input 
                    type="number" 
                    value={profile.age}
                    onChange={(e) => updateProfile('age', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                    placeholder="--"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Gender</label>
                  <select 
                    value={profile.gender}
                    onChange={(e) => updateProfile('gender', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                  >
                    <option value="">--</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Blood Group</label>
                  <select 
                    value={profile.bloodGroup}
                    onChange={(e) => updateProfile('bloodGroup', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium appearance-none"
                  >
                    <option value="">--</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Weight (kg)</label>
                  <input 
                    type="number" 
                    value={profile.weight}
                    onChange={(e) => updateProfile('weight', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Height (cm)</label>
                  <input 
                    type="number" 
                    value={profile.height}
                    onChange={(e) => updateProfile('height', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                    placeholder="0"
                  />
                </div>
              </div>
            </section>

            {/* Clinical Vitals */}
            <section className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-heart-pulse"></i>
                </div>
                <h2 className="font-bold text-slate-800">Clinical Vitals</h2>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Heart Rate</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={profile.heartRate}
                      onChange={(e) => updateProfile('heartRate', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-bold text-lg"
                      placeholder="--"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">BPM</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Oxygen (SpO2)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={profile.spo2}
                      onChange={(e) => updateProfile('spo2', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-bold text-lg"
                      placeholder="--"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">%</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Systolic BP</label>
                  <input 
                    type="number" 
                    value={profile.systolicBP}
                    onChange={(e) => updateProfile('systolicBP', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-bold text-lg"
                    placeholder="120"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Diastolic BP</label>
                  <input 
                    type="number" 
                    value={profile.diastolicBP}
                    onChange={(e) => updateProfile('diastolicBP', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-bold text-lg"
                    placeholder="80"
                  />
                </div>
                <div className="col-span-4">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1 block mb-1.5">Body Temp</label>
                  <input 
                    type="text" 
                    value={profile.temp}
                    onChange={(e) => updateProfile('temp', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all font-bold text-lg"
                    placeholder="e.g. 98.6°F"
                  />
                </div>
              </div>
            </section>

            {/* Symptoms Description */}
            <section className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-comment-medical"></i>
                </div>
                <h2 className="font-bold text-slate-800">Symptoms & Feelings</h2>
              </div>
              <textarea 
                rows={4}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium text-slate-700 resize-none"
                placeholder="Describe specific symptoms, duration, and severity..."
              ></textarea>
            </section>

            <button 
              onClick={handleAnalyze}
              disabled={loading}
              className={`w-full py-5 rounded-[2rem] text-lg font-black text-white shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-[0.98] ${
                loading 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300'
              }`}
            >
              {loading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
              {loading ? "Synthesizing Guidelines..." : "Run Clinical Assessment"}
            </button>
          </div>

          {/* Right Column: Analysis Output */}
          <div className="xl:col-span-7 space-y-6">
            
            {/* Real-time Triage Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {vitalsAnalysis.length > 0 ? vitalsAnalysis.map((stat, i) => (
                <div key={i} className={`p-5 rounded-[2rem] border-2 flex items-center gap-4 transition-all ${
                  stat.status === 'danger' ? 'bg-rose-50 border-rose-100 text-rose-700' : 
                  stat.status === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' : 
                  'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    stat.status === 'danger' ? 'bg-rose-100' : 
                    stat.status === 'warning' ? 'bg-amber-100' : 'bg-emerald-100'
                  }`}>
                    <i className={`fa-solid ${stat.icon}`}></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">{stat.label}</p>
                    <p className="text-xl font-black">{stat.value}</p>
                  </div>
                </div>
              )) : (
                <div className="col-span-3 py-10 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <i className="fa-solid fa-chart-line text-2xl mb-2 opacity-20"></i>
                  <p className="text-sm font-bold uppercase tracking-widest opacity-40">Awaiting Clinical Data</p>
                </div>
              )}
            </div>

            {/* Assessment Report Card */}
            <div className="bg-white rounded-[2.5rem] shadow-sm ring-1 ring-slate-200 overflow-hidden min-h-[700px] flex flex-col">
              <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Guideline Assessment Report</h3>
                {result && (
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-400">
                    Generated {new Date().toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <div className="flex-1 p-10">
                {result ? (
                  <div className="prose prose-slate max-w-none">
                    <div 
                      className="text-slate-600 leading-relaxed font-medium"
                      dangerouslySetInnerHTML={{ 
                        __html: result
                          .replace(/### (.*)/g, '<h4 class="text-xl font-black text-slate-900 mt-10 mb-4 flex items-center gap-2 underline decoration-indigo-200 decoration-4 underline-offset-4">$1</h4>')
                          .replace(/## (.*)/g, '<h3 class="text-2xl font-black text-slate-900 mt-12 mb-6 bg-slate-50 p-4 rounded-2xl border-l-8 border-indigo-600">$1</h3>')
                          .replace(/\n- (.*)/g, '<div class="flex gap-4 ml-2 my-4 group"><div class="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 flex-shrink-0 transition-transform group-hover:scale-150"></div><span class="text-slate-700">$1</span></div>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 px-1">$1</strong>')
                          .split('\n').map(line => line.trim().startsWith('<div') || line.trim().startsWith('<h') ? line : `<p class="mb-5">${line}</p>`).join('')
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-24">
                    <div className="w-24 h-24 bg-indigo-50 text-indigo-200 rounded-full flex items-center justify-center mb-8 animate-pulse">
                      <i className="fa-solid fa-file-medical text-5xl"></i>
                    </div>
                    <h3 className="text-xl font-black text-slate-300 tracking-tighter uppercase">Waiting for Input</h3>
                    <p className="max-w-xs text-center text-slate-400 font-bold text-xs mt-3 leading-relaxed uppercase tracking-widest">
                      The clinical engine is ready to process your entry against the hardcoded guidelines.
                    </p>
                  </div>
                )}
              </div>

              {/* Legal / Safety Footer */}
              <div className="p-8 bg-slate-900 text-white">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black uppercase tracking-widest text-rose-500 mb-1">Emergency Warning & Disclaimer</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      This assessment is generated by an AI using private reference guidelines. It is for informational purposes only. If you are experiencing chest pain, severe shortness of breath, sudden numbness, or heavy bleeding, <strong className="text-white">Call 911 (or local emergency services) immediately.</strong> This is not a substitute for clinical diagnosis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-20 border-t border-slate-200 py-12 text-center">
        <div className="flex items-center justify-center gap-6 mb-4 opacity-30">
          <i className="fa-solid fa-shield-halved"></i>
          <i className="fa-solid fa-lock"></i>
          <i className="fa-solid fa-user-shield"></i>
        </div>
        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
          &copy; {new Date().getFullYear()} Private Clinical Advisor Instance • Built on Gemini Pro
        </p>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);