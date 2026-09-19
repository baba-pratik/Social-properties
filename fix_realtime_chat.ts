import fs from 'fs';
let content = fs.readFileSync('src/components/RealtimeChat.tsx', 'utf-8');

// replace imports
content = content.replace(/import \{ uploadPropertyMedia, sendMessage, db \} from "\.\.\/lib\/firebase";\nimport \{ collection, query, where, orderBy, onSnapshot \} from "firebase\/firestore";/, 'import { uploadPropertyMedia, sendMessage, fetchUserConversations, fetchConversationMessages, supabase } from "../lib/supabase";');

// replace conversations listener
content = content.replace(/  \/\/ Load conversations\n  useEffect\(\(\) => \{[\s\S]*?  \}, \[currentUser, activeConversationId\]\);/, `  // Load conversations
  useEffect(() => {
    if (!currentUser) return;
    
    const loadConversations = async () => {
      const list = await fetchUserConversations(currentUser.id);
      unstable_batchedUpdates(() => {
        setConversations(list);
        if (!activeConversationId && list.length > 0) {
          setActiveConversationId(list[0].id);
        }
      });
    };
    
    loadConversations();

    const convChannel = supabase.channel('conversations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => {
        loadConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
        loadConversations();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(convChannel);
    };
  }, [currentUser, activeConversationId]);`);


// replace messages listener
content = content.replace(/  \/\/ Load messages whenever active conversation changes\n  useEffect\(\(\) => \{[\s\S]*?  \}, \[activeConversationId\]\);/, `  // Load messages whenever active conversation changes
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
    };
    
    loadMessages();

    const msgChannel = supabase.channel(\`messages-\${activeConversationId}\`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: \`conversation_id=eq.\${activeConversationId}\`
      }, (payload) => {
        const newMessage = payload.new as Message;
        unstable_batchedUpdates(() => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        });
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
    };
  }, [activeConversationId]);`);

// Update handleSend (which calls handleSend -> sendmessage) to not use firebase.
// Wait, sendMessage was already replaced in the import to be from "../lib/supabase"
// Also handleSend calls loadConversations(); and handleImageAttach calls loadMessages();
// Let's re-add those because my earlier patch removed them.
content = content.replace(/      setSending\(false\);\n    \}\n  \};/g, `      const list = await fetchUserConversations(currentUser.id);
      setConversations(list);
      setSending(false);
    }
  };`);
content = content.replace(/      console\.error\("Attach error:", err\);\n    \}\n  \};/g, `      const list = await fetchConversationMessages(activeConversationId);
      setMessages(list);
    } catch (err) {
      console.error("Attach error:", err);
    }
  };`);

fs.writeFileSync('src/components/RealtimeChat.tsx', content);
