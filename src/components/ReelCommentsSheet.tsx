import React, { useEffect, useState } from "react";
import { X, Send, MessageSquare } from "lucide-react";
import { Profile, PropertyComment } from "../types/database";
import { fetchReelComments, addReelComment } from "../lib/supabase";
import { formatRelativeTime } from "../lib/utils";

interface ReelCommentsSheetProps {
  reelId: string;
  currentUser: Profile | null;
  onClose: () => void;
}

export const ReelCommentsSheet: React.FC<ReelCommentsSheetProps> = ({
  reelId,
  currentUser,
  onClose,
}) => {
  const [comments, setComments] = useState<PropertyComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadComments();
  }, [reelId]);

  const loadComments = async () => {
    setLoading(true);
    const data = await fetchReelComments(reelId);
    setComments(data);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!currentUser || !newComment.trim() || sending) return;
    setSending(true);
    const added = await addReelComment(reelId, currentUser.id, newComment.trim());
    if (added) {
      setComments((prev) => [...prev, added]);
      setNewComment("");
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentUser) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-full duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">कमेंट्स</h2>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments list */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-slate-500 py-8">लोड हो रहा है...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-slate-500 py-8">अभी कोई कमेंट नहीं</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                {c.author?.avatar_url ? (
                  <img src={c.author.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    {c.author?.full_name?.charAt(0) || "U"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{c.author?.full_name || "User"}</span>
                    <span className="text-xs text-slate-400">{formatRelativeTime(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 p-3 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {currentUser.avatar_url ? (
              <img src={currentUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                {currentUser.full_name?.charAt(0) || "U"}
              </div>
            )}
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="कमेंट लिखें..."
              className="flex-1 px-3 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!newComment.trim() || sending}
              className="p-2 rounded-full bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send comment"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelCommentsSheet;