import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /  \/\/ Initialize Zustand store on first load using Firebase Auth\n  useEffect\(\(\) => \{\n    const unsubscribe = onAuthStateChanged[\s\S]*?    return \(\) => unsubscribe\(\);\n  \}, \[\]\);/m;

const newEffect = `  // Initialize Zustand store on first load using Supabase Auth
  useEffect(() => {
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
    };

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
  }, []);`;

content = content.replace(regex, newEffect);
fs.writeFileSync('src/App.tsx', content);
