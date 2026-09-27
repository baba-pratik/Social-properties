import React, { useState, useEffect } from "react";
import { User, MapPin, Image as ImageIcon, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useUserStore } from "../store/useUserStore";
import { createCommunityPost, updateCommunityPost, getSupabaseClient } from "../lib/supabase";
import { CommunityPost } from "../types/database";
import { formatPrice } from "../lib/utils";

interface CreateCommunityPostModalProps {
  initialData?: CommunityPost;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateCommunityPostModal: React.FC<CreateCommunityPostModalProps> = ({ initialData, onClose, onSuccess }) => {
  const { currentUser } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [content, setContent] = useState(initialData?.content || "");
  const [mediaUrl, setMediaUrl] = useState<string | null>(initialData?.media_urls?.[0] || null);
  const [city, setCity] = useState<string | null>(initialData?.city || null);
  const [locality, setLocality] = useState<string | null>(initialData?.locality || null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isEditing = !!initialData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setError(null);
    setLoading(true);

    try {
      const postData = {
        author_id: currentUser.id,
        content: content.trim(),
        media_urls: mediaUrl ? [mediaUrl] : [],
        video_url: mediaUrl && /\.mp4|\.webm|\.mov/.test(mediaUrl) ? mediaUrl : undefined,
        city,
        locality,
      };

      if (isEditing && initialData) {
        const updated = await updateCommunityPost(initialData.id, currentUser.id, postData);
        if (!updated) throw new Error("पोस्ट अपडेट करने में त्रुटि हुई");
      } else {
        const created = await createCommunityPost(postData);
        if (!created) throw new Error("पोस्ट बनाने में त्रुटि हुई");
      }

      onSuccess();
    } catch (err: any) {
      console.error(isEditing ? "Update post error" : "Create post error:", err);
      setError(err?.message || (isEditing ? "पोस्ट अपडेट करने में त्रुटि हुई।" : "पोस्ट बनाने में त्रुटि हुई। कृपया पुनः प्रयास करें।"));
    } finally {
      setLoading(false);
      setUploadingMedia(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    setUploadProgress(0);

    try {
      if (!currentUser) return;

      // Upload to Supabase storage
      const c = getSupabaseClient();
      if (!c) throw new Error("Supabase not configured");

      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `community-posts/${currentUser.id}/${fileName}`;

      const { error: uploadError } = await c.storage
        .from("property-media")
        .upload(filePath, file, {
          contentType: file.type || "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = c.storage.from("property-media").getPublicUrl(filePath);
      if (data?.publicUrl) {
        setMediaUrl(data.publicUrl);
        setUploadProgress(100);
      } else {
        throw new Error("सार्वजनिक URL प्राप्त करने में त्रुटि");
      }
    } catch (err: any) {
      console.error("Media upload error:", err);
      setError(err?.message || "मीडिया अपलोड में त्रुटि।");
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  if (!currentUser) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors cursor-pointer"
          aria-label="बंद करें"
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>

        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">{isEditing ? "पोस्ट संपादित करें" : "नई पोस्ट बनाएं"}</h2>
          {error && (
            <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-50 text-emerald-600 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-5 shrink-0" />
              <span>पोस्ट सफलतापूर्वक प्रकाशित हुई!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                विवरण (Content) *
              </label>
              <textarea
                rows={3}
                placeholder="क्या आप अपने आस-पास की कोई प्रॉपर्टी शेयर करना चाहते हैं?..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                शहर (City)
              </label>
              <select
                value={city ?? "बोकारो"}
                onChange={(e) => setCity(e.target.value === "बोकारो" ? "बोकारो" : e.target.value === "गिरिडीह" ? "गिरिडीह" : null)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
              >
                <option value="बोकारो">बोकारो</option>
                <option value="गिरिडीह">गिरिडीह</option>
                <option value="अन्य">अन्य</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                इलाका / सेक्टर (Optional)
              </label>
              <input
                type="text"
                placeholder="उदा: सेक्टर 4, चास..."
                value={locality || ""}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm transition-all"
              />
            </div>

            {/* Media Upload Section */}
            {currentUser && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  मीडिया जोड़ें (Optional) *
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  छवि या वीडियो जोड़ने से पोस्ट अधिक आकर्षक बनेगी।
                </p>
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 rounded-3xl p-6 text-center transition-colors cursor-pointer relative overflow-hidden">
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    onChange={handleFileChange}
                    disabled={uploadingMedia}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center min-h-[140px] pointer-events-none w-full">
                    {!mediaUrl ? (
                      <>
                        <ImageIcon className="w-10 h-10 text-emerald-600 mb-2" />
                        <span className="text-base font-bold text-slate-800">
                          मीडिया चुनने के लिए टैप करें
                        </span>
                        <span className="text-xs text-slate-400 mt-1">
                          JPG, PNG, WebP, MP4, WebM, MOV
                        </span>
                      </>
                    ) : (
                      <>
                        <img
                          src={mediaUrl}
                          alt="पोस्ट मीडिया"
                          className="w-24 h-24 rounded-lg object-cover mb-2"
                        />
                        <span className="text-sm text-slate-600">मीडिया जोड़ी गई</span>
                        <button
                          type="button"
                          onClick={() => {
                            setMediaUrl(null);
                          }}
                          className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                        >
                          हटाएं
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className={`w-full flex items-center justify-center py-3 px-4 rounded-xl font-bold transition-all ${
                  loading
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                }`}
              >
                {loading
                  ? (
                    <>
                      <Loader2 className="w-4 h-5 me-2" /> प्रकाशित हो रहा है...
                    </>
                  )
                  : "पोस्ट प्रकाशित करें"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};