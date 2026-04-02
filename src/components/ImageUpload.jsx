import React from 'react';
import { proxyImageUrl } from '../utils/imageProxy';

/**
 * ImageUpload — cho phép chọn file ảnh, preview, và upload lên GitHub.
 * Props:
 *   value     — current image URL
 *   onChange  — (url: string) => void
 *   clanId    — clan ID for folder organization
 */
export default function ImageUpload({ value, onChange, clanId }) {
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState(null);
  const [error, setError] = React.useState('');
  const fileRef = React.useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      setError('Chỉ chấp nhận file ảnh');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh không được vượt quá 5MB');
      return;
    }

    setError('');

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
    };
    reader.readAsDataURL(file);

    // Upload
    uploadToGitHub(file);
  };

  const uploadToGitHub = async (file) => {
    setUploading(true);
    setError('');
    try {
      // Convert to base64
      const base64 = await fileToBase64(file);

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          base64Data: base64,
          clanId: clanId || 'general',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lỗi upload');
        return;
      }

      // Set the GitHub raw URL as the image URL
      onChange(data.url);
      setPreview(null); // clear preview, real URL is now set
    } catch (err) {
      setError('Không thể upload ảnh: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove data:image/...;base64, prefix
        const result = reader.result.split(',')[1];
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const displayUrl = preview || (value ? proxyImageUrl(value) : '');

  return (
    <div className="image-upload">
      <div className="image-upload-preview">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Preview"
            className="image-upload-img"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="image-upload-placeholder">
            <span>📷</span>
            <span>Chưa có ảnh</span>
          </div>
        )}
      </div>

      <div className="image-upload-controls">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="image-upload-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '⏳ Đang upload...' : '📤 Chọn & Upload ảnh'}
        </button>

        <div className="image-upload-url">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Hoặc nhập URL ảnh trực tiếp"
          />
        </div>
      </div>

      {error && <div className="image-upload-error">{error}</div>}
      {uploading && (
        <div className="image-upload-progress">
          <div className="upload-spinner" />
          <span>Đang upload lên GitHub...</span>
        </div>
      )}
    </div>
  );
}
