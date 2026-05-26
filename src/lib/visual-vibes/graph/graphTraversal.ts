// Matches input expressions such as `${steps.normalize_request.output}`.
const STEP_REFERENCE_REGEX = /\$\{steps\.([a-zA-Z0-9_-]+)\./g;

/** Returns step ids referenced by `${steps.*}` expressions inside any value. */
export function getReferencedStepIds(value: unknown) {
  const valueText = JSON.stringify(value);
  const matches = valueText.matchAll(STEP_REFERENCE_REGEX);

  return Array.from(matches, (match) => match[1]);
}
