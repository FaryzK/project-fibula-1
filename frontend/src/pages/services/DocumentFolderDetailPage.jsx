import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createDocumentFolder,
  listDocumentFolders,
  sendOutFromFolder,
  updateDocumentFolder
} from '../../services/configServiceNodesApi';

export function DocumentFolderDetailPage() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !folderId;

  const [folderName, setFolderName] = useState('');
  const [folderMeta, setFolderMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    if (isNew) {
      return;
    }

    async function loadFolder() {
      setIsLoading(true);
      setErrorText('');

      try {
        const data = await listDocumentFolders();
        const found = data.find((item) => item.id === folderId);

        if (!found) {
          setErrorText('Document folder not found');
          return;
        }

        setFolderMeta(found);
        setFolderName(found.name || '');
      } catch (error) {
        setErrorText(error?.response?.data?.error || 'Failed to load document folder');
      } finally {
        setIsLoading(false);
      }
    }

    loadFolder();
  }, [folderId, isNew]);

  async function handleSave() {
    if (!folderName.trim()) {
      setErrorText('Folder name is required');
      return;
    }

    setIsSaving(true);
    setErrorText('');
    setStatusText('');

    try {
      if (isNew) {
        const folder = await createDocumentFolder({ name: folderName });
        setStatusText('Folder created');
        const params = new URLSearchParams(location.search);
        const returnTo = params.get('returnTo');
        const returnNodeId = params.get('nodeId');

        if (returnTo && returnNodeId) {
          navigate(`${returnTo}?nodeId=${returnNodeId}&assignFolderId=${folder.id}`);
          return;
        }

        navigate(`/app/services/document-folders/${folder.id}`);
        return;
      }

      const folder = await updateDocumentFolder(folderId, { name: folderName });
      setFolderMeta(folder);
      setStatusText('Folder updated');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save folder');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSendOutAll() {
    if (!folderMeta) {
      return;
    }

    const documentIds = (folderMeta.heldDocuments || []).map((item) => item.document?.id).filter(Boolean);

    if (!documentIds.length) {
      return;
    }

    setStatusText('');
    setErrorText('');

    try {
      await sendOutFromFolder(folderMeta.id, { documentIds });
      setStatusText('Held documents sent out');
      const data = await listDocumentFolders();
      const found = data.find((item) => item.id === folderMeta.id);
      setFolderMeta(found || folderMeta);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to send out held documents');
    }
  }

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div>
          <span className="section-eyebrow">Service Setup</span>
          <h1>{isNew ? 'New Document Folder' : 'Document Folder'}</h1>
          <p className="section-subtitle">Hold and release documents that need manual review.</p>
        </div>
        <div className="section-actions">
          <Link className="btn btn-ghost" to="/app/services/document-folders">
            Back to Folders
          </Link>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Folder'}
          </button>
        </div>
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {statusText ? <p className="status-ok">{statusText}</p> : null}
      {isLoading ? <p>Loading folder...</p> : null}

      {!isLoading ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Folder Details</h2>
              <p>Configure the review folder and manage held documents.</p>
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

          {folderMeta ? (
            <div className="panel-actions">
              <button type="button" className="btn btn-outline" onClick={handleSendOutAll}>
                Send Out All Held Documents
              </button>
            </div>
          ) : null}

          {folderMeta ? (
            <div className="card-grid">
              <div className="card-item">
                <div className="card-title">Held documents</div>
                <div className="card-meta">
                  {folderMeta.heldDocumentCount || folderMeta.heldDocuments?.length || 0}
                </div>
              </div>
              <div className="card-item">
                <div className="card-title">Used by nodes</div>
                <div className="card-meta">{folderMeta.nodeUsages?.length || 0}</div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
