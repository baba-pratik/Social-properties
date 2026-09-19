import fs from 'fs';
let content = fs.readFileSync('src/components/RealtimeChat.tsx', 'utf-8');

content = content.replace(/    \} catch \(err\) \{\n      const list = await fetchConversationMessages\(activeConversationId\);\n      setMessages\(list\);\n    \} catch \(err\) \{\n      console\.error\("Attach error:", err\);\n    \}/, `      const list = await fetchConversationMessages(activeConversationId);
      setMessages(list);
    } catch (err) {
      console.error("Attach error:", err);
    }`);

fs.writeFileSync('src/components/RealtimeChat.tsx', content);
