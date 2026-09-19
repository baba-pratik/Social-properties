import fs from 'fs';
let content = fs.readFileSync('src/lib/firebase.ts', 'utf-8');
content = content.replace(/\} as Conversation;/g, '} as unknown as Conversation;');
content = content.replace(/\} as Message;/g, '} as unknown as Message;');
fs.writeFileSync('src/lib/firebase.ts', content);
