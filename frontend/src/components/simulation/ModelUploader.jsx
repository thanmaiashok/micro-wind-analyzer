import React, { useCallback, useState } from 'react';

export default function ModelUploader({ onModelUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileDetails, setFileDetails] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file) => {
    // Check if it's a 3D model (very basic check)
    const name = file.name.toLowerCase();
    if (name.endsWith('.glb') || name.endsWith('.gltf')) {
      const url = URL.createObjectURL(file);
      setFileDetails({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      });
      onModelUpload(url);
    } else {
      alert('Please upload a .glb or .gltf file.');
    }
  };

  return (
    <div className="sim-section">
      <div className="sim-section-title">Building Model</div>
      
      {!fileDetails ? (
        <div 
          className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('model-upload').click()}
        >
          <input 
            type="file" 
            id="model-upload" 
            style={{ display: 'none' }} 
            accept=".glb,.gltf"
            onChange={handleChange}
          />
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <div className="upload-label">Upload 3D Map</div>
          <div className="upload-sub">Drag & drop or click to browse</div>
          
          <div className="upload-formats">
            <span className="format-tag">GLB</span>
            <span className="format-tag">GLTF</span>
          </div>
        </div>
      ) : (
        <div className="uploaded-file">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <div className="uploaded-file-name" title={fileDetails.name}>{fileDetails.name}</div>
          <div className="uploaded-file-size">{fileDetails.size}</div>
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 8 }}
            onClick={(e) => {
              e.stopPropagation();
              setFileDetails(null);
              onModelUpload(null);
            }}
            title="Remove model"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
