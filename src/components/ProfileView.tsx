import React, { useState, useMemo } from "react";
import { Profile, Property, CommunityPost } from "../types/database";
import {
  Edit2,
  Share2,
  Grid,
  CheckCircle2,
  MessageSquare,
  Bookmark,
  Building2,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  PlusCircle,
  Compass,
} from "lucide-react";
import { PropertyCard } from "./PropertyCard";
import { CommunityPostCard } from "./CommunityPostCard";
import { EditProfileModal } from "./EditProfileModal";

interface ProfileViewProps {
  currentUser: Profile;
  properties: Property[];
  communityPosts: CommunityPost[];
  savedPropertyIds: string[];
  onToggleSave: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onStartChat: (property: Property) => void;
  onUserUpdate: (updatedUser: Profile) => void;
  onNavigateToUpload?: () => void;
  onNavigateToFeed?: () => void;
  onRemoveFromWishlist?: (propertyId: string) => void;
  onEditProperty?: (property: Property) => void;
  onCloseProperty?: (property: Property) => void;
  onReopenProperty?: (property: Property) => void;
  onDeleteProperty?: (property: Property) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  properties,
  communityPosts,
  savedPropertyIds,
  onToggleSave,
  onSelectProperty,
  onStartChat,
  onUserUpdate,
  onNavigateToUpload,
  onNavigateToFeed,
  onRemoveFromWishlist,
  onEditProperty,
  onCloseProperty,
  onReopenProperty,
  onDeleteProperty,
}) => {
  const [activeTab, setActiveTab] = useState<"properties" | "saved" | "posts">("properties");
  const [propertyStatusFilter, setPropertyStatusFilter] = useState<"all" | "active" | "closed">("all");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Filter items by current user
  const userProperties = useMemo(() => {
    return properties.filter((p) => p.author_id === currentUser.id);
  }, [properties, currentUser.id]);

  const filteredUserProperties = useMemo(() => {
    if (propertyStatusFilter === "active") {
      return userProperties.filter((p) => !p.status || p.status === "active");
    }
    if (propertyStatusFilter === "closed") {
      return userProperties.filter((p) => p.status && p.status !== "active");
    }
    return userProperties;
  }, [userProperties, propertyStatusFilter]);

  const activeUserCount = useMemo(() => {
    return userProperties.filter((p) => !p.status || p.status === "active").length;
  }, [userProperties]);

  const closedUserCount = useMemo(() => {
    return userProperties.filter((p) => p.status && p.status !== "active").length;
  }, [userProperties]);

  const savedProperties = useMemo(() => {
    return properties.filter((p) => savedPropertyIds.includes(p.id));
  }, [properties, savedPropertyIds]);

  const userPosts = useMemo(() => {
    return communityPosts.filter((p) => p.author_id === currentUser.id);
  }, [communityPosts, currentUser.id]);

  const handleWhatsAppShare = () => {
    const text = `Social Properties पर मेरी प्रोफ़ाइल देखें!\n\nनाम: ${currentUser.full_name}\nशहर: ${currentUser.city}\n${currentUser.bio || ""}\n\nयहां देखें: ${window.location.origin}/profile/${currentUser.id}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const roleLabel =
    currentUser.user_type === "broker" || currentUser.is_verified_broker
      ? "ब्रोकर / एजेंट"
      : currentUser.user_type === "buyer"
      ? "खरीदार / अन्वेषक"
      : "प्रॉपर्टी मालिक";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        {/* Avatar */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-teal-700 shrink-0 shadow-sm">
          <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-slate-100">
            <img
              src={
                currentUser.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  currentUser.full_name || "User"
                )}&background=10b981&color=fff`
              }
              alt={currentUser.full_name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Info Details */}
        <div className="flex-1 text-center sm:text-left space-y-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h2 className="text-2xl font-black text-slate-900">{currentUser.full_name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {roleLabel}
                </span>
                {currentUser.is_verified_broker && (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> सत्यापित ब्रोकर
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {currentUser.location || currentUser.city || "बोकारो"}
                  {currentUser.locality || currentUser.address ? `, ${currentUser.locality || currentUser.address}` : ""}
                </span>
                {(currentUser.mobile_number || currentUser.phone) && (
                  <span className="flex items-center gap-1 font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {currentUser.mobile_number || currentUser.phone}
                  </span>
                )}
                {currentUser.email && (
                  <span className="flex items-center gap-1 font-medium">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {currentUser.email}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>प्रोफ़ाइल एडिट</span>
              </button>
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>शेयर</span>
              </button>
            </div>
          </div>

          {/* Followers / Stats Counters */}
          <div className="flex items-center justify-center sm:justify-start gap-8 py-2 border-y border-slate-100 sm:border-none">
            <div className="text-center sm:text-left">
              <span className="block font-black text-lg text-slate-900">{userProperties.length}</span>
              <span className="text-[11px] text-slate-500 font-semibold">संपत्तियां</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="block font-black text-lg text-slate-900">{savedProperties.length}</span>
              <span className="text-[11px] text-slate-500 font-semibold">सहेजी गईं</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="block font-black text-lg text-slate-900">{userPosts.length}</span>
              <span className="text-[11px] text-slate-500 font-semibold">लोकल पोस्ट</span>
            </div>
          </div>

          {currentUser.bio && (
            <p className="text-sm text-slate-700 leading-relaxed max-w-xl bg-slate-50/70 p-3 rounded-xl border border-slate-100">
              {currentUser.bio}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex justify-center">
        <div className="flex w-full max-w-md justify-between">
          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
              activeTab === "properties"
                ? "text-emerald-700 border-b-2 border-emerald-600 font-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>मेरी संपत्तियां ({userProperties.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
              activeTab === "saved"
                ? "text-emerald-700 border-b-2 border-emerald-600 font-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>पसंदीदा ({savedProperties.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
              activeTab === "posts"
                ? "text-emerald-700 border-b-2 border-emerald-600 font-black"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>लोकल पोस्ट ({userPosts.length})</span>
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="py-2">
        {activeTab === "properties" && (
          <div className="space-y-4">
            {userProperties.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setPropertyStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    propertyStatusFilter === "all"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  सभी ({userProperties.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyStatusFilter("active")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    propertyStatusFilter === "active"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  सक्रिय ({activeUserCount})
                </button>
                <button
                  type="button"
                  onClick={() => setPropertyStatusFilter("closed")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    propertyStatusFilter === "closed"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  बंद ({closedUserCount})
                </button>
              </div>
            )}

            {filteredUserProperties.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredUserProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isSaved={savedPropertyIds.includes(property.id)}
                    onToggleSave={onToggleSave}
                    onSelectProperty={onSelectProperty}
                    onStartChat={onStartChat}
                    currentUser={currentUser}
                    onEdit={onEditProperty}
                    onCloseListing={onCloseProperty}
                    onReopenListing={onReopenProperty}
                    onDeleteListing={onDeleteProperty}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4 max-w-lg mx-auto">
                <Building2 className="w-12 h-12 mx-auto text-slate-300" />
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {propertyStatusFilter === "closed"
                      ? "कोई बंद प्रॉपर्टी नहीं है"
                      : "अभी तक कोई प्रॉपर्टी लिस्ट नहीं की गई है"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    अपनी पहली प्रॉपर्टी पोस्ट या रील अपलोड करें और संभावित खरीदारों से सीधे जुड़ें।
                  </p>
                </div>
                {onNavigateToUpload && (
                  <button
                    type="button"
                    onClick={onNavigateToUpload}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>प्रॉपर्टी अपलोड करें</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          savedProperties.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isSaved={true}
                  onToggleSave={onToggleSave}
                  onSelectProperty={onSelectProperty}
                  onStartChat={onStartChat}
                  currentUser={currentUser}
                  showWishlistRemoveButton={true}
                  onRemoveFromWishlist={onRemoveFromWishlist}
                  onEdit={onEditProperty}
                  onCloseListing={onCloseProperty}
                  onReopenListing={onReopenProperty}
                  onDeleteListing={onDeleteProperty}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4 max-w-lg mx-auto">
              <Bookmark className="w-12 h-12 mx-auto text-slate-300" />
              <div>
                <h3 className="text-base font-bold text-slate-800">कोई पसंदीदा प्रॉपर्टी नहीं मिली</h3>
                <p className="text-xs text-slate-500 mt-1">
                  फीड में किसी भी प्रॉपर्टी पर बुकमार्क आइकन दबाकर उसे बाद में देखने के लिए सहेजें।
                </p>
              </div>
              {onNavigateToFeed && (
                <button
                  type="button"
                  onClick={onNavigateToFeed}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Compass className="w-4 h-4" />
                  <span>फीड एक्सप्लोर करें</span>
                </button>
              )}
            </div>
          )
        )}

        {activeTab === "posts" && (
          userPosts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {userPosts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onComment={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3 max-w-lg mx-auto">
              <MessageSquare className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-800">कोई लोकल पोस्ट नहीं है</h3>
              <p className="text-xs text-slate-500">
                बोकारो या गिरिडीह से जुड़ी कोई भी जानकारी या सवाल शेयर करें।
              </p>
            </div>
          )
        )}
      </div>

      {isEditModalOpen && (
        <EditProfileModal
          profile={currentUser}
          onClose={() => setIsEditModalOpen(false)}
          onProfileUpdated={(updatedProfile) => {
            onUserUpdate(updatedProfile);
          }}
        />
      )}
    </div>
  );
};
