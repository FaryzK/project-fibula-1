const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;
const ensuredBuckets = new Set();

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

function isBucketMissingError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('bucket not found');
}

function isAlreadyExistsError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('already exists');
}

async function ensureFeedbackBucketExists(client, bucket) {
  if (ensuredBuckets.has(bucket)) {
    return;
  }

  const { data, error } = await client.storage.getBucket(bucket);

  if (!error && data) {
    ensuredBuckets.add(bucket);
    return;
  }

  if (error && !isBucketMissingError(error)) {
    throw new Error(error.message || 'Failed to check storage bucket');
  }

  const { error: createError } = await client.storage.createBucket(bucket, {
    public: false
  });

  if (createError && !isAlreadyExistsError(createError)) {
    throw new Error(createError.message || 'Failed to create storage bucket');
  }

  ensuredBuckets.add(bucket);
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
  await ensureFeedbackBucketExists(client, bucket);

  let { error } = await client.storage.from(bucket).upload(path, fileBuffer, {
    contentType: mimeType || 'application/octet-stream',
    upsert: true
  });

  // Handle race conditions where bucket creation and upload happen close together.
  if (error && isBucketMissingError(error)) {
    ensuredBuckets.delete(bucket);
    await ensureFeedbackBucketExists(client, bucket);
    const retry = await client.storage.from(bucket).upload(path, fileBuffer, {
      contentType: mimeType || 'application/octet-stream',
      upsert: true
    });
    error = retry.error;
  }

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
