import React, { useState, useEffect } from "react";
import {
  X,
  MapPin,
  Bed,
  Bath,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Phone,
  ShieldCheck,
  Send,
  Calendar,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
} from "lucide-react";
import { Property, Profile, PropertyComment } from "../types/database";
import {
  formatPrice,
  formatRelativeTime,
  PROPERTY_TYPE_LABELS,
  ROLE_LABELS,
} from "../lib/utils";
import { fetchPropertyComments, addPropertyComment, deleteProperty } from "../lib/supabase";
import { Link } from "./Link";
import { UploadPropertyForm } from "./UploadPropertyForm";
import { PropertyActionMenu } from "./PropertyActionMenu";

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onStartChat: (property: Property) => void;
  currentUser: Profile | null;
  onOpenAuth: () => void;
  onPropertyDeleted?: (id: string) => void;
  onPropertyUpdated?: (property: Property) => void;
  onEditListing?: (property: Property) => void;
  onCloseListing?: (property: Property) => void;
  onReopenListing?: (property: Property) => void;
  onDeleteListing?: (property: Property) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  isSaved,
  onToggleSave,
  onStartChat,
  currentUser,
  onOpenAuth,
  onPropertyDeleted,
  onPropertyUpdated,
  onEditListing,
  onCloseListing,
  onReopenListing,
  onDeleteListing,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [comments, setComments] = useState<PropertyComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (property) {
      setActiveImageIndex(0);
      loadComments(property.id);
    }
  }, [property]);

  const loadComments = async (propId: string) => {
    const list = await fetchPropertyComments(propId);
    setComments(list);
  };

  if (!isOpen || !property) return null;

  const images =
    property.media_urls && property.media_urls.length > 0
      ? property.media_urls
      : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000&auto=format&fit=crop&q=80"];

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleDelete = async () => {
    if (!property || !currentUser || property.author_id !== currentUser.id) return;
    if (onDeleteListing) {
      onDeleteListing(property);
      return;
    }
    const confirm = window.confirm("क्या आप वाकई इस प्रॉपर्टी को डिलीट करना चाहते हैं?");
    if (!confirm) return;
    
    setIsDeleting(true);
    try {
      await deleteProperty(property.id, currentUser.id);
      if (onPropertyDeleted) onPropertyDeleted(property.id);
      onClose();
    } catch (err) {
      console.error("Delete error:", err);
      alert("डिलीट करने में त्रुटि हुई।");
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwner = Boolean(
    currentUser &&
    currentUser.id &&
    property.author_id &&
    currentUser.id === property.author_id
  );

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setSubmittingComment(true);
    try {
      const added = await addPropertyComment(property.id, currentUser.id, newCommentText.trim());
      setComments((prev) => [...prev, added]);
      setNewCommentText("");
    } catch (err) {
      console.error("Comment submit error:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      {isEditMode ? (
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-150 my-auto p-4 sm:p-6 relative">
          <button
            onClick={() => setIsEditMode(false)}
            className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <UploadPropertyForm 
            currentUser={currentUser} 
            onOpenAuth={onOpenAuth} 
            initialData={property}
            onPropertyUpdated={(updated) => {
              if (onPropertyUpdated) onPropertyUpdated(updated);
              setIsEditMode(false);
            }}
            onPropertyCreated={() => {}}
            onCancel={() => setIsEditMode(false)}
          />
        </div>
      ) : (
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Top Sticky Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider text-white ${
                property.listing_type === "rent" ? "bg-indigo-600" : "bg-emerald-600"
              }`}
            >
              {property.listing_type === "rent" ? "किराया (Rent)" : "बिक्री (Sale)"}
            </span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {PROPERTY_TYPE_LABELS[property.property_type]?.hi}
            </span>
            {property.status && property.status !== "active" && (
              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                {property.status === "sold"
                  ? "बिक गया (Sold)"
                  : property.status === "rented"
                  ? "किराए पर उठा (Rented)"
                  : "बंद (Closed)"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <PropertyActionMenu
                property={property}
                currentUser={currentUser}
                onEdit={onEditListing ? onEditListing : (prop) => setIsEditMode(true)}
                onCloseListing={onCloseListing}
                onReopenListing={onReopenListing}
                onDeleteListing={onDeleteListing ? onDeleteListing : handleDelete}
                variant="header"
                align="right"
              />
            )}

            <button
              onClick={() => onToggleSave(property.id)}
              className={`p-2 rounded-full border transition-colors cursor-pointer ${
                isSaved
                  ? "bg-rose-50 border-rose-200 text-rose-600"
                  : "border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
              title={isSaved ? "पसंदीदा से हटाएं" : "पसंदीदा बनाएं"}
            >
              <Heart className={`w-4 h-4 ${isSaved ? "fill-rose-600" : ""}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
          {/* Gallery Carousel */}
          <div className="relative aspect-16/10 sm:aspect-16/9 rounded-2xl overflow-hidden bg-slate-900 shadow-inner group">
            <img
              src={images[activeImageIndex]}
              alt={property.title}
              className="w-full h-full object-cover transition-all duration-300"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Thumbnails indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 backdrop-blur-xs px-3 py-1.5 rounded-full">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                        idx === activeImageIndex ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Title & Price Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-1 flex-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {property.title}
              </h1>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  {property.address ? `${property.address}, ` : ""}
                  {property.locality}, {property.city}
                </span>
              </div>
            </div>

            <div className="sm:text-right bg-emerald-50/80 p-3 sm:p-0 sm:bg-transparent rounded-xl">
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                {formatPrice(property.price, property.listing_type)}
              </div>
              <div className="text-xs font-semibold text-slate-500">
                {property.listing_type === "rent" ? "प्रति माह किराया" : "अनुमानित कुल कीमत"}
              </div>
            </div>
          </div>

          {/* Video Walkthrough Player if Reel/Video exists */}
          {property.video_url && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>30-सेकंड वीडियो वॉकथ्रू (Video Reel)</span>
              </h3>
              <div className="relative aspect-9/16 max-w-xs mx-auto rounded-2xl overflow-hidden bg-black shadow-lg">
                <video
                  src={property.video_url}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Quick Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">बेडरूम (BHK)</span>
              <span className="font-bold text-slate-800 text-sm">
                {property.bedrooms > 0 ? `${property.bedrooms} BHK` : "लागू नहीं"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">बाथरूम</span>
              <span className="font-bold text-slate-800 text-sm">{property.bathrooms || 1} बाथरूम</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">फर्निशिंग</span>
              <span className="font-bold text-slate-800 text-sm">
                {property.furnishing || "Semi-Furnished"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">क्षेत्रफल (Area)</span>
              <span className="font-bold text-slate-800 text-sm">
                {property.carpet_area
                  ? `${property.carpet_area} sq.ft`
                  : property.built_up_area
                  ? `${property.built_up_area} sq.ft`
                  : "उपलब्ध नहीं"}
              </span>
            </div>
            {property.balconies !== undefined && property.balconies > 0 && (
              <div>
                <span className="text-slate-400 block font-medium">बालकनी</span>
                <span className="font-bold text-slate-800 text-sm">{property.balconies} बालकनी</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 block font-medium">प्रॉपर्टी स्टेटस</span>
              <span className="font-bold text-emerald-600 text-sm uppercase">
                {property.status === "active" ? "उपलब्ध (Active)" : property.status}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>प्रॉपर्टी का संपूर्ण विवरण (Description)</span>
            </h3>
            <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
              {property.description}
            </div>
          </div>

          {/* Author Card & Direct Action */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <Link href={`/profile/${property.author_id}`} className="flex items-center gap-3.5 w-full sm:w-auto hover:opacity-80 transition-opacity">
              <img
                src={
                  property.author?.avatar_url ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                }
                alt=""
                className="w-13 h-13 rounded-full object-cover ring-2 ring-emerald-400"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base">{property.author?.full_name || "मालिक"}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xs text-emerald-200">
                  {property.author?.is_verified_broker ? 'ब्रोकर' : 'मालिक'} • {property.author?.city || property.city}
                </div>
                {property.author?.phone && (
                  <div className="text-xs text-slate-300 font-mono mt-0.5">
                    {property.author.phone}
                  </div>
                )}
              </div>
            </Link>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                id="modal-direct-chat-btn"
                onClick={() => {
                  onClose();
                  onStartChat(property);
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>सीधे चैट करें (Real-time Chat)</span>
              </button>

              {property.author?.phone && (
                <a
                  href={`tel:${property.author.phone}`}
                  className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                  title="सीधे फोन करें"
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">कॉल</span>
                </a>
              )}
            </div>
          </div>

          {/* Comments & Public Q&A Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>सार्वजनिक सवाल-जवाब एवं टिप्पणियाँ ({comments.length})</span>
            </h3>

            {/* Comments List */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  अभी कोई टिप्पणी नहीं है। पहली पूछताछ या समीक्षा पोस्ट करें।
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <Link href={`/profile/${c.author_id}`} className="font-bold text-slate-800 hover:text-emerald-600 transition-colors">
                        {c.author?.full_name || "यूज़र"}
                      </Link>
                      <span className="text-[10px] text-slate-400">
                        {formatRelativeTime(c.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Post Form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder={currentUser ? "यहाँ सार्वजनिक सवाल या पूछताछ लिखें..." : "टिप्पणी लिखने के लिए पहले लॉगिन करें"}
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                disabled={submittingComment}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submittingComment || !newCommentText.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>भेजें</span>
              </button>
            </form>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
