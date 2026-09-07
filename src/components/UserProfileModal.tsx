import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, X, Save, Trash2, Heart, Plus } from 'lucide-react';
import { useUserProfile, UserProfile } from '../hooks/useUserProfile';
import { DrugInput } from './DrugInput';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { profile, saveProfile } = useUserProfile();
  
  const [formData, setFormData] = useState<UserProfile>({
    name: '',
    age: '',
    sex: 'male',
    medications: ''
  });

  const [medicationTags, setMedicationTags] = useState<string[]>([]);
  const [medSearch, setMedSearch] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData(profile);
      setMedicationTags(profile.medications ? profile.medications.split(',').map(m => m.trim()).filter(Boolean) : []);
    } else {
      setFormData({ name: '', age: '', sex: 'male', medications: '' });
      setMedicationTags([]);
    }
    setMedSearch('');
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // basic validation
    if (!formData.name.trim() || !formData.age.trim()) return;
    saveProfile({
      ...formData,
      medications: medicationTags.join(', ')
    });
    onClose();
  };

  const handleClear = () => {
    saveProfile(null);
    onClose();
  };

  const addMedication = () => {
    const val = medSearch.trim();
    if (!val) return;
    if (!medicationTags.includes(val)) {
      setMedicationTags([...medicationTags, val]);
    }
    setMedSearch('');
  };

  const removeMedication = (drug: string) => {
    setMedicationTags(medicationTags.filter(d => d !== drug));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-surface border border-outline-variant/20 rounded-3xl shadow-2xl p-6 sm:p-8"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-on-surface-variant z-10"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Heart size={20} className="fill-primary/20" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface">Personalize Results</h2>
              <p className="text-sm text-on-surface-variant flex items-center gap-1">
                Add details for tailored AI insights
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">First Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. John"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/20 bg-transparent text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-on-surface">Age</label>
                <input
                  required
                  type="number"
                  placeholder="e.g. 45"
                  value={formData.age}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/20 bg-transparent text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">Biological Sex</label>
              <select
                value={formData.sex}
                onChange={(e) => setFormData(prev => ({ ...prev, sex: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/20 bg-transparent text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="male" className="bg-surface text-on-surface">Male</option>
                <option value="female" className="bg-surface text-on-surface">Female</option>
                <option value="other" className="bg-surface text-on-surface">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-on-surface">
                Current Medications
                <span className="text-on-surface-variant font-normal opacity-70 ml-1">(Optional)</span>
              </label>
              
              <div className="relative group">
                <DrugInput 
                  className="w-full px-4 py-2.5 pr-12 rounded-xl border border-outline-variant/20 bg-transparent text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50" 
                  placeholder="e.g. Lisinopril, Metformin..." 
                  value={medSearch}
                  onChange={setMedSearch}
                  onEnter={addMedication}
                />
                <button 
                  type="button"
                  onClick={addMedication}
                  disabled={!medSearch.trim()}
                  className="absolute inset-y-1.5 right-1.5 flex items-center justify-center w-8 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-primary/10 z-10"
                >
                  <Plus size={16} />
                </button>
              </div>

              {medicationTags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {medicationTags.map(drug => (
                    <div key={drug} className="inline-flex items-center bg-primary text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:brightness-110 border border-white/10">
                      {drug}
                      <button 
                        type="button"
                        onClick={() => removeMedication(drug)}
                        className="ml-1.5 hover:opacity-70 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                We'll automatically check new searches against these medications to highlight potential interactions.
              </p>
            </div>

            <div className="pt-4 flex gap-3">
              {profile && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2.5 rounded-xl justify-center text-error border border-error/30 hover:bg-error/10 font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-on-surface-variant hover:bg-black/5 dark:hover:bg-white/10 transition-colors border border-transparent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.name.trim() || !formData.age.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-primary text-white hover:brightness-110 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent"
              >
                <Save size={18} />
                Save Profile
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
