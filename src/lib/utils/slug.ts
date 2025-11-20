// Slug utility functions
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugify(text: string): string {
  return generateSlug(text);
}

export default { generateSlug, slugify };
