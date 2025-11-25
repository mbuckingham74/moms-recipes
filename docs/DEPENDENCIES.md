# Dependency Notes & Alternatives

## PDF Processing

### Current: `pdf-parse` (v1.1.1)

**Pros:**
- Simple, lightweight API
- Works well for text-based PDFs
- No external dependencies
- Fast for our use case

**Cons:**
- Last updated in 2019 (not actively maintained)
- Only supports text extraction (no OCR)
- May have issues with newer PDF formats
- Limited support for complex PDF structures

**Status:** ✅ Currently works well for our needs

### Alternatives to Consider (Future):

#### 1. **pdf-lib** (if pdf-parse becomes problematic)
- More actively maintained
- Better support for modern PDF formats
- Can also create/modify PDFs
- Larger bundle size

#### 2. **pdfjs-dist** (Mozilla's PDF.js)
- Actively maintained by Mozilla
- Full-featured PDF rendering
- Works in browser and Node.js
- More complex API
- **Best for:** If we need robust, long-term support

#### 3. **OCR Solutions** (for scanned PDFs)

**Tesseract.js:**
- Browser and Node.js support
- Free, open-source
- Multiple language support
- Slower (10-30 seconds per page)
- Requires training data

**Google Cloud Vision API:**
- Commercial OCR service
- Very accurate
- Pay-per-use pricing
- External dependency

**AWS Textract:**
- Commercial OCR service
- Good for structured documents
- Pay-per-use pricing
- External dependency

### Migration Strategy (if needed):

If `pdf-parse` stops working:

1. **Short-term fix:** Pin to current version (1.1.1)
2. **Medium-term:** Switch to `pdfjs-dist`
3. **Long-term:** Add OCR support for scanned PDFs

### Current Implementation:

Our PDF processing is abstracted in `backend/src/services/pdfParser.js`, making it easy to swap out the underlying library without changing the rest of the codebase.

```javascript
// Easy to swap implementation
class PDFParser {
  static async extractText(filePath) {
    // Could swap pdf-parse for another library here
    const data = await pdf(dataBuffer);
    return data.text;
  }
}
```

---

## Anthropic Claude SDK

### Current: `@anthropic-ai/sdk` (v0.17.0)

**Status:** ✅ Official SDK, actively maintained

**Alternatives:**
- Direct API calls (more control, less convenience)
- OpenAI GPT-4 (similar capabilities, different API)

---

## Authentication

### Current: `jsonwebtoken` + `bcrypt`

**Status:** ✅ Industry standard, actively maintained

Both libraries are widely used and well-maintained. No changes needed.

---

## File Upload

### Current: `multer` (v1.4.5-lts.1)

**Status:** ✅ Stable, widely used

Multer is the de-facto standard for Express file uploads. The LTS version ensures long-term support.

---

## Monitoring Recommendations

### Check quarterly:
1. `npm outdated` - Check for updates
2. `npm audit` - Check for security vulnerabilities
3. Review GitHub issues for critical bugs

### Auto-update (safe):
- Patch versions: Always (1.2.3 → 1.2.4)
- Minor versions: After testing (1.2.0 → 1.3.0)
- Major versions: Manual review (1.0.0 → 2.0.0)

---

## Security Dependencies

Keep these updated regularly:
- `bcrypt` - Security critical
- `jsonwebtoken` - Security critical
- All `@anthropic-ai/*` packages

---

*Last reviewed: November 2024*
