/**
 * @file generateSlug.js
 * @description Utility to generate and format clean URL-friendly slugs from strings.
 */

/**
 * Generate a URL-friendly slug from text
 * @param {string} text 
 * @returns {string} e.g. "Dr. Priya Sharma" -> "dr-priya-sharma"
 */
const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, '-')     // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')         // Trim hyphens from start
    .replace(/-+$/, '');        // Trim hyphens from end
};

module.exports = {
  generateSlug,
};
