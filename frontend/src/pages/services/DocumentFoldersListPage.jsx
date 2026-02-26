import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteDocumentFolder, listDocumentFolders } from '../../services/configServiceNodesApi';

export function DocumentFoldersListPage() {
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  async function loadFolders() {
    setIsLoading(true);
    setErrorText('');

    try {
      const data = await listDocumentFolders();
      setFolders(data);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to load document folders');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFolders();
  }, []);

  async function handleDelete(folderId) {
    setErrorText('');

    try {
      await deleteDocumentFolder(folderId);
      await loadFolders();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete document folder');
    }
  }

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Services</span>
          <h1>Document Folders</h1>
          <p className="section-subtitle">Monitor documents held for human review.</p>
        </div>
        <div className="section-actions">
          <Link className="btn btn-primary" to="/app/services/document-folders/new">
            New Folder
          </Link>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {isLoading ? <p>Loading document folders...</p> : null}
      {!isLoading && folders.length === 0 ? <p>No document folders yet.</p> : null}

      {!isLoading && folders.length > 0 ? (
        <div className="card-grid">
          {folders.map((folder) => (
            <div className="card-item" key={folder.id}>
              <div className="card-title">{folder.name}</div>
              <div className="card-meta">Held documents: {folder.heldDocumentCount || folder.heldDocuments?.length || 0}</div>
              <div className="card-meta">Used by nodes: {folder.nodeUsages?.length || 0}</div>
              <div className="panel-actions">
                <Link className="btn btn-outline" to={`/app/services/document-folders/${folder.id}`}>
                  Manage
                </Link>
                <button type="button" className="btn-danger" onClick={() => handleDelete(folder.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
