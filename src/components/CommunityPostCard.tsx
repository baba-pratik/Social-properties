import React, { useState, useEffect } from "react";
import { CommunityPost, Profile } from "../types/database";
import { ThumbsUp, MessageCircle, Share2, CheckCircle2, MoreHorizontal } from "lucide-react";
import { formatRelativeTime } from "../lib/utils";
import { toggleLike, getLikes } from "../lib/supabase";
import { ShareModal } from "./ShareModal";
import { Link } from "./Link";

interface CommunityPostCardProps {
  post: CommunityPost;
  currentUser: Profile | null;
  onComment: (post: CommunityPost) => void;
  onRequestAuth?: () => void;
}

export const CommunityPostCard: React.FC<CommunityPostCardProps> = ({
  post,
  currentUser,
  onComment,
  onRequestAuth,
}) => {
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      getLikes(post.id, "post").then((likes) => {
        setLikesCount(likes.length);
        setIsLiked(likes.some(l => l.user_id === currentUser.id));
      });
    }
  }, [post.id, currentUser]);

  const handleToggleLike = async () => {
    if (!currentUser) {
      if (onRequestAuth) onRequestAuth();
      return;
    }
    const newlyLiked = await toggleLike(currentUser.id, post.id, "post");
    setIsLiked(newlyLiked);
    setLikesCount(prev => newlyLiked ? prev + 1 : Math.max(0, prev - 1));
  };

  const handleShareClick = () => {
    setIsShareModalOpen(true);
  };
  
  const shareUrl = `${window.location.origin}/post/${post.id}`;
  const whatsappText = `${post.author?.full_name} ने ${post.locality}, ${post.city} के बारे में अपडेट साझा किया: "${post.content}"\n\nSocial Properties पर पढ़ें!`;

  return (
    <>
    <div className="bg-white rounded-none sm:rounded-2xl border-y sm:border border-slate-200/80 shadow-none sm:shadow-xs overflow-hidden flex flex-col snap-start sm:mb-4">
      {/* Header */}
      <div className="p-4 flex justify-between items-start">
        <Link href={`/profile/${post.author_id}`} className="flex gap-3 hover:opacity-80 transition-opacity">
          <img
            src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${post.author?.full_name}&background=f1f5f9`}
            alt={post.author?.full_name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <div className="flex items-center gap-1">
              <h4 className="font-bold text-slate-900 text-sm">{post.author?.full_name}</h4>
              {post.author?.is_verified_broker && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                  <CheckCircle2 className="w-3 h-3" /> सत्यापित ब्रोकर
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              {post.locality}, {post.city} • {formatRelativeTime(post.created_at)}
            </div>
          </div>
        </Link>
        <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Media (If any) */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="px-4 pb-4">
          <img
            src={post.media_urls[0]}
            alt="Post media"
            className="w-full h-auto max-h-80 object-cover rounded-xl"
          />
        </div>
      )}

      {/* Action Bar */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex gap-6">
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 text-sm font-semibold cursor-pointer transition-colors ${
              isLiked ? "text-rose-500" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ThumbsUp className={`w-4.5 h-4.5 ${isLiked ? "fill-rose-500" : ""}`} />
            <span>{likesCount > 0 ? likesCount : "पसंद"}</span>
          </button>
          
          <button
            onClick={() => onComment(post)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold cursor-pointer transition-colors"
          >
            <MessageCircle className="w-4.5 h-4.5" />
            <span>{post.comments_count || "कमेंट"}</span>
          </button>
        </div>

        <button
          onClick={handleShareClick}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-green-600 cursor-pointer transition-colors"
          title="शेयर करें"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
    
    <ShareModal
      isOpen={isShareModalOpen}
      onClose={() => setIsShareModalOpen(false)}
      title="अपडेट शेयर करें"
      shareUrl={shareUrl}
      whatsappText={whatsappText}
    />
    </>
  );
};
