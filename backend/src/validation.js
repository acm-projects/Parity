function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validateFigmaProjectBody(body) {
  if (!body || !isNonEmptyString(body.file_url)) {
    return "file_url is required";
  }

  return null;
}

function validateFrameBody(body) {
  if (!body || !isNonEmptyString(body.frame_id)) {
    return "frame_id is required";
  }

  return null;
}

function validateCompareBody(body) {
  if (!body) {
    return "Request body is required";
  }

  if (!isPositiveNumber(body.project_id)) {
    return "project_id must be a positive number";
  }

  if (!body.element || typeof body.element !== "object") {
    return "element is required";
  }

  if (!isNonEmptyString(body.element.tag)) {
    return "element.tag is required";
  }

  if (
    body.figma_node_id !== undefined &&
    body.figma_node_id !== null &&
    !isNonEmptyString(body.figma_node_id)
  ) {
    return "figma_node_id must be a non-empty string";
  }

  return null;
}

module.exports = {
  validateFigmaProjectBody,
  validateFrameBody,
  validateCompareBody,
};