import fs from 'fs';
let content = fs.readFileSync('src/components/Login.tsx', 'utf-8');
content = content.replace('      // Call Firebase Cloud Function (v2)\n', '');
fs.writeFileSync('src/components/Login.tsx', content);

let obContent = fs.readFileSync('src/components/OnboardingModal.tsx', 'utf-8');
obContent = obContent.replace('  // sessionUser is a Firebase User object\n', '');
fs.writeFileSync('src/components/OnboardingModal.tsx', obContent);

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
appContent = appContent.replace('  // Initialize Zustand store on first load using Firebase Auth', '  // Initialize Zustand store on first load using Supabase Auth');
fs.writeFileSync('src/App.tsx', appContent);
