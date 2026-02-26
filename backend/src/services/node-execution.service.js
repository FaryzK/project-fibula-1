function getValueAtPath(target, path) {
  if (!path) {
    return undefined;
  }

  return path.split('.').reduce((current, segment) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    return current[segment];
  }, target);
}

function setValueAtPath(target, path, value) {
  const pathSegments = path.split('.');
  let current = target;

  for (let index = 0; index < pathSegments.length - 1; index += 1) {
    const segment = pathSegments[index];

    if (typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {};
    }

    current = current[segment];
  }

  current[pathSegments[pathSegments.length - 1]] = value;
}

function evaluateRule(metadata, rule) {
  const actualValue = getValueAtPath(metadata, rule.fieldPath);

  if (rule.operator === 'exists') {
    return actualValue !== undefined && actualValue !== null;
  }

  if (rule.operator === 'not_exists') {
    return actualValue === undefined || actualValue === null;
  }

  if (rule.dataType === 'string') {
    const left = String(actualValue || '');
    const right = String(rule.value || '');

    if (rule.operator === 'equals') {
      return left === right;
    }

    if (rule.operator === 'not_equals') {
      return left !== right;
    }

    if (rule.operator === 'contains') {
      return left.includes(right);
    }

    if (rule.operator === 'not_contains') {
      return !left.includes(right);
    }
  }

  if (rule.dataType === 'number') {
    const left = Number(actualValue);
    const right = Number(rule.value);

    if (Number.isNaN(left) || Number.isNaN(right)) {
      return false;
    }

    if (rule.operator === 'equals') {
      return left === right;
    }

    if (rule.operator === 'not_equals') {
      return left !== right;
    }

    if (rule.operator === 'greater_than') {
      return left > right;
    }

    if (rule.operator === 'less_than') {
      return left < right;
    }

    if (rule.operator === 'greater_or_equal') {
      return left >= right;
    }

    if (rule.operator === 'less_or_equal') {
      return left <= right;
    }
  }

  if (rule.dataType === 'datetime') {
    const left = new Date(actualValue).getTime();
    const right = new Date(rule.value).getTime();

    if (Number.isNaN(left) || Number.isNaN(right)) {
      return false;
    }

    if (rule.operator === 'equals') {
      return left === right;
    }

    if (rule.operator === 'not_equals') {
      return left !== right;
    }

    if (rule.operator === 'greater_than') {
      return left > right;
    }

    if (rule.operator === 'less_than') {
      return left < right;
    }

    if (rule.operator === 'greater_or_equal') {
      return left >= right;
    }

    if (rule.operator === 'less_or_equal') {
      return left <= right;
    }
  }

  if (rule.dataType === 'boolean') {
    if (rule.operator === 'is_true') {
      return Boolean(actualValue) === true;
    }

    if (rule.operator === 'is_false') {
      return Boolean(actualValue) === false;
    }
  }

  return false;
}

function evaluateRules(metadata, logic, rules) {
  const normalizedRules = Array.isArray(rules) ? rules : [];

  if (!normalizedRules.length) {
    return false;
  }

  if (logic === 'OR') {
    return normalizedRules.some((rule) => evaluateRule(metadata, rule));
  }

  return normalizedRules.every((rule) => evaluateRule(metadata, rule));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resolveExpression(expression, context) {
  const trimmed = String(expression || '').trim();

  if (trimmed === '$document') {
    return context.document;
  }

  if (trimmed === '$metadata') {
    return context.metadata;
  }

  if (trimmed.startsWith('$document.')) {
    return getValueAtPath(context.document, trimmed.slice('$document.'.length));
  }

  if (trimmed.startsWith('$metadata.')) {
    return getValueAtPath(context.metadata, trimmed.slice('$metadata.'.length));
  }

  return undefined;
}

function resolveTemplateValue(value, context) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplateValue(item, context));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, resolveTemplateValue(entryValue, context)])
    );
  }

  if (typeof value !== 'string') {
    return value;
  }

  const directExpression = value.match(/^\s*\{\{\s*([^}]+)\s*\}\}\s*$/);

  if (directExpression) {
    const resolved = resolveExpression(directExpression[1], context);
    return resolved === undefined ? '' : resolved;
  }

  return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, expression) => {
    const resolved = resolveExpression(expression, context);

    if (resolved === undefined || resolved === null) {
      return '';
    }

    if (typeof resolved === 'object') {
      return JSON.stringify(resolved);
    }

    return String(resolved);
  });
}

function parseJsonObjectOrThrow(value, fieldName) {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`${fieldName} must resolve to a JSON object`);
      }

      return parsed;
    } catch (error) {
      throw new Error(`${fieldName} must be valid JSON object: ${error.message}`);
    }
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }

  return value;
}

function parseJsonValueOrThrow(value, fieldName) {
  if (value === undefined || value === null) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`${fieldName} must be valid JSON: ${error.message}`);
    }
  }

  return value;
}

function executeManualUploadNode(payload) {
  return {
    document: payload.document,
    metadata: payload.metadata
  };
}

function executeIfNode(payload) {
  const logic = payload.config?.logic || 'AND';
  const rules = payload.config?.rules || [];
  const matches = evaluateRules(payload.metadata || {}, logic, rules);

  return {
    branch: matches ? 'true' : 'false',
    document: payload.document,
    metadata: payload.metadata
  };
}

function executeSwitchNode(payload) {
  const cases = payload.config?.cases || [];
  const metadata = payload.metadata || {};

  for (const switchCase of cases) {
    if (evaluateRule(metadata, switchCase.rule)) {
      return {
        branch: switchCase.id,
        document: payload.document,
        metadata: payload.metadata
      };
    }
  }

  return {
    branch: 'fallback',
    document: payload.document,
    metadata: payload.metadata
  };
}

function executeSetValueNode(payload) {
  const assignments = payload.config?.assignments || [];
  const metadata = JSON.parse(JSON.stringify(payload.metadata || {}));

  assignments.forEach((assignment) => {
    if (!assignment.fieldPath) {
      return;
    }

    setValueAtPath(metadata, assignment.fieldPath, assignment.value);
  });

  return {
    document: payload.document,
    metadata
  };
}

function executeWebhookNode(payload) {
  const webhookPayload = payload.webhookPayload || {};
  const body =
    webhookPayload.body && typeof webhookPayload.body === 'object' ? deepClone(webhookPayload.body) : {};

  const document = webhookPayload.file || body.file || body.document || null;

  if (Object.prototype.hasOwnProperty.call(body, 'file')) {
    delete body.file;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'document')) {
    delete body.document;
  }

  return {
    document,
    metadata: body
  };
}

async function defaultRequestFn({ url, method, headers, body }) {
  const shouldSendBody = !['GET', 'DELETE'].includes(method) && body !== undefined;
  const response = await fetch(url, {
    method,
    headers: headers || {},
    ...(shouldSendBody ? { body: JSON.stringify(body) } : {})
  });

  let responseBody = null;
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  return {
    status: response.status,
    body: responseBody
  };
}

async function executeHttpNode(payload, options = {}) {
  const config = payload.config || {};
  const method = String(config.method || 'POST').toUpperCase();
  const rawUrl = String(config.url || '').trim();

  if (!rawUrl) {
    throw new Error('HTTP node URL is required');
  }

  const context = {
    document: payload.document || {},
    metadata: payload.metadata || {}
  };
  const resolvedUrl = resolveTemplateValue(rawUrl, context);
  const resolvedHeaders = resolveTemplateValue(
    parseJsonObjectOrThrow(config.headers ?? config.headersText, 'Headers'),
    context
  );
  const resolvedBody = resolveTemplateValue(
    parseJsonValueOrThrow(config.body ?? config.bodyText, 'Body'),
    context
  );

  const requestFn = options.requestFn || defaultRequestFn;
  let response;
  try {
    response = await requestFn({
      url: resolvedUrl,
      method,
      headers: resolvedHeaders,
      body: resolvedBody
    });
  } catch (error) {
    throw new Error(`HTTP request failed: ${error.message}`);
  }

  if (!response || response.status < 200 || response.status >= 300) {
    const statusCode = response?.status ?? 'unknown';
    throw new Error(`HTTP request failed with status ${statusCode}`);
  }

  const nextMetadata = deepClone(payload.metadata || {});
  nextMetadata.httpResponse = {
    statusCode: response.status,
    body: response.body
  };

  return {
    document: payload.document,
    metadata: nextMetadata
  };
}

module.exports = {
  executeHttpNode,
  executeIfNode,
  executeManualUploadNode,
  executeSetValueNode,
  executeSwitchNode,
  executeWebhookNode
};
