import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf';
import pdfWorkerSrc from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  addExtractorFeedback,
  addExtractorFeedbackWithFile,
  createExtractor,
  deleteExtractor,
  deleteExtractorFeedback,
  listExtractors,
  runExtractorInference,
  sendOutFromExtractor,
  updateExtractor
} from '../../services/configServiceNodesApi';
import { UsageList } from '../../components/UsageList';

const DEFAULT_SCHEMA = {
  headerFields: [],
  tableTypes: []
};

const STEPS = [
  { key: 'basics', label: 'Basics', description: 'Name the extractor and describe its intent.' },
  { key: 'schema', label: 'Schema', description: 'Define header fields and table structures.' },
  { key: 'hold', label: 'Hold Rules', description: 'Set mandatory fields and hold behavior.' }
];

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export function ExtractorDetailPage() {
  const { extractorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !extractorId;
  const emptyArray = useMemo(() => [], []);

  const [activeStep, setActiveStep] = useState(STEPS[0].key);
  const [name, setName] = useState('');
  const [schema, setSchema] = useState(DEFAULT_SCHEMA);
  const [holdAllDocuments, setHoldAllDocuments] = useState(false);
  const [extractorMeta, setExtractorMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');
  const [activeTab, setActiveTab] = useState('schema');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingSchema, setIsEditingSchema] = useState(isNew);
  const [feedbackGroups, setFeedbackGroups] = useState([]);
  const [feedbackDocumentId, setFeedbackDocumentId] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [selectedHeldDocs, setSelectedHeldDocs] = useState([]);
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [extractionPreview, setExtractionPreview] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedPreviewTarget, setSelectedPreviewTarget] = useState(null);
  const [activeFeedbackGroupId, setActiveFeedbackGroupId] = useState('');
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [modalTarget, setModalTarget] = useState(null);
  const [modalFeedbackText, setModalFeedbackText] = useState('');
  const [modalFeedbackError, setModalFeedbackError] = useState('');
  const [usedFeedbackIds, setUsedFeedbackIds] = useState([]);
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [documentPages, setDocumentPages] = useState(1);
  const [documentPage, setDocumentPage] = useState(1);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const [useNativePdfView, setUseNativePdfView] = useState(false);
  const [pdfRenderVersion, setPdfRenderVersion] = useState(0);
  const pdfRef = useRef(null);
  const pdfDocRef = useRef(null);

  useEffect(() => {
    if (isNew) {
      return;
    }

    async function loadExtractor() {
      setIsLoading(true);
      setErrorText('');

      try {
        const data = await listExtractors();
        const found = data.find((item) => item.id === extractorId);

        if (!found) {
          setErrorText('Extractor not found');
          return;
        }

        setExtractorMeta(found);
        setName(found.name || '');
        setSchema(found.schema || DEFAULT_SCHEMA);
        setHoldAllDocuments(Boolean(found.holdAllDocuments));
        setFeedbackGroups(normalizeFeedbackGroups(found.feedbacks || []));
        setIsEditingSchema(false);
      } catch (error) {
        setErrorText(error?.response?.data?.error || 'Failed to load extractor');
      } finally {
        setIsLoading(false);
      }
    }

    loadExtractor();
  }, [extractorId, isNew]);

  const createSteps = useMemo(
    () => (isNew ? STEPS.filter((step) => step.key !== 'hold') : STEPS),
    [isNew]
  );

  const activeIndex = useMemo(
    () => createSteps.findIndex((step) => step.key === activeStep),
    [activeStep, createSteps]
  );

  function updateHeaderField(index, field, value) {
    setSchema((previous) => {
      const next = [...(previous.headerFields || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...previous, headerFields: next };
    });
  }

  function reorderList(list, fromIndex, toIndex) {
    if (fromIndex === toIndex) {
      return list;
    }
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }

  function setDragPayload(event, payload) {
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  }

  function getDragPayload(event) {
    const raw = event.dataTransfer.getData('application/json');
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }

  function addHeaderField() {
    setSchema((previous) => ({
      ...previous,
      headerFields: [
        ...(previous.headerFields || []),
        { fieldName: '', description: '', required: false }
      ]
    }));
  }

  function removeHeaderField(index) {
    setSchema((previous) => ({
      ...previous,
      headerFields: (previous.headerFields || []).filter((_, idx) => idx !== index)
    }));
  }

  function handleHeaderDrop(event, targetIndex) {
    event.preventDefault();
    const payload = getDragPayload(event);
    if (!payload || payload.type !== 'header') {
      return;
    }
    setSchema((previous) => ({
      ...previous,
      headerFields: reorderList(previous.headerFields || [], payload.index, targetIndex)
    }));
  }

  function updateTableType(index, field, value) {
    setSchema((previous) => {
      const next = [...(previous.tableTypes || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...previous, tableTypes: next };
    });
  }

  function addTableType() {
    setSchema((previous) => ({
      ...previous,
      tableTypes: [
        ...(previous.tableTypes || []),
        {
          tableName: '',
          description: '',
          required: false,
          columns: [{ columnName: '', description: '' }]
        }
      ]
    }));
  }

  function removeTableType(index) {
    setSchema((previous) => ({
      ...previous,
      tableTypes: (previous.tableTypes || []).filter((_, idx) => idx !== index)
    }));
  }

  function handleTableDrop(event, targetIndex) {
    event.preventDefault();
    const payload = getDragPayload(event);
    if (!payload || payload.type !== 'table') {
      return;
    }
    setSchema((previous) => ({
      ...previous,
      tableTypes: reorderList(previous.tableTypes || [], payload.index, targetIndex)
    }));
  }

  function updateColumn(tableIndex, columnIndex, field, value) {
    setSchema((previous) => {
      const tableTypes = [...(previous.tableTypes || [])];
      const table = { ...tableTypes[tableIndex] };
      const columns = [...(table.columns || [])];
      columns[columnIndex] = { ...columns[columnIndex], [field]: value };
      table.columns = columns;
      tableTypes[tableIndex] = table;
      return { ...previous, tableTypes };
    });
  }

  function buildPreviewFromSchema(schemaSnapshot) {
    const headerPreview = (schemaSnapshot.headerFields || []).map((field) => ({
      fieldName: field.fieldName || 'Field',
      value: '—'
    }));
    const tablePreview = (schemaSnapshot.tableTypes || []).map((table) => ({
      tableName: table.tableName || 'Table',
      columns: (table.columns || []).map((column) => ({
        columnName: column.columnName || 'Column',
        value: '—'
      }))
    }));

    return {
      headerFields: headerPreview,
      tableTypes: tablePreview
    };
  }

  function normalizeFeedbackGroup(group) {
    if (!group) {
      return null;
    }

    if (Array.isArray(group.feedbackItems)) {
      return { ...group, feedbackItems: group.feedbackItems };
    }

    const createdAt = group.createdAt || new Date().toISOString();
    return {
      id: group.id,
      documentId: group.documentId || null,
      document: group.document || null,
      documentSummary: group.documentSummary || null,
      embedding: group.embedding || null,
      storageBucket: group.storageBucket || null,
      storagePath: group.storagePath || null,
      feedbackItems: [
        {
          id: group.id,
          targetType: group.targetType || null,
          targetPath: group.targetPath || null,
          feedbackText: group.feedbackText || '',
          createdAt
        }
      ],
      createdAt,
      updatedAt: group.updatedAt || createdAt
    };
  }

  function normalizeFeedbackGroups(items) {
    if (!Array.isArray(items)) {
      return [];
    }
    return items.map((group) => normalizeFeedbackGroup(group)).filter(Boolean);
  }

  function upsertFeedbackGroup(group) {
    const normalized = normalizeFeedbackGroup(group);
    if (!normalized) {
      return;
    }
    setFeedbackGroups((current) => {
      const index = current.findIndex((item) => item.id === normalized.id);
      if (index < 0) {
        return [normalized, ...current];
      }
      const next = [...current];
      next[index] = normalized;
      return next;
    });
  }

  function buildGroupedTables(tableTypes, schemaTables) {
    const groups = new Map();
    const schemaColumns = new Map();

    (schemaTables || []).forEach((table) => {
      const name = table.tableName || 'Table';
      const columns = (table.columns || [])
        .map((column) => column.columnName || 'Column')
        .filter(Boolean);
      if (columns.length) {
        schemaColumns.set(name, columns);
      }
    });

    (tableTypes || []).forEach((table) => {
      const name = table.tableName || 'Table';
      const columns = (table.columns || []).map((column) => ({
        name: column.columnName || 'Column',
        value: column.value ?? null
      }));

      if (!groups.has(name)) {
        groups.set(name, {
          tableName: name,
          columns: [...(schemaColumns.get(name) || [])],
          rows: []
        });
      }

      const group = groups.get(name);
      columns.forEach((column) => {
        if (!group.columns.includes(column.name)) {
          group.columns.push(column.name);
          group.rows = group.rows.map((row) => [...row, null]);
        }
      });

      const row = group.columns.map((columnName) => {
        const found = columns.find((column) => column.name === columnName);
        return found ? found.value : null;
      });
      group.rows.push(row);
    });

    return Array.from(groups.values());
  }

  async function handleRunExtraction() {
    if (!uploadedDocument) {
      setFeedbackError('Upload a document before running extraction');
      return;
    }

    setFeedbackError('');
    setFeedbackStatus('');
    setIsExtracting(true);
    setSelectedPreviewTarget(null);

    try {
      const result = await runExtractorInference(extractorId, uploadedDocument);
      const preview = result?.extraction || buildPreviewFromSchema(schema);
      setExtractionPreview(preview);
      setUsedFeedbackIds(result?.usedFeedbackIds || []);
      if (result?.usedFeedbackIds?.length) {
        setFeedbackStatus(`Using ${result.usedFeedbackIds.length} similar feedback document(s).`);
      } else {
        setFeedbackStatus('Extraction complete');
      }
      setFeedbackDocumentId(uploadedDocument.name || 'uploaded-document');
    } catch (error) {
      setFeedbackError(error?.response?.data?.error || 'Failed to run extraction');
    } finally {
      setIsExtracting(false);
    }
  }

  function openFeedbackModal(target) {
    setSelectedPreviewTarget({ type: target.type, path: target.path });
    setModalTarget(target);
    setModalFeedbackText('');
    setModalFeedbackError('');
    setIsFeedbackModalOpen(true);
  }

  function handleSelectHeaderTarget(fieldName, value) {
    openFeedbackModal({
      type: 'header',
      path: fieldName,
      label: fieldName,
      value
    });
  }

  function handleSelectTableTarget(tableName, columnName, rowIndex, value) {
    const path = `${tableName}[${rowIndex + 1}].${columnName}`;
    openFeedbackModal({
      type: 'table',
      path,
      label: `${tableName} · ${columnName} (Row ${rowIndex + 1})`,
      value
    });
  }

  function addColumn(tableIndex) {
    setSchema((previous) => {
      const tableTypes = [...(previous.tableTypes || [])];
      const table = { ...tableTypes[tableIndex] };
      table.columns = [...(table.columns || []), { columnName: '', description: '' }];
      tableTypes[tableIndex] = table;
      return { ...previous, tableTypes };
    });
  }

  function removeColumn(tableIndex, columnIndex) {
    setSchema((previous) => {
      const tableTypes = [...(previous.tableTypes || [])];
      const table = { ...tableTypes[tableIndex] };
      table.columns = (table.columns || []).filter((_, idx) => idx !== columnIndex);
      tableTypes[tableIndex] = table;
      return { ...previous, tableTypes };
    });
  }

  async function handleAddFeedback() {
    if (!modalFeedbackText.trim()) {
      setModalFeedbackError('Feedback text is required');
      return;
    }

    if (!modalTarget?.path) {
      setModalFeedbackError('Select a field or table cell to leave feedback');
      return;
    }

    if (!uploadedDocument) {
      setModalFeedbackError('Upload a document before saving feedback');
      return;
    }

    if (isSubmittingFeedback) {
      return;
    }

    const payload = {
      documentId: feedbackDocumentId.trim() || null,
      targetType: modalTarget.type,
      targetPath: modalTarget.path.trim(),
      feedbackText: modalFeedbackText.trim()
    };
    const targetSnapshot = { ...modalTarget };
    const selectedSnapshot = { type: modalTarget.type, path: modalTarget.path.trim() };

    setFeedbackError('');
    setFeedbackStatus('Saving feedback...');
    setModalFeedbackError('');
    setIsSubmittingFeedback(true);
    setIsFeedbackModalOpen(false);
    setModalFeedbackText('');

    try {
      let feedbackGroup = null;

      if (activeFeedbackGroupId) {
        feedbackGroup = await addExtractorFeedback(extractorId, {
          feedbackGroupId: activeFeedbackGroupId,
          targetType: payload.targetType,
          targetPath: payload.targetPath,
          feedbackText: payload.feedbackText
        });
      } else {
        feedbackGroup = await addExtractorFeedbackWithFile(
          extractorId,
          {
            documentId: payload.documentId,
            targetType: payload.targetType,
            targetPath: payload.targetPath,
            feedbackText: payload.feedbackText
          },
          uploadedDocument
        );
        if (feedbackGroup?.id) {
          setActiveFeedbackGroupId(feedbackGroup.id);
        }
      }

      upsertFeedbackGroup(feedbackGroup);
      setFeedbackStatus('Feedback recorded for this document');
      setSelectedPreviewTarget(null);
      setModalTarget(null);
      setModalFeedbackError('');
    } catch (error) {
      const message = error?.response?.data?.error || 'Failed to add feedback';
      setIsFeedbackModalOpen(true);
      setModalTarget(targetSnapshot);
      setSelectedPreviewTarget(selectedSnapshot);
      setModalFeedbackText(payload.feedbackText);
      setModalFeedbackError(message);
      setFeedbackStatus('');
      setFeedbackError(message);
    } finally {
      setIsSubmittingFeedback(false);
    }
  }

  function handleCloseFeedbackModal() {
    if (isSubmittingFeedback) {
      return;
    }
    setIsFeedbackModalOpen(false);
    setModalTarget(null);
    setModalFeedbackText('');
    setModalFeedbackError('');
    setSelectedPreviewTarget(null);
  }

  async function handleDeleteFeedback(feedbackId) {
    setFeedbackError('');
    setFeedbackStatus('');

    try {
      await deleteExtractorFeedback(extractorId, feedbackId);
      setFeedbackGroups((current) => current.filter((item) => item.id !== feedbackId));
      if (feedbackId === activeFeedbackGroupId) {
        setActiveFeedbackGroupId('');
      }
      setFeedbackStatus('Feedback removed');
    } catch (error) {
      setFeedbackError(error?.response?.data?.error || 'Failed to delete feedback');
    }
  }

  async function handleSendOutSelected() {
    if (!selectedHeldDocs.length) {
      return;
    }

    setStatusText('');
    setErrorText('');

    try {
      await sendOutFromExtractor(extractorId, { documentIds: selectedHeldDocs });
      setSelectedHeldDocs([]);
      const data = await listExtractors();
      const found = data.find((item) => item.id === extractorId);
      if (found) {
        setExtractorMeta(found);
        setHoldAllDocuments(Boolean(found.holdAllDocuments));
        setFeedbackGroups(normalizeFeedbackGroups(found.feedbacks || []));
        setSchema(found.schema || DEFAULT_SCHEMA);
      }
      setStatusText('Selected documents sent out');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to send out documents');
    }
  }

  function toggleHeldSelection(docId) {
    if (!docId) {
      return;
    }
    setSelectedHeldDocs((current) =>
      current.includes(docId) ? current.filter((id) => id !== docId) : [...current, docId]
    );
  }

  function handleColumnDrop(event, tableIndex, targetIndex) {
    event.preventDefault();
    const payload = getDragPayload(event);
    if (!payload || payload.type !== 'column' || payload.tableIndex !== tableIndex) {
      return;
    }
    setSchema((previous) => {
      const tableTypes = [...(previous.tableTypes || [])];
      const table = { ...tableTypes[tableIndex] };
      table.columns = reorderList(table.columns || [], payload.index, targetIndex);
      tableTypes[tableIndex] = table;
      return { ...previous, tableTypes };
    });
  }

  async function handleSaveExtractor() {
    if (!name.trim()) {
      setErrorText('Extractor name is required');
      return;
    }

    try {
      if (isNew) {
        setIsSaving(true);
        setErrorText('');
        setStatusText('');
        const extractor = await createExtractor({
          name,
          schema,
          holdAllDocuments
        });
        const params = new URLSearchParams(location.search);
        const returnTo = params.get('returnTo');
        const returnNodeId = params.get('nodeId');

        if (returnTo && returnNodeId) {
          navigate(`${returnTo}?nodeId=${returnNodeId}&assignExtractorId=${extractor.id}`);
          return;
        }

        navigate('/app/services/extractors');
        return;
      }

      await handleSaveSchema();
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save extractor');
    }
  }

  async function handleSaveSchema() {
    if (!extractorId) {
      return;
    }

    if (!name.trim()) {
      setErrorText('Extractor name is required');
      return;
    }

    setIsSaving(true);
    setErrorText('');
    setStatusText('');

    try {
      const extractor = await updateExtractor(extractorId, {
        name,
        schema,
        holdAllDocuments
      });
      setExtractorMeta(extractor);
      setFeedbackGroups(normalizeFeedbackGroups(extractor.feedbacks || []));
      setStatusText('Schema updated');
      setIsEditingSchema(false);
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to save schema');
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    if (extractorMeta) {
      setName(extractorMeta.name || '');
      setSchema(extractorMeta.schema || DEFAULT_SCHEMA);
      setHoldAllDocuments(Boolean(extractorMeta.holdAllDocuments));
      setFeedbackGroups(normalizeFeedbackGroups(extractorMeta.feedbacks || []));
    }
    setErrorText('');
    setStatusText('');
    setIsEditingSchema(false);
  }

  async function handleDeleteExtractor() {
    if (!extractorId) {
      return;
    }

    const confirmed = window.confirm('Delete this extractor? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setErrorText('');
    setStatusText('');

    try {
      await deleteExtractor(extractorId);
      navigate('/app/services/extractors');
    } catch (error) {
      setErrorText(error?.response?.data?.error || 'Failed to delete extractor');
    } finally {
      setIsDeleting(false);
    }
  }

  function nextStep() {
    if (!isNew) {
      return;
    }

    if (activeIndex >= createSteps.length - 1) {
      handleSaveExtractor();
      return;
    }

    const nextIndex = Math.min(activeIndex + 1, createSteps.length - 1);
    setActiveStep(createSteps[nextIndex].key);
  }

  function previousStep() {
    if (!isNew) {
      return;
    }

    const nextIndex = Math.max(activeIndex - 1, 0);
    setActiveStep(createSteps[nextIndex].key);
  }

  const requiredHeaderCount = (schema.headerFields || []).filter((item) => item.required).length;
  const requiredTableCount = (schema.tableTypes || []).filter((item) => item.required).length;
  const heldDocuments = extractorMeta?.heldDocuments || emptyArray;
  const canEditSchema = isNew || isEditingSchema;
  const titleText = name.trim() || (isNew ? 'New Extractor' : 'Untitled Extractor');
  const groupedTables = useMemo(
    () =>
      extractionPreview
        ? buildGroupedTables(extractionPreview.tableTypes || [], schema.tableTypes || [])
        : [],
    [extractionPreview, schema]
  );
  const usedFeedbackLabels = useMemo(
    () =>
      usedFeedbackIds.map((id) => {
        const group = feedbackGroups.find((item) => item.id === id);
        return group?.documentId || group?.document?.fileName || id.slice(0, 6);
      }),
    [usedFeedbackIds, feedbackGroups]
  );
  const formatTimestamp = (value) => {
    if (!value) {
      return 'Unknown';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Unknown';
    }
    return parsed.toLocaleString();
  };
  const resolveHeldReason = (heldDocument) => {
    const explicit = heldDocument?.reason || heldDocument?.metadata?.holdReason;
    if (explicit) {
      return explicit;
    }
    const missingFields = heldDocument?.metadata?.missingFields;
    if (Array.isArray(missingFields) && missingFields.length) {
      return `Missing fields: ${missingFields.join(', ')}`;
    }
    return holdAllDocuments ? 'Held by policy' : 'Missing required fields';
  };

  useEffect(() => {
    setSelectedHeldDocs((current) => {
      if (!heldDocuments.length) {
        return current.length ? [] : current;
      }

      const next = current.filter((id) =>
        heldDocuments.some((item) => item.document?.id === id)
      );

      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }

      return next;
    });
  }, [heldDocuments]);

  useEffect(() => {
    setExtractionPreview(null);
    setSelectedPreviewTarget(null);
    setFeedbackStatus('');
    setFeedbackError('');
    setFeedbackDocumentId(uploadedDocument?.name || '');
    setUsedFeedbackIds([]);
    setActiveFeedbackGroupId('');
    setIsFeedbackModalOpen(false);
    setModalTarget(null);
    setModalFeedbackText('');
    setModalFeedbackError('');
    setUseNativePdfView(false);
    setPdfRenderVersion(0);
    setIsSubmittingFeedback(false);
  }, [uploadedDocument]);

  useEffect(() => {
    if (!uploadedDocument) {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
      setDocumentUrl('');
      setDocumentType('');
      setDocumentPages(1);
      setDocumentPage(1);
      setDocumentError('');
      pdfDocRef.current = null;
      return;
    }

    const nextType = uploadedDocument.type || '';
    setDocumentType(nextType);
    setDocumentPages(1);
    setDocumentPage(1);
    setDocumentError('');
    setUseNativePdfView(false);
    setPdfRenderVersion(0);
    if (nextType !== 'application/pdf') {
      setIsDocumentLoading(false);
      pdfDocRef.current = null;
    }
    if (documentUrl) {
      URL.revokeObjectURL(documentUrl);
    }

    const nextUrl = URL.createObjectURL(uploadedDocument);
    setDocumentUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [uploadedDocument]);

  useEffect(() => {
    if (!uploadedDocument || documentType !== 'application/pdf' || !documentUrl) {
      pdfDocRef.current = null;
      return;
    }

    let isCancelled = false;
    setIsDocumentLoading(true);
    setDocumentError('');

    async function loadPdf() {
      try {
        const pdf = await getDocument({ url: documentUrl }).promise;
        if (isCancelled) {
          return;
        }
        pdfDocRef.current = pdf;
        setDocumentPages(pdf.numPages || 1);
        setDocumentPage(1);
        setPdfRenderVersion((current) => current + 1);
      } catch (_error) {
        pdfDocRef.current = null;
        setDocumentError('Unable to preview PDF');
      } finally {
        if (!isCancelled) {
          setIsDocumentLoading(false);
        }
      }
    }

    loadPdf();
    return () => {
      isCancelled = true;
    };
  }, [uploadedDocument, documentType, documentUrl]);

  useEffect(() => {
    async function renderPdfPage() {
      if (!pdfDocRef.current || !pdfRef.current) {
        return;
      }
      const pageNumber = Math.min(Math.max(documentPage, 1), documentPages || 1);
      const page = await pdfDocRef.current.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.25 });
      const canvas = pdfRef.current;
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      context.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
    }

    if (documentType === 'application/pdf') {
      renderPdfPage();
    }
  }, [documentPage, documentPages, documentType, pdfRenderVersion]);

  return (
    <div className="panel-stack">
      <header className="section-header">
        <div className="section-title-row">
          <Link className="icon-btn-neutral icon-btn-lg" to="/app/services/extractors" aria-label="Back to extractors">
            ←
          </Link>
          <div>
            <h1>{titleText}</h1>
          </div>
        </div>
        {isNew ? (
          <div className="section-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveExtractor}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Create Extractor'}
            </button>
          </div>
        ) : null}
      </header>

      {errorText ? <p className="status-error">{errorText}</p> : null}
      {statusText ? <p className="status-ok">{statusText}</p> : null}
      {isLoading ? <p>Loading extractor...</p> : null}

      {!isLoading ? (
        <>
          {isNew ? (
            <div className="stepper">
              {createSteps.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  className={`stepper-item ${activeStep === step.key ? 'active' : ''} ${
                    index < activeIndex ? 'complete' : ''
                  }`}
                  onClick={() => setActiveStep(step.key)}
                >
                  <span className="stepper-index">{index + 1}</span>
                  <span>
                    <span className="stepper-title">{step.label}</span>
                    <span className="stepper-meta">{step.description}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {!isNew ? (
            <div className="segmented-control" role="tablist">
              {[
                { key: 'schema', label: 'Schema' },
                { key: 'feedback', label: 'Training Feedback' },
                { key: 'held', label: 'Held Documents' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}

          {isNew && activeStep === 'basics' ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Extractor Basics</h2>
                  <p>Name the extractor and clarify its intended document type.</p>
                </div>
              </div>
              <div className="form-grid">
                <label htmlFor="extractor-name">Extractor name</label>
                <input
                  id="extractor-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Invoice Extractor"
                />
              </div>
            </section>
          ) : null}

          {(isNew ? activeStep === 'schema' : activeTab === 'schema') ? (
            <div className="panel-stack">
              {!isNew ? (
                <section className="panel">
                  <div className="panel-header">
                    <div>
                      <h2>Schema</h2>
                      <p>Define the extractor name and document schema fields.</p>
                    </div>
                    {!isEditingSchema ? (
                      <button
                        type="button"
                        className="icon-btn-neutral icon-btn-lg"
                        onClick={() => setIsEditingSchema(true)}
                        aria-label="Edit schema"
                      >
                        ✎
                      </button>
                    ) : null}
                  </div>

                  {!isEditingSchema ? (
                    <div className="form-grid">
                      <label htmlFor="extractor-name-readonly">Extractor name</label>
                      <input id="extractor-name-readonly" type="text" value={titleText} disabled />
                    </div>
                  ) : (
                    <div className="form-grid">
                      <label htmlFor="extractor-name-edit">Extractor name</label>
                      <input
                        id="extractor-name-edit"
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Extractor name"
                      />
                    </div>
                  )}

                  {isEditingSchema ? (
                    <div className="panel-actions">
                      <button type="button" className="btn btn-ghost" onClick={handleCancelEdit}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSaveSchema}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Schema'}
                      </button>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Header Fields</h2>
                    <p>Define the fields extracted from the document header.</p>
                  </div>
                  {canEditSchema ? (
                    <button type="button" className="btn btn-outline" onClick={addHeaderField}>
                      Add Field
                    </button>
                  ) : null}
                </div>

                {(schema.headerFields || []).length === 0 ? <p>No header fields yet.</p> : null}

                {(schema.headerFields || []).map((field, index) => (
                  <div
                    className="field-row"
                    key={`header-${index}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleHeaderDrop(event, index)}
                  >
                    <button
                      type="button"
                      className="drag-handle"
                      draggable={canEditSchema}
                      onDragStart={
                        canEditSchema ? (event) => setDragPayload(event, { type: 'header', index }) : undefined
                      }
                      aria-label="Reorder header field"
                    >
                      ⋮⋮
                    </button>
                    <div className="field-inputs">
                      <input
                        type="text"
                        value={field.fieldName || ''}
                        onChange={(event) => updateHeaderField(index, 'fieldName', event.target.value)}
                        placeholder="Field name"
                        aria-label="Field name"
                        disabled={!canEditSchema}
                      />
                      <input
                        type="text"
                        value={field.description || ''}
                        onChange={(event) => updateHeaderField(index, 'description', event.target.value)}
                        placeholder="Description"
                        aria-label="Field description"
                        disabled={!canEditSchema}
                      />
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(event) => updateHeaderField(index, 'required', event.target.checked)}
                        disabled={!canEditSchema}
                      />
                      <span className="toggle-track" />
                      <span className="toggle-label">Required</span>
                    </label>
                    {canEditSchema ? (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => removeHeaderField(index)}
                        aria-label="Remove field"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                ))}
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Table Types</h2>
                    <p>Define line item tables that should be extracted.</p>
                  </div>
                  {canEditSchema ? (
                    <button type="button" className="btn btn-outline" onClick={addTableType}>
                      Add Table Type
                    </button>
                  ) : null}
                </div>

                {(schema.tableTypes || []).length === 0 ? <p>No table types yet.</p> : null}

                {(schema.tableTypes || []).map((table, index) => (
                  <div
                    className="panel"
                    key={`table-${index}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleTableDrop(event, index)}
                  >
                    <div className="table-type-header">
                      <button
                        type="button"
                        className="drag-handle"
                        draggable={canEditSchema}
                        onDragStart={
                          canEditSchema ? (event) => setDragPayload(event, { type: 'table', index }) : undefined
                        }
                        aria-label="Reorder table type"
                      >
                        ⋮⋮
                      </button>
                      <div className="field-inputs">
                        <input
                          type="text"
                          value={table.tableName || ''}
                          onChange={(event) => updateTableType(index, 'tableName', event.target.value)}
                          placeholder="Table name"
                          aria-label="Table name"
                          disabled={!canEditSchema}
                        />
                        <input
                          type="text"
                          value={table.description || ''}
                          onChange={(event) => updateTableType(index, 'description', event.target.value)}
                          placeholder="Description"
                          aria-label="Table description"
                          disabled={!canEditSchema}
                        />
                      </div>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(table.required)}
                          onChange={(event) => updateTableType(index, 'required', event.target.checked)}
                          disabled={!canEditSchema}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-label">Required</span>
                      </label>
                      {canEditSchema ? (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => removeTableType(index)}
                          aria-label="Remove table"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>

                    {canEditSchema ? (
                      <div className="panel-actions align-right">
                        <button type="button" className="btn btn-outline" onClick={() => addColumn(index)}>
                          Add Column
                        </button>
                      </div>
                    ) : null}

                    {(table.columns || []).map((column, columnIndex) => (
                      <div
                        className="field-row"
                        key={`table-${index}-column-${columnIndex}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleColumnDrop(event, index, columnIndex)}
                      >
                        <button
                          type="button"
                          className="drag-handle"
                          draggable={canEditSchema}
                          onDragStart={
                            canEditSchema
                              ? (event) =>
                                  setDragPayload(event, {
                                    type: 'column',
                                    tableIndex: index,
                                    index: columnIndex
                                  })
                              : undefined
                          }
                          aria-label="Reorder column"
                        >
                          ⋮⋮
                        </button>
                        <div className="field-inputs">
                          <input
                            type="text"
                            value={column.columnName || ''}
                            onChange={(event) =>
                              updateColumn(index, columnIndex, 'columnName', event.target.value)
                            }
                            placeholder="Column name"
                            aria-label="Column name"
                            disabled={!canEditSchema}
                          />
                          <input
                            type="text"
                            value={column.description || ''}
                            onChange={(event) =>
                              updateColumn(index, columnIndex, 'description', event.target.value)
                            }
                            placeholder="Description"
                            aria-label="Column description"
                            disabled={!canEditSchema}
                          />
                        </div>
                        <div />
                        {canEditSchema ? (
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => removeColumn(index, columnIndex)}
                            aria-label="Remove column"
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            </div>
          ) : null}

          {!isNew && activeTab === 'feedback' ? (
            <div className="panel-stack">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Training Feedback</h2>
                    <p>Upload a document, run extraction, and annotate incorrect fields.</p>
                  </div>
                </div>
                {feedbackError ? <p className="status-error">{feedbackError}</p> : null}
                {feedbackStatus ? <p className="status-ok">{feedbackStatus}</p> : null}
              </section>

              <div className="feedback-grid">
                <section className="panel feedback-column feedback-sticky">
                  <div className="panel-header">
                    <div>
                      <h2>Document</h2>
                      <p>Upload a file and review the first page.</p>
                    </div>
                  </div>
                  <div className="feedback-toolbar">
                    <div className="form-grid">
                      <label htmlFor="feedback-upload">Upload document</label>
                      <input
                        id="feedback-upload"
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={(event) => setUploadedDocument(event.target.files?.[0] || null)}
                      />
                      {uploadedDocument ? (
                        <div className="file-summary">
                          <span className="card-title">{uploadedDocument.name}</span>
                          <span className="data-meta">
                            {(uploadedDocument.size / 1024).toFixed(1)} KB · {uploadedDocument.type || 'file'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleRunExtraction}
                      disabled={isExtracting || !uploadedDocument}
                    >
                      {isExtracting ? 'Extracting...' : extractionPreview ? 'Re-extract' : 'Run Extraction'}
                    </button>
                  </div>
                  <div className={`document-preview ${uploadedDocument ? '' : 'empty'}`}>
                    {uploadedDocument ? (
                      documentType === 'application/pdf' ? (
                        <>
                          {isDocumentLoading ? <p className="muted-text">Loading document…</p> : null}
                          <div className="pdf-actions">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setUseNativePdfView((current) => !current)}
                            >
                              {useNativePdfView ? 'Use rendered view' : 'Use native viewer'}
                            </button>
                          </div>
                          {documentError ? (
                            <div className="pdf-fallback">
                              <p className="status-error">{documentError}</p>
                              {documentUrl ? (
                                <object data={documentUrl} type="application/pdf" className="pdf-object">
                                  <p className="muted-text">Preview unavailable. Open the PDF in a new tab.</p>
                                </object>
                              ) : null}
                            </div>
                          ) : useNativePdfView ? (
                            <object data={documentUrl} type="application/pdf" className="pdf-object">
                              <p className="muted-text">Preview unavailable. Open the PDF in a new tab.</p>
                            </object>
                          ) : (
                            <>
                              <canvas ref={pdfRef} className="pdf-canvas" />
                              <div className="page-controls">
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() => setDocumentPage((current) => Math.max(1, current - 1))}
                                  disabled={documentPage <= 1}
                                >
                                  Prev
                                </button>
                                <span className="page-indicator">
                                  Page {documentPage} of {documentPages}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  onClick={() =>
                                    setDocumentPage((current) => Math.min(documentPages, current + 1))
                                  }
                                  disabled={documentPage >= documentPages}
                                >
                                  Next
                                </button>
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <img src={documentUrl} alt="Uploaded document preview" />
                      )
                    ) : (
                      <div className="document-placeholder" />
                    )}
                  </div>
                </section>

                <section className="panel feedback-column">
                  <div className="panel-header">
                    <div>
                      <h2>Extraction & Feedback</h2>
                      <p>Select a field or table cell to leave feedback.</p>
                    </div>
                  </div>
                  {feedbackStatus ? <p className="status-ok">{feedbackStatus}</p> : null}
                  {usedFeedbackLabels.length ? (
                    <div className="tag-row">
                      <span className="tag">Using feedback from</span>
                      {usedFeedbackLabels.map((label, index) => (
                        <span className="tag tag-accent" key={`${label}-${index}`}>
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {extractionPreview ? (
                    <div className="panel-stack">
                      <div>
                        <h3>Header Fields</h3>
                        {(extractionPreview.headerFields || []).length === 0 ? (
                          <p className="muted-text">No header fields defined.</p>
                        ) : (
                          <table className="preview-table">
                            <thead>
                              <tr>
                                <th>Field</th>
                                <th>Extracted value</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {extractionPreview.headerFields.map((field) => (
                                <tr key={field.fieldName}>
                                  <td>{field.fieldName}</td>
                                  <td>{field.value}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className={`select-btn ${selectedPreviewTarget?.path === field.fieldName ? 'active' : ''}`}
                                      onClick={() => handleSelectHeaderTarget(field.fieldName, field.value)}
                                    >
                                      Select
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div>
                        <h3>Table Types</h3>
                        {groupedTables.length === 0 ? (
                          <p className="muted-text">No table types defined.</p>
                        ) : (
                          groupedTables.map((table) => (
                            <div key={table.tableName} className="table-preview">
                              <div className="panel-header table-preview-header">
                                <div>
                                  <h3>{table.tableName}</h3>
                                  <p className="muted-text">Review each row and select cells to leave feedback.</p>
                                </div>
                              </div>
                              {table.columns.length === 0 ? (
                                <p className="muted-text">No columns defined for this table.</p>
                              ) : (
                                <div className="table-scroll">
                                  <table className="preview-table">
                                    <thead>
                                      <tr>
                                        <th>#</th>
                                        {table.columns.map((column) => (
                                          <th key={`${table.tableName}-${column}`}>{column}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {table.rows.length === 0 ? (
                                        <tr>
                                          <td colSpan={table.columns.length + 1}>
                                            <span className="muted-text">No extracted rows.</span>
                                          </td>
                                        </tr>
                                      ) : (
                                        table.rows.map((row, rowIndex) => (
                                          <tr key={`${table.tableName}-row-${rowIndex}`}>
                                            <td>{rowIndex + 1}</td>
                                            {table.columns.map((column, columnIndex) => {
                                              const value = row[columnIndex] ?? '—';
                                              const path = `${table.tableName}[${rowIndex + 1}].${column}`;
                                              return (
                                                <td key={`${table.tableName}-${column}-${rowIndex}`}>
                                                  <button
                                                    type="button"
                                                    className={`cell-select ${selectedPreviewTarget?.path === path ? 'active' : ''}`}
                                                    onClick={() =>
                                                      handleSelectTableTarget(
                                                        table.tableName,
                                                        column,
                                                        rowIndex,
                                                        value
                                                      )
                                                    }
                                                  >
                                                    {value}
                                                  </button>
                                                </td>
                                              );
                                            })}
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="muted-text">Run extraction to see extracted values.</p>
                  )}
                </section>
              </div>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Feedback History</h2>
                    <p>Stored feedback used to guide future extractions.</p>
                  </div>
                </div>
                {feedbackGroups.length === 0 ? (
                  <p className="muted-text">No feedback recorded yet.</p>
                ) : (
                  <div className="data-table">
                    <div className="data-header four-col">
                      <span>Document</span>
                      <span>Targets</span>
                      <span>Feedback</span>
                      <span></span>
                    </div>
                    {feedbackGroups.map((feedback) => (
                      <div className="data-row four-col" key={feedback.id}>
                        <div className="data-cell">
                          <span className="card-title">
                            {feedback.documentId || feedback.document?.fileName || 'Document'}
                          </span>
                          <span className="data-meta">
                            {feedback.createdAt ? formatTimestamp(feedback.createdAt) : ''}
                          </span>
                          <span className="data-meta">
                            {(feedback.feedbackItems || []).length} feedback item(s)
                          </span>
                        </div>
                        <div className="data-cell">
                          <div className="stacked-meta">
                            {(feedback.feedbackItems || []).map((item) => (
                              <span className="data-meta" key={item.id}>
                                {item.targetType || 'Target'}
                                {item.targetPath ? ` · ${item.targetPath}` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="data-cell">
                          <div className="stacked-meta">
                            {(feedback.feedbackItems || []).map((item) => (
                              <span className="data-meta" key={`${item.id}-text`}>
                                {item.feedbackText || '—'}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="data-cell">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleDeleteFeedback(feedback.id)}
                            aria-label="Delete feedback"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {!isNew && activeTab === 'held' ? (
            <section className="panel-stack">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Hold Settings</h2>
                    <p>Control when documents are held in this extractor.</p>
                  </div>
                </div>

                <div className="form-grid">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={holdAllDocuments}
                      onChange={(event) => setHoldAllDocuments(event.target.checked)}
                    />
                    <span className="toggle-track" />
                    <span className="toggle-label">Hold all documents by default</span>
                  </label>
                </div>

                <div className="card-grid">
                  <div className="card-item">
                    <div className="card-title">Required Header Fields</div>
                    <div className="card-meta">{requiredHeaderCount} fields marked required</div>
                  </div>
                  <div className="card-item">
                    <div className="card-title">Required Tables</div>
                    <div className="card-meta">{requiredTableCount} tables marked required</div>
                  </div>
                  <div className="card-item">
                    <div className="card-title">Held Documents</div>
                    <div className="card-meta">
                      {extractorMeta?.heldDocumentCount || extractorMeta?.heldDocuments?.length || 0}
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Held Documents</h2>
                    <p>Review documents waiting for manual release.</p>
                  </div>
                  <div className="panel-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleSendOutSelected}
                      disabled={!selectedHeldDocs.length}
                    >
                      Send Selected ({selectedHeldDocs.length})
                    </button>
                  </div>
                </div>

                {heldDocuments.length === 0 ? (
                  <p className="muted-text">No held documents for this extractor.</p>
                ) : (
                  <div className="data-table">
                    <div className="data-header five-col">
                      <span></span>
                      <span>Document</span>
                      <span>Reason</span>
                      <span>Workflow</span>
                      <span>Held At</span>
                    </div>
                    {heldDocuments.map((item, index) => {
                      const docId = item.document?.id;
                      const isSelected = docId ? selectedHeldDocs.includes(docId) : false;
                      return (
                        <div className="data-row five-col" key={docId || `${index}`}>
                          <div className="data-cell">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleHeldSelection(docId)}
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
                            <span className="data-meta">{resolveHeldReason(item)}</span>
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
                            <span className="data-meta">{formatTimestamp(item.heldAt || item.arrivedAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </section>
          ) : null}

          {isNew ? (
            <div className="panel-actions">
              <button type="button" className="btn btn-ghost" onClick={previousStep} disabled={activeIndex === 0}>
                Back
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={nextStep}
                disabled={isSaving}
              >
                {activeIndex >= createSteps.length - 1 ? 'Create Extractor' : 'Next'}
              </button>
            </div>
          ) : null}

          {!isNew && activeTab === 'schema' ? (
            <div className="panel-stack">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Workflow Usage</h2>
                    <p>Jump to the nodes using this extractor.</p>
                  </div>
                </div>
                <UsageList usages={extractorMeta?.nodeUsages || []} />
              </section>
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Delete Extractor</h2>
                    <p>Remove this extractor and its stored feedback. This cannot be undone.</p>
                  </div>
                </div>
                <div className="panel-actions">
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={handleDeleteExtractor}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Extractor'}
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {isFeedbackModalOpen ? (
            <div
              className="feedback-modal"
              role="dialog"
              aria-modal="true"
              onClick={handleCloseFeedbackModal}
            >
              <div className="feedback-dialog" onClick={(event) => event.stopPropagation()}>
                <div className="feedback-dialog-header">
                  <div>
                    <h3>Leave feedback</h3>
                    <p>Describe how this value should be extracted.</p>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={handleCloseFeedbackModal}
                    aria-label="Close feedback dialog"
                  >
                    ×
                  </button>
                </div>
                <div className="feedback-dialog-body">
                  <div className="feedback-target">
                    <span className="data-meta">Selected target</span>
                    <div className="card-title">{modalTarget?.label || modalTarget?.path || ''}</div>
                    {modalTarget && modalTarget.value !== undefined ? (
                      <span className="data-meta">
                        Extracted value: {String(modalTarget.value ?? '—')}
                      </span>
                    ) : null}
                  </div>

                  <label htmlFor="modal-feedback-text">Feedback</label>
                  <textarea
                    id="modal-feedback-text"
                    rows={4}
                    value={modalFeedbackText}
                    onChange={(event) => setModalFeedbackText(event.target.value)}
                    placeholder="Describe the correction that should be applied."
                  />

                  {modalFeedbackError ? <p className="status-error">{modalFeedbackError}</p> : null}
                </div>
                <div className="feedback-dialog-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleCloseFeedbackModal}
                    disabled={isSubmittingFeedback}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleAddFeedback}
                    disabled={isSubmittingFeedback}
                  >
                    {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
