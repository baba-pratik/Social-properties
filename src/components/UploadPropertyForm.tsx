import React, { useState } from "react";
import {
  UploadCloud,
  Sparkles,
  MapPin,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Building,
  Home,
  AlertCircle,
  Loader2,
  Store,
  Map as MapIcon,
  ChevronRight,
  ChevronLeft,
  Camera,
  Video,
  Layers,
  Car,
  PhoneCall,
  Check,
  FileText,
  DollarSign,
  Compass,
  Tractor,
} from "lucide-react";
import { Profile, ListingType, PropertyType, Property, Reel } from "../types/database";
import { LOCALITIES_BY_CITY, PROPERTY_TYPE_LABELS } from "../lib/utils";
import { createProperty, updateProperty, uploadPropertyMedia, createReel, uploadReelVideo } from "../lib/supabase";

interface UploadPropertyFormProps {
  initialData?: Property;
  onPropertyUpdated?: (updated: Property) => void;
  currentUser: Profile | null;
  onOpenAuth: () => void;
  onPropertyCreated: (newProperty: Property) => void;
  onCancel?: () => void;
}

export type UploadContentType = "post" | "reel";

export const UploadPropertyForm: React.FC<UploadPropertyFormProps> = ({
  currentUser,
  onOpenAuth,
  onPropertyCreated,
  onCancel,
  initialData,
  onPropertyUpdated,
}) => {
  const isEditMode = !!initialData;
  const [step, setStep] = useState(1);

  // Content type: Post (images) vs Reel (vertical video)
  const [uploadType, setUploadType] = useState<UploadContentType>(
    initialData?.video_url ? "reel" : "post"
  );

  // Step 1: Type & Classification
  const [listingType, setListingType] = useState<ListingType>(
    initialData?.listing_type || "sale"
  );
  const [propertyType, setPropertyType] = useState<PropertyType>(
    initialData?.property_type || "flat"
  );

  // Step 2: Media
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(
    initialData?.media_urls && initialData.media_urls.length > 0
      ? initialData.media_urls
      : []
  );
  const [videoUrl, setVideoUrl] = useState<string>(initialData?.video_url || "");
  const [reelVideoMeta, setReelVideoMeta] = useState<{ width: number; height: number; fileSize: number; duration: number } | null>(null);
  const [reelUserId, setReelUserId] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // AI Video Script (Reel flow only)
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [videoScript, setVideoScript] = useState("");
  const [scriptGenerated, setScriptGenerated] = useState(false);
  // Dedicated Optional details toggle for both Post and Reel
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);

  // Step 3: Property Details
  const [title, setTitle] = useState(initialData?.title || "");
  const [price, setPrice] = useState<number | "">(initialData?.price ?? "");
  const [isNegotiable, setIsNegotiable] = useState(initialData?.negotiable ?? false);
  const [city, setCity] = useState(initialData?.city || "बोकारो");
  const [locality, setLocality] = useState(initialData?.locality || "सेक्टर 4");
  const [customLocality, setCustomLocality] = useState("");
  const [landmark, setLandmark] = useState(initialData?.landmark || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [contactPreference, setContactPreference] = useState(
    initialData?.contact_preference || "WhatsApp"
  );

  // Dynamic Residential Fields
  const [bedrooms, setBedrooms] = useState<number>(initialData?.bedrooms || 2);
  const [bathrooms, setBathrooms] = useState<number>(initialData?.bathrooms || 2);
  const [balconies, setBalconies] = useState<number>(initialData?.balconies || 1);
  const [carpetArea, setCarpetArea] = useState<number | "">(initialData?.carpet_area || "");
  const [builtUpArea, setBuiltUpArea] = useState<number | "">(initialData?.built_up_area || "");
  const [furnishing, setFurnishing] = useState(initialData?.furnishing || "Semi-Furnished");
  const [floorNumber, setFloorNumber] = useState<number | "">(initialData?.floor_number || "");
  const [totalFloors, setTotalFloors] = useState<number | "">(initialData?.total_floors || "");
  const [parking, setParking] = useState(initialData?.parking || "Yes");
  const [propertyAge, setPropertyAge] = useState(initialData?.property_age || "New");
  const [facing, setFacing] = useState(initialData?.facing || "East");

  // Dynamic Land Fields
  const [plotArea, setPlotArea] = useState<number | "">(initialData?.plot_area || "");
  const [areaUnit, setAreaUnit] = useState(initialData?.area_unit || "sq ft");
  const [roadWidth, setRoadWidth] = useState<number | "">(initialData?.road_width || "");
  const [boundaryWall, setBoundaryWall] = useState(initialData?.boundary_wall ?? false);
  const [landUse, setLandUse] = useState(initialData?.land_use || "Residential");
  const [cornerPlot, setCornerPlot] = useState(initialData?.corner_plot ?? false);
  const [ownershipStatus, setOwnershipStatus] = useState(
    initialData?.ownership_status || "Freehold"
  );

  // Dynamic Commercial Fields
  const [commercialCategory, setCommercialCategory] = useState(
    initialData?.commercial_category || "Retail Shop"
  );
  const [washroom, setWashroom] = useState(initialData?.washroom ?? true);
  const [powerBackup, setPowerBackup] = useState(initialData?.power_backup ?? true);
  const [suitableBusiness, setSuitableBusiness] = useState(
    initialData?.description?.includes("उपयुक्त व्यवसाय:")
      ? initialData.description.split("उपयुक्त व्यवसाय:")[1].trim()
      : ""
  );

  // Form State
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isResidential = ["flat", "house", "villa", "pg"].includes(propertyType);
  const isLand = ["land", "agricultural_land"].includes(propertyType);
  const isCommercial = ["commercial", "office", "shop", "warehouse"].includes(propertyType);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const locs = LOCALITIES_BY_CITY[newCity] || [];
    setLocality(locs[0] || "");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!currentUser) {
      onOpenAuth();
      e.target.value = "";
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Format validation
        if (uploadType === "post" && !file.type.startsWith("image/")) {
          throw new Error("प्रॉपर्टी पोस्ट के लिए केवल फ़ोटो (JPG, PNG, WebP) अपलोड करें।");
        }
        if (uploadType === "reel" && !file.type.startsWith("video/")) {
          throw new Error("रील के लिए केवल वीडियो (MP4, WebM, MOV) अपलोड करें।");
        }

        let url = "";
        let videoMeta: { width: number; height: number; fileSize: number; duration: number } | null = null;

        if (uploadType === "reel" && file.type.startsWith("video/")) {
          // Use dedicated reel upload for videos
          try {
            const meta = await uploadReelVideo(file);
            url = meta.videoUrl;
            videoMeta = {
              width: meta.videoWidth,
              height: meta.videoHeight,
              fileSize: meta.videoFileSize,
              duration: meta.durationSec,
            };
            // Store metadata for later use in handleSubmit
            setReelVideoMeta(videoMeta);
            setReelUserId(meta.userId);
          } catch (reelUploadErr) {
            console.error("Reel video upload failed:", reelUploadErr);
            throw reelUploadErr;
          }
        } else {
          // Use existing property media upload for images
          try {
            url = await uploadPropertyMedia(file);
          } catch (uploadErr) {
            console.warn("uploadPropertyMedia fallback:", uploadErr);
            url = URL.createObjectURL(file);
          }
        }
        setUploadProgress(((i + 1) * 100) / files.length);

        if (uploadType === "reel" || file.type.startsWith("video/")) {
          setVideoUrl(url);
        } else {
          newUrls.push(url);
        }
      }

      if (newUrls.length > 0) {
        setUploadedUrls((prev) => [...prev, ...newUrls]);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMessage(err?.message || "अपलोड में त्रुटि हुई। कृपया दोबारा प्रयास करें।");
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRemoveVideo = () => {
    setVideoUrl("");
    setReelVideoMeta(null);
    setReelUserId(null);
  };

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    setErrorMessage(null);

    const actualLocality = locality === "other" ? customLocality : locality;

    try {
      const res = await fetch("/api/gemini/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || `${bedrooms}BHK ${propertyType} in ${actualLocality}`,
          property_type: propertyType,
          listing_type: listingType,
          price: price || 2500000,
          bedrooms: isLand ? 0 : bedrooms,
          locality: actualLocality,
          city,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "स्क्रिप्ट तैयार करने में त्रुटि हुई।");
      }

      if (data.script) {
        setVideoScript(data.script);
        setScriptGenerated(true);
      }
    } catch (err: any) {
      console.error("AI Script error:", err);
      setErrorMessage(err?.message || "AI स्क्रिप्ट सर्विस उपलब्ध नहीं है।");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const validateStep2 = () => {
    if (uploadType === "post" && uploadedUrls.length === 0) {
      setErrorMessage("कृपया कम से कम एक फ़ोटो अवश्य अपलोड करें।");
      return false;
    }
    if (uploadType === "reel" && !videoUrl) {
      setErrorMessage("कृपया रील के लिए एक वर्टिकल वीडियो अवश्य अपलोड करें।");
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const validateStep3 = () => {
    if (!title.trim()) {
      setErrorMessage("कृपया प्रॉपर्टी का शीर्षक दर्ज करें।");
      return false;
    }
    if (uploadType !== "reel" && (!price || Number(price) <= 0)) {
      setErrorMessage("कृपया सही कीमत दर्ज करें।");
      return false;
    }
    if (locality === "other" && !customLocality.trim()) {
      setErrorMessage("कृपया इलाके का नाम दर्ज करें।");
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (submittingForm) return;

    if (!validateStep3()) return;

    setSubmittingForm(true);
    setErrorMessage(null);

    const actualLocality = locality === "other" ? customLocality.trim() : locality;
    
    // For Reel: use defaults for hidden fields
    const isReel = uploadType === "reel";

    if (isReel) {
      // Reel submission - use dedicated reels table
      if (!videoUrl) {
        setErrorMessage("कृपया रील के लिए एक वर्टिकल वीडियो अवश्य अपलोड करें।");
        setSubmittingForm(false);
        return;
      }

      const reelPayload = {
        title: title.trim(),
        description: description.trim() || `${title} ${actualLocality}, ${city} में स्थित है।`,
        video_url: videoUrl,
        video_width: reelVideoMeta?.width,
        video_height: reelVideoMeta?.height,
        video_file_size: reelVideoMeta?.fileSize,
        duration_sec: reelVideoMeta?.duration,
        city,
        locality: actualLocality,
        landmark: landmark.trim() || undefined,
        contact_preference: contactPreference,
        userId: reelUserId || "",
      };

      try {
        const created = await createReel(reelPayload);
        if (created) {
          // Notify global realtime event
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("social-properties-realtime", {
                detail: { event: "reel-added", property: created },
              })
            );
          }
          setFormSuccess(true);
          setTimeout(() => {
            // Convert Reel to Property-like object for compatibility with onPropertyCreated
            const reelAsProperty = {
              ...created,
              id: created.id,
              author_id: created.author_id,
              author: created.author,
              title: created.title,
              description: created.description,
              price: 0,
              listing_type: "sale" as const,
              property_type: "flat" as const,
              bedrooms: 0,
              bathrooms: 0,
              address: created.locality,
              locality: created.locality,
              city: created.city,
              lat: city === "गिरिडीह" ? 24.1852 : 23.6693,
              lng: city === "गिरिडीह" ? 86.3054 : 86.1511,
              video_url: created.video_url,
              media_urls: [created.video_url],
              status: "active" as const,
              views_count: created.views_count,
              likes_count: created.likes_count,
              comments_count: created.comments_count,
              created_at: created.created_at,
              updated_at: created.updated_at,
            } as Property;
            onPropertyCreated(reelAsProperty);
          }, 1200);
        }
      } catch (err: any) {
        console.error("Submit reel error:", err);
        setErrorMessage(err?.message || "रील सेव करने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
      } finally {
        setSubmittingForm(false);
      }
      return;
    }

    // Post submission - existing property flow
    const effectiveListingType = listingType;
    const effectivePropertyType = propertyType;
    const effectivePrice = Number(price);
    const effectiveNegotiable = isNegotiable;
    const effectiveAddress = address.trim() || actualLocality;
    const effectiveDescription = description.trim() || 
      `${title} ${actualLocality}, ${city} में स्थित है।`;

    // Ensure fallback images if empty
    let mediaUrlsToSave = uploadedUrls.length > 0 ? uploadedUrls : [];
    if (mediaUrlsToSave.length === 0) {
      mediaUrlsToSave = [
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
      ];
    }

    const propertyPayload: any = {
      author_id: currentUser.id,
      title: title.trim(),
      description: effectiveDescription,
      price: effectivePrice,
      listing_type: effectiveListingType,
      property_type: effectivePropertyType,
      bedrooms: 0,
      bathrooms: 0,
      address: effectiveAddress,
      locality: actualLocality,
      city,
      lat: city === "गिरिडीह" ? 24.1852 : 23.6693,
      lng: city === "गिरिडीह" ? 86.3054 : 86.1511,
      video_url: videoUrl || null,
      media_urls: mediaUrlsToSave,
      status: "active",
      negotiable: effectiveNegotiable,
      contact_preference: contactPreference,
    };

    // Set optional details: Landmark for both Post and Reel
    if (landmark.trim()) {
      propertyPayload.landmark = landmark.trim();
    }

    // Only set additional optional details for Post (not Reel)
    if (showOptionalDetails) {
      if (isResidential) {
        propertyPayload.bedrooms = Number(bedrooms) || 0;
        propertyPayload.bathrooms = Number(bathrooms) || 0;
        if (balconies) propertyPayload.balconies = Number(balconies);
        if (carpetArea && Number(carpetArea) > 0) propertyPayload.carpet_area = Number(carpetArea);
        if (builtUpArea && Number(builtUpArea) > 0) propertyPayload.built_up_area = Number(builtUpArea);
        if (floorNumber !== "" && floorNumber !== undefined && floorNumber !== null) {
          propertyPayload.floor_number = Number(floorNumber);
        }
        if (totalFloors !== "" && totalFloors !== undefined && totalFloors !== null) {
          propertyPayload.total_floors = Number(totalFloors);
        }
        if (furnishing) propertyPayload.furnishing = furnishing;
        if (parking) propertyPayload.parking = parking;
        if (propertyAge) propertyPayload.property_age = propertyAge;
        if (facing) propertyPayload.facing = facing;
      }
      
      if (isLand) {
        propertyPayload.bedrooms = 0;
        propertyPayload.bathrooms = 0;
        if (plotArea && Number(plotArea) > 0) propertyPayload.plot_area = Number(plotArea);
        if (areaUnit) propertyPayload.area_unit = areaUnit;
        if (roadWidth && Number(roadWidth) > 0) propertyPayload.road_width = Number(roadWidth);
        propertyPayload.boundary_wall = boundaryWall;
        if (landUse) propertyPayload.land_use = landUse;
        propertyPayload.corner_plot = cornerPlot;
        if (ownershipStatus) propertyPayload.ownership_status = ownershipStatus;
      } else if (isCommercial) {
        propertyPayload.bedrooms = 0;
        propertyPayload.bathrooms = 0;
        if (commercialCategory) propertyPayload.commercial_category = commercialCategory;
        if (carpetArea && Number(carpetArea) > 0) propertyPayload.carpet_area = Number(carpetArea);
        if (floorNumber !== "" && floorNumber !== undefined && floorNumber !== null) {
          propertyPayload.floor_number = Number(floorNumber);
        }
        propertyPayload.washroom = washroom;
        propertyPayload.power_backup = powerBackup;
        if (parking) propertyPayload.parking = parking;
        if (furnishing) propertyPayload.furnishing = furnishing;
      }
    } else {
      // Set missing optional fields to null or safe default values for Post without optional details
      propertyPayload.bedrooms = 0;
      propertyPayload.bathrooms = 0;
      propertyPayload.balconies = null;
      propertyPayload.carpet_area = null;
      propertyPayload.built_up_area = null;
      propertyPayload.floor_number = null;
      propertyPayload.total_floors = null;
      propertyPayload.plot_area = null;
      propertyPayload.road_width = null;
      propertyPayload.boundary_wall = null;
      propertyPayload.corner_plot = null;
      propertyPayload.landmark = null;
    }

    try {
      if (isEditMode && initialData) {
        const updated = await updateProperty(initialData.id, propertyPayload);
        setFormSuccess(true);
        setTimeout(() => {
          if (onPropertyUpdated && updated) {
            onPropertyUpdated(updated);
          } else if (updated) {
            onPropertyCreated(updated);
          }
        }, 1200);
      } else {
        const created = await createProperty(propertyPayload);
        if (created) {
          // Notify global realtime event
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("social-properties-realtime", {
                detail: { event: "property-added", property: created },
              })
            );
          }
          setFormSuccess(true);
          setTimeout(() => {
            onPropertyCreated(created);
          }, 1200);
        }
      }
    } catch (err: any) {
      console.error("Submit property error:", err);
      setErrorMessage(err?.message || "प्रॉपर्टी सेव करने में त्रुटि हुई। कृपया पुनः प्रयास करें।");
    } finally {
      setSubmittingForm(false);
    }
  };

  if (formSuccess) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          {isEditMode ? "प्रॉपर्टी अपडेट हो गई!" : "बधाई हो! आपकी लिस्टिंग लाइव है"}
        </h2>
        <p className="text-slate-600 text-base">
          {uploadType === "reel"
            ? "आपकी रील वीडियो होम फीड और रील सेक्शन में दिखाई देगी।"
            : "आपकी प्रॉपर्टी पोस्ट सोशल फीड पर सफलतापूर्वक प्रकाशित हो गई है।"}
        </p>
        <div className="p-3 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-2xl">
          रीडायरेक्ट किया जा रहा है...
        </div>
      </div>
    );
  }

  const availableLocalities = LOCALITIES_BY_CITY[city] || [];

  return (
    <div className="flex-1 overflow-y-auto w-full max-w-full overflow-x-hidden">
      <div className="max-w-2xl mx-auto py-2 sm:py-4 px-2.5 sm:px-6 pb-32 w-full max-w-full">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[70vh] flex flex-col relative w-full">
          
          {/* Top Progress & Header */}
          <div className="bg-white border-b border-slate-100 p-3.5 sm:p-4 sticky top-0 z-20 flex flex-col gap-3">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 flex-1 mr-4">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                      s <= step ? "bg-emerald-500" : "bg-slate-100"
                    }`}
                  />
                ))}
              </div>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-slate-400 hover:text-slate-700 text-sm font-bold bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full transition-colors"
                >
                  रद्द करें
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  स्टेप {step} का 3
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {step === 1 && "अपलोड का प्रकार व श्रेणी"}
                  {step === 2 && (uploadType === "post" ? "तस्वीरें अपलोड करें" : "रील वीडियो अपलोड करें")}
                  {step === 3 && "प्रॉपर्टी का विवरण"}
                </h1>
              </div>

              {/* Step indicator label */}
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                {uploadType === "post" ? "📷 फ़ोटो पोस्ट" : "🎬 रील"}
              </span>
            </div>
          </div>

          <div className="flex-1 p-5 sm:p-8 overflow-y-auto">
            {errorMessage && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ================= STEP 1: Content Type & Property Category ================= */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in duration-300">
                
                {/* 1. Content Type Selector: Post vs Reel */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700">
                    अपलोड का प्रकार चुनें (Content Type) *
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadType("post");
                        setVideoUrl("");
                        setReelVideoMeta(null);
                        setReelUserId(null);
                      }}
                      className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-base transition-all ${
                        uploadType === "post"
                          ? "bg-white text-emerald-700 shadow-md scale-[1.01]"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <ImageIcon className="w-5 h-5" />
                      <span>प्रॉपर्टी पोस्ट</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUploadType("reel");
                        setUploadedUrls([]);
                        setReelVideoMeta(null);
                        setReelUserId(null);
                      }}
                      className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold text-base transition-all ${
                        uploadType === "reel"
                          ? "bg-white text-emerald-700 shadow-md scale-[1.01]"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Video className="w-5 h-5 text-rose-500" />
                      <span>रील / वीडियो</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 px-1">
                    {uploadType === "post"
                      ? "• प्रॉपर्टी पोस्ट: एक या अधिक उच्च गुणवत्ता वाली तस्वीरें जोड़ें।"
                      : "• रील / वीडियो: 30-60 सेकंड का वर्टिकल वॉकथ्रू वीडियो जोड़ें।"}
                  </p>
                </div>

                {/* 2. Listing Type: Rent vs Sale (Hidden for Reel) */}
                {uploadType !== "reel" && (
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">
                      प्रॉपर्टी का उद्देश्य *
                    </label>
                    <div className="flex gap-3">
                      {[
                        { id: "sale", label: "बिक्री (Sale)" },
                        { id: "rent", label: "किराया (Rent)" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setListingType(item.id as ListingType)}
                          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm sm:text-base border-2 transition-all ${
                            listingType === item.id
                              ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Property Type Selection (Hidden for Reel) */}
                {uploadType !== "reel" && (
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">
                      प्रॉपर्टी श्रेणी चुनें *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { id: "flat", label: "फ्लैट / अपार्टमेंट", icon: Building },
                        { id: "house", label: "स्वतंत्र मकान", icon: Home },
                        { id: "villa", label: "विला (Villa)", icon: Home },
                        { id: "land", label: "प्लॉट / आवासीय ज़मीन", icon: MapIcon },
                        { id: "agricultural_land", label: "कृषि भूमि / खेत", icon: Tractor },
                        { id: "commercial", label: "कमर्शियल शॉप / ऑफिस", icon: Store },
                      ].map((t) => {
                        const Icon = t.icon;
                        const isSelected = propertyType === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setPropertyType(t.id as PropertyType)}
                            className={`cursor-pointer rounded-2xl p-4 border-2 flex flex-col items-center text-center gap-2 transition-all ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm scale-[1.02]"
                                : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-slate-50"
                            }`}
                          >
                            <Icon className={`w-7 h-7 ${isSelected ? "text-emerald-600" : "text-slate-400"}`} />
                            <span className="font-bold text-xs sm:text-sm">{t.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ================= STEP 2: Media Upload ================= */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* Notice for Post vs Reel */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 font-medium">
                  {uploadType === "post" ? (
                    <>
                      <ImageIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>प्रॉपर्टी पोस्ट में तस्वीरें जोड़ें। खरीदार तस्वीरें स्वाइप करके देख सकते हैं।</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-5 h-5 text-rose-500 shrink-0" />
                      <span>रील में 9:16 वर्टिकल वीडियो अपलोड करें। यह सीधे इंस्टाग्राम/टिकटॉक की तरह होम फीड पर दिखेगी।</span>
                    </>
                  )}
                </div>

                {/* Upload Box */}
                <div>
                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/60 rounded-3xl p-6 text-center transition-colors relative overflow-hidden">
                    <input
                      type="file"
                      multiple={uploadType === "post"}
                      accept={
                        uploadType === "post"
                          ? "image/jpeg,image/png,image/webp,image/jpg"
                          : "video/mp4,video/webm,video/quicktime,video/*"
                      }
                      onChange={handleFileUpload}
                      disabled={uploadingMedia}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center min-h-[140px] pointer-events-none w-full">
                      {uploadingMedia ? (
                        <div className="w-full flex flex-col items-center justify-center px-4">
                          <Loader2 className="w-9 h-9 text-emerald-500 animate-spin mb-3" />
                          <span className="text-base font-bold text-slate-800 mb-2">
                            अपलोड हो रहा है... {Math.round(uploadProgress)}%
                          </span>
                          <div className="w-full max-w-xs h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          {uploadType === "post" ? (
                            <Camera className="w-10 h-10 text-emerald-600 mb-2" />
                          ) : (
                            <Video className="w-10 h-10 text-rose-500 mb-2" />
                          )}
                          <span className="text-base font-bold text-slate-800">
                            {uploadType === "post"
                              ? "तस्वीरें चुनने के लिए टैप करें"
                              : "वर्टिकल वीडियो चुनने के लिए टैप करें"}
                          </span>
                          <span className="text-xs text-slate-400 mt-1">
                            {uploadType === "post"
                              ? "JPG, PNG, WebP (एक या एक से अधिक)"
                              : "MP4, WebM, MOV (9:16 आस्पेक्ट रेशियो)"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Previews */}
                {uploadType === "post" && uploadedUrls.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>अपलोड की गई तस्वीरें ({uploadedUrls.length})</span>
                      <span className="text-slate-400">हटाने के लिए ट्रैश आइकन दबाएँ</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {uploadedUrls.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100"
                        >
                          <img
                            src={url}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {idx === 0 && (
                            <span className="absolute bottom-1.5 left-1.5 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                              कवर
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadType === "reel" && videoUrl && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-600">वीडियो प्रीव्यू</span>
                    <div className="relative w-48 h-72 mx-auto rounded-2xl overflow-hidden bg-black border border-slate-300 shadow-md">
                      <video
                        src={videoUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="absolute top-2 right-2 p-2 bg-rose-600 text-white rounded-xl shadow-md hover:bg-rose-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ================= STEP 3: Detailed Form ================= */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">

                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    प्रॉपर्टी का आकर्षक शीर्षक (Title) *
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: सेक्टर 4 में शानदार 2BHK बालकनी युक्त फ्लैट..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3.5 text-base border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Price & Negotiable (Hidden for Reel) */}
                {uploadType !== "reel" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        {listingType === "rent" ? "किराया प्रतिमाह (₹) *" : "कुल कीमत (₹) *"}
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-base">₹</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          min="1"
                          value={price}
                          onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : "")}
                          className="w-full pl-9 pr-4 py-3.5 text-base font-bold border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex items-center sm:pt-6">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isNegotiable}
                          onChange={(e) => setIsNegotiable(e.target.checked)}
                          className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="text-sm font-bold text-slate-700">
                          कीमत नेगोशिएबल (मोलभाव संभव)
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* City & Locality */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">शहर *</label>
                    <select
                      value={city}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full px-4 py-3.5 text-base font-bold border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:outline-none bg-white"
                    >
                      <option value="बोकारो">बोकारो</option>
                      <option value="गिरिडीह">गिरिडीह</option>
                      <option value="अन्य">अन्य</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">इलाका / सेक्टर *</label>
                    <select
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      className="w-full px-4 py-3.5 text-base font-bold border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:outline-none bg-white"
                    >
                      {availableLocalities.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                      <option value="other">अन्य इलाका...</option>
                    </select>
                  </div>
                </div>

                {locality === "other" && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      इलाके का नाम लिखें *
                    </label>
                    <input
                      type="text"
                      placeholder="उदा: कोऑपरेटिव कॉलोनी, सेक्टर 12..."
                      value={customLocality}
                      onChange={(e) => setCustomLocality(e.target.value)}
                      className="w-full px-4 py-3.5 text-base border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition-colors"
                    />
                  </div>
                )}

                {/* Description (Multiline Textarea - Optional) */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    संक्षिप्त विवरण (Description - वैकल्पिक)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="प्रॉपर्टी के बारे में मुख्य बातें लिखें (जैसे पानी, बिजली, रास्ता, नजदीकी बाजार आदि)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3.5 text-sm border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Contact Preference */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    संपर्क प्राथमिकता (Contact Preference)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["WhatsApp", "Phone Call", "In-App Chat"].map((pref) => (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => setContactPreference(pref)}
                        className={`py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all ${
                          contactPreference === pref
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {pref === "WhatsApp" && "व्हाट्सएप"}
                        {pref === "Phone Call" && "फ़ोन कॉल"}
                        {pref === "In-App Chat" && "ऐप चैट"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Landmark (for both Post and Reel) */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    नजदीकी लैंडमार्क (वैकल्पिक)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा: राम मंदिर के पास, डीपीएस स्कूल..."
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full px-4 py-3.5 text-base border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* DEDICATED OPTIONAL DETAILS TOGGLE BUTTON & FUNCTION (Hidden for Reel) */}
                {uploadType !== "reel" && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowOptionalDetails(!showOptionalDetails)}
                      className={`w-full py-3.5 px-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer font-bold text-sm ${
                        showOptionalDetails
                          ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100/90 border-dashed border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 text-left">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-base transition-colors ${
                            showOptionalDetails
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {showOptionalDetails ? "−" : "+"}
                        </div>
                        <div>
                          <p className="leading-tight text-sm font-bold">
                            {showOptionalDetails
                              ? "अतिरिक्त प्रॉपर्टी विवरण छुपाएं"
                              : "अतिरिक्त प्रॉपर्टी विवरण जोड़ें (वैकल्पिक)"}
                          </p>
                          <p className="text-[11px] font-normal text-slate-500">
                            {isLand
                              ? "खेत/प्लॉट साइज, रास्ता, बाउंड्री, लैंडमार्क आदि (BHK नहीं)"
                              : isCommercial
                              ? "दुकान/ऑफिस साइज, फ्लोर, वॉशरूम, लैंडमार्क आदि"
                              : "BHK, बाथरूम, एरिया, फर्निशिंग, फ्लोर, लैंडमार्क आदि"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 shrink-0 ml-2">
                        {showOptionalDetails ? "छुपाएं ▲" : "खोलें ▼"}
                      </span>
                    </button>
                  </div>
                )}

                {/* EXPANDABLE OPTIONAL DETAILS SECTION (Hidden for Reel) */}
                {uploadType !== "reel" && showOptionalDetails && (
                  <div className="space-y-5 pt-1 animate-in fade-in duration-200">
                    {/* Full Address (only for Post) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        विस्तृत पता (Address - वैकल्पिक)
                      </label>
                      <input
                        type="text"
                        placeholder="फ्लैट/मकान/प्लॉट संख्या, स्ट्रीट..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3.5 py-3 text-sm border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* DYNAMIC FIELDS: RESIDENTIAL (Only Flat, House, Villa - NOT Land/Field!) */}
                    {isResidential && (
                      <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                            आवासीय प्रॉपर्टी विवरण (वैकल्पिक)
                          </h3>
                          <span className="text-[11px] text-slate-400 font-medium">वैकल्पिक</span>
                        </div>

                        {/* Bedrooms BHK */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-2">
                            बेडरूम (BHK) (वैकल्पिक)
                          </label>
                          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                            {[1, 2, 3, 4, 5].map((bhk) => (
                              <button
                                key={bhk}
                                type="button"
                                onClick={() => setBedrooms(bhk)}
                                className={`py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm border-2 transition-colors cursor-pointer text-center ${
                                  bedrooms === bhk
                                    ? "border-emerald-500 bg-white text-emerald-700 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                }`}
                              >
                                {bhk} BHK
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Bathrooms & Balconies */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">बाथरूम</label>
                            <select
                              value={bathrooms}
                              onChange={(e) => setBathrooms(Number(e.target.value))}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">बालकनी संख्या</label>
                            <select
                              value={balconies}
                              onChange={(e) => setBalconies(Number(e.target.value))}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            >
                              {[0, 1, 2, 3, 4].map((n) => (
                                <option key={n} value={n}>{n === 0 ? "कोई नहीं" : `${n} बालकनी`}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Carpet Area & Built-up Area */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              कारपेट एरिया (वर्ग फीट)
                            </label>
                            <input
                              type="number"
                              placeholder="उदा: 950"
                              value={carpetArea}
                              onChange={(e) => setCarpetArea(e.target.value ? Number(e.target.value) : "")}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              बिल्ट-अप एरिया (वर्ग फीट)
                            </label>
                            <input
                              type="number"
                              placeholder="उदा: 1200"
                              value={builtUpArea}
                              onChange={(e) => setBuiltUpArea(e.target.value ? Number(e.target.value) : "")}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            />
                          </div>
                        </div>

                        {/* Furnishing & Parking */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">फर्निशिंग स्थिति</label>
                            <select
                              value={furnishing}
                              onChange={(e) => setFurnishing(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            >
                              <option value="Unfurnished">अनफर्निश्ड (खाली)</option>
                              <option value="Semi-Furnished">सेमी-फर्निश्ड</option>
                              <option value="Fully Furnished">फुल्ली फर्निश्ड</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">पार्किंग</label>
                            <select
                              value={parking}
                              onChange={(e) => setParking(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            >
                              <option value="Yes">कवर्ड / सुरक्षित पार्किंग</option>
                              <option value="Open">ओपन पार्किंग</option>
                              <option value="No">उपलब्ध नहीं</option>
                            </select>
                          </div>
                        </div>

                        {/* Floor & Total Floors */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">फ्लोर नंबर</label>
                            <input
                              type="number"
                              placeholder="उदा: 3"
                              value={floorNumber}
                              onChange={(e) => setFloorNumber(e.target.value ? Number(e.target.value) : "")}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">कुल मंजिलें</label>
                            <input
                              type="number"
                              placeholder="उदा: 5"
                              value={totalFloors}
                              onChange={(e) => setTotalFloors(e.target.value ? Number(e.target.value) : "")}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC FIELDS: PLOT / LAND / FIELD (NO BHK EVER!) */}
                    {isLand && (
                      <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                            खेत / प्लॉट / ज़मीन का विवरण (वैकल्पिक)
                          </h3>
                          <span className="text-[11px] text-slate-400 font-medium">वैकल्पिक</span>
                        </div>

                        {/* Plot Area & Unit */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              एरिया (Area Size)
                            </label>
                            <input
                              type="number"
                              placeholder="उदा: 1800"
                              value={plotArea}
                              onChange={(e) => setPlotArea(e.target.value ? Number(e.target.value) : "")}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">इकाई (Unit)</label>
                            <select
                              value={areaUnit}
                              onChange={(e) => setAreaUnit(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            >
                              <option value="sq ft">वर्ग फीट (Sq Ft)</option>
                              <option value="katha">कट्ठा (Katha)</option>
                              <option value="acre">एकड़ (Acre)</option>
                              <option value="decimal">डिसमिल (Decimal)</option>
                            </select>
                          </div>
                        </div>

                        {/* Road Width & Land Use */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              सड़क / रास्ते की चौड़ाई (फीट)
                            </label>
                            <input
                              type="number"
                              placeholder="उदा: 25 फीट"
                              value={roadWidth}
                              onChange={(e) => setRoadWidth(e.target.value ? Number(e.target.value) : "")}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">भूमि उपयोग</label>
                            <select
                              value={landUse}
                              onChange={(e) => setLandUse(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            >
                              <option value="Agricultural">कृषि (Agricultural / खेत)</option>
                              <option value="Residential">आवासीय (Residential)</option>
                              <option value="Commercial">कमर्शियल (Commercial)</option>
                              <option value="Mixed">मिश्रित (Mixed)</option>
                            </select>
                          </div>
                        </div>

                        {/* Checkboxes: Boundary Wall & Corner Plot */}
                        <div className="flex flex-wrap gap-4 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={boundaryWall}
                              onChange={(e) => setBoundaryWall(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                            />
                            <span>चारदीवारी / बाउंड्री वॉल मौजूद है</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={cornerPlot}
                              onChange={(e) => setCornerPlot(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                            />
                            <span>कॉर्नर प्लॉट (Corner Plot)</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC FIELDS: COMMERCIAL */}
                    {isCommercial && (
                      <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                        <h3 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                          कमर्शियल प्रॉपर्टी विवरण (वैकल्पिक)
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              कमर्शियल श्रेणी
                            </label>
                            <select
                              value={commercialCategory}
                              onChange={(e) => setCommercialCategory(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            >
                              <option value="Retail Shop">दुकान (Retail Shop)</option>
                              <option value="Office Space">ऑफिस स्पेस (Office Space)</option>
                              <option value="Showroom">शोरूम (Showroom)</option>
                              <option value="Warehouse">गोदाम / वेयरहाउस</option>
                              <option value="Other">अन्य</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              कारपेट एरिया (वर्ग फीट)
                            </label>
                            <input
                              type="number"
                              placeholder="उदा: 500"
                              value={carpetArea}
                              onChange={(e) => setCarpetArea(e.target.value ? Number(e.target.value) : "")}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">मंजिल (Floor)</label>
                            <input
                              type="number"
                              placeholder="उदा: 1, 2"
                              value={floorNumber}
                              onChange={(e) => setFloorNumber(e.target.value ? Number(e.target.value) : "")}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">पार्किंग</label>
                            <select
                              value={parking}
                              onChange={(e) => setParking(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            >
                              <option value="Yes">कवर्ड पार्किंग</option>
                              <option value="Open">ओपन पार्किंग</option>
                              <option value="No">उपलब्ध नहीं</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">फर्निशिंग स्थिति</label>
                            <select
                              value={furnishing}
                              onChange={(e) => setFurnishing(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            >
                              <option value="Unfurnished">अनफर्निश्ड (खाली)</option>
                              <option value="Semi-Furnished">सेमी-फर्निश्ड</option>
                              <option value="Fully Furnished">फुल्ली फर्निश्ड</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">उपयुक्त व्यवसाय टाइप</label>
                            <input
                              type="text"
                              placeholder="उदा: रेस्टोरेंट, कपड़े की दुकान, बैंक..."
                              value={suitableBusiness}
                              onChange={(e) => setSuitableBusiness(e.target.value)}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-1">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={washroom}
                              onChange={(e) => setWashroom(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                            />
                            <span>वॉशरूम उपलब्ध</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={powerBackup}
                              onChange={(e) => setPowerBackup(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                            />
                            <span>पावर बैकअप उपलब्ध</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Footer Navigation Bar */}
          <div className="bg-white border-t border-slate-100 p-3.5 sm:p-6 sticky bottom-0 z-20 flex gap-2.5 sm:gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep(step - 1);
                }}
                className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base rounded-2xl transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>पीछे</span>
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 2 && !validateStep2()) return;
                  setErrorMessage(null);
                  setStep(step + 1);
                }}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                <span>आगे बढ़ें</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submittingForm || uploadingMedia}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingForm ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>लाइव किया जा रहा है...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    <span>{isEditMode ? "अपडेट सुरक्षित करें" : "प्रॉपर्टी लाइव करें"}</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
