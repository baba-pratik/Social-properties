import React, { useState } from "react";
import { User as UserIcon, MapPin, Loader2, AlertCircle } from "lucide-react";
import { useUserStore } from "../store/useUserStore";
import { Profile } from "../types/database";
import { getSupabaseClient } from "../lib/supabase";

export const OnboardingModal: React.FC = () => {
  const { sessionUser, setCurrentUser } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const initialName = sessionUser?.user_metadata?.full_name || "";
  const [fullName, setFullName] = useState(initialName);
  const [city, setCity] = useState("बोकारो");
  const [address, setAddress] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;
    
    setLoading(true);
    setError(null);
    try {
      const newProfile: Profile = {
        id: sessionUser.id,
        full_name: fullName,
        phone: sessionUser.phone || "",
        city: city,
        bio: address,
        created_at: new Date().toISOString(),
      };

      const c = getSupabaseClient();
      if (!c) throw new Error("Supabase not configured");
      const { error } = await c.from('profiles').upsert(newProfile);
      if (error) throw error;

      setCurrentUser(newProfile);
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setError(err.message || "An error occurred during onboarding.");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionUser) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md relative shadow-2xl animate-in fade-in zoom-in duration-300 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">अपनी प्रोफ़ाइल पूरी करें</h1>
          <p className="text-slate-500 text-sm">आगे बढ़ने के लिए कुछ विवरण दर्ज करें</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start text-sm">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">पूरा नाम (Full Name)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 block w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Rahul Kumar"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">शहर (City)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="pl-10 block w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="बोकारो">बोकारो</option>
                <option value="गिरिडीह">गिरिडीह</option>
                <option value="अन्य">अन्य</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">विस्तृत पता (Address / Locality)</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="block w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="सेक्टर 4, चास..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !fullName || !address}
            className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "सबमिट करें"}
          </button>
        </form>
      </div>
    </div>
  );
};
