# Social Properties (सोशल प्रॉपर्टीज) - Project Documentation

## 1. Project Purpose (प्रोजेक्ट का उद्देश्य)
**Social Properties** is a hyperlocal, social media-driven real estate platform designed exclusively for Bokaro and Giridih (Jharkhand, India). 
Unlike traditional, boring real estate listing websites, this platform functions like **Instagram/TikTok for real estate**. It prioritizes 30-60 second vertical video walkthroughs (Reels), 24-hour Stories, and community engagement. 
The goal is to make property hunting and selling highly interactive, visually appealing, and directly connected through real-time chat and WhatsApp, tailored for the local Hindi-speaking audience.

## 2. Core Architecture & Tech Stack (तकनीकी जानकारी)
- **Frontend Framework:** React 18 with Vite
- **Language:** TypeScript (for type safety and robust code)
- **Styling:** Tailwind CSS (for mobile-first, responsive design)
- **Icons:** Lucide React
- **Backend & Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (Phone OTP & Google OAuth)
- **Storage:** Supabase Storage (for Property Media, Videos, and Stories)
- **State Management:** Zustand (`useUserStore`) & React Hooks

## 3. Key Features & Implementation (मुख्य सुविधाएँ)

### 3.1. User Interface & Experience (UI/UX)
- **Mobile-First Design:** The app is designed to feel like a native mobile app in the browser.
- **Bottom Navigation Bar:** Persistent navigation for guests and logged-in users, allowing seamless switching between Home (फीड), Search (सर्च), Reels (रील्स), and Profile (प्रोफ़ाइल).
- **Hamburger Drawer Menu:** A sliding side-menu containing profile info, quick navigation, and legal/info pages (About, Terms, Privacy, Support).
- **Hindi-First UI:** All user-facing text, buttons, and placeholders are in Hindi to cater to the local demographic (e.g., 'लॉगिन', 'अपलोड करें'), while the underlying codebase remains in English.

### 3.2. Authentication (लॉगिन और सुरक्षा)
- **Phone OTP First:** Users log in using their 10-digit mobile number and a 6-digit OTP. 
- **Google Auth Fallback:** Users can also log in quickly using their Google accounts.
- **Mandatory Onboarding:** If a user logs in but doesn't have a completed profile (Name, City), they are locked into an Onboarding Modal until they provide these details.
- **Guest Access:** Unauthenticated users can browse properties, watch reels, and search. However, interacting with uploads, chats, or saving properties prompts them to log in.

### 3.3. Property Discovery (प्रॉपर्टी खोजना)
- **Feed (`/feed`):** Standard scrolling feed of property cards with images, price, BHK, and location.
- **Reels (`/reels`):** A 9:16 vertical video swipe-up feed. Users can watch property tours just like TikTok/Instagram Reels.
- **Search & Filters (`/search`):** Users can search by query and filter by city (Bokaro/Giridih), property type, budget, and BHK.

### 3.4. Social Features (सोशल मीडिया सुविधाएँ)
- **24-Hour Stories:** Users can upload temporary images/videos that disappear after 24 hours. Logged-in users can view and delete their own stories.
- **Real-Time Chat:** A secure, built-in direct messaging system between buyers and property owners. Protected by Row Level Security (RLS) so only the participants can read the messages.
- **Community Engagement:** Users can Like, Save, and Comment on properties.
- **WhatsApp Integration:** 1-click sharing and contacting via WhatsApp.

### 3.5. Security & Database (डेटाबेस और सुरक्षा)
- **Row Level Security (RLS):** Strict rules in Supabase ensure that users can only delete their own properties, manage their own stories, and read their own private chats.
- **Storage Buckets:** A dedicated `property-media` bucket stores all images and videos securely.

## 4. Recent Work Completed (हाल ही में किया गया कार्य)
1. **Migrated Auth to Phone OTP:** Replaced email/password with a localized phone number OTP flow.
2. **Fixed Bottom Navigation:** Ensured the bottom tab bar is always visible to guests on core pages, hiding only on full-screen modals like Upload.
3. **Redesigned Sidebar Menu:** Created a premium, sliding `HamburgerDrawer` grouping navigation, information pages, and a clear Login/Logout footer.
4. **Secured Stories:** Added authentication checks before allowing story uploads, and added a Trash (Delete) button for users to remove their own active stories from the database and storage bucket.
5. **Real-time Chat Security:** Audited and fixed the conversation routing so that chat histories remain strictly private between the two participants.

## 5. Future Roadmap / Next Steps (आगे का कार्य)
- **AI Video Script Generator:** Implement Gemini AI to auto-generate 30-second Hindi speaking scripts for sellers based on their property details (Locality, Price, BHK).
- **Broker Verification System:** Add a badge system for verified local brokers.
- **Push Notifications:** Notify users when they receive a new chat message or comment.
