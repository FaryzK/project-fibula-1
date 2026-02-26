function getPathValue(target, path) {
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

function setPathValue(target, path, value) {
  const segments = path.split('.');
  let current = target;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];

    if (typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {};
    }

    current = current[segment];
  }

  current[segments[segments.length - 1]] = value;
}

function evaluateRule(metadata, rule) {
  const actualValue = getPathValue(metadata, rule.fieldPath);

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

function evaluateRules(metadata, rules, logic) {
  if (!rules?.length) {
    return false;
  }

  if (logic === 'OR') {
    return rules.some((rule) => evaluateRule(metadata, rule));
  }

  return rules.every((rule) => evaluateRule(metadata, rule));
}

export function getDefaultNodeConfig(nodeTypeKey) {
  if (nodeTypeKey === 'if') {
    return {
      logic: 'AND',
      rules: [
        {
          fieldPath: '',
          dataType: 'string',
          operator: 'equals',
          value: ''
        }
      ]
    };
  }

  if (nodeTypeKey === 'switch') {
    return {
      cases: [
        {
          id: 'case_1',
          label: 'Case 1',
          rule: {
            fieldPath: '',
            dataType: 'string',
            operator: 'equals',
            value: ''
          }
        }
      ]
    };
  }

  if (nodeTypeKey === 'set_value') {
    return {
      assignments: [{ fieldPath: '', value: '' }]
    };
  }

  if (nodeTypeKey === 'manual_upload') {
    return {
      acceptedFileTypes: ['pdf', 'jpeg', 'jpg', 'tiff', 'png']
    };
  }

  return {};
}

export function getNodePorts(nodeData) {
  const nodeTypeKey = nodeData.nodeTypeKey;
  const outputs = [];
  const inputs = [];

  if (nodeTypeKey !== 'manual_upload') {
    inputs.push({ id: 'in-primary', label: 'In' });
  }

  if (nodeTypeKey === 'if') {
    outputs.push({ id: 'out-true', label: 'True' });
    outputs.push({ id: 'out-false', label: 'False' });
    return { inputs, outputs };
  }

  if (nodeTypeKey === 'switch') {
    const switchCases = nodeData.config?.cases || [];

    switchCases.forEach((switchCase) => {
      outputs.push({
        id: `out-${switchCase.id}`,
        label: switchCase.label || switchCase.id
      });
    });

    outputs.push({ id: 'out-fallback', label: 'Fallback' });
    return { inputs, outputs };
  }

  outputs.push({ id: 'out-primary', label: 'Out' });
  return { inputs, outputs };
}

export function evaluateIfNodePreview(metadata, config) {
  const matches = evaluateRules(metadata || {}, config.rules || [], config.logic || 'AND');
  return matches ? 'true' : 'false';
}

export function evaluateSwitchNodePreview(metadata, config) {
  const switchCases = config.cases || [];

  for (const switchCase of switchCases) {
    if (evaluateRule(metadata || {}, switchCase.rule || {})) {
      return switchCase.id;
    }
  }

  return 'fallback';
}

export function applySetValuePreview(metadata, config) {
  const nextMetadata = JSON.parse(JSON.stringify(metadata || {}));

  (config.assignments || []).forEach((assignment) => {
    if (!assignment.fieldPath) {
      return;
    }

    setPathValue(nextMetadata, assignment.fieldPath, assignment.value);
  });

  return nextMetadata;
}
