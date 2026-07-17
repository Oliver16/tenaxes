import { z } from 'zod'
import { ANALYSIS_HEADLINE_EDITORIAL_MAX_CHARS } from './headline'

export const confidenceSchema = z.enum(['low', 'medium', 'high'])
export const tensionClassificationSchema = z.enum([
  'principled_domain_exception', 'coherent_tradeoff', 'context_dependent_preference',
  'unresolved_inconsistency', 'selective_application', 'possible_hypocrisy',
  'likely_hypocrisy', 'irrational_tension', 'insufficient_evidence'
])
export const engagementClassificationSchema = z.enum([
  'strongly_engaged', 'selectively_engaged', 'genuinely_moderate',
  'counterbalanced_convictions', 'context_dependent', 'apparent_low_salience',
  'possible_knowledge_gap', 'possible_avoidance_or_ambivalence', 'insufficient_evidence'
])
export const centerShapeSchema = z.enum([
  'not_center', 'low_intensity_center', 'counterbalanced_center',
  'contextual_center', 'uncertain_center', 'insufficient_evidence'
])

const boundedText = z.string().trim().min(1).max(4000)
const headlineText = boundedText.max(200).describe(
  `A complete standalone headline of no more than ${ANALYSIS_HEADLINE_EDITORIAL_MAX_CHARS} characters. Never end with a dangling word, hyphen, dash, or punctuation mark.`
)
const ids = z.array(z.string().min(1).max(100)).max(30)
const questionIds = z.array(z.number().int().positive()).max(60)
const stableOutputId = z.string().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/)

export const personalizedAnalysisSchema = z.object({
  schema_version: z.literal('1'),
  analysis_stage: z.enum(['provisional', 'refined']),
  headline: headlineText,
  executive_summary: boundedText,
  overall_assessment: z.object({
    ideological_coherence: z.enum(['high', 'mostly_coherent', 'mixed', 'significant_unresolved_tensions', 'insufficient_evidence']),
    engagement: z.enum(['strongly_engaged', 'selectively_engaged', 'broadly_moderate', 'apparent_low_salience', 'uncertain']),
    candor_summary: boundedText,
    confidence: confidenceSchema
  }).strict(),
  defining_commitments: z.array(z.object({
    title: boundedText.max(200), analysis: boundedText, axis_ids: ids,
    question_ids: questionIds, confidence: confidenceSchema
  }).strict()).min(3).max(6),
  center_explanations: z.array(z.object({
    axis_id: z.string().min(1), shape: centerShapeSchema, analysis: boundedText, question_ids: questionIds
  }).strict()).max(30),
  tensions: z.array(z.object({
    tension_id: stableOutputId, classification: tensionClassificationSchema,
    severity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    confidence: confidenceSchema, title: boundedText.max(200), verdict: boundedText,
    principle_or_commitment: boundedText, conflicting_pattern: boundedText,
    why_it_may_be_coherent: z.array(boundedText).min(1).max(5),
    why_it_may_be_incoherent: z.array(boundedText).min(1).max(5),
    generalization_test: boundedText, axis_ids: ids, question_ids: questionIds,
    pair_ids: ids, clarifying_question_id: stableOutputId.nullable()
  }).strict()).max(8),
  engagement_and_knowledge: z.object({
    overall_analysis: boundedText,
    topics: z.array(z.object({
      topic: boundedText.max(200), classification: engagementClassificationSchema,
      confidence: confidenceSchema, analysis: boundedText,
      alternative_explanations: z.array(boundedText).min(1).max(5), question_ids: questionIds
    }).strict()).max(10)
  }).strict(),
  domain_specific_exceptions: z.array(z.object({
    title: boundedText.max(200),
    status: z.enum(['coherent', 'plausibly_coherent', 'self_serving_risk', 'unresolved']),
    analysis: boundedText, generalizable_rule: boundedText.nullable(), analogous_case_test: boundedText,
    axis_ids: ids, question_ids: questionIds
  }).strict()).max(5),
  blind_spots: z.array(z.object({
    title: boundedText.max(200), analysis: boundedText, confidence: confidenceSchema, question_ids: questionIds
  }).strict()).max(5),
  clarifying_questions: z.array(z.object({
    clarification_id: stableOutputId, question: boundedText.max(500),
    why_it_matters: boundedText.max(1000), related_tension_ids: ids
  }).strict()).max(5),
  reflection_questions: z.array(boundedText.max(500)).min(3).max(6),
  limitations: z.array(boundedText.max(1000)).min(2).max(5)
}).strict()

export const personalizedAnalysisJsonSchema = z.toJSONSchema(personalizedAnalysisSchema, {
  target: 'draft-7', unrepresentable: 'any'
}) as Record<string, unknown>

export const generateRequestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('generate'), general_context: z.string().optional() }).strict(),
  z.object({
    action: z.literal('refine'), parent_analysis_id: z.string().uuid(), general_context: z.string().optional(),
    clarification_answers: z.array(z.object({ clarification_id: z.string().min(1).max(100), answer: z.string() }).strict()).max(5)
  }).strict()
])
