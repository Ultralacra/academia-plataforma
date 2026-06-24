// ─── Visible Zoom Accounts ────────────────────────────────────────────────────

export const VISIBLE_ZOOM_ACCOUNTS: Record<string, string> = {
  "asesorias1@javierquest.com": "Carla Pinto",
  "asesorias2@javierquest.com": "Nicolas Medina",
  "administracion3@javierquest.com": "Elizabeth Flores",
  "administracion2@javierquest.com": "Karen Rubio",
  "ventas1@x-academy.tech": "Samuel Martinez",
  "ventas2@x-academy.tech": "Juan Diego Afanador",
  "administracion1@javierquest.com": "Jose Bayona",
};

export const VISIBLE_ZOOM_EMAILS = Object.keys(VISIBLE_ZOOM_ACCOUNTS);

export function getDisplayName(email: string): string | null {
  return VISIBLE_ZOOM_ACCOUNTS[email] ?? null;
}

export function isVisibleZoomAccount(email: string): boolean {
  return VISIBLE_ZOOM_EMAILS.some(e => e.toLowerCase() === (email || '').toLowerCase());
}

// ─── Sales Analysis Types ─────────────────────────────────────────────────────

export interface SalesAnalysisEvidence {
  insight: string;
  phrase: string;
  minute: string;
}

export interface SalesAnalysisDiscovery {
  score: number;
  problemIdentification: boolean;
  painDeepening: boolean;
  consequences: boolean;
  economicImpact: boolean;
  emotionalImpact: boolean;
  urgency: boolean;
  previousAttempts: boolean;
  objectives: boolean;
  realMotivators: boolean;
  decisionCapacity: boolean;
  strengths: string[];
  improvements: string[];
}

export interface SalesAnalysisQuestions {
  openEnded: number;
  closed: number;
  deepening: number;
  diagnostic: number;
}

export interface SalesAnalysisValueBuilding {
  score: number;
  personalization: boolean;
  problemSolutionConnection: boolean;
  methodClarity: boolean;
  programClarity: boolean;
  expectedResultsClarity: boolean;
}

export interface SalesAnalysisOffer {
  score: number;
  offerClarity: boolean;
  priceClarity: boolean;
  conditionsClarity: boolean;
  nextStepsClarity: boolean;
  expectationsClarity: boolean;
}

export interface SalesAnalysisObjection {
  type: string;
  minute: string;
  response: string;
  result: string;
  evidence: string;
}

export interface SalesAnalysisProcessCompliance {
  opening: number;
  rapport: number;
  discovery: number;
  diagnosis: number;
  presentation: number;
  offer: number;
  close: number;
  followUp: number;
}

export interface SalesAnalysisProspectProfile {
  name: string;
  profession: string;
  niche: string;
  experienceLevel: string;
  currentRevenue: string;
  targetRevenue: string;
  mainPain: string;
  programOfInterest: string;
  consciousnessLevel: string;
  mainProblem: string;
  currentConsequences: string[];
  objectives: {
    shortTerm: string;
    longTerm: string;
  };
  previousAttempts: string[];
  emotionalMotivators: string[];
  behavioralProfile: string;
  behavioralProfileExplanation: string;
}

export interface SalesAnalysisDeliverySummary {
  whyBought: string;
  desiredResult: string;
  programExpectation: string;
  concerns: string[];
  currentLimitations: string[];
  resources: string[];
  commitmentLevel: string;
  identifiedRisks: string[];
  supportNeeded: string;
  promisesUnderstood: string[];
  believesWillReceive: string;
}

export interface SalesAnalysisCoaching {
  strengths: string[];
  opportunities: string[];
  actionPlan: string[];
}

export interface SalesAnalysisAlert {
  type: string;
  severity: string;
  detail?: string;
}

export interface SalesAnalysisResult {
  won: boolean;
  closeProbability: number;
  leadTemperature: string;
  reasonWon: string;
  reasonLost: string;
  nextAction: string;
  idealFollowUpDate: string;
  executiveSummary: string;

  talkRatio: {
    closer: number;
    prospect: number;
    alert: string | null;
  };

  discovery: SalesAnalysisDiscovery;
  questions: SalesAnalysisQuestions;
  valueBuilding: SalesAnalysisValueBuilding;
  offer: SalesAnalysisOffer;
  objections: SalesAnalysisObjection[];
  objectionScore: number;
  processCompliance: SalesAnalysisProcessCompliance;
  prospectProfile: SalesAnalysisProspectProfile;
  deliverySummary: SalesAnalysisDeliverySummary;
  expectationMatchScore: number;
  coaching: SalesAnalysisCoaching;
  alerts: SalesAnalysisAlert[];
  risks: string[];
  salesRecommendations: string[];
  deliveryRecommendations: string[];
  evidence: SalesAnalysisEvidence[];
}
