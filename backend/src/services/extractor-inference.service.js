const { randomUUID } = require('crypto');
const { addExtractorFeedback, getExtractorById } = require('./config-service-nodes.service');
const {
  generateDocumentSummary,
  generateTextEmbedding,
  runExtraction
} = require('./openai-extractor.service');
const { uploadFeedbackDocument } = require('./storage.service');

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return null;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (!normA || !normB) {
    return null;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function selectRelevantFeedbacks(feedbacks, embedding, limit = 3) {
  if (!embedding || !feedbacks.length) {
    return [];
  }

  const scored = feedbacks
    .map((feedback) => ({
      feedback,
      score: cosineSimilarity(embedding, feedback.embedding)
    }))
    .filter((item) => item.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((item) => item.feedback);
}

function normalizeExtractionResult(extraction, schema) {
  if (!extraction) {
    return {
      headerFields: (schema.headerFields || []).map((field) => ({
        fieldName: field.fieldName || 'Field',
        value: null
      })),
      tableTypes: (schema.tableTypes || []).map((table) => ({
        tableName: table.tableName || 'Table',
        columns: (table.columns || []).map((column) => ({
          columnName: column.columnName || 'Column',
          value: null
        }))
      }))
    };
  }

  return extraction;
}

async function runExtractorInference({ userId, extractorId, file }) {
  const extractor = await getExtractorById(userId, extractorId);
  if (!extractor) {
    return null;
  }

  const summary = await generateDocumentSummary({
    buffer: file.buffer,
    mimeType: file.mimetype,
    filename: file.originalname
  });
  const embedding = await generateTextEmbedding(summary);

  const feedbacks = (extractor.feedbacks || []).filter((feedback) => Array.isArray(feedback.embedding));
  const relevantFeedbacks = selectRelevantFeedbacks(feedbacks, embedding, 3);

  const extraction = await runExtraction({
    buffer: file.buffer,
    mimeType: file.mimetype,
    filename: file.originalname,
    schema: extractor.schema || { headerFields: [], tableTypes: [] },
    feedbacks: relevantFeedbacks
  });

  return {
    extraction: normalizeExtractionResult(extraction, extractor.schema || { headerFields: [], tableTypes: [] }),
    usedFeedbackIds: relevantFeedbacks.map((item) => item.id),
    documentSummary: summary
  };
}

async function addTrainingFeedbackWithDocument({
  userId,
  extractorId,
  file,
  targetType,
  targetPath,
  feedbackText,
  documentId
}) {
  const extractor = await getExtractorById(userId, extractorId);
  if (!extractor) {
    return null;
  }

  const feedbackId = randomUUID();
  const summary = await generateDocumentSummary({
    buffer: file.buffer,
    mimeType: file.mimetype,
    filename: file.originalname
  });
  const embedding = await generateTextEmbedding(summary);

  const storage = await uploadFeedbackDocument({
    userId,
    extractorId,
    feedbackId,
    fileBuffer: file.buffer,
    fileName: file.originalname,
    mimeType: file.mimetype
  });

  const feedback = await addExtractorFeedback(userId, extractorId, {
    id: feedbackId,
    documentId: documentId || file.originalname || null,
    document: {
      fileName: file.originalname || null,
      mimeType: file.mimetype || null,
      size: file.size || null
    },
    documentSummary: summary,
    embedding,
    storageBucket: storage.bucket,
    storagePath: storage.path,
    targetType,
    targetPath,
    feedbackText
  });

  return feedback;
}

module.exports = {
  addTrainingFeedbackWithDocument,
  runExtractorInference
};
