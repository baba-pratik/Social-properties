import React, { useState, useEffect, useCallback, useRef } from "react";
import { Property, Profile } from "../types/database";
import { ReelCard } from "./ReelCard";
import { supabase } from "../lib/supabase";
import { Loader2 } from "lucide-react";

interface ReelsFeedProps {
  currentUser: Profile | null;
  onSelectProperty: (property: Property) => void;
  onStartChat: (property: Property) => void;
  onToggleSave: (id: string) => void;
  savedPropertyIds: string[];
  onEdit?: (property: Property) => void;
  onCloseListing?: (property: Property) => void;
  onReopenListing?: (property: Property) => void;
  onDeleteListing?: (property: Property) => void;
}

export const ReelsFeed: React.FC<ReelsFeedProps> = ({
  currentUser,
  onSelectProperty,
  onStartChat,
  onToggleSave,
  savedPropertyIds,
  onEdit,
  onCloseListing,
  onReopenListing,
  onDeleteListing,
}) => {
  const [feedItems, setFeedItems] = useState<Property[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Listen to realtime property updates and deletions
  useEffect(() => {
    const handleRealtime = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      if (detail.type === "property-deleted" && detail.propertyId) {
        setFeedItems((prev) => prev.filter((p) => p.id !== detail.propertyId));
      } else if (detail.type === "property-updated" && detail.property) {
        const updated = detail.property as Property;
        setFeedItems((prev) => {
          if (updated.status && updated.status !== "active") {
            // If it's closed and the user is NOT the author, remove from public feed
            if (!currentUser || currentUser.id !== updated.author_id) {
              return prev.filter((p) => p.id !== updated.id);
            }
          }
          return prev.map((p) => (p.id === updated.id ? updated : p));
        });
      }
    };

    window.addEventListener("social-properties-realtime", handleRealtime);
    return () => {
      window.removeEventListener("social-properties-realtime", handleRealtime);
    };
  }, [currentUser]);

  const fetchProperties = useCallback(async (isInitial = false) => {
    if (loading || (!hasMore && !isInitial)) return;
    
    setLoading(true);
    try {
      const currentPage = isInitial ? 1 : page;
      const limit = 5;
      const start = (currentPage - 1) * limit;
      const end = start + limit - 1;

      const { data, error } = await supabase
        .from('properties')
        .select('*, author:profiles(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;
      
      const newItems = (data || []) as Property[];
      
      if (newItems.length < limit) {
        setHasMore(false);
      }
      
      if (isInitial) {
        setFeedItems(newItems);
        setPage(2);
      } else {
        setFeedItems(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newItems.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
        setPage(currentPage + 1);
      }
      
    } catch (error) {
      console.error("Error fetching reels:", error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Lock page-level scroll when Reels tab is active
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlHeight = document.documentElement.style.height;

    document.body.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100%";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.height = originalBodyHeight;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.height = originalHtmlHeight;
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchProperties(true).then(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Force scroll container to the absolute top when reels populate or load
  useEffect(() => {
    if (feedItems.length > 0 && containerRef.current) {
      containerRef.current.scrollTop = 0;
      // Instant execution fallback in case elements are still mounting or sizing
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [feedItems.length]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchProperties(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, fetchProperties]);

  if (feedItems.length === 0 && !loading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center text-white">
        कोई रील्स नहीं मिलीं।
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden relative z-40">
      <div 
        ref={containerRef}
        className="w-full h-full max-w-[500px] flex flex-col overflow-y-scroll snap-y snap-mandatory overscroll-y-contain hide-scrollbar sm:border-x border-slate-800"
        style={{ 
          scrollbarWidth: "none", 
          msOverflowStyle: "none", 
          overscrollBehaviorY: "contain",
          scrollSnapType: "y mandatory",
          overflowY: "scroll"
        }}
      >
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {feedItems.map((property) => (
          <ReelCard 
            key={property.id} 
            property={property}
            currentUser={currentUser}
            onSelectProperty={onSelectProperty}
            onStartChat={onStartChat}
            onToggleSave={onToggleSave}
            isSaved={savedPropertyIds.includes(property.id)}
            onEdit={onEdit}
            onCloseListing={onCloseListing}
            onReopenListing={onReopenListing}
            onDeleteListing={onDeleteListing}
          />
        ))}
        
        {/* Load More Trigger / Loader */}
        <div ref={loadMoreRef} className="w-full h-32 flex items-center justify-center text-white pb-10 shrink-0 snap-start">
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : !hasMore && feedItems.length > 0 ? (
            <p className="text-sm text-white/50">और रील्स नहीं हैं</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
