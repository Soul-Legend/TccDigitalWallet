import {PresentationExchangeRequest} from '../../types';

/**
 * Pure helpers for extracting attribute names from a PEX request.
 * Shared between IntegrityVerifier (only required) and PredicateChecker
 * (all requested) — kept here to avoid duplication.
 */

function extractAttributeName(path: string): string | undefined {
  const match = path.match(/\.([^.]+)$/);
  return match ? match[1] : undefined;
}

/** Only attributes whose `predicate` is `'required'` or undefined. */
export function extractRequiredAttributes(
  pexRequest: PresentationExchangeRequest,
): string[] {
  const attributes: string[] = [];
  for (const descriptor of pexRequest.presentation_definition.input_descriptors) {
    for (const field of descriptor.constraints.fields) {
      if (field.predicate === 'preferred') {
        continue;
      }
      const name = extractAttributeName(field.path[0]);
      if (name) {
        attributes.push(name);
      }
    }
  }
  return attributes;
}

/** Every attribute referenced by the PEX request, required or optional. */
export function extractRequestedAttributes(
  pexRequest: PresentationExchangeRequest,
): string[] {
  const attributes: string[] = [];
  for (const descriptor of pexRequest.presentation_definition.input_descriptors) {
    for (const field of descriptor.constraints.fields) {
      const name = extractAttributeName(field.path[0]);
      if (name) {
        attributes.push(name);
      }
    }
  }
  return attributes;
}
