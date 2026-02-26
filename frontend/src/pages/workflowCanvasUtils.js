const NODE_COLLISION_THRESHOLD_X = 100;
const NODE_COLLISION_THRESHOLD_Y = 70;
const NODE_PLACEMENT_OFFSET = {
  x: 120,
  y: -80
};

function isColliding(candidate, existingNode) {
  const deltaX = Math.abs(candidate.x - existingNode.position.x);
  const deltaY = Math.abs(candidate.y - existingNode.position.y);

  return deltaX < NODE_COLLISION_THRESHOLD_X && deltaY < NODE_COLLISION_THRESHOLD_Y;
}

export function getNextAvailablePosition({ desiredPosition, existingNodes }) {
  let candidate = {
    x: desiredPosition.x,
    y: desiredPosition.y
  };

  while (existingNodes.some((node) => isColliding(candidate, node))) {
    candidate = {
      x: candidate.x + NODE_PLACEMENT_OFFSET.x,
      y: candidate.y + NODE_PLACEMENT_OFFSET.y
    };
  }

  return candidate;
}

export function filterNodeTemplates(templates, searchQuery) {
  const query = (searchQuery || '').trim().toLowerCase();

  if (!query) {
    return templates;
  }

  return templates.filter((template) => {
    return (
      template.label.toLowerCase().includes(query) || template.key.toLowerCase().includes(query)
    );
  });
}

export function findRecenterTarget(nodes) {
  if (!nodes.length) {
    return { x: 0, y: 0 };
  }

  const oldestNode = nodes.reduce((oldest, current) => {
    const oldestDate = new Date(oldest.data?.createdAt || 0).getTime();
    const currentDate = new Date(current.data?.createdAt || 0).getTime();

    return currentDate < oldestDate ? current : oldest;
  });

  return {
    x: oldestNode.position.x,
    y: oldestNode.position.y
  };
}
