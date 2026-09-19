import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace Firebase imports
content = content.replace(/import \{ auth, db, getOrCreateConversation \} from "\.\/lib\/firebase";\nimport \{ onAuthStateChanged \} from "firebase\/auth";\nimport \{ doc, getDoc \} from "firebase\/firestore";/, 'import { getOrCreateConversation } from "./lib/supabase";');

// Replace Firebase auth listener with Supabase
content = content.replace(/  useEffect\(\(\) => \{\n    const unsubscribe = onAuthStateChanged\(auth, async \(user\) => \{[\s\S]*?      \}\n    \}\);\n    return \(\) => unsubscribe\(\);\n  \}, \[\]\);/, `  useEffect(() => {
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
  }, []);

  const handleAuthChange = async (user: any) => {
    if (user) {
      setSessionUser(user);
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data && data.full_name) {
          setCurrentUser(data as Profile);
          setShowOnboarding(false);
        } else {
          setShowOnboarding(true);
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
  };`);

fs.writeFileSync('src/App.tsx', content);
