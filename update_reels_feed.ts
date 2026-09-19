import fs from 'fs';
let content = fs.readFileSync('src/components/ReelsFeed.tsx', 'utf-8');

// Replace Firebase imports
content = content.replace(/import \{ db \} from "\.\.\/lib\/firebase";\nimport \{ collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot \} from "firebase\/firestore";/, 'import { supabase } from "../lib/supabase";');

content = content.replace(/const \[lastVisible, setLastVisible\] = useState<QueryDocumentSnapshot \| null>\(null\);/, 'const [page, setPage] = useState(1);');
content = content.replace(/const fetchProperties = useCallback\(async \(isInitial = false\) => \{[\s\S]*?    \} finally \{/g, `const fetchProperties = useCallback(async (isInitial = false) => {
    if (loading || (!hasMore && !isInitial)) return;
    
    setLoading(true);
    try {
      const currentPage = isInitial ? 1 : page;
      const limit = 5;
      const start = (currentPage - 1) * limit;
      const end = start + limit - 1;

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false })
        .range(start, end);

      if (error) throw error;
      
      const newItems = (data || []) as Property[];
      
      if (newItems.length < limit) {
        setHasMore(false);
      }
      
      if (isInitial) {
        setFeedItems(newItems);
        setPage(2);
      } else {
        setFeedItems(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newItems.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
        setPage(currentPage + 1);
      }
      
    } catch (error) {
      console.error("Error fetching reels:", error);
    } finally {`);

fs.writeFileSync('src/components/ReelsFeed.tsx', content);
