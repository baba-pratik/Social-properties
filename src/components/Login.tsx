import React, { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { supabase, signInWithEmail, sendPasswordResetEmail } from "../lib/supabase";
import { Register } from "./Register";

interface LoginProps {
  onSuccess: () => void;
  initialMode?: "login" | "register";
}

export const Login: React.FC<LoginProps> = ({ onSuccess, initialMode = "login" }) => {
  const [mode, setMode] = useState<"login" | "register" | "forgot_password">(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Email & Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password email state
  const [resetEmail, setResetEmail] = useState("");

  if (mode === "register") {
    return (
      <Register
        onSuccess={onSuccess}
        onSwitchToLogin={(registeredEmail) => {
          setError(null);
          if (registeredEmail) {
            setEmail(registeredEmail);
            setInfoMessage("खाता बन गया है! कृपया पासवर्ड दर्ज करके लॉगिन करें।");
          } else {
            setInfoMessage(null);
          }
          setMode("login");
        }}
      />
    );
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("कृपया अपना ईमेल और पासवर्ड दर्ज करें।");
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const data = await signInWithEmail(email.trim(), password);
      if (data.session) {
        onSuccess();
      } else {
        setError("लॉगिन सफल हुआ, लेकिन सत्र सक्रिय नहीं हो सका।");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      let msg = err?.message || "लॉगिन करने में त्रुटि हुई।";
      if (msg.includes("Invalid login credentials")) {
        msg = "अमान्य ईमेल या पासवर्ड। कृपया पुनः जांचें।";
      } else if (msg.includes("Email not confirmed")) {
        msg = "ईमेल की पुष्टि नहीं हुई है। कृपया अपना इनबॉक्स देखें या सहायता लें।";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError("कृपया अपना ईमेल पता दर्ज करें।");
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      await sendPasswordResetEmail(resetEmail.trim());
      setInfoMessage("पासवर्ड रीसेट लिंक आपके ईमेल पर भेज दिया गया है।");
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err?.message || "पासवर्ड रीसेट लिंक भेजने में त्रुटि हुई।");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || "Google से लॉगिन करने में त्रुटि हुई।");
      setLoading(false);
    }
  };

  if (mode === "forgot_password") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-slate-50 relative w-full h-full p-4 sm:p-8">
        <div className="w-full relative z-10">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setInfoMessage(null);
              setMode("login");
            }}
            className="mb-4 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> वापस लॉगिन पर जाएं
          </button>

          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">पासवर्ड भूल गए?</h1>
            <p className="text-slate-500">अपना ईमेल दर्ज करें, हम आपको रीसेट लिंक भेजेंगे</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start text-sm border border-red-200">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-start text-sm border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ईमेल (Email Address)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-10 block w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  placeholder="aapka.naam@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !resetEmail.trim()}
              className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "रीसेट लिंक भेजें"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-slate-50 relative w-full h-full p-4 sm:p-8">
      <div className="w-full relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">लॉगिन करें</h1>
          <p className="text-slate-500">Social Properties में आपका स्वागत है</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-start text-sm border border-red-200">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-start text-sm border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          {/* Email field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ईमेल (Email Address)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 block w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                placeholder="aapka.naam@example.com"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">
                पासवर्ड (Password)
              </label>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setResetEmail(email);
                  setMode("forgot_password");
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                पासवर्ड भूल गए?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 block w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "लॉगिन करें (Login)"
            )}
          </button>
        </form>

        {/* Register link */}
        <div className="mt-6 text-center pt-2">
          <p className="text-sm text-slate-600">
            खाता नहीं है?{" "}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setInfoMessage(null);
                setMode("register");
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
            >
              नया अकाउंट बनाएं (Register)
            </button>
          </p>
        </div>

        {/* Divider */}
        <div className="mt-8 flex items-center justify-between">
          <div className="w-full border-t border-slate-200"></div>
          <span className="px-4 text-sm text-slate-400 bg-slate-50 font-medium whitespace-nowrap">
            या Google से करें
          </span>
          <div className="w-full border-t border-slate-200"></div>
        </div>

        {/* Google OAuth Login */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-6 w-full flex items-center justify-center bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
        >
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>
      </div>
    </div>
  );
};
