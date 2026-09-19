import React, { useState } from "react";
import {
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { signUpWithEmail, RegisterUserData } from "../lib/supabase";

interface RegisterProps {
  onSuccess: () => void;
  onSwitchToLogin: (registeredEmail?: string) => void;
}

export const Register: React.FC<RegisterProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    age: "",
    location: "Bokaro" as "Bokaro" | "Giridih" | "",
    mobileNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "fullName": {
        if (!value.trim()) return "कृपया अपना पूरा नाम दर्ज करें।";
        if (value.trim().length < 2) return "नाम कम से कम 2 अक्षरों का होना चाहिए।";
        return "";
      }
      case "age": {
        if (!value.trim()) return "कृपया अपनी उम्र दर्ज करें।";
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num)) return "उम्र एक वैध संख्या होनी चाहिए।";
        if (num < 18) return "उम्र कम से कम 18 वर्ष होनी चाहिए।";
        if (num > 120) return "कृपया वैध उम्र दर्ज करें (अधिकतम 120)।";
        return "";
      }
      case "location": {
        if (!value) return "कृपया शहर चुनें (बोकारो या गिरिडीह)।";
        if (value !== "Bokaro" && value !== "Giridih") {
          return "स्थान केवल बोकारो या गिरिडीह होना चाहिए।";
        }
        return "";
      }
      case "mobileNumber": {
        if (!value.trim()) return "कृपया मोबाइल नंबर दर्ज करें।";
        const cleanNumber = value.replace(/[\s\-\+]/g, "").replace(/^91/, "");
        const indianMobileRegex = /^[6-9]\d{9}$/;
        if (!indianMobileRegex.test(cleanNumber)) {
          return "कृपया 10 अंकों का वैध भारतीय मोबाइल नंबर दर्ज करें (6-9 से शुरू)।";
        }
        return "";
      }
      case "email": {
        if (!value.trim()) return "कृपया ईमेल पता दर्ज करें।";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) {
          return "कृपया एक मान्य ईमेल आईडी दर्ज करें (उदा. naam@example.com)।";
        }
        return "";
      }
      case "password": {
        if (!value) return "कृपया पासवर्ड दर्ज करें।";
        if (value.length < 6) return "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।";
        return "";
      }
      case "confirmPassword": {
        if (!value) return "कृपया पासवर्ड की पुष्टि करें।";
        if (value !== formData.password) return "दोनों पासवर्ड मेल नहीं खाते हैं।";
        return "";
      }
      default:
        return "";
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (touched[name]) {
        const err = validateField(name, value);
        setErrors((prevErr) => ({ ...prevErr, [name]: err }));
      }
      // If password changed, re-validate confirm password if touched
      if (name === "password" && touched.confirmPassword) {
        setErrors((prevErr) => ({
          ...prevErr,
          confirmPassword: next.confirmPassword !== value ? "दोनों पासवर्ड मेल नहीं खाते हैं।" : "",
        }));
      }
      return next;
    });
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    // Validate all fields
    const newErrors: { [key: string]: string } = {};
    const fieldsToValidate = [
      "fullName",
      "age",
      "location",
      "mobileNumber",
      "email",
      "password",
      "confirmPassword",
    ];

    fieldsToValidate.forEach((f) => {
      const err = validateField(f, (formData as any)[f]);
      if (err) newErrors[f] = err;
    });

    setErrors(newErrors);
    setTouched({
      fullName: true,
      age: true,
      location: true,
      mobileNumber: true,
      email: true,
      password: true,
      confirmPassword: true,
      address: true,
    });

    if (Object.keys(newErrors).length > 0) {
      setGeneralError("कृपया सभी आवश्यक फ़ील्ड सही तरीके से भरें।");
      return;
    }

    setLoading(true);

    try {
      const cleanMobile = formData.mobileNumber.replace(/[\s\-\+]/g, "").replace(/^91/, "");
      
      const payload: RegisterUserData = {
        fullName: formData.fullName.trim(),
        age: Number(formData.age),
        location: formData.location as "Bokaro" | "Giridih",
        mobileNumber: cleanMobile,
        email: formData.email.trim(),
        password: formData.password,
        address: formData.address.trim() || undefined,
      };

      const result = await signUpWithEmail(payload);

      if (!result.user) {
        throw new Error("रजिस्ट्रेशन विफल रहा, कृपया दोबारा प्रयास करें।");
      }

      if (result.session) {
        setSuccessMessage("खाता सफलतापूर्वक बन गया! आपका स्वागत है।");
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setSuccessMessage("खाता सफलतापूर्वक बन गया! अब आप अपने ईमेल और पासवर्ड से लॉगिन कर सकते हैं।");
        setTimeout(() => {
          onSwitchToLogin(formData.email.trim());
        }, 1500);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      let msg = err?.message || "रजिस्ट्रेशन में त्रुटि हुई।";
      if (msg.includes("already registered") || msg.includes("already exists")) {
        msg = "यह ईमेल पहले से पंजीकृत है। कृपया लॉगिन करें या दूसरा ईमेल उपयोग करें।";
      } else if (msg.includes("Password should be")) {
        msg = "पासवर्ड कम से कम 6 अक्षरों का होना आवश्यक है।";
      }
      setGeneralError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-slate-50 relative w-full h-full p-4 sm:p-6">
      <div className="w-full relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
            नया अकाउंट बनाएं
          </h1>
          <p className="text-slate-500 text-sm">
            Social Properties (Bokaro & Giridih) में शामिल हों
          </p>
        </div>

        {generalError && (
          <div className="mb-5 bg-red-50 text-red-600 p-4 rounded-xl flex items-start text-sm border border-red-200">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-start text-sm border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              पूरा नाम (Full Name) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`pl-10 block w-full bg-white border ${
                  errors.fullName ? "border-rose-400 focus:ring-rose-400" : "border-slate-200 focus:ring-indigo-500"
                } rounded-xl py-2.5 px-4 text-slate-800 text-sm focus:ring-2 focus:border-transparent outline-none transition-all`}
                placeholder="उदा. राहुल कुमार"
              />
            </div>
            {errors.fullName && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.fullName}
              </p>
            )}
          </div>

          {/* Age & Location in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                उम्र (Age) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <input
                  type="number"
                  name="age"
                  min="18"
                  max="120"
                  required
                  value={formData.age}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`pl-10 block w-full bg-white border ${
                    errors.age ? "border-rose-400 focus:ring-rose-400" : "border-slate-200 focus:ring-indigo-500"
                  } rounded-xl py-2.5 px-4 text-slate-800 text-sm focus:ring-2 focus:border-transparent outline-none transition-all`}
                  placeholder="25"
                />
              </div>
              {errors.age && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.age}
                </p>
              )}
            </div>

            {/* Location (Dropdown with ONLY Bokaro and Giridih) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                स्थान (Location) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <select
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`pl-10 block w-full bg-white border ${
                    errors.location ? "border-rose-400 focus:ring-rose-400" : "border-slate-200 focus:ring-indigo-500"
                  } rounded-xl py-2.5 px-4 text-slate-800 text-sm focus:ring-2 focus:border-transparent outline-none transition-all appearance-none cursor-pointer`}
                >
                  <option value="Bokaro">Bokaro (बोकारो)</option>
                  <option value="Giridih">Giridih (गिरिडीह)</option>
                </select>
              </div>
              {errors.location && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.location}
                </p>
              )}
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              मोबाइल नंबर (Mobile Number) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-medium text-sm">
                <Phone className="w-4 h-4 mr-1 text-slate-400" />
                <span>+91</span>
              </div>
              <input
                type="tel"
                name="mobileNumber"
                maxLength={10}
                required
                value={formData.mobileNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setFormData((prev) => ({ ...prev, mobileNumber: val }));
                  if (touched.mobileNumber) {
                    const err = validateField("mobileNumber", val);
                    setErrors((prev) => ({ ...prev, mobileNumber: err }));
                  }
                }}
                onBlur={handleBlur}
                className={`pl-16 block w-full bg-white border ${
                  errors.mobileNumber ? "border-rose-400 focus:ring-rose-400" : "border-slate-200 focus:ring-indigo-500"
                } rounded-xl py-2.5 px-4 text-slate-800 text-sm focus:ring-2 focus:border-transparent outline-none transition-all`}
                placeholder="9876543210"
              />
            </div>
            {errors.mobileNumber && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.mobileNumber}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ईमेल (Email Address) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`pl-10 block w-full bg-white border ${
                  errors.email ? "border-rose-400 focus:ring-rose-400" : "border-slate-200 focus:ring-indigo-500"
                } rounded-xl py-2.5 px-4 text-slate-800 text-sm focus:ring-2 focus:border-transparent outline-none transition-all`}
                placeholder="aapka.naam@example.com"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
              </p>
            )}
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                पासवर्ड (Password) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`pl-10 pr-10 block w-full bg-white border ${
                    errors.password ? "border-rose-400 focus:ring-rose-400" : "border-slate-200 focus:ring-indigo-500"
                  } rounded-xl py-2.5 px-4 text-slate-800 text-sm focus:ring-2 focus:border-transparent outline-none transition-all`}
                  placeholder="कम से कम 6 अक्षर"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                पुष्टि करें (Confirm) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`pl-10 pr-10 block w-full bg-white border ${
                    errors.confirmPassword ? "border-rose-400 focus:ring-rose-400" : "border-slate-200 focus:ring-indigo-500"
                  } rounded-xl py-2.5 px-4 text-slate-800 text-sm focus:ring-2 focus:border-transparent outline-none transition-all`}
                  placeholder="पासवर्ड दोबारा दर्ज करें"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Optional Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              पता (Address) <span className="text-xs text-slate-400 font-normal">(वैकल्पिक / Optional)</span>
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="block w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="उदा. सेक्टर 4, सिटी सेंटर, बोकारो स्टील सिटी"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>रजिस्ट्रेशन हो रहा है...</span>
              </span>
            ) : (
              "रजिस्टर करें (Register)"
            )}
          </button>
        </form>

        {/* Switch to Login */}
        <div className="mt-6 text-center pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            पहले से अकाउंट है?{" "}
            <button
              type="button"
              onClick={() => onSwitchToLogin()}
              className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
            >
              लॉगिन करें (Login)
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
