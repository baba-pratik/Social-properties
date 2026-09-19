import fs from 'fs';
let content = fs.readFileSync('src/components/UploadPropertyForm.tsx', 'utf-8');
content = content.replace('await uploadPropertyMedia(files[i], (progress) => {\n          const overallProgress = ((i * 100) + progress) / files.length;\n          setUploadProgress(overallProgress);\n        });', 'await uploadPropertyMedia(files[i]);\n        setUploadProgress(((i + 1) * 100) / files.length);');
fs.writeFileSync('src/components/UploadPropertyForm.tsx', content);
