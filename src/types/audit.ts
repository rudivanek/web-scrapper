export interface PriorityItem {
  recommendation: string;
  category: string;
  impact: 'High' | 'Medium' | 'Low';
  effort: 'High' | 'Medium' | 'Low';
  priority: number;
  timeframe: string;
  consequence?: string;
}

export interface ScoredAssessment {
  valueProposition: number;
  headline: number;
  cta: number;
  aboveTheFold: number;
  narrativeFlow: number;
  trustSignals: number;
  objectionHandling: number;
  microCopy: number;
  accessibility: number;
  weightedTotal: number;
}

export interface DetailedFinding {
  category: string;
  analysis?: string;
  issues: string[];
  recommendations: string[];
}

export interface CopyRewrite {
  element: string;
  current: string;
  improved: string;
  rationale: string;
}

export interface CompetitorAnalysis {
  competitor: string;
  strengths: string[];
  weaknesses: string[];
  whatTheyDoBetter: string[];
  whatYouDoBetter: string[];
}

export interface ABTest {
  element: string;
  controlVariant: string;
  variantB: string;
  primaryMetric: string;
  suggestedDuration: string;
  expectedImpact: 'Low' | 'Medium' | 'High';
}

export interface ActionPlan {
  '30days': string[];
  '60days': string[];
  '90days': string[];
}

export interface ContextIdentification {
  primaryConversionGoal: string;
  trafficContext: string;
  targetAudience: string;
  marketIndustry: string;
}

export interface BuyerJourneyVisitor {
  analysis: string;
  gaps: string[];
  recommendations: string[];
}

export interface BuyerJourneyAnalysis {
  coldVisitor: BuyerJourneyVisitor;
  warmVisitor: BuyerJourneyVisitor;
  hotVisitor: BuyerJourneyVisitor;
}

export interface EmotionalTrigger {
  trigger: string;
  present: 'yes' | 'partial' | 'no';
  implementation: string;
}

export interface SubAnalysis {
  analysis: string;
  findings: string[];
  recommendations: string[];
}

export type ReadyToUseContentCategory =
  | 'trust'
  | 'cta'
  | 'faq'
  | 'social-proof'
  | 'objection-handling'
  | 'narrative'
  | 'pricing'
  | 'lead-magnet'
  | 'technical-seo'
  | 'mobile'
  | 'other';

export interface ReadyToUseContentBlock {
  sectionTitle: string;
  placement: string;
  content: string;
  rationale: string;
  category: ReadyToUseContentCategory;
}

export interface SEOScoreCard {
  titleMeta: number;
  headingStructure: number;
  contentQuality: number;
  keywordOptimization: number;
  links: number;
  imageMedia: number;
  schemaStructuredData: number;
  contentArchitecture: number;
  weightedTotal: number;
}

export interface SEOKeywordMapItem {
  keyword: string;
  type: 'primary' | 'secondary';
  inTitle: boolean;
  inH1: boolean;
  inMeta: boolean;
  inFirst100Words: boolean;
  frequency: number;
  status: 'good' | 'needs work' | 'missing';
}

export interface SEODetailedFinding {
  dimension: string;
  score: number;
  currentState: string;
  issues: string[];
  recommendations: string[];
}

export interface SEOMetaRewrite {
  element: string;
  current: string;
  optimized: string;
  rationale: string;
}

export interface SEOSchemaMarkup {
  schemaType: string;
  rationale: string;
  code: string;
}

export interface SEOQuickWin {
  action: string;
  estimatedTime: string;
  impact: string;
  consequence?: string;
}

export interface SEOActionPlan {
  week1: { actions: string; impact: string };
  week2to4: { actions: string; impact: string };
  month2to3: { actions: string; impact: string };
}

export interface SEOAuditResult {
  language?: string;
  seoExecutiveSummary: string;
  seoContext: {
    primaryKeywords: string[];
    searchIntent: string;
    likelyCompetitors: string;
  };
  seoScoreCard: SEOScoreCard;
  headingStructureMap: string;
  keywordMap: SEOKeywordMapItem[];
  detailedAnalysis: SEODetailedFinding[];
  metaHeadingRewrites: SEOMetaRewrite[];
  schemaMarkupCode: SEOSchemaMarkup[];
  contentGapAnalysis: {
    missingSubtopics: string[];
    unansweredQuestions: string[];
    recommendedSections: string[];
    additionalWordCount: number;
  };
  seoQuickWins: SEOQuickWin[];
  seoHighImpactChanges: SEOQuickWin[];
  seoActionPlan: SEOActionPlan;
  seoFinalSummary: string;
}

export type WireframeZoneStatus = 'exists_correct' | 'move_up' | 'missing' | 'move_down' | 'reduce';

export interface PageWireframeZone {
  zone: number;
  name: string;
  status: WireframeZoneStatus;
  currentPosition?: number;
  description: string;
}

export interface PageWireframe {
  currentStructure: string[];
  structuralProblems: string[];
  recommendedZones: PageWireframeZone[];
}

export interface AuditResult {
  language?: string;
  contextIdentification?: ContextIdentification;
  executiveSummary: string;
  priorityTable: PriorityItem[];
  scoredAssessment: ScoredAssessment;
  detailedFindings: DetailedFinding[];
  buyerJourneyAnalysis?: BuyerJourneyAnalysis;
  emotionalTriggers?: EmotionalTrigger[];
  pricingPsychology?: SubAnalysis | null;
  geoAIReadiness?: SubAnalysis;
  mobileAnalysis?: SubAnalysis;
  copyRewrites: CopyRewrite[];
  readyToUseContent?: ReadyToUseContentBlock[] | null;
  competitorComparison: CompetitorAnalysis[] | null;
  quickWins: string[];
  highImpactChanges: string[];
  pageWireframe?: PageWireframe | null;
  abTests: ABTest[];
  actionPlan: ActionPlan;
  finalSummary: string;
  truncated?: boolean;
}
