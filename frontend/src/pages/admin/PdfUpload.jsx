import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/PdfUpload.css';

function PdfUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setSuccess('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      // Don't set Content-Type - let browser/axios set it automatically with the correct boundary
      // We need to override the default 'application/json' from the axios instance
      const response = await api.post('/admin/upload-pdf', formData);

      if (response.data.success) {
        setSuccess(`Successfully uploaded! ${response.data.recipesCount} recipe(s) parsed.`);
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('pdf-file-input');
        if (fileInput) fileInput.value = '';

        // Navigate to pending recipes after 2 seconds
        setTimeout(() => {
          navigate('/admin/pending');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload PDF. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin');
  };

  return (
    <div className="pdf-upload-container">
      <div className="pdf-upload-header">
        <h1>Upload Recipe PDF</h1>
        <p className="subtitle">Upload a PDF containing recipes to automatically parse and extract recipe information</p>
      </div>

      <div className="upload-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="pdf-file-input" className="file-label">
              <div className="file-drop-zone">
                {file ? (
                  <div className="file-selected">
                    <div className="file-icon">📄</div>
                    <div className="file-info">
                      <p className="file-name">{file.name}</p>
                      <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="file-placeholder">
                    <div className="upload-icon">📁</div>
                    <p className="upload-text">Click to select a PDF file</p>
                    <p className="upload-hint">or drag and drop</p>
                  </div>
                )}
              </div>
              <input
                id="pdf-file-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="file-input"
              />
            </label>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <span className="success-icon">✓</span>
              {success}
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn btn-secondary"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!file || uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner-small"></span>
                  Uploading...
                </>
              ) : (
                'Upload and Parse'
              )}
            </button>
          </div>
        </form>

        <div className="upload-info">
          <h3>How it works:</h3>
          <ol>
            <li>Select a PDF file containing recipes</li>
            <li>The system will automatically parse and extract recipe information</li>
            <li>Extracted recipes will be saved as pending for review</li>
            <li>Review and approve recipes before they appear in the main collection</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default PdfUpload;
