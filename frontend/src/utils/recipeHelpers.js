/**
 * Get CSS class name for a recipe tag based on its content
 * @param {string} tag - The tag name
 * @returns {string} CSS class name
 */
export const getTagClass = (tag) => {
  const tagLower = tag.toLowerCase();
  if (tagLower.includes('dessert')) return 'tag-dessert';
  if (tagLower.includes('breakfast')) return 'tag-breakfast';
  if (tagLower.includes('main')) return 'tag-main';
  if (tagLower.includes('baking')) return 'tag-baking';
  if (tagLower.includes('appetizer')) return 'tag-appetizer';
  if (tagLower.includes('soup')) return 'tag-soup';
  return 'tag-default';
};

/**
 * Format Unix timestamp to readable date
 * @param {number} timestamp - Unix timestamp in seconds
 * @param {boolean} short - Use short format (default: true)
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp, short = true) => {
  const date = new Date(timestamp * 1000);
  if (short) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  }
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};
