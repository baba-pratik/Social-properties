import React, { useState, useRef, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  MapPin,
  CheckCircle2,
  Eye,
  Volume2,
  VolumeX,
  MessageSquare,
  Building2,
  Play,
  Pause,
  Phone,
  Trash2,
} from "lucide-react";
import { Property, Profile } from "../types/database";
import { formatPrice, formatRelativeTime, PROPERTY_TYPE_LABELS } from "../lib/utils";
import { toggleLike, getLikes } from "../lib/supabase";
import { ShareModal } from "./ShareModal";
import { Link } from "./Link";
import { PropertyActionMenu } from "./PropertyActionMenu";

interface PropertyCardProps {
  property: Property;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onStartChat: (property: Property) => void;
  currentUser: Profile | null;
  onRequestAuth?: () => void;
  onEdit?: (property: Property) => void;
  onCloseListing?: (property: Property) => void;
  onReopenListing?: (property: Property) => void;
  onDeleteListing?: (property: Property) => void;
  showWishlistRemoveButton?: boolean;
  onRemoveFromWishlist?: (propertyId: string) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isSaved,
  onToggleSave,
  onSelectProperty,
  onStartChat,
  currentUser,
  onEdit,
  onCloseListing,
  onReopenListing,
  onDeleteListing,
  showWishlistRemoveButton,
  onRemoveFromWishlist,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animState, setAnimState] = useState<{ type: "play" | "pause"; id: number } | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const mediaList =
    property.media_urls && property.media_urls.length > 0
      ? property.media_urls
      : ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=80"];

  useEffect(() => {
    getLikes(property.id, "property").then((likes) => {
      setLikesCount(likes.length);
      if (currentUser) {
        setIsLiked(likes.some((l) => l.user_id === currentUser.id));
      }
    });
  }, [property.id, currentUser]);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    const newlyLiked = await toggleLike(currentUser.id, property.id, "property");
    setIsLiked(newlyLiked);
    setLikesCount((prev) => (newlyLiked ? prev + 1 : Math.max(0, prev - 1)));
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play().catch((err) => {
        console.warn("Play error:", err);
      });
      setIsPlaying(true);
      setAnimState({ type: "play", id: Date.now() });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setAnimState({ type: "pause", id: Date.now() });
    }
  };

  const handlePrevMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1));
  };

  const handleNextMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMediaIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0));
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  const shareUrl = `${window.location.origin}/property/${property.id}`;
  const whatsappText = `देखें यह प्रॉपर्टी: ${property.title} | कीमत: ${formatPrice(
    property.price,
    property.listing_type
  )} | स्थान: ${property.locality}, ${property.city}\n\nSocial Properties पर अधिक विवरण देखें!`;

  const authorPhone = property.author?.mobile_number || property.author?.phone;

  return (
    <>
      <div className="bg-white rounded-none sm:rounded-2xl border-y sm:border border-slate-200/90 shadow-none sm:shadow-sm flex flex-col mb-4 sm:mb-6 overflow-hidden">
        {/* Header: Author Info */}
        <div className="p-3 flex items-center justify-between">
          <Link
            href={`/profile/${property.author_id}`}
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity pointer-events-auto"
          >
            {property.author?.avatar_url ? (
              <img
                src={property.author.avatar_url}
                alt={property.author.full_name}
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-emerald-500/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                {property.author?.full_name?.charAt(0) || "U"}
              </div>
            )}
            <div className="truncate text-xs">
              <div className="font-bold text-slate-900 truncate flex items-center gap-1 flex-wrap">
                <span>{property.author?.full_name || "मालिक"}</span>
                {property.author?.is_verified_broker && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" /> सत्यापित ब्रोकर
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {property.locality}, {property.city} • {formatRelativeTime(property.created_at)}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Owner Status Badge if closed/sold/rented */}
            {property.status && property.status !== "active" && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                {property.status === "sold"
                  ? "बिक गया (Sold)"
                  : property.status === "rented"
                  ? "किराए पर उठा (Rented)"
                  : "बंद (Closed)"}
              </span>
            )}

            {/* Direct Call button if phone available and not owner */}
            {authorPhone && currentUser?.id !== property.author_id && (
              <a
                href={`tel:${authorPhone}`}
                onClick={(e) => e.stopPropagation()}
                title="कॉल करें"
                className="p-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}

            {currentUser?.id !== property.author_id ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition-colors cursor-pointer pointer-events-auto"
              >
                फॉलो
              </button>
            ) : (
              <PropertyActionMenu
                property={property}
                currentUser={currentUser}
                onEdit={onEdit}
                onCloseListing={onCloseListing}
                onReopenListing={onReopenListing}
                onDeleteListing={onDeleteListing}
                align="right"
                variant="card"
              />
            )}
          </div>
        </div>

        {/* Media Container */}
        <div
          className="relative aspect-16/10 w-full overflow-hidden bg-black flex items-center justify-center cursor-pointer select-none"
          onClick={property.video_url ? handleVideoClick : () => onSelectProperty(property)}
        >
          {property.video_url ? (
            <>
              <video
                ref={videoRef}
                src={property.video_url}
                className="w-full h-full object-contain"
                loop
                muted={isMuted}
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {animState && (
                <div
                  key={animState.id}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white z-20 pointer-events-none animate-[fadeOut_0.8s_ease-out_forwards]"
                >
                  {animState.type === "play" ? (
                    <Play className="w-8 h-8 fill-white text-white ml-1 drop-shadow-lg" />
                  ) : (
                    <Pause className="w-8 h-8 fill-white text-white drop-shadow-lg" />
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="absolute bottom-2 right-2 z-30 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:bg-black/60 transition-colors pointer-events-auto"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </>
          ) : (
            <>
              <img
                src={mediaList[activeMediaIndex]}
                alt={property.title}
                className="w-full h-full object-cover transition-all duration-300"
                loading="lazy"
              />

              {/* Multi-image indicators and arrows */}
              {mediaList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevMedia}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-20 transition-all pointer-events-auto shadow-md"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMedia}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-20 transition-all pointer-events-auto shadow-md"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/40 backdrop-blur-xs px-2 py-1 rounded-full">
                    {mediaList.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === activeMediaIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Top Badges */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-30">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-xs ${
                  property.listing_type === "rent" ? "bg-indigo-600" : "bg-emerald-600"
                }`}
              >
                {property.listing_type === "rent" ? "किराया (Rent)" : "बिक्री (Sale)"}
              </span>

              {property.video_url && (
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs flex items-center gap-1">
                  <Play className="w-2.5 h-2.5 fill-white" />
                  <span>रील</span>
                </span>
              )}
            </div>

            {property.views_count !== undefined && property.views_count > 0 && (
              <div className="flex items-center gap-1 text-[11px] bg-black/40 backdrop-blur-xs px-2 py-1 rounded-full text-white font-medium">
                <Eye className="w-3.5 h-3.5" />
                <span>{property.views_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleLike}
              className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-white to-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-200 cursor-pointer transition-transform hover:scale-110 active:scale-95"
              title="लाइक करें"
            >
              <Heart
                className={`w-5 h-5 drop-shadow-sm ${
                  isLiked ? "fill-rose-500 text-rose-500" : "text-slate-600 group-hover:text-rose-400"
                }`}
              />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectProperty(property);
              }}
              className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-white to-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-200 cursor-pointer transition-transform hover:scale-110 active:scale-95"
              title="कमेंट / विवरण"
            >
              <MessageCircle className="w-5 h-5 text-slate-600 drop-shadow-sm group-hover:text-blue-500" />
            </button>

            <button
              type="button"
              onClick={handleShareClick}
              className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-white to-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-200 cursor-pointer transition-transform hover:scale-110 active:scale-95"
              title="शेयर करें"
            >
              <Share2 className="w-5 h-5 text-slate-600 drop-shadow-sm group-hover:text-emerald-500" />
            </button>

            {/* Bookmark / Save Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(property.id);
              }}
              className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-white to-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-200 cursor-pointer transition-transform hover:scale-110 active:scale-95"
              title={isSaved ? "सहेजी गई प्रॉपर्टी हटाएं" : "पसंदीदा में जोड़ें"}
            >
              <Bookmark
                className={`w-5 h-5 drop-shadow-sm ${
                  isSaved ? "fill-amber-500 text-amber-500" : "text-slate-600 group-hover:text-amber-500"
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartChat(property);
            }}
            className="flex items-center gap-1.5 bg-gradient-to-br from-emerald-500 to-teal-700 hover:from-emerald-600 hover:to-teal-800 text-white px-4 py-2 rounded-full text-xs font-black cursor-pointer transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            <MessageSquare className="w-4 h-4 drop-shadow-sm" />
            <span className="drop-shadow-sm">मालिक से चैट</span>
          </button>
        </div>

        {/* Content & Details */}
        <div className="px-4 py-3 flex-1 flex flex-col space-y-2">
          <div className="flex items-baseline justify-between">
            <div
              className="text-2xl font-black text-slate-900 cursor-pointer hover:text-emerald-600 transition-colors inline-block"
              onClick={() => onSelectProperty(property)}
            >
              {formatPrice(property.price, property.listing_type)}
            </div>
            <div className="text-xs font-bold text-slate-500">
              {likesCount > 0 ? `${likesCount} पसंद` : "0 पसंद"}
            </div>
          </div>

          {/* Feature Tags */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 flex-wrap">
            {property.bedrooms > 0 && (
              <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-700">
                {property.bedrooms} BHK
              </span>
            )}
            <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-700">
              {PROPERTY_TYPE_LABELS[property.property_type]?.hi || property.property_type}
            </span>
            {property.carpet_area ? (
              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                {property.carpet_area} sq.ft
              </span>
            ) : property.built_up_area ? (
              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                {property.built_up_area} sq.ft
              </span>
            ) : null}
            {property.furnishing && (
              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">{property.furnishing}</span>
            )}
            {property.balconies !== undefined && property.balconies > 0 && (
              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">{property.balconies} बालकनी</span>
            )}
          </div>

          <div className="text-sm text-slate-700 leading-relaxed flex flex-col items-start gap-1">
            <p className="line-clamp-2">
              <span className="font-bold text-slate-900 mr-2">{property.title}</span>
              {property.description}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectProperty(property);
              }}
              className="text-emerald-700 font-bold hover:underline text-xs mt-0.5 cursor-pointer"
            >
              पूरा विवरण देखें...
            </button>
          </div>

          {/* Dedicated Wishlist Remove Button */}
          {showWishlistRemoveButton && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRemoveFromWishlist) {
                    onRemoveFromWishlist(property.id);
                  } else {
                    onToggleSave(property.id);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Wishlist से हटाएँ</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={property.title}
        shareUrl={shareUrl}
        whatsappText={whatsappText}
      />
    </>
  );
};
