export enum Language {
  ENGLISH = "English",
  HINDI = "Hindi",
  BENGALI = "Bengali",
  TELUGU = "Telugu",
  MARATHI = "Marathi",
  TAMIL = "Tamil",
  KANNADA = "Kannada"
}

export enum Severity {
  LOW = "Low",
  MODERATE = "Moderate",
  HIGH = "High",
  CRITICAL = "Critical",
}

export interface Analysis {
  condition: string;
  probability: number;
  recommendation: string;
  severity: Severity;
  localization?: string; // Hindi/Local name
  features?: string[]; // Top clinical features observed
}

export interface CommunityAlert {
  id: string;
  condition: string;
  location: string;
  severity: Severity;
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  image: string;
  analysis: Analysis;
  timestamp: string;
  voiceDescription?: string;
  skinTone: number;
}

export interface VoiceState {
  isListening: boolean;
  transcript: string;
}

export interface PredictionLog {
  id: string;
  userId: string;
  condition: string;
  probability: number;
  severity: Severity;
  timestamp: string;
  skinTone?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  registeredAt: string;
  lastLoginAt?: string;
  predictionsCount?: number;
  role?: 'Admin' | 'Clinic Worker' | 'Dermatologist';
}

export type DateRangeOption = '7d' | '30d' | '90d' | 'ytd' | 'all';
