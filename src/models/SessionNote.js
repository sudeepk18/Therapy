/**
 * @file SessionNote.js
 * @description Mongoose model for Session Notes.
 *
 * SessionNotes are structured clinical records attached to a Session.
 * They support multiple note types (SOAP, DAP, free-form, etc.) and include
 * a digital-signature flow for compliance / audit purposes.
 *
 * Relationships:
 *   - Many SessionNotes → one Session
 *   - Many SessionNotes → one Therapist (author)
 *   - Many SessionNotes → one Client (subject)
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema: SOAP Note Fields ────────────────────────────────────────────
// Used when noteType === 'soap'
const SoapSchema = new Schema(
  {
    // Subjective – what the client reported / said
    subjective: { type: String, maxlength: 5000 },

    // Objective – observable / measurable findings
    objective: { type: String, maxlength: 5000 },

    // Assessment – therapist's clinical impression / diagnosis
    assessment: { type: String, maxlength: 5000 },

    // Plan – treatment plan, homework, next steps
    plan: { type: String, maxlength: 5000 },
  },
  { _id: false }
);

// ─── Sub-schema: DAP Note Fields ─────────────────────────────────────────────
// Used when noteType === 'dap'
const DapSchema = new Schema(
  {
    // Data – factual information gathered in the session
    data: { type: String, maxlength: 5000 },

    // Assessment – therapist's interpretation of the data
    assessment: { type: String, maxlength: 5000 },

    // Plan – next actions, interventions, homework
    plan: { type: String, maxlength: 5000 },
  },
  { _id: false }
);

// ─── Sub-schema: Risk Assessment ─────────────────────────────────────────────
const RiskAssessmentSchema = new Schema(
  {
    // Suicidal ideation level
    suicidalIdeation: {
      type: String,
      enum: ['none', 'passive', 'active_without_plan', 'active_with_plan'],
      default: 'none',
    },

    // Self-harm risk level
    selfHarmRisk: {
      type: String,
      enum: ['none', 'low', 'moderate', 'high'],
      default: 'none',
    },

    // Whether a safety plan was created or updated this session
    safetyPlanUpdated: { type: Boolean, default: false },

    // Free-text notes on the risk assessment
    notes: { type: String, maxlength: 2000 },
  },
  { _id: false }
);

// ─── Main Schema ─────────────────────────────────────────────────────────────
const SessionNoteSchema = new Schema(
  {
    // ── Relationships ────────────────────────────────────────────────────────

    // The session this note belongs to
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session reference is required'],
      index: true,
    },

    // The therapist who authored this note
    therapistId: {
      type: Schema.Types.ObjectId,
      ref: 'Therapist',
      required: [true, 'Therapist reference is required'],
      index: true,
    },

    // The client this note is about
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client reference is required'],
      index: true,
    },

    // ── Note Type ────────────────────────────────────────────────────────────

    // The clinical documentation format used for this note
    noteType: {
      type: String,
      enum: [
        'soap',         // Subjective – Objective – Assessment – Plan
        'dap',          // Data – Assessment – Plan
        'birp',         // Behaviour – Intervention – Response – Plan
        'progress',     // General progress note (free-text)
        'intake',       // Initial intake / assessment note
        'discharge',    // Discharge summary
        'crisis',       // Crisis intervention note
        'consultation', // Supervisor / peer consultation note
        'miscellaneous' // Other / non-standard
      ],
      required: [true, 'Note type is required'],
      default: 'progress',
    },

    // ── Content Fields ───────────────────────────────────────────────────────

    // Title / heading for the note (auto-generated or custom)
    title: { type: String, trim: true, maxlength: 200 },

    // General free-text content – used for progress, misc, and as a fallback
    content: { type: String, maxlength: 20000 },

    // Structured SOAP fields (populated when noteType === 'soap')
    soap: { type: SoapSchema, default: null },

    // Structured DAP fields (populated when noteType === 'dap')
    dap: { type: DapSchema, default: null },

    // ── Risk & Safety ────────────────────────────────────────────────────────
    riskAssessment: { type: RiskAssessmentSchema, default: () => ({}) },

    // ── Clinical Markers ─────────────────────────────────────────────────────

    // DSM-5 / ICD-11 diagnosis codes discussed or updated this session
    diagnosisCodes: [{ type: String, trim: true }],

    // Therapeutic interventions used (e.g. 'CBT', 'Mindfulness', 'EMDR')
    interventionsUsed: [{ type: String, trim: true }],

    // Homework assigned to the client
    homework: { type: String, maxlength: 2000 },

    // Progress rating on a standardised scale (e.g. GAF 0-100)
    progressRating: {
      type: Number,
      min: 0,
      max: 100,
    },

    // Client's self-reported mood at the start of the session (1-10)
    clientMoodAtStart: { type: Number, min: 1, max: 10 },

    // Client's self-reported mood at the end of the session (1-10)
    clientMoodAtEnd: { type: Number, min: 1, max: 10 },

    // ── Status & Workflow ────────────────────────────────────────────────────

    // Lifecycle state of the note
    status: {
      type: String,
      enum: [
        'draft',     // Therapist is still writing
        'finalized', // Note is complete but not yet signed
        'signed',    // Digitally signed and locked
        'amended',   // Signed note with an approved amendment
      ],
      default: 'draft',
    },

    // Whether the note has been cryptographically signed by the therapist
    isSigned: { type: Boolean, default: false },

    // Timestamp when the therapist signed / finalized the note
    signedAt: { type: Date },

    // Hash or signature token for tamper-evident records
    signatureHash: { type: String, select: false },

    // ── Sharing ───────────────────────────────────────────────────────────────

    // Whether the client can view this note in their portal
    isSharedWithClient: { type: Boolean, default: false },

    // Timestamp when the note was shared with the client
    sharedWithClientAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
SessionNoteSchema.index({ therapistId: 1, createdAt: -1 });   // Therapist's recent notes
SessionNoteSchema.index({ clientId: 1, createdAt: -1 });      // Client's note history
SessionNoteSchema.index({ therapistId: 1, status: 1 });       // Unsigned / draft notes queue

// ─── Export ───────────────────────────────────────────────────────────────────
const SessionNote = mongoose.model('SessionNote', SessionNoteSchema);
module.exports = SessionNote;
