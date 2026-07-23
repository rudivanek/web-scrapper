import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, BorderStyle, Footer, TabStopType, PageNumber } from 'docx';
import type { AuditResult, SEOAuditResult } from '../types/audit';
import type { CopyAnalysisResult } from '../types/copyAnalysis';
import { CRO_GLOSSARY, SEO_GLOSSARY, COPY_GLOSSARY, type GlossaryEntry } from './glossaries';
import { getLabels } from './i18n';

const DIMENSION_TRANSLATIONS: Record<string, string> = {
  'Clarity': 'Claridad',
  'Persuasion Strength': 'Fuerza Persuasiva',
  'Emotional Tone': 'Tono Emocional',
  'Benefit-to-Feature Ratio': 'Proporción Beneficio–Característica',
  'Power Words & Language': 'Lenguaje de Alto Impacto',
  'Active vs Passive Voice': 'Voz Activa',
  'Active Voice': 'Voz Activa',
  'Conversion Relevance': 'Relevancia de Conversión',
  clarity: 'Claridad',
  persuasion: 'Fuerza Persuasiva',
  emotionalTone: 'Tono Emocional',
  benefitFeatureRatio: 'Proporción Beneficio–Característica',
  powerWords: 'Lenguaje de Alto Impacto',
  activeVoice: 'Voz Activa',
  conversionRelevance: 'Relevancia de Conversión',
};

function translateDimension(dim: string): string {
  return DIMENSION_TRANSLATIONS[dim] || dim;
}

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
};

function createHeading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 240, after: 120 },
  });
}

function createParagraph(text: string): Paragraph {
  return new Paragraph({
    text,
    spacing: { before: 120, after: 120 },
  });
}

function createBoldParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true })],
    spacing: { before: 120, after: 60 },
  });
}

function createBulletList(items: string[]): Paragraph[] {
  return items.map(item => new Paragraph({
    text: item,
    bullet: { level: 0 },
    spacing: { before: 60, after: 60 },
  }));
}

function createTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    children: headers.map(header => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: header, bold: true })],
        alignment: AlignmentType.LEFT,
      })],
      shading: { fill: 'F0F0F0' },
      borders: tableBorders,
    })),
  });

  const dataRows = rows.map(row => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new Paragraph({ text: cell })],
      borders: tableBorders,
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function createCodeBlock(code: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: code, font: 'Courier New', size: 20 })],
    spacing: { before: 120, after: 120 },
    shading: { fill: 'F4F4F4' },
  });
}

function createGlossarySection(entries: GlossaryEntry[]): (Paragraph)[] {
  const paragraphs: Paragraph[] = [];
  paragraphs.push(createHeading('Glosario de términos', HeadingLevel.HEADING_2));
  for (const entry of entries) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: `${entry.term}: `, bold: true }),
        new TextRun({ text: entry.definition }),
      ],
      spacing: { before: 80, after: 80 },
    }));
  }
  return paragraphs;
}

function createDocxFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'Sharpen.Studio · sharpen.studio', size: 18, color: '888888' }),
          new TextRun({ text: '\t' }),
          new TextRun({ text: 'Página ', size: 18, color: '888888' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' }),
          new TextRun({ text: ' de ', size: 18, color: '888888' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '888888' }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
      }),
    ],
  });
}

export async function exportCROAuditToDocx(result: AuditResult, brandName: string): Promise<Blob> {
  const sections: (Paragraph | Table)[] = [];
  const L = getLabels(result.language);

  sections.push(createHeading(`CRO Audit Report: ${brandName}`, HeadingLevel.HEADING_1));

  if (result.contextIdentification) {
    sections.push(createHeading('Context', HeadingLevel.HEADING_2));
    sections.push(createParagraph(`Primary Conversion Goal: ${result.contextIdentification.primaryConversionGoal}`));
    sections.push(createParagraph(`Traffic Context: ${result.contextIdentification.trafficContext}`));
    sections.push(createParagraph(`Target Audience: ${result.contextIdentification.targetAudience}`));
    sections.push(createParagraph(`Market/Industry: ${result.contextIdentification.marketIndustry}`));
  }

  sections.push(createHeading('Executive Summary', HeadingLevel.HEADING_2));
  sections.push(createParagraph(result.executiveSummary));

  sections.push(createHeading('Scorecard', HeadingLevel.HEADING_2));
  sections.push(createTable(
    ['Dimension', 'Score'],
    [
      [L.croScoreRowLabels.valueProposition, `${(result.scoredAssessment.valueProposition / 10).toFixed(1)}/10`],
      [L.croScoreRowLabels.headline, `${(result.scoredAssessment.headline / 10).toFixed(1)}/10`],
      [L.croScoreRowLabels.cta, `${(result.scoredAssessment.cta / 10).toFixed(1)}/10`],
      [L.croScoreRowLabels.aboveTheFold, `${(result.scoredAssessment.aboveTheFold / 10).toFixed(1)}/10`],
      [L.croScoreRowLabels.narrativeFlow, `${(result.scoredAssessment.narrativeFlow / 10).toFixed(1)}/10`],
      [L.croScoreRowLabels.trustSignals, `${(result.scoredAssessment.trustSignals / 10).toFixed(1)}/10`],
      [L.croScoreRowLabels.objectionHandling, `${(result.scoredAssessment.objectionHandling / 10).toFixed(1)}/10`],
      [L.croScoreRowLabels.microCopy, `${(result.scoredAssessment.microCopy / 10).toFixed(1)}/10`],
      [L.croScoreRowLabels.accessibility, `${(result.scoredAssessment.accessibility / 10).toFixed(1)}/10`],
      [L.weightedTotal, `${(result.scoredAssessment.weightedTotal / 10).toFixed(1)}/100`],
    ]
  ));

  sections.push(createHeading('Detailed Findings', HeadingLevel.HEADING_2));
  result.detailedFindings.forEach((finding) => {
    sections.push(createHeading(finding.category, HeadingLevel.HEADING_3));
    if (finding.analysis) {
      sections.push(createParagraph(finding.analysis));
    }
    if (finding.issues.length > 0) {
      sections.push(createBoldParagraph('Issues:'));
      sections.push(...createBulletList(finding.issues));
    }
    if (finding.recommendations.length > 0) {
      sections.push(createBoldParagraph('Recommendations:'));
      sections.push(...createBulletList(finding.recommendations));
    }
  });

  if (result.buyerJourneyAnalysis) {
    sections.push(createHeading('Buyer Journey Analysis', HeadingLevel.HEADING_2));

    sections.push(createHeading('Cold Visitor', HeadingLevel.HEADING_3));
    sections.push(createParagraph(result.buyerJourneyAnalysis.coldVisitor.analysis));
    if (result.buyerJourneyAnalysis.coldVisitor.gaps.length > 0) {
      sections.push(createBoldParagraph('Gaps:'));
      sections.push(...createBulletList(result.buyerJourneyAnalysis.coldVisitor.gaps));
    }
    if (result.buyerJourneyAnalysis.coldVisitor.recommendations.length > 0) {
      sections.push(createBoldParagraph('Recommendations:'));
      sections.push(...createBulletList(result.buyerJourneyAnalysis.coldVisitor.recommendations));
    }

    sections.push(createHeading('Warm Visitor', HeadingLevel.HEADING_3));
    sections.push(createParagraph(result.buyerJourneyAnalysis.warmVisitor.analysis));
    if (result.buyerJourneyAnalysis.warmVisitor.gaps.length > 0) {
      sections.push(createBoldParagraph('Gaps:'));
      sections.push(...createBulletList(result.buyerJourneyAnalysis.warmVisitor.gaps));
    }
    if (result.buyerJourneyAnalysis.warmVisitor.recommendations.length > 0) {
      sections.push(createBoldParagraph('Recommendations:'));
      sections.push(...createBulletList(result.buyerJourneyAnalysis.warmVisitor.recommendations));
    }

    sections.push(createHeading('Hot Visitor', HeadingLevel.HEADING_3));
    sections.push(createParagraph(result.buyerJourneyAnalysis.hotVisitor.analysis));
    if (result.buyerJourneyAnalysis.hotVisitor.gaps.length > 0) {
      sections.push(createBoldParagraph('Gaps:'));
      sections.push(...createBulletList(result.buyerJourneyAnalysis.hotVisitor.gaps));
    }
    if (result.buyerJourneyAnalysis.hotVisitor.recommendations.length > 0) {
      sections.push(createBoldParagraph('Recommendations:'));
      sections.push(...createBulletList(result.buyerJourneyAnalysis.hotVisitor.recommendations));
    }
  }

  if (result.emotionalTriggers && result.emotionalTriggers.length > 0) {
    sections.push(createHeading('Emotional Triggers', HeadingLevel.HEADING_2));
    sections.push(createTable(
      ['Trigger', 'Present', 'Implementation'],
      result.emotionalTriggers.map(t => [t.trigger, t.present, t.implementation])
    ));
  }

  if (result.pricingPsychology) {
    sections.push(createHeading('Pricing Psychology', HeadingLevel.HEADING_2));
    sections.push(createParagraph(result.pricingPsychology.analysis));
    if (result.pricingPsychology.findings.length > 0) {
      sections.push(createBoldParagraph('Findings:'));
      sections.push(...createBulletList(result.pricingPsychology.findings));
    }
    if (result.pricingPsychology.recommendations.length > 0) {
      sections.push(createBoldParagraph('Recommendations:'));
      sections.push(...createBulletList(result.pricingPsychology.recommendations));
    }
  }

  if (result.geoAIReadiness) {
    sections.push(createHeading('AI & Geo-Specific Readiness', HeadingLevel.HEADING_2));
    sections.push(createParagraph(result.geoAIReadiness.analysis));
    if (result.geoAIReadiness.findings.length > 0) {
      sections.push(createBoldParagraph('Findings:'));
      sections.push(...createBulletList(result.geoAIReadiness.findings));
    }
    if (result.geoAIReadiness.recommendations.length > 0) {
      sections.push(createBoldParagraph('Recommendations:'));
      sections.push(...createBulletList(result.geoAIReadiness.recommendations));
    }
  }

  if (result.mobileAnalysis) {
    sections.push(createHeading('Mobile Analysis', HeadingLevel.HEADING_2));
    sections.push(createParagraph(result.mobileAnalysis.analysis));
    if (result.mobileAnalysis.findings.length > 0) {
      sections.push(createBoldParagraph('Findings:'));
      sections.push(...createBulletList(result.mobileAnalysis.findings));
    }
    if (result.mobileAnalysis.recommendations.length > 0) {
      sections.push(createBoldParagraph('Recommendations:'));
      sections.push(...createBulletList(result.mobileAnalysis.recommendations));
    }
  }

  sections.push(createHeading('Copy Rewrites', HeadingLevel.HEADING_2));
  result.copyRewrites.forEach((rewrite, idx) => {
    sections.push(createHeading(`${idx + 1}. ${rewrite.element}`, HeadingLevel.HEADING_3));
    sections.push(new Paragraph({
      children: [
        new TextRun({ text: 'Current: ', bold: true }),
        new TextRun({ text: rewrite.current }),
      ],
      spacing: { before: 60, after: 60 },
    }));
    sections.push(new Paragraph({
      children: [
        new TextRun({ text: 'Improved: ', bold: true }),
        new TextRun({ text: rewrite.improved }),
      ],
      spacing: { before: 60, after: 60 },
    }));
    sections.push(new Paragraph({
      children: [
        new TextRun({ text: 'Rationale: ', bold: true }),
        new TextRun({ text: rewrite.rationale }),
      ],
      spacing: { before: 60, after: 60 },
    }));
  });

  if (result.readyToUseContent && result.readyToUseContent.length > 0) {
    sections.push(createHeading('Ready-to-Use Content Suggestions', HeadingLevel.HEADING_2));
    result.readyToUseContent.forEach((block, idx) => {
      sections.push(createHeading(`${idx + 1}. ${block.sectionTitle}`, HeadingLevel.HEADING_3));
      sections.push(createParagraph(`Placement: ${block.placement}`));
      sections.push(createParagraph(`Category: ${block.category}`));
      sections.push(createBoldParagraph('Content:'));
      sections.push(createParagraph(block.content));
      sections.push(createParagraph(`Rationale: ${block.rationale}`));
    });
  }

  if (result.competitorComparison && result.competitorComparison.length > 0) {
    sections.push(createHeading('Competitor Analysis', HeadingLevel.HEADING_2));
    result.competitorComparison.forEach((comp) => {
      sections.push(createHeading(comp.competitor, HeadingLevel.HEADING_3));
      if (comp.strengths.length > 0) {
        sections.push(createBoldParagraph('Strengths:'));
        sections.push(...createBulletList(comp.strengths));
      }
      if (comp.weaknesses.length > 0) {
        sections.push(createBoldParagraph('Weaknesses:'));
        sections.push(...createBulletList(comp.weaknesses));
      }
      if (comp.whatTheyDoBetter.length > 0) {
        sections.push(createBoldParagraph('What They Do Better:'));
        sections.push(...createBulletList(comp.whatTheyDoBetter));
      }
      if (comp.whatYouDoBetter.length > 0) {
        sections.push(createBoldParagraph('What You Do Better:'));
        sections.push(...createBulletList(comp.whatYouDoBetter));
      }
    });
  }

  sections.push(createHeading('Quick Wins', HeadingLevel.HEADING_2));
  sections.push(...createBulletList(result.quickWins));

  sections.push(createHeading('High Impact Changes', HeadingLevel.HEADING_2));
  sections.push(...createBulletList(result.highImpactChanges));

  sections.push(createHeading(L.abTestsSection.replace(/^[A-Z\d][\.\s–]+\s*/, ''), HeadingLevel.HEADING_2));
  sections.push(createTable(
    ['Elemento', L.abControlLabel, L.abVariantBLabel, L.abPrimaryMetric.replace(/:$/, ''), 'Plazo', L.tableImpact],
    result.abTests.map(t => [
      (t as any).element || (t as any).test || '',
      (t as any).controlVariant || (t as any).hypothesis || '',
      (t as any).variantB || '',
      (t as any).primaryMetric || (t as any).metric || '',
      (t as any).suggestedDuration || '',
      t.expectedImpact,
    ])
  ));

  sections.push(createHeading('Action Plan', HeadingLevel.HEADING_2));
  sections.push(createHeading('30 Days', HeadingLevel.HEADING_3));
  sections.push(...createBulletList(result.actionPlan['30days']));
  sections.push(createHeading('60 Days', HeadingLevel.HEADING_3));
  sections.push(...createBulletList(result.actionPlan['60days']));
  sections.push(createHeading('90 Days', HeadingLevel.HEADING_3));
  sections.push(...createBulletList(result.actionPlan['90days']));

  sections.push(createHeading('Priority Table', HeadingLevel.HEADING_2));
  sections.push(createTable(
    ['Priority', 'Recommendation', 'Category', 'Impact', 'Effort', 'Timeframe'],
    result.priorityTable.map(item => [
      String(item.priority),
      item.recommendation,
      item.category,
      item.impact,
      item.effort,
      item.timeframe,
    ])
  ));

  sections.push(createHeading('Final Summary', HeadingLevel.HEADING_2));
  sections.push(createParagraph(result.finalSummary));

  sections.push(...createGlossarySection(CRO_GLOSSARY));

  const doc = new Document({
    sections: [{
      footers: { default: createDocxFooter() },
      children: sections,
    }],
  });

  return await Packer.toBlob(doc);
}

export async function exportSEOAuditToDocx(result: SEOAuditResult, brandName: string): Promise<Blob> {
  const sections: (Paragraph | Table)[] = [];
  const L = getLabels(result.language);

  sections.push(createHeading(`SEO Audit Report: ${brandName}`, HeadingLevel.HEADING_1));

  sections.push(createHeading('Executive Summary', HeadingLevel.HEADING_2));
  sections.push(createParagraph(result.seoExecutiveSummary));

  sections.push(createHeading('SEO Context', HeadingLevel.HEADING_2));
  sections.push(createParagraph(`Primary Keywords: ${result.seoContext.primaryKeywords.join(', ')}`));
  sections.push(createParagraph(`Search Intent: ${result.seoContext.searchIntent}`));
  sections.push(createParagraph(`Likely Competitors: ${result.seoContext.likelyCompetitors}`));

  sections.push(createHeading('Scorecard', HeadingLevel.HEADING_2));
  sections.push(createTable(
    ['Dimension', 'Score'],
    [
      [L.seoScoreRowLabels.titleMeta, `${(result.seoScoreCard.titleMeta / 10).toFixed(1)}/10`],
      [L.seoScoreRowLabels.headingStructure, `${(result.seoScoreCard.headingStructure / 10).toFixed(1)}/10`],
      [L.seoScoreRowLabels.contentQuality, `${(result.seoScoreCard.contentQuality / 10).toFixed(1)}/10`],
      [L.seoScoreRowLabels.keywordOptimization, `${(result.seoScoreCard.keywordOptimization / 10).toFixed(1)}/10`],
      [L.seoScoreRowLabels.links, `${(result.seoScoreCard.links / 10).toFixed(1)}/10`],
      [L.seoScoreRowLabels.imageMedia, `${(result.seoScoreCard.imageMedia / 10).toFixed(1)}/10`],
      [L.seoScoreRowLabels.schemaStructuredData, `${(result.seoScoreCard.schemaStructuredData / 10).toFixed(1)}/10`],
      [L.seoScoreRowLabels.contentArchitecture, `${(result.seoScoreCard.contentArchitecture / 10).toFixed(1)}/10`],
      [L.weightedTotal, `${(result.seoScoreCard.weightedTotal / 10).toFixed(1)}/100`],
    ]
  ));

  sections.push(createHeading('Heading Structure Map', HeadingLevel.HEADING_2));
  sections.push(createParagraph(result.headingStructureMap));

  sections.push(createHeading('Keyword Map', HeadingLevel.HEADING_2));
  sections.push(createTable(
    ['Keyword', 'Type', 'Status', 'Frequency', 'In H1', 'In Title', 'In Meta'],
    result.keywordMap.map(kw => [
      kw.keyword,
      kw.type,
      kw.status,
      String(kw.frequency),
      kw.inH1 ? '✓' : '✗',
      kw.inTitle ? '✓' : '✗',
      kw.inMeta ? '✓' : '✗',
    ])
  ));

  sections.push(createHeading('Detailed Analysis', HeadingLevel.HEADING_2));
  result.detailedAnalysis.forEach((finding) => {
    sections.push(createHeading(`${finding.dimension} (Score: ${(finding.score / 10).toFixed(1)}/10)`, HeadingLevel.HEADING_3));
    sections.push(createParagraph(`Current State: ${finding.currentState}`));
    if (finding.issues.length > 0) {
      sections.push(createBoldParagraph('Issues:'));
      sections.push(...createBulletList(finding.issues));
    }
    if (finding.recommendations.length > 0) {
      sections.push(createBoldParagraph('Recommendations:'));
      sections.push(...createBulletList(finding.recommendations));
    }
  });

  sections.push(createHeading('Meta & Heading Rewrites', HeadingLevel.HEADING_2));
  result.metaHeadingRewrites.forEach((rewrite, idx) => {
    sections.push(createHeading(`${idx + 1}. ${rewrite.element}`, HeadingLevel.HEADING_3));
    sections.push(new Paragraph({
      children: [
        new TextRun({ text: 'Current: ', bold: true }),
        new TextRun({ text: rewrite.current }),
      ],
      spacing: { before: 60, after: 60 },
    }));
    sections.push(new Paragraph({
      children: [
        new TextRun({ text: 'Optimized: ', bold: true }),
        new TextRun({ text: rewrite.optimized }),
      ],
      spacing: { before: 60, after: 60 },
    }));
    sections.push(new Paragraph({
      children: [
        new TextRun({ text: 'Rationale: ', bold: true }),
        new TextRun({ text: rewrite.rationale }),
      ],
      spacing: { before: 60, after: 60 },
    }));
  });

  if (result.schemaMarkupCode && result.schemaMarkupCode.length > 0) {
    sections.push(createHeading('Schema Markup Recommendations', HeadingLevel.HEADING_2));
    result.schemaMarkupCode.forEach((schema, idx) => {
      sections.push(createHeading(`${idx + 1}. ${schema.schemaType}`, HeadingLevel.HEADING_3));
      sections.push(createParagraph(`Rationale: ${schema.rationale}`));
      sections.push(createBoldParagraph('Code:'));
      sections.push(createCodeBlock(schema.code));
    });
  }

  sections.push(createHeading('Content Gap Analysis', HeadingLevel.HEADING_2));
  if (result.contentGapAnalysis.missingSubtopics.length > 0) {
    sections.push(createBoldParagraph('Missing Subtopics:'));
    sections.push(...createBulletList(result.contentGapAnalysis.missingSubtopics));
  }
  if (result.contentGapAnalysis.unansweredQuestions.length > 0) {
    sections.push(createBoldParagraph('Unanswered Questions:'));
    sections.push(...createBulletList(result.contentGapAnalysis.unansweredQuestions));
  }
  if (result.contentGapAnalysis.recommendedSections.length > 0) {
    sections.push(createBoldParagraph('Recommended Sections:'));
    sections.push(...createBulletList(result.contentGapAnalysis.recommendedSections));
  }
  sections.push(createParagraph(`Additional Word Count Needed: ${result.contentGapAnalysis.additionalWordCount} words`));

  sections.push(createHeading('Quick Wins', HeadingLevel.HEADING_2));
  sections.push(createTable(
    ['Action', 'Time', 'Impact'],
    result.seoQuickWins.map(win => [win.action, win.estimatedTime, win.impact])
  ));

  sections.push(createHeading('High Impact Changes', HeadingLevel.HEADING_2));
  sections.push(createTable(
    ['Action', 'Time', 'Impact'],
    result.seoHighImpactChanges.map(change => [change.action, change.estimatedTime, change.impact])
  ));

  sections.push(createHeading('Action Plan', HeadingLevel.HEADING_2));
  sections.push(createHeading('Week 1', HeadingLevel.HEADING_3));
  sections.push(createParagraph(`Actions: ${result.seoActionPlan.week1.actions}`));
  sections.push(createParagraph(`Impact: ${result.seoActionPlan.week1.impact}`));
  sections.push(createHeading('Week 2-4', HeadingLevel.HEADING_3));
  sections.push(createParagraph(`Actions: ${result.seoActionPlan.week2to4.actions}`));
  sections.push(createParagraph(`Impact: ${result.seoActionPlan.week2to4.impact}`));
  sections.push(createHeading('Month 2-3', HeadingLevel.HEADING_3));
  sections.push(createParagraph(`Actions: ${result.seoActionPlan.month2to3.actions}`));
  sections.push(createParagraph(`Impact: ${result.seoActionPlan.month2to3.impact}`));

  sections.push(createHeading('Final Summary', HeadingLevel.HEADING_2));
  sections.push(createParagraph(result.seoFinalSummary));

  sections.push(...createGlossarySection(SEO_GLOSSARY));

  const doc = new Document({
    sections: [{
      footers: { default: createDocxFooter() },
      children: sections,
    }],
  });

  return await Packer.toBlob(doc);
}

export async function exportCopyAnalysisToDocx(result: CopyAnalysisResult, brandName: string): Promise<Blob> {
  const sections: (Paragraph | Table)[] = [];
  const L = getLabels(result.language);

  sections.push(createHeading(`Copy Analysis Report: ${brandName}`, HeadingLevel.HEADING_1));

  sections.push(createHeading('Summary', HeadingLevel.HEADING_2));
  sections.push(createParagraph(result.copySummary));

  sections.push(createHeading('Page Score Summary', HeadingLevel.HEADING_2));
  sections.push(createTable(
    ['Metric', 'Value'],
    [
      ['Overall Score', `${(result.pageScore.overallScore / 10).toFixed(1)}/10`],
      ['Total Blocks', String(result.pageScore.totalBlocks)],
      ['Green Blocks (8.0–10)', `${result.pageScore.greenBlocks} (${result.pageScore.greenPercent}%)`],
      ['Yellow Blocks (6.0–7.9)', `${result.pageScore.yellowBlocks} (${result.pageScore.yellowPercent}%)`],
      ['Red Blocks (0–5.9)', `${result.pageScore.redBlocks} (${result.pageScore.redPercent}%)`],
      ['Weakest Dimension', `${result.pageScore.weakestDimension} (${result.pageScore.weakestDimensionAvg})`],
      ['Strongest Dimension', `${result.pageScore.strongestDimension} (${result.pageScore.strongestDimensionAvg})`],
      ['Reading Level', result.pageScore.readingLevel],
      ['Est. Reading Time', result.pageScore.estimatedReadingTime],
      ['Tone Consistency', result.pageScore.toneConsistency],
    ]
  ));

  sections.push(createHeading('Dimension Averages', HeadingLevel.HEADING_2));
  sections.push(createTable(
    ['Dimension', 'Average', 'Assessment'],
    result.dimensionAverages.map(dim => [
      translateDimension(dim.dimension),
      String(dim.average),
      dim.assessment,
    ])
  ));

  sections.push(createHeading('Copy Heatmap', HeadingLevel.HEADING_2));
  result.copyHeatmap.forEach((block) => {
    const colorEmoji = block.color === 'green' ? '🟢' : block.color === 'yellow' ? '🟡' : '🔴';
    sections.push(createHeading(`${L.blockSection(block.blockNumber)} ${colorEmoji} (Score: ${block.compositeScore})`, HeadingLevel.HEADING_3));
    sections.push(createParagraph(`Preview: ${block.blockTextPreview}`));
  });

  sections.push(createHeading('Detailed Block Analysis', HeadingLevel.HEADING_2));
  result.detailedBlocks.forEach((block) => {
    const colorEmoji = block.color === 'green' ? '🟢' : block.color === 'yellow' ? '🟡' : '🔴';
    sections.push(createHeading(`${L.blockSection(block.blockNumber)} ${colorEmoji}`, HeadingLevel.HEADING_3));
    sections.push(createParagraph(`Score: ${block.compositeScore}/10`));
    sections.push(createBoldParagraph('Original Text:'));
    sections.push(createParagraph(block.originalText));
    sections.push(createBoldParagraph('Dimension Scores:'));
    sections.push(...createBulletList([
      `Claridad: ${block.scores.clarity}`,
      `Fuerza Persuasiva: ${block.scores.persuasion}`,
      `Tono Emocional: ${block.scores.emotionalTone}`,
      `Proporción Beneficio–Característica: ${block.scores.benefitFeatureRatio}`,
      `Lenguaje de Alto Impacto: ${block.scores.powerWords}`,
      `Voz Activa: ${block.scores.activeVoice}`,
      `Relevancia de Conversión: ${block.scores.conversionRelevance}`,
    ]));

    if (block.issues.length > 0) {
      sections.push(createBoldParagraph('Issues:'));
      sections.push(...createBulletList(block.issues));
    }

    if (block.rewrite) {
      sections.push(createBoldParagraph('Suggested Rewrite:'));
      sections.push(createParagraph(block.rewrite));
      if (block.rewriteRationale) {
        sections.push(createParagraph(`Rationale: ${block.rewriteRationale}`));
      }
      if (block.projectedScore) {
        sections.push(createParagraph(`Projected Score: ${block.projectedScore}/10`));
      }
    }
  });

  sections.push(createHeading('Top Priority Rewrites', HeadingLevel.HEADING_2));
  sections.push(createTable(
    ['Priority', 'Block', 'Current Score', 'Issue', 'Projected Score'],
    result.topPriorityRewrites.map(r => [
      String(r.priority),
      L.blockSection(r.blockNumber),
      String(r.currentScore),
      r.issue,
      String(r.projectedScore),
    ])
  ));

  sections.push(createHeading('Pattern Analysis', HeadingLevel.HEADING_2));
  sections.push(createParagraph(`Dominant Weakness: ${result.patternAnalysis.dominantWeakness}`));
  sections.push(createParagraph(`Worst Habit: ${result.patternAnalysis.worstHabit}`));
  if (result.patternAnalysis.recurringPatterns.length > 0) {
    sections.push(createBoldParagraph('Recurring Patterns:'));
    sections.push(...createBulletList(result.patternAnalysis.recurringPatterns));
  }
  sections.push(createBoldParagraph('Coaching Advice:'));
  sections.push(createParagraph(result.patternAnalysis.coachingAdvice));

  sections.push(createHeading('Action Plan', HeadingLevel.HEADING_2));
  sections.push(createTable(
    ['Priority', 'Action', 'Blocks Affected', 'Impact'],
    result.actionPlan.map(item => [
      String(item.priority),
      item.action,
      item.blocksAffected,
      item.impact,
    ])
  ));

  sections.push(createHeading('Final Summary', HeadingLevel.HEADING_2));
  sections.push(createParagraph(result.finalSummary));

  sections.push(...createGlossarySection(COPY_GLOSSARY));

  const doc = new Document({
    sections: [{
      footers: { default: createDocxFooter() },
      children: sections,
    }],
  });

  return await Packer.toBlob(doc);
}
