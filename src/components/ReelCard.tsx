import React, { useState, useRef, useEffect } from "react";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MapPin, 
  CheckCircle2, 
  Eye, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Bookmark, 
  Play, 
  Pause,
  ChevronDown
} from "lucide-react";
import { Property, Profile } from "../types/database";
import { formatPrice, formatRelativeTime, PROPERTY_TYPE_LABELS } from "../lib/utils";
import { toggleLike, getLikes } from "../lib/supabase";
import { ShareModal } from "./ShareModal";
import { Link } from "./Link";
import { PropertyActionMenu } from "./PropertyActionMenu";
// @ts-ignore
import ReactPlayer from "react-player";
import { useInView } from "react-intersection-observer";

interface ReelCardProps {
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
}

export const ReelCard: React.FC<ReelCardProps> = ({
  property,
  isSaved,
  onToggleSave,
  onSelectProperty,
  onStartChat,
  currentUser,
  onRequestAuth,
  onEdit,
  onCloseListing,
  onReopenListing,
  onDeleteListing,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const playerRef = useRef<any>(null);
  
  // Intersection Observer to detect when this specific reel is fully in view
  const { ref: containerRef, inView } = useInView({
    threshold: 0.7, // Play when 70% visible
  });

  useEffect(() => {
    // In a real app we would fetch real likes from Firestore, mocking here for UI consistency based on existing code
    setLikesCount(property.likes_count || 0);
  }, [property]);

  const handleTimeUpdate = (state: { playedSeconds: number, played: number }) => {
    setVideoProgress(state.played * 100);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVideoProgress(val);
    if (playerRef.current) {
      playerRef.current.seekTo(val / 100, 'fraction');
    }
  };

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    // Real implementation would update Firestore here
  };

  const handleToggleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave(property.id);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  const handleContactWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Hi, I am interested in your property: ${property.title}.`;
    const phone = property.author?.phone || "";
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      onStartChat(property); // Fallback to in-app chat
    }
  };

  const shareUrl = `${window.location.origin}/property/${property.id}`;
  const whatsappText = `इस प्रॉपर्टी को देखें: ${property.title} - ${formatPrice(property.price, property.listing_type)}\n\n${shareUrl}`;

  return (
    <>
    <div 
      ref={containerRef}
      className="relative w-full h-full min-h-full shrink-0 snap-start snap-always bg-black overflow-hidden flex items-center justify-center group"
      style={{ scrollSnapAlign: "start", height: "100%" }}
      onClick={() => setIsPlaying(!isPlaying)}
    >
      {/* Background Blur for non-9:16 videos */}
      {property.video_url && (
        <div className="absolute inset-0 w-full h-full opacity-30 scale-110 blur-xl pointer-events-none z-0">
          {/* @ts-ignore */}
          <ReactPlayer 
            url={property.video_url}
            playing={inView && isPlaying}
            muted={true}
            loop={true}
            width="100%"
            height="100%"
          />
        </div>
      )}

      {/* Main Video Player */}
      {property.video_url ? (
        <div className="absolute inset-0 w-full h-full z-10 flex items-center justify-center pointer-events-none">
          {/* @ts-ignore */}
          <ReactPlayer 
            ref={playerRef}
            url={property.video_url}
            playing={inView && isPlaying}
            muted={isMuted}
            loop={true}
            width="100%"
            height="100%"
            onProgress={(state: any) => handleTimeUpdate(state)}
            playsinline
          />
        </div>
      ) : (
        <div className="absolute inset-0 w-full h-full z-10">
          <img 
            src={property.media_urls?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}

      {/* Top Gradient Overlay */}
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/60 to-transparent z-20 pointer-events-none" />

      {/* View Count */}
      <div className="absolute top-6 left-4 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
        <Eye className="w-3.5 h-3.5 text-white/90" />
        <span className="text-white text-xs font-semibold">{property.views_count || 0}</span>
      </div>

      {/* Mute/Unmute Toggle */}
      {property.video_url && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(!isMuted);
          }}
          className="absolute top-6 right-4 z-20 w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-black/60 transition-colors shadow-lg"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      )}

      {/* Play/Pause Indicator (Fades out) */}
      {!isPlaying && property.video_url && (
        <div className="absolute inset-0 m-auto w-16 h-16 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full text-white z-30 pointer-events-none animate-in zoom-in duration-200">
          <Play className="w-8 h-8 ml-1" />
        </div>
      )}

      {/* Bottom Information Overlay */}
      {!isExpanded && (
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 pt-20 px-4 pb-6 pointer-events-none">
          <div className="flex items-end justify-between w-full">
            <div className="flex-1 pr-16 pointer-events-auto">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                  {property.listing_type === "rent" ? "किराया" : "बिक्री"}
                </span>
                {property.status && property.status !== "active" && (
                  <span className="bg-amber-500/90 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                    {property.status === "sold"
                      ? "बिक गया"
                      : property.status === "rented"
                      ? "किराए पर उठा"
                      : "बंद (Closed)"}
                  </span>
                )}
                <span className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-1 border border-white/10 shadow-sm">
                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0"/>
                  {property.locality}
                </span>
              </div>
              <h3 className="text-white font-bold text-lg leading-tight mb-1 drop-shadow-md line-clamp-1">{property.title}</h3>
              <div className="text-emerald-400 font-black text-xl mb-2 drop-shadow-md">
                {formatPrice(property.price, property.listing_type)}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Link href={`/profile/${property.author_id}`} className="flex items-center gap-2">
                  {property.author?.avatar_url ? (
                    <img
                      src={property.author.avatar_url}
                      alt={property.author.full_name}
                      className="w-6 h-6 rounded-full object-cover border border-white/50"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] border border-white/50">
                      {property.author?.full_name?.charAt(0) || "U"}
                    </div>
                  )}
                  <span className="text-white text-xs font-medium drop-shadow-md">
                    {property.author?.full_name || "मालिक"}
                  </span>
                </Link>
              </div>
              
              <div className="text-white/80 text-xs line-clamp-2 mb-3 drop-shadow-sm leading-relaxed">
                {property.description}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                className="text-white/60 text-xs font-medium flex items-center gap-1 hover:text-white transition-colors"
              >
                और पढ़ें <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Description Bottom Sheet */}
      {isExpanded && (
        <div 
          className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/95 via-black/90 to-black/70 backdrop-blur-md z-30 pt-6 px-4 pb-8 animate-in slide-in-from-bottom-full duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <Link 
              href={`/profile/${property.author_id}`} 
              className="flex items-center gap-2"
            >
              {property.author?.avatar_url ? (
                <img
                  src={property.author.avatar_url}
                  alt={property.author.full_name}
                  className="w-10 h-10 rounded-full object-cover border border-white/40 shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm border border-white/40">
                  {property.author?.full_name?.charAt(0) || "U"}
                </div>
              )}
              <div>
                <div className="font-bold text-white text-sm flex items-center gap-1 flex-wrap">
                  {property.author?.full_name || "मालिक"}
                  {property.author?.is_verified_broker && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-900/40 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> सत्यापित ब्रोकर
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-white/60">@{property.author?.full_name?.replace(/\s+/g, '').toLowerCase() || "user"}</div>
              </div>
            </Link>
            <button 
              onClick={() => setIsExpanded(false)} 
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-2">
            <div className="text-3xl font-black text-white drop-shadow-md tracking-tight">
              {formatPrice(property.price, property.listing_type)}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span
              className={`px-2 py-1 rounded-md text-[10px] font-bold text-white shadow-sm ${
                property.listing_type === "rent" ? "bg-indigo-600" : "bg-emerald-600"
              }`}
            >
              {property.listing_type === "rent" ? "किराया" : "बिक्री"}
            </span>
            {property.bedrooms > 0 && (
              <span className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-bold text-white shadow-sm">
                {property.bedrooms} BHK
              </span>
            )}
            <span className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-bold text-white flex items-center gap-1 shadow-sm">
              <MapPin className="w-3 h-3 text-emerald-400 shrink-0"/>
              {property.locality}, {property.city}
            </span>
            <span className="bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-bold text-white shadow-sm">
              {PROPERTY_TYPE_LABELS[property.property_type]?.hi || property.property_type}
            </span>
          </div>
          
          <h3 className="text-sm font-bold text-white mb-2 leading-snug">{property.title}</h3>
          
          <div className="text-xs sm:text-sm text-white/80 max-h-[20vh] overflow-y-auto mb-5 leading-relaxed pr-2">
            {property.description}
          </div>
          
          <button
            onClick={handleContactWhatsApp}
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-3.5 rounded-xl font-bold cursor-pointer transition-all shadow-lg active:scale-95"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">Contact Owner (WhatsApp)</span>
          </button>
        </div>
      )}

      {/* Minimal Right Action Rail (YouTube Shorts Style) */}
      <div className={`absolute bottom-10 right-2 z-20 flex flex-col items-center gap-6 transition-opacity duration-300 ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* WhatsApp / Contact Owner */}
        {property.author?.phone && (
          <a
            href={`https://wa.me/${property.author.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappText)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-1 cursor-pointer group pointer-events-auto"
            aria-label="Contact via WhatsApp"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center drop-shadow-xl transition-transform group-active:scale-90 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <MessageSquare className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-white font-bold text-[10px] drop-shadow-md">संपर्क</span>
          </a>
        )}

        {/* Like */}
        <button
          onClick={handleToggleLike}
          className="flex flex-col items-center gap-1 cursor-pointer group pointer-events-auto"
          aria-label="Like property"
        >
          <div className="bg-black/20 backdrop-blur-sm p-2 rounded-full border border-white/10 group-active:scale-90 transition-transform">
            <Heart className={`w-7 h-7 drop-shadow-xl ${isLiked ? "fill-rose-500 text-rose-500" : "text-white"}`} strokeWidth={1.5} />
          </div>
          <span className="text-white font-bold text-[11px] drop-shadow-md">{likesCount > 0 ? likesCount : 'लाइक'}</span>
        </button>
        
        {/* Comment */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectProperty(property);
          }}
          className="flex flex-col items-center gap-1 cursor-pointer group pointer-events-auto"
          aria-label="Comment on property"
        >
          <div className="bg-black/20 backdrop-blur-sm p-2 rounded-full border border-white/10 group-active:scale-90 transition-transform">
            <MessageSquare className="w-7 h-7 text-white drop-shadow-xl" strokeWidth={1.5} />
          </div>
          <span className="text-white font-bold text-[11px] drop-shadow-md">कमेंट</span>
        </button>

        {/* WhatsApp Contact */}
        <button
          onClick={handleContactWhatsApp}
          className="flex flex-col items-center gap-1 cursor-pointer group pointer-events-auto"
          aria-label="WhatsApp"
        >
          <div className="bg-[#25D366]/20 backdrop-blur-sm p-2 rounded-full border border-[#25D366]/30 group-active:scale-90 transition-transform">
            <MessageCircle className="w-7 h-7 text-[#25D366] drop-shadow-xl" strokeWidth={1.5} />
          </div>
          <span className="text-white font-bold text-[11px] drop-shadow-md">संपर्क</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShareClick}
          className="flex flex-col items-center gap-1 cursor-pointer group pointer-events-auto"
          aria-label="Share property"
        >
          <div className="bg-black/20 backdrop-blur-sm p-2 rounded-full border border-white/10 group-active:scale-90 transition-transform">
            <Share2 className="w-7 h-7 text-white drop-shadow-xl" strokeWidth={1.5} />
          </div>
          <span className="text-white font-bold text-[11px] drop-shadow-md">शेयर</span>
        </button>

        {/* Bookmark / Wishlist Save */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(property.id);
          }}
          className="flex flex-col items-center gap-1 cursor-pointer group pointer-events-auto"
          aria-label="Save property"
        >
          <div className="bg-black/20 backdrop-blur-sm p-2 rounded-full border border-white/10 group-active:scale-90 transition-transform">
            <Bookmark
              className={`w-7 h-7 drop-shadow-xl ${
                isSaved ? "fill-amber-400 text-amber-400" : "text-white"
              }`}
              strokeWidth={1.5}
            />
          </div>
          <span className="text-white font-bold text-[11px] drop-shadow-md">
            {isSaved ? "सहेजा" : "सेव"}
          </span>
        </button>

        {/* Owner Actions */}
        {currentUser?.id === property.author_id && (
          <div className="flex flex-col items-center gap-1 pointer-events-auto">
            <PropertyActionMenu
              property={property}
              currentUser={currentUser}
              onEdit={onEdit}
              onCloseListing={onCloseListing}
              onReopenListing={onReopenListing}
              onDeleteListing={onDeleteListing}
              variant="reel"
              align="right"
            />
            <span className="text-white font-bold text-[10px] drop-shadow-md">विकल्प</span>
          </div>
        )}
      </div>

      {/* Interactive Seekable Progress Bar (Absolute Bottom) */}
      {property.video_url && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-2 z-40 group cursor-pointer flex items-end pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={videoProgress || 0}
            onChange={handleSeek}
            className="w-full h-1 appearance-none bg-white/20 accent-emerald-500 cursor-pointer outline-none hover:h-1.5 transition-all duration-200 m-0 p-0"
            style={{
              background: `linear-gradient(to right, #10b981 ${videoProgress}%, rgba(255, 255, 255, 0.2) ${videoProgress}%)`
            }}
          />
          <style>{`
            input[type=range]::-webkit-slider-thumb {
              appearance: none;
              width: 0px;
              height: 0px;
              transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              background: #10b981;
              border-radius: 50%;
              box-shadow: 0 0 5px rgba(0,0,0,0.5);
            }
            .group:hover input[type=range]::-webkit-slider-thumb {
              width: 14px;
              height: 14px;
            }
          `}</style>
        </div>
      )}
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
