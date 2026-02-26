const OpenAI = require('openai');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

function buildInputPart({ buffer, mimeType, filename, fileId }) {
  if (mimeType === 'application/pdf') {
    if (fileId) {
      return {
        type: 'input_file',
        file_id: fileId
      };
    }

    return {
      type: 'input_file',
      filename: filename || 'document.pdf',
      file_data: buffer.toString('base64')
    };
  }

  if (mimeType && mimeType.startsWith('image/')) {
    return {
      type: 'input_image',
      image_url: toDataUrl(buffer, mimeType)
    };
  }

  throw new Error('Unsupported document type. Please upload an image or PDF.');
}

async function uploadPdfForInference({ buffer, filename }) {
  const openai = getOpenAIClient();
  const safeName = filename || 'document.pdf';
  const tmpPath = path.join(os.tmpdir(), `fibula-${Date.now()}-${safeName}`);

  await fs.promises.writeFile(tmpPath, buffer);

  try {
    const file = await openai.files.create({
      file: fs.createReadStream(tmpPath),
      purpose: process.env.OPENAI_FILE_PURPOSE || 'user_data'
    });

    return file.id;
  } finally {
    await fs.promises.unlink(tmpPath).catch(() => {});
  }
}

async function generateDocumentSummary({ buffer, mimeType, filename, fileId }) {
  const openai = getOpenAIClient();
  const response = await openai.responses.create({
    model:
      mimeType === 'application/pdf'
        ? process.env.OPENAI_PDF_MODEL || 'gpt-4o-mini'
        : process.env.OPENAI_VLM_MODEL || 'gpt-4.1-mini',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text:
              'Summarize this document in 2-3 sentences. Focus on key fields and tables that appear.'
          },
          buildInputPart({ buffer, mimeType, filename, fileId })
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

function stripCodeFences(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  const match = trimmed.match(/^```[a-zA-Z]*\n([\s\S]*?)```$/);
  if (match && match[1]) {
    return match[1].trim();
  }

  return trimmed.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
}

function extractJsonSubstring(value) {
  const text = String(value || '');
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return text.slice(first, last + 1);
  }
  return text;
}

async function runExtraction({ buffer, mimeType, filename, fileId, schema, feedbacks }) {
  const openai = getOpenAIClient();
  const prompt = `You are extracting structured data from a document.\n\nSchema:\n${formatSchemaInstructions(
    schema
  )}\n\nFeedback to apply:\n${formatFeedbackContext(feedbacks)}\n\nReturn JSON with this exact shape:\n{\n  "headerFields": [{"fieldName": "", "value": ""}],\n  "tableTypes": [{"tableName": "", "columns": [{"columnName": "", "value": ""}]}]\n}\nUse null if a value is missing.`;

  const response = await openai.responses.create({
    model:
      mimeType === 'application/pdf'
        ? process.env.OPENAI_PDF_MODEL || 'gpt-4o-mini'
        : process.env.OPENAI_VLM_MODEL || 'gpt-4.1-mini',
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          buildInputPart({ buffer, mimeType, filename, fileId })
        ]
      }
    ]
  });

  const raw = response.output_text || response.output?.[0]?.content?.[0]?.text || '';
  if (!raw) {
    return null;
  }

  try {
    const sanitized = extractJsonSubstring(stripCodeFences(raw));
    return JSON.parse(sanitized);
  } catch (error) {
    const parsed = { error: 'Invalid JSON from model', raw };
    throw Object.assign(new Error('Invalid JSON from model'), { parsed });
  }
}

module.exports = {
  generateDocumentSummary,
  generateTextEmbedding,
  runExtraction,
  uploadPdfForInference
};
