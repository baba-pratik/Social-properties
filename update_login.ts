import fs from 'fs';
let content = fs.readFileSync('src/components/Login.tsx', 'utf-8');

// Replace Firebase imports
content = content.replace(/import \{ auth, functions, googleProvider, setAccessToken \} from "\.\.\/lib\/firebase";\nimport \{ httpsCallable \} from "firebase\/functions";\nimport \{ signInWithCustomToken, signInWithPopup \} from "firebase\/auth";/, 'import { supabase } from "../lib/supabase";');

// Update Google Login
content = content.replace(/  const handleGoogleLogin = async \(\) => \{[\s\S]*?  \};/, `  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/documents https://mail.google.com/',
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      // It redirects, so no onSuccess needed here
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setError(err.message || "Failed to sign in with Google.");
      setLoading(false);
    }
  };`);

// Update OTP Login
content = content.replace(/      const verifyOTPFunction = httpsCallable\(functions, "verifyOTP"\);[\s\S]*?      await signInWithCustomToken\(auth, data\.customToken\);/, `      // Implement Supabase OTP later if needed, but the prompt says:
      // "Implement: Google OAuth login"
      // If OTP is required via Supabase, we would do:
      // const { error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otp, type: 'sms' })
      const { error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otp, type: 'sms' });
      if (error) throw error;
`);

content = content.replace(/      const sendOTPFunction = httpsCallable\(functions, "sendOTP"\);[\s\S]*?      await sendOTPFunction\(\{ phone: formattedPhone \}\);/, `      const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
      if (error) throw error;
`);


fs.writeFileSync('src/components/Login.tsx', content);
