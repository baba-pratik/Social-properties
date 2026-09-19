import fs from 'fs';
let content = fs.readFileSync('src/components/StoriesBar.tsx', 'utf-8');
content = content.replace('import { uploadPropertyMedia } from "../lib/firebase";', 'import { uploadPropertyMedia } from "../lib/supabase";');
fs.writeFileSync('src/components/StoriesBar.tsx', content);
