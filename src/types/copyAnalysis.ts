export interface CopyBlockScores {
  clarity: number;
  persuasion: number;
  emotionalTone: number;
  benefitFeatureRatio: number;
  powerWords: number;
  activeVoice: number;
  conversionRelevance: number;
}

export interface CopyHeatmapBlock {
  blockNumber: number;
  sectionName?: string;
  blockText: string | null;
  blockTextPreview: string;
  color: 'green' | 'yellow' | 'red';
  compositeScore: number;
  scores: CopyBlockScores;
}

export interface CopyDetailedBlock {
  blockNumber: number;
  sectionName?: string;
  originalText: string;
  compositeScore: number;
  color: 'green' | 'yellow' | 'red';
  scores: CopyBlockScores;
  issues: string[];
  rewrite: string | null;
  rewriteRationale: string | null;
  projectedScore: number | null;
}

export interface CopyDimensionAverage {
  dimension: string;
  average: number;
  assessment: string;
}

export interface CopyPriorityRewrite {
  priority: number;
  blockNumber: number;
  sectionName?: string;
  currentScore: number;
  issue: string;
  rewrite: string;
  projectedScore: number;
}

export interface CopyActionPlanItem {
  priority: number;
  action: string;
  blocksAffected: string;
  impact: string;
}

export interface CopyPageScore {
  overallScore: number;
  totalBlocks: number;
  greenBlocks: number;
  greenPercent: number;
  yellowBlocks: number;
  yellowPercent: number;
  redBlocks: number;
  redPercent: number;
  weakestDimension: string;
  weakestDimensionAvg: number;
  strongestDimension: string;
  strongestDimensionAvg: number;
  readingLevel: string;
  estimatedReadingTime: string;
  toneConsistency: string;
}

export interface CopyPatternAnalysis {
  recurringPatterns: string[];
  dominantWeakness: string;
  worstHabit: string;
  coachingAdvice: string;
}

export interface CopyAnalysisResult {
  _partial?: boolean;
  language?: string;
  copySummary: string;
  pageScore: CopyPageScore;
  copyHeatmap: CopyHeatmapBlock[];
  dimensionAverages: CopyDimensionAverage[];
  detailedBlocks: CopyDetailedBlock[];
  topPriorityRewrites: CopyPriorityRewrite[];
  patternAnalysis: CopyPatternAnalysis;
  actionPlan: CopyActionPlanItem[];
  finalSummary: string;
}
