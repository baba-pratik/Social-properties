import React, { useEffect, useState } from "react";
import { Profile, Property } from "../types/database";
import { fetchPublicProfile, fetchUserProperties, toggleFollow, isFollowing, getFollowers, getFollowing } from "../lib/supabase";
import { MapPin, User, CheckCircle2, MessageCircle, UserPlus, FileVideo, Building2, UserMinus, Users } from "lucide-react";
import { PropertyCard } from "./PropertyCard";
import { PropertyGridSkeleton } from "./PropertySkeleton";
import { ConfirmModal } from "./ConfirmModal";

interface PublicProfileViewProps {
  userId: string;
  currentUser: Profile | null;
  savedPropertyIds: string[];
  onToggleSave: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onStartChat: (property: Property) => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({
  userId,
  currentUser,
  savedPropertyIds,
  onToggleSave,
  onSelectProperty,
  onStartChat,
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [profData, propsData] = await Promise.all([
          fetchPublicProfile(userId),
          fetchUserProperties(userId)
        ]);
        const prof = profData as Profile;
        setProfile(prof);
        setProperties(propsData as Property[]);
        setFollowersCount(prof.followers_count || 0);
        setFollowingCount(prof.following_count || 0);
        if (currentUser) {
          const following = await isFollowing(currentUser.id, userId);
          setIsFollowing(following);
        }
      } catch (error) {
        console.error("Failed to load public profile", error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) {
      loadData();
    }
  }, [userId, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser || currentUser.id === userId) return;
    const newState = await toggleFollow(currentUser.id, userId);
    setIsFollowing(newState);
    if (newState) {
      setFollowersCount(c => c + 1);
    } else {
      setFollowersCount(c => Math.max(0, c - 1));
    }
  };

  const openFollowersModal = async () => {
    setLoadingLists(true);
    const data = await getFollowers(userId);
    setFollowersList(data);
    setShowFollowersModal(true);
    setLoadingLists(false);
  };

  const openFollowingModal = async () => {
    setLoadingLists(true);
    const data = await getFollowing(userId);
    setFollowingList(data);
    setShowFollowingModal(true);
    setLoadingLists(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 animate-pulse">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-200 rounded w-1/4" />
          </div>
        </div>
        <PropertyGridSkeleton count={3} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 font-bold">प्रोफ़ाइल नहीं मिली</p>
      </div>
    );
  }

  const isOwnProfile = currentUser && currentUser.id === userId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6">
      
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">
        
        {/* Abstract Background pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-60 -ml-10 -mb-10 pointer-events-none" />
        
        <div className="relative">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-white shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shadow-lg border-4 border-white font-bold text-3xl sm:text-4xl">
              {profile.full_name?.charAt(0) || "U"}
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left z-10">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2">
            <span>{profile.full_name}</span>
            {profile.is_verified_broker && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" /> सत्यापित ब्रोकर
              </span>
            )}
          </h1>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-slate-500 mb-4 font-medium">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {profile.city || 'झारखंड'}</span>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-6 text-slate-700">
            <div className="text-center">
              <div className="font-black text-xl">{properties.length}</div>
              <div className="text-xs text-slate-500">पोस्ट्स</div>
            </div>
            <div className="text-center cursor-pointer" onClick={openFollowersModal}>
              <div className="font-black text-xl">{followersCount}</div>
              <div className="text-xs text-slate-500">फ़ॉलोअर्स</div>
            </div>
            <div className="text-center cursor-pointer" onClick={openFollowingModal}>
              <div className="font-black text-xl">{followingCount}</div>
              <div className="text-xs text-slate-500">फ़ॉलोइंग</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full sm:w-auto mt-4 sm:mt-0 z-10">
          {!isOwnProfile && (
            <button 
              onClick={handleFollowToggle}
              className={`px-8 py-3 font-bold rounded-2xl transition-colors shadow-lg flex items-center justify-center gap-2 ${
                isFollowing
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {isFollowing ? <UserMinus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {isFollowing ? 'फॉलो कर रहे हैं' : 'फॉलो करें'}
            </button>
          )}
          <button 
            onClick={() => {
              if (properties.length > 0) {
                onStartChat(properties[0]);
              }
            }}
            className="px-8 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 border border-emerald-200"
          >
            <MessageCircle className="w-5 h-5" />
            मैसेज करें
          </button>
        </div>
      </div>

      {/* User's Uploads Grid */}
      <div>
        <div className="flex items-center gap-3 mb-6 px-2 border-b border-slate-200 pb-4">
          <FileVideo className="w-6 h-6 text-slate-800" />
          <h2 className="text-xl font-bold text-slate-900">पोस्ट्स / Reels</h2>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">
              कोई पोस्ट नहीं
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSaved={savedPropertyIds.includes(property.id)}
                onToggleSave={onToggleSave}
                onSelectProperty={onSelectProperty}
                onStartChat={onStartChat}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">फॉलोअर्स ({followersCount})</h2>
              <button onClick={() => setShowFollowersModal(false)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-4">
              {loadingLists ? <div className="text-center text-slate-500">लोड हो रहा है...</div> :
              followersList.length === 0 ? <div className="text-center text-slate-500">कोई फॉलोअर्स नहीं</div> :
              followersList.map((f: any) => (
                <div key={f.follower?.id || f.id} className="flex items-center gap-3 p-2 border-b last:border-0">
                  {f.follower?.avatar_url ? (
                    <img src={f.follower.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                      {f.follower?.full_name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{f.follower?.full_name}</div>
                    <div className="text-xs text-slate-500">{f.follower?.city}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">फॉलोइंग ({followingCount})</h2>
              <button onClick={() => setShowFollowingModal(false)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-4">
              {loadingLists ? <div className="text-center text-slate-500">लोड हो रहा है...</div> :
              followingList.length === 0 ? <div className="text-center text-slate-500">कोई फॉलोइंग नहीं</div> :
              followingList.map((f: any) => (
                <div key={f.following?.id || f.id} className="flex items-center gap-3 p-2 border-b last:border-0">
                  {f.following?.avatar_url ? (
                    <img src={f.following.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                      {f.following?.full_name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{f.following?.full_name}</div>
                    <div className="text-xs text-slate-500">{f.following?.city}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
