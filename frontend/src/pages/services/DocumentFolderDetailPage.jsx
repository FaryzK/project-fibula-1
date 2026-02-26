import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  createDocumentFolder,
  listDocumentFolders,
  sendOutFromFolder,
  updateDocumentFolder
} from '../../services/configServiceNodesApi';
import { UsageList } from '../../components/UsageList';

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
  const [selectedDocuments, setSelectedDocuments] = useState([]);

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

  const heldDocuments = folderMeta?.heldDocuments || [];

  useEffect(() => {
    setSelectedDocuments((current) =>
      current.filter((id) => heldDocuments.some((item) => item.document?.id === id))
    );
  }, [heldDocuments]);

  async function refreshFolder() {
    const data = await listDocumentFolders();
    const found = data.find((item) => item.id === (folderMeta?.id || folderId));
    setFolderMeta(found || folderMeta);
  }

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
      setSelectedDocuments([]);
      await refreshFolder();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to send out held documents');
    }
  }

  async function handleSendOutSelected() {
    if (!folderMeta) {
      return;
    }

    if (!selectedDocuments.length) {
      return;
    }

    setStatusText('');
    setErrorText('');

    try {
      await sendOutFromFolder(folderMeta.id, { documentIds: selectedDocuments });
      setStatusText('Selected documents sent out');
      setSelectedDocuments([]);
      await refreshFolder();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to send out selected documents');
    }
  }

  function toggleSelected(docId) {
    if (!docId) {
      return;
    }
    setSelectedDocuments((current) =>
      current.includes(docId) ? current.filter((id) => id !== docId) : [...current, docId]
    );
  }

  function formatTimestamp(value) {
    if (!value) {
      return 'Unknown';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Unknown';
    }
    return parsed.toLocaleString();
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
        <>
          <div className="panel-grid">
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

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Workflow Usage</h2>
                  <p>Jump to the canvas nodes using this folder.</p>
                </div>
              </div>
              <UsageList usages={folderMeta?.nodeUsages || []} />
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Held Documents</h2>
                <p>Review documents held in this folder.</p>
              </div>
              {folderMeta ? (
                <div className="panel-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleSendOutSelected}
                    disabled={!selectedDocuments.length}
                  >
                    Send Selected ({selectedDocuments.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleSendOutAll}
                    disabled={!heldDocuments.length}
                  >
                    Send Out All Held Documents
                  </button>
                </div>
              ) : null}
            </div>

            {heldDocuments.length === 0 ? (
              <p className="muted-text">No held documents in this folder.</p>
            ) : (
              <div className="data-table">
                <div className="data-header five-col">
                  <span></span>
                  <span>Document</span>
                  <span>Workflow</span>
                  <span>Node</span>
                  <span>Arrived</span>
                </div>
                {heldDocuments.map((item, index) => {
                  const docId = item.document?.id;
                  const isSelected = docId ? selectedDocuments.includes(docId) : false;
                  return (
                    <div className="data-row five-col" key={docId || `${index}`}>
                      <div className="data-cell">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(docId)}
                          disabled={!docId}
                        />
                      </div>
                      <div className="data-cell">
                        <span className="card-title">
                          {item.document?.fileName || item.document?.id || 'Document'}
                        </span>
                        <span className="data-meta">{item.document?.id || 'No ID'}</span>
                      </div>
                      <div className="data-cell">
                        {item.workflowId ? (
                          <Link
                            className="btn btn-ghost"
                            to={`/app/workflows/${item.workflowId}/canvas?nodeId=${item.nodeId}`}
                          >
                            {item.workflowName || 'Workflow'}
                          </Link>
                        ) : (
                          <span className="data-meta">Workflow pending</span>
                        )}
                      </div>
                      <div className="data-cell">
                        <span className="data-meta">{item.nodeName || 'Node'}</span>
                      </div>
                      <div className="data-cell">
                        <span className="data-meta">{formatTimestamp(item.arrivedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
