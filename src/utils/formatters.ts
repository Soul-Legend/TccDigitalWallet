/**
 * Shared formatting utilities used across multiple components.
 */

/**
 * Converts a snake_case attribute name to a human-readable Title Case format.
 *
 * Example: "nome_completo" → "Nome Completo"
 */
export const formatAttributeName = (attr: string): string => {
  return attr
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
