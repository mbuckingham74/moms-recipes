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
 * Format timestamp to readable date
 * Handles Unix seconds, milliseconds, and ISO strings
 * @param {number|string} timestamp - Unix timestamp (seconds or ms) or ISO string
 * @param {boolean} short - Use short format (default: true)
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp, short = true) => {
  let date;

  if (typeof timestamp === 'string') {
    // ISO string
    date = new Date(timestamp);
  } else if (typeof timestamp === 'number') {
    // Assume milliseconds if > year 2000 in seconds (946684800)
    // This handles both Unix seconds and milliseconds correctly
    date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
  } else {
    return 'Invalid Date';
  }

  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

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
