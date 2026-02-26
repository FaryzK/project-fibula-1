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

module.exports = {
  executeIfNode,
  executeManualUploadNode,
  executeSetValueNode,
  executeSwitchNode
};
