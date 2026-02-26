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
    <section>
      <h2>Document Folders</h2>
      <p>Create folders to hold documents for human review and send-out.</p>

      <label htmlFor="document-folder-name">Folder name</label>
      <br />
      <input
        id="document-folder-name"
        type="text"
        value={folderName}
        onChange={(event) => setFolderName(event.target.value)}
      />
      <button type="button" onClick={handleSubmit}>
        {editingFolderId ? 'Save Folder' : 'Add Folder'}
      </button>
      {editingFolderId ? (
        <button type="button" onClick={cancelEdit}>
          Cancel Edit
        </button>
      ) : null}

      {errorText ? <p>{errorText}</p> : null}
      {isLoading ? <p>Loading document folders...</p> : null}
      {!isLoading && folders.length === 0 ? <p>No document folders yet.</p> : null}

      <ul>
        {folders.map((folder) => (
          <li key={folder.id}>
            <strong>{folder.name}</strong>
            <p>Held documents: {folder.heldDocumentCount || folder.heldDocuments?.length || 0}</p>
            <p>Used by nodes: {folder.nodeUsages?.length || 0}</p>
            <button type="button" onClick={() => beginEdit(folder)}>
              Edit
            </button>
            <button type="button" onClick={() => handleDelete(folder.id)}>
              Delete
            </button>
            <button type="button" onClick={() => handleSendOutAll(folder)}>
              Send Out All Held Documents
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
