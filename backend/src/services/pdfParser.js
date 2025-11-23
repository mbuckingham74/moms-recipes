const pdf = require('pdf-parse');
const fs = require('fs').promises;

class PDFParser {
  /**
   * Extract text from PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<Object>} - Extracted data
   */
  static async extractText(filePath) {
    try {
      // Read PDF file
      const dataBuffer = await fs.readFile(filePath);

      // Parse PDF
      const data = await pdf(dataBuffer);

      return {
        text: data.text,
        numpages: data.numpages,
        info: data.info,
        metadata: data.metadata
      };
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Clean extracted text
   * Removes extra whitespace, normalizes line breaks
   * @param {string} text
   * @returns {string}
   */
  static cleanText(text) {
    if (!text) return '';

    return text
      // Remove multiple spaces
      .replace(/[ \t]+/g, ' ')
      // Normalize line breaks (max 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Trim each line
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Trim overall
      .trim();
  }

  /**
   * Extract and clean text from PDF
   * @param {string} filePath
   * @returns {Promise<string>}
   */
  static async extractAndClean(filePath) {
    const data = await this.extractText(filePath);
    return this.cleanText(data.text);
  }
}

module.exports = PDFParser;
