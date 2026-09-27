import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Building, MapPin, Phone, CheckCircle2, Paperclip, Image as ImageIcon, Clock, Sparkles, ArrowLeft } from "lucide-react";
import { Conversation, Message, Profile, Property } from "../types/database";
import { formatPrice, formatRelativeTime, ROLE_LABELS } from "../lib/utils";

import { uploadPropertyMedia, sendMessage, fetchUserConversations, fetchConversationMessages, getSupabaseClient, markMessagesAsRead, getUnreadCounts } from "../lib/supabase";
import { unstable_batchedUpdates } from "react-dom";

interface RealtimeChatProps {
  currentUser: Profile | null;
  initialConversationId?: string | null;
  onOpenAuth: () => void;
  onSelectProperty: (property: Property) => void;
}

export const RealtimeChat: React.FC<RealtimeChatProps> = ({
  currentUser,
  initialConversationId,
  onOpenAuth,
  onSelectProperty,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(initialConversationId));
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations + subscribe to conversation changes (channel depends only on auth to avoid churn)
  useEffect(() => {
    if (!currentUser) return;

    const refreshUnread = async () => {
      const counts = await getUnreadCounts(currentUser.id);
      setUnreadCounts(counts);
    };

    const loadConversations = async () => {
      const list = await fetchUserConversations(currentUser.id);
      unstable_batchedUpdates(() => {
        setConversations(list);
        setActiveConversationId((prev) => prev ?? (list.length > 0 ? list[0].id : null));
      });
      refreshUnread();
    };

    loadConversations();

    const c = getSupabaseClient();
    if (!c) return;
    const convChannel = c.channel('conversations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => {
        loadConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      c.removeChannel(convChannel);
    };
  }, [currentUser]);

  // Load messages whenever active conversation changes; mark incoming messages as read
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    
    const loadMessages = async () => {
      const list = await fetchConversationMessages(activeConversationId);
      unstable_batchedUpdates(() => {
        setMessages(list);
      });
      scrollToBottom();

      // Mark incoming (non-own) unread messages as read when the conversation is opened
      if (currentUser && list.some((m) => m.sender_id !== currentUser.id && !m.is_read)) {
        await markMessagesAsRead(activeConversationId, currentUser.id);
        setUnreadCounts((prev) => ({ ...prev, [activeConversationId]: 0 }));
        unstable_batchedUpdates(() => {
          setMessages((prev) =>
            prev.map((m) => (m.sender_id === currentUser.id ? m : { ...m, is_read: true }))
          );
        });
      }
    };
    
    loadMessages();

    const c = getSupabaseClient();
    if (!c) return;
    const msgChannel = c.channel(`messages-${activeConversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${activeConversationId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        unstable_batchedUpdates(() => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        });
        scrollToBottom();

        // Viewer is looking at this conversation: mark the incoming message read immediately
        if (currentUser && newMessage.sender_id !== currentUser.id) {
          markMessagesAsRead(activeConversationId, currentUser.id);
          setUnreadCounts((prev) => ({ ...prev, [activeConversationId]: 0 }));
          unstable_batchedUpdates(() => {
            setMessages((prev) =>
              prev.map((m) => (m.id === newMessage.id ? { ...m, is_read: true } : m))
            );
          });
        }
      })
      .subscribe();

    return () => {
      c.removeChannel(msgChannel);
    };
  }, [activeConversationId, currentUser]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !activeConversationId || !currentUser) return;

    setSending(true);
    try {
      const sent = await sendMessage(activeConversationId, currentUser.id, text.trim());

      setInputText("");

    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      const list = await fetchUserConversations(currentUser.id);
      setConversations(list);
      setSending(false);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    handleSend(promptText);
  };

  // Image attachment
  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId || !currentUser) return;

    try {
      const mediaUrl = await uploadPropertyMedia(file);
      await sendMessage(
        activeConversationId,
        currentUser.id,
        "तस्वीर साझा की गई",
        mediaUrl
      );

      const list = await fetchConversationMessages(activeConversationId);
      setMessages(list);
    } catch (err) {
      console.error("Attach error:", err);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <MessageSquare className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">रियल-टाइम चैट के लिए लॉगिन आवश्यक है</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          बोकारो और गिरिडीह के संपत्ति मालिकों व खरीदारों के साथ सीधे बात करने के लिए अपना खाता चुनें।
        </p>
        <button
          onClick={onOpenAuth}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          लॉगिन / साइन-अप करें
        </button>
      </div>
    );
  }

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const otherProfile =
    activeConv?.participant_1 === currentUser.id
      ? activeConv?.participant_2_profile
      : activeConv?.participant_1_profile;

  const quickPrompts = [
    "क्या यह प्रॉपर्टी अभी उपलब्ध है?",
    "क्या कीमत में कुछ बातचीत संभव है?",
    "कल दोपहर में साइट विजिट का समय तय करें?",
    "क्या 24x7 बिजली और पानी की सुविधा है?",
  ];

  return (
    <div className="w-full mx-auto py-4 px-3 lg:px-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden h-[80vh] flex flex-col md:flex-row lg:grid lg:grid-cols-[280px_1fr]">
        {/* Left Sidebar: Conversations List */}
        <div
          className={`w-full md:w-1/3 lg:w-auto lg:col-span-1 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0 ${
            mobileShowChat ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <span>सीधी चैट एवं पूछताछ ({conversations.length})</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              स्थानीय खरीदारों और मालिकों के बीच सीधा संपर्क
            </p>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <Building className="w-8 h-8 mx-auto opacity-40" />
                <p>अभी कोई सक्रिय चैट नहीं है।</p>
                <p className="text-[11px]">
                  फीड से किसी भी प्रॉपर्टी पर &ldquo;मालिक से चैट करें&rdquo; बटन दबाकर बातचीत शुरू करें।
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const partner =
                  conv.participant_1 === currentUser.id
                    ? conv.participant_2_profile
                    : conv.participant_1_profile;
                const isActive = conv.id === activeConversationId;

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setMobileShowChat(true);
                    }}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors min-h-[44px] ${
                      isActive
                        ? "bg-emerald-50/80 border-r-4 border-emerald-600"
                        : "hover:bg-slate-100/70"
                    }`}
                  >
                    {partner?.avatar_url ? (
                      <img
                        src={partner.avatar_url}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-slate-200">
                        {partner?.full_name?.charAt(0) || "U"}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate flex items-center gap-1">
                          {partner?.full_name || "उपयोगकर्ता"}
                          {partner?.is_verified_broker && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          {(unreadCounts[conv.id] || 0) > 0 && (
                            <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                              {unreadCounts[conv.id]}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeTime(conv.last_message_at)}
                          </span>
                        </span>
                      </div>

                      {conv.property && (
                        <div className="text-[11px] font-semibold text-emerald-700 truncate mb-1">
                          📍 {conv.property.title}
                        </div>
                      )}

                      <p className="text-xs text-slate-500 truncate">
                        {conv.last_message || "बातचीत शुरू की गई"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Room */}
        <div
          className={`flex-1 w-full md:w-2/3 lg:w-auto lg:col-span-1 flex flex-col bg-slate-50 min-w-0 pb-[env(safe-area-inset-bottom)] ${
            mobileShowChat ? "flex" : "hidden md:flex"
          }`}
        >
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setMobileShowChat(false)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {otherProfile?.avatar_url ? (
                    <img
                      src={otherProfile.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-emerald-500"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-emerald-500">
                      {otherProfile?.full_name?.charAt(0) || "U"}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {otherProfile?.full_name || "उपयोगकर्ता"}
                      </span>
                      {otherProfile?.is_verified_broker && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3" /> सत्यापित ब्रोकर
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span>{otherProfile?.city}</span>
                    </div>
                  </div>
                </div>

                {/* Property Quick Glance */}
                {activeConv.property && (
                  <div
                    onClick={() => onSelectProperty(activeConv.property!)}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50 transition-colors cursor-pointer text-xs"
                    title="प्रॉपर्टी विवरण देखें"
                  >
                    <img
                      src={activeConv.property.media_urls?.[0]}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                    <div className="text-left">
                      <div className="font-bold text-slate-800 truncate max-w-44">
                        {activeConv.property.title}
                      </div>
                      <div className="text-emerald-700 font-extrabold text-[11px]">
                        {formatPrice(activeConv.property.price, activeConv.property.listing_type)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-4">
                <div className="text-center my-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-200/60 px-2.5 py-1 rounded-full">
                    सुरक्षित रियल-टाइम हाइपरलोकल चैट
                  </span>
                </div>

                {messages.map((msg) => {
                  const isMine = msg.sender_id === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md rounded-2xl p-2.5 text-xs sm:text-sm shadow-xs relative ${
                          isMine
                            ? "bg-green-500 text-white rounded-tr-sm"
                            : "bg-gray-100 text-black border border-slate-200/80 rounded-tl-sm"
                        }`}
                      >
                        {msg.media_url && (
                          <img
                            src={msg.media_url}
                            alt=""
                            className="rounded-xl mb-2 max-h-56 w-full object-cover"
                          />
                        )}
                        <div className="whitespace-pre-line leading-relaxed pb-3 pr-8">{msg.text}</div>
                        <span className={`text-[10px] absolute bottom-1.5 right-2.5 ${isMine ? 'text-green-100' : 'text-gray-500'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts */}
              <div className="px-4 py-2 bg-white/80 border-t border-slate-200/60 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 font-medium whitespace-nowrap transition-colors text-[11px] cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]"
              >
                <label className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
                  <ImageIcon className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageAttach}
                    className="hidden"
                  />
                </label>

                <input
                  type="text"
                  placeholder="संदेश लिखें (जैसे: क्या आज मुलाकात संभव है?)..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-3 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                />

                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="min-h-[44px] min-w-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">भेजें</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-12 h-12 opacity-30" />
              <p className="text-sm font-semibold text-slate-700">कोई चैट चयनित नहीं है</p>
              <p className="text-xs max-w-xs">
                बाईं ओर की सूची से कोई वार्तालाप चुनें या फीड से किसी प्रॉपर्टी पर चैट शुरू करें।
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
