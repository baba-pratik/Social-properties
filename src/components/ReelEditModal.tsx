import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Profile, Reel } from "../types/database";
import { getSupabaseClient } from "../lib/supabase";

interface ReelEditModalProps {
  reel: Reel;
  currentUser: Profile | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReelEditModal: React.FC<ReelEditModalProps> = ({
  reel,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: reel.title,
    description: reel.description || "",
    city: reel.city,
    locality: reel.locality,
    landmark: reel.landmark || "",
    contact_preference: reel.contact_preference || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError(null);
    setLoading(true);
    try {
      const c = getSupabaseClient();
      if (!c) throw new Error("Supabase not configured");
      const { error } = await c
        .from("reels")
        .update({
          title: form.title,
          description: form.description,
          city: form.city,
          locality: form.locality,
          landmark: form.landmark,
          contact_preference: form.contact_preference,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reel.id)
        .eq("author_id", currentUser.id);
      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update reel");
    } finally {
      setLoading(false);
    }
  };

  const cities = ["बोकारो", "गिरिडीह", "अन्य"] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-full duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">रील संपादित करें</h2>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">शीर्षक *</label>
            <input name="title" value={form.title} onChange={handleChange} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">विवरण</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">शहर</label>
              <select name="city" value={form.city} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">इलाका / सेक्टर</label>
              <input name="locality" value={form.locality} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">लैंडमार्क (वैकल्पिक)</label>
            <input name="landmark" value={form.landmark} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">संपर्क प्राथमिकता</label>
            <select name="contact_preference" value={form.contact_preference} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
              <option value="">कोई नहीं</option>
              <option value="call">कॉल</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="chat">ऐप चैट</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 disabled:opacity-50">रद्द</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "सहेजें"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReelEditModal;