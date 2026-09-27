import React, { useState, useRef } from "react";
import { X, Save, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Profile } from "../types/database";
import { updateUserProfile, uploadProfileImage } from "../lib/supabase";

interface EditProfileModalProps {
  profile: Profile;
  onClose: () => void;
  onProfileUpdated: (updatedProfile: Profile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  profile,
  onClose,
  onProfileUpdated,
}) => {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || "",
    phone: profile.phone || profile.mobile_number || "",
    bio: profile.bio || "",
    city: profile.city || profile.location || "Bokaro",
    locality: profile.locality || profile.address || "",
    user_type: profile.user_type || (profile.is_verified_broker ? "broker" : "owner"),
    avatar_url: profile.avatar_url || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("फोटो 5MB से छोटी होनी चाहिए");
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage(null);
    try {
      const publicUrl = await uploadProfileImage(file);
      setFormData((prev) => ({ ...prev, avatar_url: publicUrl }));
    } catch (err: any) {
      console.warn("Avatar upload failed, using local object preview:", err);
      const localUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, avatar_url: localUrl }));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updatedProfile: Profile = {
        ...profile,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        mobile_number: formData.phone.trim(),
        bio: formData.bio.trim(),
        city: formData.city,
        location: formData.city,
        locality: formData.locality.trim(),
        address: formData.locality.trim(),
        user_type: formData.user_type,
        avatar_url: formData.avatar_url,
        is_verified_broker: formData.user_type === "broker" ? profile.is_verified_broker : false,
      };

      const savedProfile = await updateUserProfile(updatedProfile);
      onProfileUpdated(savedProfile);
      onClose();
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      setErrorMessage(error?.message || "प्रोफ़ाइल अपडेट करने में त्रुटि हुई");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">प्रोफ़ाइल एडिट करें (Edit Profile)</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          <form id="edit-profile-form" onSubmit={handleSave} className="space-y-4">
            {/* Avatar Preview & Upload */}
<div className="flex flex-col items-center justify-center mb-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-emerald-100 shadow-md overflow-hidden relative">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Profile Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-3xl">
                    {formData.full_name?.charAt(0) || "U"}
                  </div>
                )}
                {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarFileSelect}
                className="hidden"
              />
              <p className="text-xs text-slate-500 font-medium mt-2">
                फोटो अपलोड करने के लिए क्लिक करें (Click to upload)
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">पूरा नाम (Full Name) *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder="उदा: राहुल कुमार"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">आपकी भूमिका (Role) *</label>
                <select
                  name="user_type"
                  value={formData.user_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs font-bold bg-white"
                >
                  <option value="owner">मालिक (Property Owner)</option>
                  <option value="broker">ब्रोकर / एजेंट (Agent)</option>
                  <option value="buyer">खरीदार / किरायेदार (Buyer)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">शहर (City) *</label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs font-bold bg-white"
                >
                  <option value="Bokaro">बोकारो (Bokaro)</option>
                  <option value="Giridih">गिरिडीह (Giridih)</option>
                  <option value="Other">अन्य (Other)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">संपर्क नंबर (Mobile) *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="10 अंकों का मोबाइल नंबर"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">इलाका / सेक्टर (Locality)</label>
                <input
                  type="text"
                  name="locality"
                  value={formData.locality}
                  onChange={handleChange}
                  placeholder="उदा: सेक्टर 4 / टॉवर चौक"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">बायो / विवरण (Bio)</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                placeholder="अपने या अपने रियल एस्टेट काम के बारे में संक्षेप में लिखें..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm resize-none"
              />
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            रद्द करें (Cancel)
          </button>
          <button
            type="submit"
            form="edit-profile-form"
            disabled={isSaving || isUploadingAvatar}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 transition-colors shadow-sm cursor-pointer flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>सेव कर रहा है...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>सेव करें (Save)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
