import type { QuoteResult } from "../rules/types";

export interface BusinessProfileData {
  businessType?: string;
  businessName?: string;
  segment?: string;
  city?: string;
  cityTier?: number;
  employeeCount?: number;
  numSites?: number;
  hasGstin?: boolean;
  gstin?: string;
  gstinStatus?: string;
  currentInternet?: string;
  monthlySpend?: number;
  painPoint?: string;
}

export interface RecommendationPayload {
  ready: boolean;
  bundleName: string;
  summary: string;
  whyReasons: string[];
  profile: BusinessProfileData;
  quote?: QuoteResult;
  suggestedNextAction?: string;
  isCheaperAlternative?: boolean;
}

export interface AdvisorMessage {
  id?: string;
  role: "user" | "model" | "system";
  content: string;
  timestamp?: string;
  quickReplies?: string[];
  recommendation?: RecommendationPayload | null;
}
