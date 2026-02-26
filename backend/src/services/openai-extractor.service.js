const OpenAI = require('openai');

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
}

function toDataUrl(buffer, mimeType) {
  const base64 = buffer.toString('base64');
  const safeType = mimeType || 'application/octet-stream';
  return `data:${safeType};base64,${base64}`;
}

async function generateDocumentSummary({ buffer, mimeType }) {
  const openai = getOpenAIClient();
  const response = await openai.responses.create({
    model: process.env.OPENAI_VLM_MODEL || 'gpt-4.1-mini',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text:
              'Summarize this document in 2-3 sentences. Focus on key fields and tables that appear.'
          },
          {
            type: 'input_image',
            image_url: toDataUrl(buffer, mimeType)
          }
        ]
      }
    ]
  });

  return (response.output_text || '').trim();
}

async function generateTextEmbedding(text) {
  if (!text) {
    return null;
  }

  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    input: text
  });

  return response.data?.[0]?.embedding || null;
}

function formatSchemaInstructions(schema) {
  const headerFields = (schema.headerFields || [])
    .map((field) => `- ${field.fieldName}: ${field.description || 'No description'}`)
    .join('\n');
  const tableTypes = (schema.tableTypes || [])
    .map((table) => {
      const columns = (table.columns || [])
        .map((column) => `  - ${column.columnName}: ${column.description || 'No description'}`)
        .join('\n');
      return `- ${table.tableName}: ${table.description || 'No description'}\n${columns}`;
    })
    .join('\n');

  return `Header Fields:\n${headerFields || 'None'}\n\nTable Types:\n${tableTypes || 'None'}`;
}

function formatFeedbackContext(feedbacks) {
  if (!feedbacks.length) {
    return 'No prior feedback available.';
  }

  return feedbacks
    .map((feedback) => {
      return `- Target: ${feedback.targetType || 'field'} ${feedback.targetPath || ''}\n  Feedback: ${feedback.feedbackText}`;
    })
    .join('\n');
}

async function runExtraction({ buffer, mimeType, schema, feedbacks }) {
  const openai = getOpenAIClient();
  const prompt = `You are extracting structured data from a document.\n\nSchema:\n${formatSchemaInstructions(
    schema
  )}\n\nFeedback to apply:\n${formatFeedbackContext(feedbacks)}\n\nReturn JSON with this exact shape:\n{\n  "headerFields": [{"fieldName": "", "value": ""}],\n  "tableTypes": [{"tableName": "", "columns": [{"columnName": "", "value": ""}]}]\n}\nUse null if a value is missing.`;

  const response = await openai.responses.create({
    model: process.env.OPENAI_VLM_MODEL || 'gpt-4.1-mini',
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: toDataUrl(buffer, mimeType) }
        ]
      }
    ]
  });

  const raw = response.output_text || response.output?.[0]?.content?.[0]?.text || '';
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const parsed = { error: 'Invalid JSON from model', raw };
    throw Object.assign(new Error('Invalid JSON from model'), { parsed });
  }
}

module.exports = {
  generateDocumentSummary,
  generateTextEmbedding,
  runExtraction
};
