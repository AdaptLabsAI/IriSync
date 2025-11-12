/**
 * Generates a URL-friendly slug from a given string
 * @param {string} text - The text to slugify
 * @returns {string} - The slugified text
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

/**
 * Creates a unique slug by appending a number if the original slug already exists
 * @param {string} baseSlug - The original slug
 * @param {Function} checkExists - Async function to check if slug exists
 * @returns {Promise<string>} - A unique slug
 */
export async function createUniqueSlug(
  baseSlug: string, 
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = baseSlug;
  let iteration = 1;
  
  while (await checkExists(slug)) {
    slug = `${baseSlug}-${iteration}`;
    iteration++;
  }
  
  return slug;
} 