const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Supabase credentials are not configured');
    }

    supabaseClient = createClient(url, key, {
      auth: { persistSession: false }
    });
  }

  return supabaseClient;
}

function getFeedbackBucket() {
  return process.env.SUPABASE_EXTRACTOR_FEEDBACK_BUCKET || 'extractor-feedback';
}

async function uploadFeedbackDocument({
  userId,
  extractorId,
  feedbackId,
  fileBuffer,
  fileName,
  mimeType
}) {
  const bucket = getFeedbackBucket();
  const safeName = fileName || 'document';
  const path = `${userId}/${extractorId}/${feedbackId}/${safeName}`;
  const client = getSupabaseClient();

  const { error } = await client.storage.from(bucket).upload(path, fileBuffer, {
    contentType: mimeType || 'application/octet-stream',
    upsert: true
  });

  if (error) {
    throw new Error(error.message || 'Failed to upload document');
  }

  return { bucket, path };
}

async function deleteFeedbackDocument({ bucket, path }) {
  if (!bucket || !path) {
    return;
  }

  const client = getSupabaseClient();
  const { error } = await client.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(error.message || 'Failed to delete document');
  }
}

module.exports = {
  deleteFeedbackDocument,
  uploadFeedbackDocument
};
