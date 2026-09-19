sed -i 's/fetchUserConversations,/fetchUserConversations,\n  fetchConversationMessages,\n  sendMessage,\n  getOrCreateConversation/g' src/lib/firebase.ts
