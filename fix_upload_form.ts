import fs from 'fs';
let content = fs.readFileSync('src/components/UploadPropertyForm.tsx', 'utf-8');
content = content.replace('import { createProperty, uploadPropertyMedia } from "../lib/firebase";', 'import { createProperty, uploadPropertyMedia } from "../lib/supabase";');
fs.writeFileSync('src/components/UploadPropertyForm.tsx', content);
