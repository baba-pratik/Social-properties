import fs from 'fs';
let content = fs.readFileSync('src/components/ReelsFeed.tsx', 'utf-8');
content = content.replace('}, [lastVisible, loading, hasMore]);', '}, [page, loading, hasMore]);');
fs.writeFileSync('src/components/ReelsFeed.tsx', content);
