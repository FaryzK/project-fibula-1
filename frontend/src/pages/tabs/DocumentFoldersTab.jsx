import React, { useEffect, useState } from 'react';
import {
  createDocumentFolder,
  deleteDocumentFolder,
  listDocumentFolders,
  sendOutFromFolder,
  updateDocumentFolder
} from '../../services/configServiceNodesApi';

export function DocumentFoldersTab() {
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [folderName, setFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState(null);

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

  async function handleSubmit() {
    if (!folderName.trim()) {
      setErrorText('Folder name is required');
      return;
    }

    setErrorText('');

    try {
      if (editingFolderId) {
        await updateDocumentFolder(editingFolderId, { name: folderName });
      } else {
        await createDocumentFolder({ name: folderName });
      }

      setFolderName('');
      setEditingFolderId(null);
      await loadFolders();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save document folder');
    }
  }

  async function handleDelete(folderId) {
    setErrorText('');

    try {
      await deleteDocumentFolder(folderId);
      await loadFolders();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete document folder');
    }
  }

  async function handleSendOutAll(folder) {
    const documentIds = (folder.heldDocuments || []).map((item) => item.document?.id).filter(Boolean);

    if (!documentIds.length) {
      return;
    }

    await sendOutFromFolder(folder.id, { documentIds });
    await loadFolders();
  }

  function beginEdit(folder) {
    setEditingFolderId(folder.id);
    setFolderName(folder.name);
  }

  function cancelEdit() {
    setEditingFolderId(null);
    setFolderName('');
  }

  return (
    <section className="panel-grid">
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Document Folders</h2>
            <p>Create folders to hold documents for human review and send-out.</p>
          </div>
        </div>

        <div className="form-grid">
          <label htmlFor="document-folder-name">Folder name</label>
          <input
            id="document-folder-name"
            type="text"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
          />
        </div>

        <div className="panel-actions">
          <button type="button" className="btn-primary" onClick={handleSubmit}>
            {editingFolderId ? 'Save Folder' : 'Add Folder'}
          </button>
          {editingFolderId ? (
            <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
              Cancel Edit
            </button>
          ) : null}
        </div>

        {errorText ? <p className="status-error">{errorText}</p> : null}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3>Folder Instances</h3>
            <p>Track held documents and send-out actions.</p>
          </div>
        </div>

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
                  <button type="button" className="btn btn-outline" onClick={() => beginEdit(folder)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => handleSendOutAll(folder)}>
                    Send Out Held
                  </button>
                  <button type="button" className="btn-danger" onClick={() => handleDelete(folder.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
