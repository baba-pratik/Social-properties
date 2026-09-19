import fs from 'fs';
let content = fs.readFileSync('src/components/RealtimeChat.tsx', 'utf-8');
content = content.replace('import React, { useState, useEffect, useRef } from "react";', `import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Building, MapPin, Phone, CheckCircle2, Paperclip, Image as ImageIcon, Clock, Sparkles, ArrowLeft } from "lucide-react";
import { Conversation, Message, Profile, Property } from "../types/database";
import { formatPrice, formatRelativeTime, ROLE_LABELS } from "../lib/utils";`);
fs.writeFileSync('src/components/RealtimeChat.tsx', content);
