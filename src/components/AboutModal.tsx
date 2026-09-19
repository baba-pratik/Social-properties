import React from "react";
import { X, Building2, Heart, Info, FileText, Shield, MapPin, Globe } from "lucide-react";

interface AboutModalProps {
  onClose: () => void;
  activeSection?: "about" | "help" | "privacy" | "terms" | "locations" | "language";
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose, activeSection = "about" }) => {
  const [section, setSection] = React.useState(activeSection);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {section === "about" && "हमारे बारे में"}
            {section === "help" && "सहायता"}
            {section === "privacy" && "गोपनीयता नीति"}
            {section === "terms" && "सेवा की शर्तें"}
            {section === "locations" && "स्थान"}
            {section === "language" && "भाषा"}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          
          {section === "about" && (
            <div className="space-y-6">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <Building2 className="w-8 h-8" />
                </div>
              </div>
              
              <div className="text-center space-y-4">
                <p className="text-slate-700 text-[15px] leading-relaxed">
                  <span className="font-bold text-emerald-700">Social Properties</span> (सोशल प्रॉपर्टीज) बोकारो और गिरिडीह का अपना पहला हाइपरलोकल रियल एस्टेट नेटवर्क है।
                </p>
                
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4 mt-6">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">निर्माता एवं संस्थापक (Creator & Founder)</p>
                    <p className="text-lg font-extrabold text-amber-600 tracking-tight">प्रतीक पांडेय (Pratik Pandey)</p>
                  </div>
                  
                  <div className="h-px w-12 bg-slate-200 mx-auto"></div>
                  
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">मार्गदर्शन एवं प्रबंधन (Guided & Managed by)</p>
                    <p className="text-lg font-extrabold text-amber-600 tracking-tight">श्री धीरेंद्र प्रसाद (Shri Dhirendra Prasad)</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">संस्करण (Version) 1.0.0</p>
                <p className="text-xs text-slate-400 mt-1">© 2026 Social Properties. सर्वाधिकार सुरक्षित।</p>
              </div>
            </div>
          )}

          {section === "help" && (
            <div className="text-center py-8 text-slate-500">
              <Heart className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p>सहायता केंद्र जल्द ही उपलब्ध होगा।</p>
              <p className="text-xs mt-2">संपर्क करें: support@socialproperties.in</p>
            </div>
          )}

          {section === "privacy" && (
            <div className="text-center py-8 text-slate-500">
              <Shield className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p>गोपनीयता नीति जल्द ही अपडेट की जाएगी।</p>
            </div>
          )}

          {section === "terms" && (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p>सेवा की शर्तें जल्द ही अपडेट की जाएंगी।</p>
            </div>
          )}

          {section === "locations" && (
            <div className="text-center py-8 text-slate-500">
              <MapPin className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="font-bold text-slate-700">सक्रिय स्थान:</p>
              <div className="flex justify-center gap-4 mt-4">
                <span className="px-4 py-2 bg-slate-100 rounded-full text-sm">बोकारो</span>
                <span className="px-4 py-2 bg-slate-100 rounded-full text-sm">गिरिडीह</span>
              </div>
            </div>
          )}

          {section === "language" && (
            <div className="text-center py-8 text-slate-500">
              <Globe className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p>वर्तमान भाषा: हिंदी (Hindi)</p>
            </div>
          )}

        </div>
        
        {/* Navigation Tabs at Bottom if needed, but since it's a modal, a small scrollable pill menu is better */}
        <div className="bg-slate-50 border-t border-slate-100 p-3 overflow-x-auto custom-scrollbar flex gap-2">
          <button onClick={() => setSection("about")} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors ${section === "about" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>हमारे बारे में</button>
          <button onClick={() => setSection("help")} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors ${section === "help" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>सहायता</button>
          <button onClick={() => setSection("privacy")} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors ${section === "privacy" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>गोपनीयता</button>
          <button onClick={() => setSection("terms")} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors ${section === "terms" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>शर्तें</button>
          <button onClick={() => setSection("locations")} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors ${section === "locations" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>स्थान</button>
        </div>

      </div>
    </div>
  );
};
