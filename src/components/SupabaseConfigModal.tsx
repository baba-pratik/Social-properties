import React, { useState } from "react";
import { X, Database, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, HardDrive } from "lucide-react";
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseConfigured } from "../lib/supabase";

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
    setStatusMessage("कॉन्फ़िगरेशन सुरक्षित कर लिया गया है। रीलोड हो रहा है...");
    onConfigSaved();
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleResetToDemo = () => {
    setUrl("");
    setAnonKey("");
    saveSupabaseConfig({ url: "", anonKey: "" });
    setStatusMessage("हाइब्रिड लोकल डेटाबेस मोड सक्रिय किया गया। रीलोड हो रहा है...");
    onConfigSaved();
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const sampleSqlSnippet = `-- 1. Supabase SQL Editor में चलाएं:
-- profiles, properties, conversations, messages, comments
-- तथा 'property-media' Storage Bucket
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    phone TEXT,
    is_verified_broker BOOLEAN DEFAULT false,
    city TEXT DEFAULT 'बोकारो',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- पूरा स्कीमा देखने के लिए supabase/schema.sql फाइल उपलब्ध है।`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sampleSqlSnippet);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isConnected = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Supabase डेटाबेस व स्टोरेज</h2>
              <p className="text-xs text-slate-500">
                PostgreSQL, Auth, Realtime और Storage bucket (property-media)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Live Status Indicator */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              isConnected
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            {isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold text-sm">
                {isConnected ? "लाइव Supabase कनेक्टेड है" : "हाइब्रिड लोकल डेटाबेस मोड सक्रिय"}
              </div>
              <p className="text-slate-600 leading-relaxed">
                {isConnected
                  ? "सभी प्रॉपर्टीज, चैट और मीडिया सीधे आपके लाइव Supabase प्रोजेक्ट में सिंक हो रहे हैं।"
                  : "बोकारो और गिरिडीह का लाइव डेटाबेस और रियल-टाइम चैट बिना किसी रुकावट के पूरी तरह काम कर रहा है। यदि आप अपना लाइव Supabase प्रोजेक्ट जोड़ना चाहते हैं, तो नीचे क्रेडेंशियल्स दर्ज करें।"}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supabase प्रोजेक्ट URL (Project URL)
              </label>
              <input
                type="url"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400">
                Supabase Dashboard &gt; Project Settings &gt; API &gt; URL
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Supabase Anon Public Key
              </label>
              <input
                type="password"
                placeholder="eyJh..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400">
                Supabase Dashboard &gt; Project Settings &gt; API &gt; anon public
              </span>
            </div>

            {statusMessage && (
              <div className="p-3 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg">
                {statusMessage}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors cursor-pointer"
              >
                सेव और कनेक्ट करें (Save &amp; Connect)
              </button>

              <button
                type="button"
                onClick={handleResetToDemo}
                className="py-2.5 px-4 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                रीसेट / ऑटो मोड
              </button>
            </div>
          </form>

          {/* Database Schema Guide */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">
                PostgreSQL डेटाबेस स्कीमा (supabase/schema.sql)
              </span>
              <button
                onClick={() => setShowSql(!showSql)}
                className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
              >
                {showSql ? "छिपाएं" : "स्कीमा पूर्वावलोकन देखें"}
              </button>
            </div>

            {showSql && (
              <div className="bg-slate-900 rounded-xl p-3 text-slate-200 text-xs font-mono relative mt-2">
                <button
                  onClick={handleCopySql}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 text-[11px]"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? "कॉपी हो गया" : "कॉपी"}</span>
                </button>
                <pre className="overflow-x-auto text-[11px] leading-relaxed max-h-44">
                  {sampleSqlSnippet}
                </pre>
              </div>
            )}

            <p className="text-[11px] text-slate-500 mt-2">
              पूर्ण SQL फ़ाइल <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">/supabase/schema.sql</code> में RLS पॉलिसियां और <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">property-media</code> स्टोरेज बकेट शामिल हैं।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
