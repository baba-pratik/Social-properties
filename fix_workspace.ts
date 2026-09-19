import fs from 'fs';
let content = fs.readFileSync('src/components/WorkspaceModal.tsx', 'utf-8');

content = content.replace('import { getAccessToken, initAuth } from "../lib/firebase";', 'import { supabase } from "../lib/supabase";');

content = content.replace(/  const checkAuthAndLoad = async \(\) => \{[\s\S]*?    setNeedsAuth\(false\);\n    fetchData\(token\);\n  \};/, `  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token;
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setNeedsAuth(false);
    fetchData(token);
  };`);

fs.writeFileSync('src/components/WorkspaceModal.tsx', content);
