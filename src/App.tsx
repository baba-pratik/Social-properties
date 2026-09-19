import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Heart,
  TrendingUp,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from "lucide-react";
import { Property, Profile, PropertyFilterState, CommunityPost, PropertyStatus } from "./types/database";
import {
  fetchProperties,
  fetchCommunityPosts,
  getSavedPropertyIds,
  toggleSaveProperty,
  removeSavedProperty,
  updatePropertyStatus,
  deleteProperty,
  isSupabaseConfigured,
  saveUserProfile,
  supabase
} from "./lib/supabase";
import { getOrCreateConversation } from "./lib/supabase";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { PropertyCard } from "./components/PropertyCard";
import { CommunityPostCard } from "./components/CommunityPostCard";
import { ProfileView } from "./components/ProfileView";
import { PublicProfileView } from "./components/PublicProfileView";
import { PropertyDetailModal } from "./components/PropertyDetailModal";
import { PropertyMap } from "./components/PropertyMap";
import { UploadPropertyForm } from "./components/UploadPropertyForm";
import { SearchFilters } from "./components/SearchFilters";
import { ReelsFeed } from "./components/ReelsFeed";
import { RealtimeChat } from "./components/RealtimeChat";
import { AuthModal } from "./components/AuthModal";
import { SupabaseConfigModal } from "./components/SupabaseConfigModal";
import { OnboardingModal } from "./components/OnboardingModal";
import { PropertyGridSkeleton } from "./components/PropertySkeleton";
import { AboutModal } from "./components/AboutModal";
import { HamburgerDrawer } from "./components/HamburgerDrawer";
import { ConfirmModal } from "./components/ConfirmModal";
import { useUserStore } from "./store/useUserStore";

const RightSidebarContent = ({ setAboutModalSection, setAboutModalOpen }: any) => {
  return (
    <>
      {/* Footer Links */}
      <div className="text-[11px] text-slate-400 font-medium px-2 flex flex-wrap gap-x-3 gap-y-1">
        <button onClick={() => { setAboutModalSection("about"); setAboutModalOpen(true); }} className="hover:text-slate-600 transition-colors cursor-pointer">हमारे बारे में</button>
        <button onClick={() => { setAboutModalSection("help"); setAboutModalOpen(true); }} className="hover:text-slate-600 transition-colors cursor-pointer">सहायता</button>
        <button onClick={() => { setAboutModalSection("privacy"); setAboutModalOpen(true); }} className="hover:text-slate-600 transition-colors cursor-pointer">गोपनीयता</button>
        <button onClick={() => { setAboutModalSection("terms"); setAboutModalOpen(true); }} className="hover:text-slate-600 transition-colors cursor-pointer">शर्तें</button>
        <button onClick={() => { setAboutModalSection("locations"); setAboutModalOpen(true); }} className="hover:text-slate-600 transition-colors cursor-pointer">स्थान</button>
        <button onClick={() => { setAboutModalSection("language"); setAboutModalOpen(true); }} className="hover:text-slate-600 transition-colors cursor-pointer">भाषा</button>
        <span className="w-full mt-2 block">© 2026 Social Properties</span>
      </div>
    </>
  );
};

export default function App() {
  const { sessionUser, setSessionUser, currentUser, setCurrentUser, authModalOpen, setAuthModalOpen } = useUserStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Initialize Zustand store on first load using Supabase Auth
  useEffect(() => {
    const handleAuthChange = async (user: any) => {
      if (user) {
        setSessionUser(user);
        try {
          const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
          if (data && data.full_name) {
            const meta = user.user_metadata || {};
            const merged: Profile = {
              ...(data as Profile),
              age: data.age ?? meta.age,
              location: data.location ?? meta.location,
              mobile_number: data.mobile_number ?? meta.mobile_number ?? data.phone,
              address: data.address ?? meta.address,
              email: data.email ?? user.email ?? meta.email,
              phone: data.phone ?? meta.mobile_number,
              city: data.city ?? meta.location ?? "Bokaro",
            };
            setCurrentUser(merged);
            setShowOnboarding(false);
          } else {
            const meta = user.user_metadata;
            if (meta && meta.full_name) {
              const fallbackProf: Profile = {
                id: user.id,
                full_name: meta.full_name,
                age: meta.age,
                location: meta.location,
                mobile_number: meta.mobile_number,
                address: meta.address,
                email: user.email || meta.email,
                phone: meta.mobile_number,
                city: meta.location || "Bokaro",
                created_at: new Date().toISOString(),
              };
              setCurrentUser(fallbackProf);
              setShowOnboarding(false);
              saveUserProfile({
                id: user.id,
                full_name: meta.full_name,
                age: meta.age,
                location: meta.location,
                mobile_number: meta.mobile_number,
                address: meta.address,
                email: user.email || meta.email,
                phone: meta.mobile_number,
                city: meta.location || "Bokaro",
              }).catch(() => {});
            } else {
              setShowOnboarding(true);
            }
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setShowOnboarding(true);
        }
      } else {
        setSessionUser(null);
        setCurrentUser(null);
        setShowOnboarding(false);
      }
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      handleAuthChange(session?.user || null);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };

  }, [setCurrentUser, setSessionUser]);

  const [activeTab, setActiveTab] = useState<"feed" | "reels" | "search" | "upload" | "messages" | "saved" | "profile" | "public-profile">("feed");
  const [currentCity, setCurrentCity] = useState<string>("all");
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [savedPropertyIds, setSavedPropertyIds] = useState<string[]>([]);

  // Modals & Active selections
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [aboutModalSection, setAboutModalSection] = useState<"about" | "help" | "privacy" | "terms" | "locations" | "language">("about");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);
  const [isSupabaseActive, setIsSupabaseActive] = useState(isSupabaseConfigured());

  // Confirm Modal state for Close/Reopen/Delete operations
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    type: "close" | "reopen" | "delete";
    property: Property | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    type: "close",
    property: null,
    isLoading: false,
  });

  // Floating Toast notification state
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };


  useEffect(() => {
    const handleNavigate = (e: CustomEvent<{ href: string }>) => {
      const { href } = e.detail;
      if (href.startsWith('/profile/')) {
        const id = href.replace('/profile/', '');
        if (id === currentUser?.id) {
          handleTabChange('profile');
        } else {
          setPublicProfileId(id);
          setActiveTab('public-profile' as any);
        }
      }
    };
    
    window.addEventListener('navigate' as any, handleNavigate);
    return () => window.removeEventListener('navigate' as any, handleNavigate);
  }, [currentUser]);

  // Search & Filter State
  const [filters, setFilters] = useState<PropertyFilterState>({
    city: "all",
    locality: "",
    listing_type: "all",
    property_type: "all",
    bedrooms: null,
    min_price: 0,
    max_price: 20000000,
    search_query: "",
    sort_by: "newest",
  });

  const handleTabChange = (tab: any) => {
    if (["upload", "messages", "profile", "saved"].includes(tab) && !currentUser) {
      setAuthModalOpen(true);
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Sync city between Header switcher and filter state
  const handleHeaderCityChange = (city: string) => {
    setCurrentCity(city);
    setFilters((prev) => ({ ...prev, city, locality: "" }));
  };

  // Load properties and saved items
  useEffect(() => {
    loadAllData();

    // Load initial saved items
    const effectiveUserId = currentUser ? currentUser.id : "guest-user";
    getSavedPropertyIds(effectiveUserId).then(ids => {
      setSavedPropertyIds(ids);
    });

    // Realtime event listener
    const handleRealtime = (e: any) => {
      const { type, property, propertyId } = e.detail || {};
      if (type === "property-added" && property) {
        setProperties((prev) => [property, ...prev.filter((p) => p.id !== property.id)]);
      } else if (type === "property-updated" && property) {
        setProperties((prev) => prev.map((p) => (p.id === property.id ? property : p)));
        setSelectedProperty((prev) => (prev?.id === property.id ? property : prev));
      } else if (type === "property-deleted" && propertyId) {
        setProperties((prev) => prev.filter((p) => p.id !== propertyId));
        setSavedPropertyIds((prev) => prev.filter((id) => id !== propertyId));
        setSelectedProperty((prev) => (prev?.id === propertyId ? null : prev));
      }
    };

    window.addEventListener("social-properties-realtime", handleRealtime);
    return () => {
      window.removeEventListener("social-properties-realtime", handleRealtime);
    };
  }, []);

  const loadAllData = async (isManual = false) => {
    setLoadingProperties(true);
    setPage(1);
    try {
      // Smooth loading transition so the skeleton animation is perceptible and pleasant
      await new Promise((resolve) => setTimeout(resolve, isManual ? 600 : 450));
      const list = await fetchProperties(1, 10);
      setProperties((prev) => {
        const combined = [...prev, ...list];
        return Array.from(new Map(combined.map(item => [item.id, item])).values());
      });
      setHasMore(list.length === 10);
      
      const posts = await fetchCommunityPosts();
      setCommunityPosts(posts);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoadingProperties(false);
    }
  };

  const loadMoreProperties = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const newList = await fetchProperties(nextPage, 10);
      if (newList.length > 0) {
        setProperties((prev) => {
          const combined = [...prev, ...newList];
          // Strict deduplication by ID
          return Array.from(new Map(combined.map(item => [item.id, item])).values());
        });
        setPage(nextPage);
        setHasMore(newList.length === 10);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleSave = (propertyId: string) => {
    const effectiveUserId = currentUser ? currentUser.id : "guest-user";
    const isNowSaved = toggleSaveProperty(effectiveUserId, propertyId);
    setSavedPropertyIds((prev) =>
      isNowSaved ? [...prev, propertyId] : prev.filter((id) => id !== propertyId)
    );
    if (isNowSaved) {
      showToast("प्रॉपर्टी पसंदीदा सूची में सहेजी गई।", "success");
    } else {
      showToast("प्रॉपर्टी पसंदीदा सूची से हटा दी गई।", "info");
    }
  };

  // Explicit Wishlist / Saved Removal
  const handleRemoveFromWishlist = async (propertyId: string) => {
    const effectiveUserId = currentUser ? currentUser.id : "guest-user";
    // Immediate UI update
    setSavedPropertyIds((prev) => prev.filter((id) => id !== propertyId));
    try {
      await removeSavedProperty(effectiveUserId, propertyId);
      showToast("प्रॉपर्टी विशलिस्ट से हटा दी गई है।", "info");
    } catch (err) {
      console.error("Remove from wishlist error:", err);
    }
  };

  // Action Menu Request Handlers
  const handleEditProperty = (prop: Property) => {
    setEditingProperty(prop);
  };

  const handleRequestCloseProperty = (prop: Property) => {
    setConfirmModalState({
      isOpen: true,
      type: "close",
      property: prop,
      isLoading: false,
    });
  };

  const handleRequestReopenProperty = (prop: Property) => {
    setConfirmModalState({
      isOpen: true,
      type: "reopen",
      property: prop,
      isLoading: false,
    });
  };

  const handleRequestDeleteProperty = (prop: Property) => {
    setConfirmModalState({
      isOpen: true,
      type: "delete",
      property: prop,
      isLoading: false,
    });
  };

  // Execute Confirmed Modal Action (Close / Reopen / Delete)
  const handleExecuteConfirmAction = async () => {
    const { type, property } = confirmModalState;
    if (!property) return;
    const effectiveUserId = currentUser ? currentUser.id : property.author_id;

    setConfirmModalState((prev) => ({ ...prev, isLoading: true }));

    try {
      if (type === "close") {
        const updated = await updatePropertyStatus(property.id, "closed", effectiveUserId);
        setProperties((prev) => prev.map((p) => (p.id === property.id ? updated : p)));
        if (selectedProperty?.id === property.id) {
          setSelectedProperty(updated);
        }
        showToast("प्रॉपर्टी लिस्टिंग सफलतापूर्वक बंद कर दी गई है। यह पब्लिक फीड में नहीं दिखेगी।", "success");
      } else if (type === "reopen") {
        const updated = await updatePropertyStatus(property.id, "active", effectiveUserId);
        setProperties((prev) => prev.map((p) => (p.id === property.id ? updated : p)));
        if (selectedProperty?.id === property.id) {
          setSelectedProperty(updated);
        }
        showToast("प्रॉपर्टी फिर से सक्रिय कर दी गई है और फीड में दिखाई देगी।", "success");
      } else if (type === "delete") {
        await deleteProperty(property.id, effectiveUserId);
        setProperties((prev) => prev.filter((p) => p.id !== property.id));
        setSavedPropertyIds((prev) => prev.filter((id) => id !== property.id));
        if (selectedProperty?.id === property.id) {
          setSelectedProperty(null);
        }
        showToast("प्रॉपर्टी और मीडिया फाइलें सफलतापूर्वक हटा दी गईं।", "success");
      }
      setConfirmModalState({ isOpen: false, type: "close", property: null, isLoading: false });
    } catch (err: any) {
      console.error("Action execution error:", err);
      showToast(err?.message || "कार्रवाई पूरी करने में त्रुटि हुई।", "error");
      setConfirmModalState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Direct Chat launcher from Card or Detail Modal
  const handleStartChat = async (property: Property) => {
    if (!currentUser) {
      setSelectedProperty(property);
      setAuthModalOpen(true);
      return;
    }

    try {
      const conv = await getOrCreateConversation(property.id, currentUser.id, property.author_id);
      setActiveConversationId(conv.id);
      setActiveTab("messages");
      setSelectedProperty(null);
    } catch (err) {
      console.error("Start chat error:", err);
    }
  };

  // Filter properties according to active filters and city
  const filteredProperties = useMemo(() => {
    return properties
      .filter((prop) => {
        // City match
        if (filters.city !== "all" && prop.city !== filters.city) return false;

        // Locality match
        if (filters.locality && !prop.locality.includes(filters.locality)) return false;

        // Listing Type match
        if (filters.listing_type !== "all" && prop.listing_type !== filters.listing_type) return false;

        // Property Type match
        if (filters.property_type !== "all" && prop.property_type !== filters.property_type) return false;

        // Bedrooms match
        if (filters.bedrooms && prop.bedrooms !== filters.bedrooms) return false;

        // Furnishing match
        if (filters.furnishing && prop.furnishing !== filters.furnishing) return false;

        // Price match
        if (prop.price > filters.max_price) return false;

        // Free search query
        if (filters.search_query.trim()) {
          const q = filters.search_query.toLowerCase();
          const matchTitle = prop.title.toLowerCase().includes(q);
          const matchDesc = prop.description.toLowerCase().includes(q);
          const matchLocality = prop.locality.toLowerCase().includes(q);
          const matchAddress = prop.address.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchLocality && !matchAddress) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sort_by === "price_asc") return a.price - b.price;
        if (filters.sort_by === "price_desc") return b.price - a.price;
        if (filters.sort_by === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (filters.sort_by === "most_viewed") return (b.views_count || 0) - (a.views_count || 0);
        if (filters.sort_by === "most_liked") return (b.likes_count || 0) - (a.likes_count || 0);
        if (filters.sort_by === "popular") {
          const popA = (a.likes_count || 0) + (a.views_count || 0);
          const popB = (b.likes_count || 0) + (b.views_count || 0);
          return popB - popA;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [properties, filters]);

  const feedItems = useMemo(() => {
    const items = filteredProperties.map(p => ({ type: 'property' as const, data: p }));
    const posts = communityPosts
      .filter(p => filters.city === "all" || p.city === filters.city)
      .map(p => ({ type: 'post' as const, data: p }));
    
    const interleaved = [];
    let postIdx = 0;
    for (let i = 0; i < items.length; i++) {
      interleaved.push(items[i]);
      if ((i + 1) % 2 === 0 && postIdx < posts.length) {
        interleaved.push(posts[postIdx]);
        postIdx++;
      }
    }
    while (postIdx < posts.length) {
      interleaved.push(posts[postIdx]);
      postIdx++;
    }
    return interleaved;
  }, [filteredProperties, communityPosts, filters.city]);

  // Wishlist/Saved properties
  const savedProperties = useMemo(() => {
    return properties.filter((p) => savedPropertyIds.includes(p.id));
  }, [properties, savedPropertyIds]);

  const handleResetFilters = () => {
    setFilters({
      city: "all",
      locality: "",
      listing_type: "all",
      property_type: "all",
      bedrooms: null,
      min_price: 0,
      max_price: 20000000,
      furnishing: undefined,
      search_query: "",
      sort_by: "newest",
    });
    setCurrentCity("all");
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased w-full max-w-full ${
      activeTab === "reels" ? "h-[100dvh] overflow-hidden" : "overflow-x-hidden"
    }`}>
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadCount={0}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <div className={`flex-1 flex flex-col min-w-0 w-full max-w-full md:ml-64 lg:ml-72 ${
        activeTab === "reels" 
          ? "h-[calc(100dvh-64px)] md:h-screen overflow-hidden pb-0" 
          : "pb-20 md:pb-0 overflow-x-hidden"
      }`}>
        {activeTab !== "reels" && (
          <Header
            currentCity={currentCity}
            onCityChange={handleHeaderCityChange}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            currentUser={currentUser}
            onOpenAuth={() => {
              if (currentUser) {
                handleTabChange("profile");
              } else {
                setAuthModalOpen(true);
              }
            }}
            onOpenSettings={() => {
              setIsDrawerOpen(true);
            }}
            isSupabaseActive={isSupabaseActive}
            unreadCount={0}
            savedCount={savedProperties.length}
          />
        )}

        <div 
          className={`flex-1 w-full mx-auto pt-0 ${
            activeTab === "reels" ? "md:pt-0" : "md:pt-6"
          } ${
            activeTab === "messages" || activeTab === "reels"
              ? "max-w-full px-0 lg:px-0 block h-full" 
              : "max-w-7xl flex justify-center gap-8 lg:px-8"
          }`}
        >
          <main className={`w-full min-w-0 ${activeTab === "reels" ? "h-full" : ""}`}>
        {activeTab === "feed" && (
          <div className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto flex flex-col pb-20 pt-2 sm:pt-4 px-3 sm:px-0">
            {loadingProperties ? (
              <div className="w-full">
                <PropertyGridSkeleton count={3} />
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3 mx-4">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  इस फ़िल्टर में कोई प्रॉपर्टी नहीं मिली
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  कृपया फ़िल्टर बदलें या अपनी नई प्रॉपर्टी अपलोड करें।
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-700 transition-colors"
                >
                  सभी संपत्तियां देखें
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-0 sm:gap-6 pb-20 sm:pb-0">
                {feedItems.map((item, idx) => {
                  if (item.type === 'property') {
                    const property = item.data;
                    return (
                      <div key={`prop-${property.id}`}>
                        <PropertyCard
                           property={property}
                           isSaved={savedPropertyIds.includes(property.id)}
                           onToggleSave={handleToggleSave}
                           onSelectProperty={(prop) => setSelectedProperty(prop)}
                           onStartChat={handleStartChat}
                           currentUser={currentUser}
                           onRequestAuth={() => setAuthModalOpen(true)}
                           onEdit={handleEditProperty}
                           onCloseListing={handleRequestCloseProperty}
                           onReopenListing={handleRequestReopenProperty}
                           onDeleteListing={handleRequestDeleteProperty}
                        />
                      </div>
                    );
                  } else {
                    const post = item.data;
                    return (
                      <div key={`post-${post.id}`} className="sm:px-0">
                        <CommunityPostCard
                           post={post}
                           currentUser={currentUser}
                           onComment={() => {
                             if (!currentUser) {
                               setAuthModalOpen(true);
                             }
                           }}
                           onRequestAuth={() => setAuthModalOpen(true)}
                        />
                      </div>
                    );
                  }
                })}
                
                {hasMore && (
                  <div className="py-8 flex justify-center">
                    <button
                      onClick={loadMoreProperties}
                      disabled={loadingMore}
                      className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-sm cursor-pointer transition-colors"
                    >
                      {loadingMore ? "लोड हो रहा है..." : "और देखें"}
                    </button>
                  </div>
                )}
              </div>
            )}
            
          </div>
        )}

        {/* ================= TAB 2: SEARCH ================= */}
        {activeTab === "search" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6">
            <SearchFilters
              filters={filters}
              onFilterChange={(f) => setFilters(f)}
              onReset={handleResetFilters}
              resultCount={filteredProperties.length}
            />

            {loadingProperties ? (
              <PropertyGridSkeleton count={6} />
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  सर्च के अनुसार कोई प्रॉपर्टी नहीं मिली
                </h3>
                <p className="text-xs text-slate-500">
                  कृपया सर्च कीवर्ड बदलें या बजट फ़िल्टर बढ़ाएं।
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  फ़िल्टर साफ़ करें
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isSaved={savedPropertyIds.includes(property.id)}
                    onToggleSave={handleToggleSave}
                    onSelectProperty={(prop) => setSelectedProperty(prop)}
                    onStartChat={handleStartChat}
                    currentUser={currentUser}
                    onRequestAuth={() => setAuthModalOpen(true)}
                    onEdit={handleEditProperty}
                    onCloseListing={handleRequestCloseProperty}
                    onReopenListing={handleRequestReopenProperty}
                    onDeleteListing={handleRequestDeleteProperty}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: UPLOAD ================= */}
        {activeTab === "reels" && (
          <ReelsFeed
            currentUser={currentUser}
            onSelectProperty={(prop) => setSelectedProperty(prop)}
            onStartChat={handleStartChat}
            onToggleSave={handleToggleSave}
            savedPropertyIds={savedPropertyIds}
            onEdit={handleEditProperty}
            onCloseListing={handleRequestCloseProperty}
            onReopenListing={handleRequestReopenProperty}
            onDeleteListing={handleRequestDeleteProperty}
          />
        )}

        {activeTab === "upload" && (
          <div className="w-full flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
            <UploadPropertyForm
              currentUser={currentUser}
              onOpenAuth={() => setAuthModalOpen(true)}
              onCancel={() => handleTabChange("feed")}
              onPropertyCreated={(newProp) => {
                setProperties((prev) => {
                  const combined = [newProp, ...prev];
                  // Strict deduplication by ID
                  return Array.from(new Map(combined.map(item => [item.id, item])).values());
                });
                // Ensure the new property is immediately visible by resetting conflicting filters
                if (filters.city !== "all" && filters.city !== newProp.city) {
                  setCurrentCity("all");
                  setFilters((prev) => ({ ...prev, city: "all", locality: "", search_query: "", sort_by: "newest" }));
                } else {
                  setFilters((prev) => ({ ...prev, locality: "", search_query: "", sort_by: "newest" }));
                }
                showToast("प्रॉपर्टी सफलतापूर्वक लिस्ट हो गई है!", "success");
                handleTabChange(newProp.video_url ? "reels" : "feed");
              }}
            />
          </div>
        )}

        {/* ================= TAB 4: REALTIME CHAT ================= */}
        {activeTab === "messages" && (
          <div className="w-full">
            <RealtimeChat
              currentUser={currentUser}
              initialConversationId={activeConversationId}
              onOpenAuth={() => setAuthModalOpen(true)}
              onSelectProperty={(prop) => setSelectedProperty(prop)}
            />
            {/* When in messages tab on desktop, put the aside content below chat */}
            <div className="hidden xl:flex w-full justify-center pt-8 pb-12">
              <div className="w-[320px] space-y-6">
                <RightSidebarContent setAboutModalSection={setAboutModalSection} setAboutModalOpen={setAboutModalOpen} />
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: SAVED PROPERTIES ================= */}
        {activeTab === "saved" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                  <span>आपकी पसंदीदा संपत्तियां ({savedProperties.length})</span>
                </h1>
                <p className="text-xs text-slate-500">
                  सहेजी गई प्रॉपर्टीज की त्वरित सूची - सीधे संपर्क करें या विशलिस्ट से हटाएं
                </p>
              </div>
            </div>

            {savedProperties.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <Heart className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  अभी कोई पसंदीदा प्रॉपर्टी नहीं है
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  फीड पर किसी भी प्रॉपर्टी के दिल (Heart) आइकन पर क्लिक करके उसे यहाँ सेव करें।
                </p>
                <button
                  onClick={() => handleTabChange("feed")}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-700 transition-colors"
                >
                  फीड देखें
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isSaved={true}
                    onToggleSave={handleToggleSave}
                    onSelectProperty={(prop) => setSelectedProperty(prop)}
                    onStartChat={handleStartChat}
                    currentUser={currentUser}
                    onRequestAuth={() => setAuthModalOpen(true)}
                    showWishlistRemoveButton={true}
                    onRemoveFromWishlist={handleRemoveFromWishlist}
                    onEdit={handleEditProperty}
                    onCloseListing={handleRequestCloseProperty}
                    onReopenListing={handleRequestReopenProperty}
                    onDeleteListing={handleRequestDeleteProperty}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {/* ================= TAB: PROFILE ================= */}
        {activeTab === "profile" && currentUser && (
          <ProfileView
            currentUser={currentUser}
            properties={properties}
            communityPosts={communityPosts}
            savedPropertyIds={savedPropertyIds}
            onToggleSave={handleToggleSave}
            onSelectProperty={(prop) => setSelectedProperty(prop)}
            onStartChat={handleStartChat}
            onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
            onNavigateToUpload={() => handleTabChange("upload")}
            onNavigateToFeed={() => handleTabChange("feed")}
            onRemoveFromWishlist={handleRemoveFromWishlist}
            onEditProperty={handleEditProperty}
            onCloseProperty={handleRequestCloseProperty}
            onReopenProperty={handleRequestReopenProperty}
            onDeleteProperty={handleRequestDeleteProperty}
          />
        )}
        {/* ================= TAB: PUBLIC PROFILE ================= */}
        {activeTab === "public-profile" && publicProfileId && (
          <PublicProfileView
            userId={publicProfileId}
            currentUser={currentUser}
            savedPropertyIds={savedPropertyIds}
            onToggleSave={handleToggleSave}
            onSelectProperty={(prop) => setSelectedProperty(prop)}
            onStartChat={handleStartChat}
          />
        )}
      </main>

      <aside className={`hidden ${activeTab !== "messages" ? "xl:block" : ""} w-[320px] shrink-0 pt-4 space-y-6`}>
        <RightSidebarContent setAboutModalSection={setAboutModalSection} setAboutModalOpen={setAboutModalOpen} />
      </aside>
    </div>

    {activeTab !== "upload" && !authModalOpen && !showOnboarding && (
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadCount={0}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
      />
    )}

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedProperty}
        isOpen={Boolean(selectedProperty)}
        onClose={() => setSelectedProperty(null)}
        isSaved={selectedProperty ? savedPropertyIds.includes(selectedProperty.id) : false}
        onToggleSave={handleToggleSave}
        onStartChat={handleStartChat}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onPropertyUpdated={(updated) => {
          setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
          setSelectedProperty(updated);
          showToast("प्रॉपर्टी सफलतापूर्वक अपडेट हुई।", "success");
        }}
        onPropertyDeleted={(id) => {
          setProperties(prev => prev.filter(p => p.id !== id));
          setSavedPropertyIds(prev => prev.filter(pid => pid !== id));
          setSelectedProperty(null);
          showToast("प्रॉपर्टी सफलतापूर्वक हटा दी गई।", "success");
        }}
        onEditListing={handleEditProperty}
        onCloseListing={handleRequestCloseProperty}
        onReopenListing={handleRequestReopenProperty}
        onDeleteListing={handleRequestDeleteProperty}
      />

      {/* Owner Edit Property Modal */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-150 my-auto p-4 sm:p-6 relative">
            <button
              onClick={() => setEditingProperty(null)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors z-10 cursor-pointer"
              aria-label="बंद करें"
            >
              <X className="w-5 h-5" />
            </button>
            <UploadPropertyForm
              currentUser={currentUser}
              onOpenAuth={() => setAuthModalOpen(true)}
              initialData={editingProperty}
              onPropertyUpdated={(updated) => {
                setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                if (selectedProperty?.id === updated.id) {
                  setSelectedProperty(updated);
                }
                setEditingProperty(null);
                showToast("प्रॉपर्टी लिस्टिंग सफलतापूर्वक अपडेट कर दी गई है।", "success");
              }}
              onPropertyCreated={() => {}}
              onCancel={() => setEditingProperty(null)}
            />
          </div>
        </div>
      )}

      {/* Confirmation Modal for Close, Reopen, and Delete actions */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        type={confirmModalState.type}
        title={
          confirmModalState.type === "delete"
            ? "प्रॉपर्टी / रील डिलीट करें"
            : confirmModalState.type === "close"
            ? "लिस्टिंग बंद करें (Close Listing)"
            : "लिस्टिंग फिर से चालू करें (Reopen Listing)"
        }
        message={
          confirmModalState.type === "delete"
            ? `क्या आप वाकई "${confirmModalState.property?.title || 'यह प्रॉपर्टी'}" को हमेशा के लिए डिलीट करना चाहते हैं? यह कार्रवाई वापस नहीं ली जा सकती और इसके सभी मीडिया डिलीट हो जाएंगे।`
            : confirmModalState.type === "close"
            ? `क्या आप "${confirmModalState.property?.title || 'यह प्रॉपर्टी'}" की लिस्टिंग बंद करना चाहते हैं? यह पब्लिक फीड से छिप जाएगी और केवल आपके प्रोफाइल में दिखेगी।`
            : `क्या आप "${confirmModalState.property?.title || 'यह प्रॉपर्टी'}" को फिर से सक्रिय करना चाहते हैं? यह तुरंत पब्लिक फीड में दिखाई देने लगेगी।`
        }
        confirmLabel={
          confirmModalState.type === "delete"
            ? "हाँ, डिलीट करें"
            : confirmModalState.type === "close"
            ? "हाँ, लिस्टिंग बंद करें"
            : "हाँ, सक्रिय करें"
        }
        cancelLabel="रद्द करें"
        isDanger={confirmModalState.type === "delete"}
        isLoading={confirmModalState.isLoading}
        onConfirm={handleExecuteConfirmAction}
        onCancel={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false, property: null }))}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900/95 text-white rounded-2xl shadow-2xl backdrop-blur-md border border-slate-700/50 max-w-md animate-in slide-in-from-bottom-5 duration-200">
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toastMessage.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-sky-400 shrink-0" />
          )}
          <p className="text-xs sm:text-sm font-medium leading-snug flex-1">
            {toastMessage.text}
          </p>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Authentication & Profile Modal */}
      <AuthModal
        isOpen={authModalOpen && !showOnboarding}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={(u) => {
          setCurrentUser(u);
          const effectiveId = u ? u.id : "guest-user";
          getSavedPropertyIds(effectiveId).then(ids => setSavedPropertyIds(ids));
        }}
      />

      {/* Onboarding Modal */}
      {showOnboarding && <OnboardingModal />}

      {/* Supabase Config & Schema Helper Modal */}
      <SupabaseConfigModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onConfigSaved={() => {
          setIsSupabaseActive(isSupabaseConfigured());
          loadAllData();
        }}
      />

      {/* About & Info Modal */}
      {aboutModalOpen && (
        <AboutModal 
          onClose={() => setAboutModalOpen(false)} 
          activeSection={aboutModalSection} 
        />
      )}

      {/* Hamburger Drawer */}
      <HamburgerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenSection={(section) => {
          setAboutModalSection(section);
          setAboutModalOpen(true);
        }}
        onNavigateTab={handleTabChange}
      />
      </div>
    </div>
  );
}
