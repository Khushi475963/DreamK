
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';

/**
 * Hospital Knowledge Base & Physician Directory
 */
const GUIDELINES_KNOWLEDGE_BASE = `
[PLEASE PASTE THE CONTENT OF YOUR MEDICAL TEXT FILE HERE]

Emergency Triage Rules:
- Sudden chest pain, shortness of breath, or slurred speech are emergencies.
- Persistent high fever or severe abdominal pain requires immediate clinical evaluation.
- All advice should be cross-referenced with your specific guidelines.
`;

const JC_JUNEJA_PHYSICIANS = `
J.C Juneja Hospital Physicians List:
1. Dr. Sanjeev Sehgal (Eye Consultant) - 9:30AM–4:00PM (Free)
2. Dr. Amit Mangla (ENT / Microbiologist) - 9:30AM–4:00PM (Free)
3. Dr. Rahul Sharma (General Surgeon) - 9:30AM–4:00PM (Free)
4. Dr. Rajesh Kumar Tayal (Orthopaedic Specialist) - 9:30AM–4:00PM (Free)
5. Dr. Shalini Mangla (Paediatrician) - 9:30AM–4:00PM (Free)
6. Dr. Romani Bansal (Paediatrician) - 9:30AM–4:00PM (Free)
7. Dr. Rooshali Kumar (Obstetrics & Gynaecology) - 9:30AM–4:00PM (Free)
8. Dr. Vivek Srivastava (General Medicine) - 9:30AM–4:00PM (Free)
9. Dr. Ashima (Dental Specialist) - 9:30AM–4:00PM (Free)
10. Dr. Kamakshi (Physiotherapist / Dietitian) - 9:30AM–4:00PM (Free)
11. Dr. Vijay Dhiman (Physiotherapist) - 9:30AM–4:00PM (Free)
12. Dr. Rohit Dhadwal (Urologist) - 10:00AM–2:00PM (Every 1st Wed, ₹400)
13. Dr. Mohit Kaushal (Pulmonologist) - 11:00AM–1:00PM (Every 2nd & 4th Wed, ₹400)
14. Dr. Anil Walia (Cosmetologist) - 10:00AM–2:00PM (Every Sat, ₹100)
15. Dr. Sudhanshu Budakoti (Cardiologist) - 11:00AM–2:00PM (Every 3rd Fri, ₹400)
16. Dr. Deepti Singh (Breast & Endocrine Surgeon) - 10:00AM–2:00PM (Every 2nd Tue, ₹400)
17. Dr. Mahindra Dange (Paediatric Surgeon) - 10:00AM–2:00PM (Every 4th Tue, ₹400)
18. Dr. Nishit Sawal (Neurologist) - 11:00AM–2:00PM (Every 1st & 3rd Tue, ₹500)
19. Dr. Yogesh Jindal (Neuro Surgeon) - 11:00AM–2:00PM (Every 2nd & 4th Thu, ₹400)
20. Dr. Kalpesh (Nephrologist) - 10:00AM–2:00PM (Every 1st Wed, ₹400)
`;

// --- Types ---
interface PatientData {
  fullName: string;
  age: string;
  gender: string;
  weight: string;
  height: string;
  bloodGroup: string;
}

interface ProbableCondition {
  condition: string;
  likelihood: 'HIGH' | 'MODERATE' | 'LOW';
  explanation: string;
}

interface DoctorRecommendation {
  name: string;
  department: string;
  timing: string;
  charges: string;
  reasonForReferral: string;
}

interface AssessmentResult {
  impression: string;
  probableConditions: ProbableCondition[];
  recommendedActions: string[];
  triageStatus: 'NORMAL' | 'MONITOR' | 'URGENT' | 'EMERGENCY';
  suggestedDoctor: DoctorRecommendation;
}

const App: React.FC = () => {
  const [profile, setProfile] = useState<PatientData>({
    fullName: '',
    age: '',
    gender: '',
    weight: '',
    height: '',
    bloodGroup: '',
  });
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const handleAnalyze = async () => {
    if (!profile.fullName && !symptoms) {
      alert("Please enter patient information and symptoms to begin analysis.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        You are a senior Clinical Advisor. 
        Analyze the patient's condition strictly using the provided guidelines and physician directory.

        ### CLINICAL GUIDELINES (SOURCE OF TRUTH):
        ${GUIDELINES_KNOWLEDGE_BASE}

        ### PHYSICIAN DIRECTORY (J.C JUNEJA HOSPITAL):
        ${JC_JUNEJA_PHYSICIANS}

        ### PATIENT CONTEXT:
        - Name: ${profile.fullName || 'Anonymous'}
        - Age: ${profile.age} years
        - Gender: ${profile.gender}
        - Weight: ${profile.weight} kg
        - Height: ${profile.height} cm
        - Blood Group: ${profile.bloodGroup}
        - Symptoms: ${symptoms || 'None specified'}

        ### OUTPUT REQUIREMENTS:
        1. Summarize clinical impression.
        2. Identify list of probable conditions based on the guidelines.
        3. For each condition, assign a likelihood (HIGH, MODERATE, or LOW) and explain why based on the text.
        4. Provide specific recommended actions.
        5. Select the SINGLE MOST APPROPRIATE doctor from the J.C Juneja Hospital list for this patient.
        6. Determine triage status (NORMAL, MONITOR, URGENT, or EMERGENCY).
        
        RETURN ONLY A VALID JSON OBJECT.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              impression: { type: Type.STRING },
              probableConditions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    condition: { type: Type.STRING },
                    likelihood: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["condition", "likelihood", "explanation"]
                }
              },
              recommendedActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              triageStatus: { type: Type.STRING },
              suggestedDoctor: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  department: { type: Type.STRING },
                  timing: { type: Type.STRING },
                  charges: { type: Type.STRING },
                  reasonForReferral: { type: Type.STRING }
                },
                required: ["name", "department", "timing", "charges", "reasonForReferral"]
              }
            },
            required: ["impression", "probableConditions", "recommendedActions", "triageStatus", "suggestedDoctor"]
          },
          thinkingConfig: { thinkingBudget: 4000 }
        }
      });

      let responseText = response.text || "{}";
      // Robust JSON cleaning for LLM outputs
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || responseText.match(/```\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        responseText = jsonMatch[1];
      }
      
      const parsed = JSON.parse(responseText.trim());
      setResult(parsed);
    } catch (error) {
      console.error("Analysis Error:", error);
      alert("Unable to process clinical analysis. Please ensure your API key is configured correctly in Vercel environment variables.");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = (field: keyof PatientData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const resetData = () => {
    if (confirm("Clear all session data?")) {
      setProfile({ fullName: '', age: '', gender: '', weight: '', height: '', bloodGroup: '' });
      setSymptoms('');
      setResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-indigo-100 pb-20">
      <nav className="glass border-b border-slate-200 sticky top-0 z-20 px-4 py-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <i className="fa-solid fa-notes-medical text-lg"></i>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">Health Advisor</h1>
              <p className="text-[9px] uppercase font-black text-slate-400 tracking-[0.2em]">Clinical Decision Engine</p>
            </div>
          </div>
          <button onClick={resetData} className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-widest">
            Reset
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto mt-10 px-4 sm:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          
          {/* Inputs */}
          <div className="xl:col-span-5 space-y-8">
            <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-user-tag"></i>
                </div>
                <h2 className="font-bold text-slate-800 text-lg">Patient Information</h2>
              </div>
              <div className="grid grid-cols-6 gap-5">
                <div className="col-span-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Full Name</label>
                  <input type="text" value={profile.fullName} onChange={(e) => updateProfile('fullName', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold" placeholder="e.g. Jane Doe" />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Age</label>
                  <input type="number" value={profile.age} onChange={(e) => updateProfile('age', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold" placeholder="--" />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Gender</label>
                  <select value={profile.gender} onChange={(e) => updateProfile('gender', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold appearance-none">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Weight (kg)</label>
                  <input type="number" value={profile.weight} onChange={(e) => updateProfile('weight', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold" placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Height (cm)</label>
                  <input type="number" value={profile.height} onChange={(e) => updateProfile('height', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold" placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Blood Group</label>
                  <select value={profile.bloodGroup} onChange={(e) => updateProfile('bloodGroup', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-semibold appearance-none">
                    <option value="">--</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-file-medical-alt"></i>
                </div>
                <h2 className="font-bold text-slate-800 text-lg">Symptoms & Context</h2>
              </div>
              <textarea rows={6} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-700 resize-none" placeholder="Describe current symptoms, duration, and severity..." />
            </section>

            <button onClick={handleAnalyze} disabled={loading} className={`w-full py-6 rounded-3xl text-lg font-black text-white shadow-xl transition-all flex items-center justify-center gap-4 active:scale-95 ${loading ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {loading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : <i className="fa-solid fa-shield-virus"></i>}
              {loading ? "Processing Clinical Data..." : "Generate Analysis Report"}
            </button>
          </div>

          {/* Report */}
          <div className="xl:col-span-7">
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[850px]">
              <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-tighter text-xl">Assessment Result</h3>
                {result && <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border ${
                  result.triageStatus === 'EMERGENCY' ? 'bg-rose-50 border-rose-200 text-rose-600' : 
                  'bg-indigo-50 border-indigo-200 text-indigo-600'
                }`}>Status: {result.triageStatus}</span>}
              </div>
              
              <div className="flex-1 p-8 sm:p-12 overflow-y-auto space-y-12">
                {result ? (
                  <>
                    {/* Conditions */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <i className="fa-solid fa-wave-square text-slate-400 text-sm"></i>
                        <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Probable Conditions</h4>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {result.probableConditions.map((item, idx) => (
                          <div key={idx} className="p-8 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-xl font-bold text-[#1E293B]">{item.condition}</h5>
                              <span className={`px-3 py-1 rounded-md text-[10px] font-black border ${
                                item.likelihood === 'HIGH' ? 'bg-rose-50 border-rose-100 text-rose-600' : 
                                item.likelihood === 'MODERATE' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
                                'bg-emerald-50 border-emerald-100 text-emerald-600'
                              }`}>
                                {item.likelihood}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[15px] leading-relaxed font-medium">{item.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Referral */}
                    <div className="bg-indigo-600 rounded-3xl p-1 shadow-xl">
                      <div className="bg-white rounded-[1.4rem] overflow-hidden">
                        <div className="bg-indigo-50 px-8 py-5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <i className="fa-solid fa-hospital-user text-indigo-600"></i>
                            <h4 className="text-[11px] font-black uppercase text-indigo-600 tracking-widest">Physician Recommendation</h4>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-300">J.C Juneja Hospital</span>
                        </div>
                        <div className="p-8">
                          <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-1">
                              <h5 className="text-2xl font-black text-slate-900 mb-1">{result.suggestedDoctor.name}</h5>
                              <p className="text-indigo-600 font-bold uppercase tracking-widest text-[11px] mb-6">{result.suggestedDoctor.department}</p>
                              
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timing</p>
                                  <p className="text-sm font-bold text-slate-700">{result.suggestedDoctor.timing}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fees</p>
                                  <p className="text-sm font-black text-slate-900">{result.suggestedDoctor.charges}</p>
                                </div>
                              </div>
                            </div>
                            <div className="md:w-64 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Referral Reason</p>
                              <p className="text-xs text-slate-600 font-medium italic">"{result.suggestedDoctor.reasonForReferral}"</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="space-y-10">
                      <div>
                        <h4 className="text-[11px] font-black uppercase text-indigo-500 tracking-widest mb-4">Clinical Impression</h4>
                        <p className="text-slate-700 text-lg leading-relaxed font-semibold bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100/50">
                          "{result.impression}"
                        </p>
                      </div>

                      <div>
                        <h4 className="text-[11px] font-black uppercase text-indigo-500 tracking-widest mb-6">Recommended Next Steps</h4>
                        <div className="grid grid-cols-1 gap-4">
                          {result.recommendedActions.map((action, i) => (
                            <div key={i} className="flex gap-4 p-5 bg-white border border-slate-200 rounded-2xl items-center">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black flex-shrink-0">
                                {i + 1}
                              </div>
                              <span className="text-slate-600 font-bold">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-40 opacity-30 grayscale">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-8">
                      <i className="fa-solid fa-microscope text-5xl text-slate-300"></i>
                    </div>
                    <h3 className="text-xl font-black text-slate-400 tracking-widest uppercase text-center">Ready for Clinical Data</h3>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-900 text-white">
                <div className="flex gap-6 items-center">
                  <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-900/40">
                    <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-1">Critical Notice</h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      AI assessment is for informational support only. <strong className="text-white">Call emergency services immediately if life-threatening symptoms occur.</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-20 border-t border-slate-200 py-16 text-center">
        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
          &copy; {new Date().getFullYear()} Clinical Support Instance • Secure Build
        </p>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
