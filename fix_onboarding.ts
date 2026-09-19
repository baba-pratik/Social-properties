import fs from 'fs';
let content = fs.readFileSync('src/components/OnboardingModal.tsx', 'utf-8');

// Replace Firebase imports
content = content.replace(/import \{ db \} from "\.\.\/lib\/firebase";\nimport \{ doc, setDoc \} from "firebase\/firestore";/, 'import { supabase } from "../lib/supabase";');

// Fix sessionUser typing mapping assuming sessionUser is now a Supabase User
content = content.replace(/sessionUser\.uid/g, 'sessionUser.id');
content = content.replace(/sessionUser\.phoneNumber \|\| ""/g, 'sessionUser.phone || ""');
// Supabase user metadata might contain name
content = content.replace(/sessionUser\?\.displayName \|\| ""/g, 'sessionUser?.user_metadata?.full_name || ""');

// Update handleSubmit
content = content.replace(/      const docRef = doc\(db, 'profiles', sessionUser\.id\);\n      await setDoc\(docRef, newProfile, \{ merge: true \}\);/, `      const { error } = await supabase.from('profiles').upsert(newProfile);
      if (error) throw error;`);

fs.writeFileSync('src/components/OnboardingModal.tsx', content);

let storeContent = fs.readFileSync('src/store/useUserStore.ts', 'utf-8');
storeContent = storeContent.replace("import { User } from 'firebase/auth';", "import { User } from '@supabase/supabase-js';");
fs.writeFileSync('src/store/useUserStore.ts', storeContent);
