import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Annotation, MammogramImage } from '../db/database';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Line } from 'react-konva';
import useImage from 'use-image';
import {
  ZoomIn, ZoomOut, Move, Square, Hexagon, CircleDot,
  ArrowLeft, Sun, Contrast, Trash2, Edit2, Check, X,
  Pencil, Eraser, Undo2, Redo2
} from 'lucide-react';
import Konva from 'konva';
import { useAppStore } from '../store/store';
import { canAnnotateDataset, canManageDataset, createAuditLog, hasAccess } from '../rbac/auth';



// ─── Annotation Edit Modal ─────────────────────────────────────────────────────
const LABELS = [
  'Malignant', 'Benign', 'Suspicious', 'Calcification',
  'Mass', 'Architectural Distortion', 'Asymmetry', 'Normal',
];

interface EditAnnotationModalProps {
  annotation: Annotation;
  onSave: (id: string, label: string, remarks: string, biRads: string) => void;
  onClose: () => void;
}

const EditAnnotationModal: React.FC<EditAnnotationModalProps> = ({ annotation, onSave, onClose }) => {
  const [label, setLabel] = useState(annotation.label);
  const [remarks, setRemarks] = useState(annotation.remarks);
  const [biRads, setBiRads] = useState(annotation.biRads || '4');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    setLabel(annotation.label);
    setRemarks(annotation.remarks);
    setBiRads(annotation.biRads || '4');
    setSaveState('idle');
  }, [annotation.id, annotation.label, annotation.remarks, annotation.biRads]);

  const handleSave = async () => {
    setSaveState('saving');
    await onSaveRef.current(annotation.id, label, remarks, biRads);
    setSaveState('saved');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-100">Edit Annotation</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Label</label>
            <select
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">BI-RADS</label>
            <select
              value={biRads}
              onChange={e => setBiRads(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="0">BI-RADS 0 – Incomplete</option>
              <option value="1">BI-RADS 1 – Negative</option>
              <option value="2">BI-RADS 2 – Benign</option>
              <option value="3">BI-RADS 3 – Probably Benign</option>
              <option value="4">BI-RADS 4 – Suspicious</option>
              <option value="5">BI-RADS 5 – Highly Suggestive of Malignancy</option>
              <option value="6">BI-RADS 6 – Known Biopsy-Proven Malignancy</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Remarks</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 h-20 resize-none"
            />
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs ${saveState === 'saved' ? 'text-green-400' : saveState === 'saving' ? 'text-blue-400' : 'text-slate-500'}`}>
                {saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving…' : 'Changes pending'}
              </span>
              <button onClick={onClose} className="px-3 py-1.5 text-slate-400 hover:text-white text-sm rounded-lg transition-colors">Cancel</button>
            </div>
            <button
              type="button"
              onClick={() => void handleSave()}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium"
            >
              <Check className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Label colour helper ───────────────────────────────────────────────────────
function labelColor(label: string): string {
  if (label === 'Malignant') return '#ef4444';
  if (label === 'Benign') return '#22c55e';
  if (label === 'Suspicious') return '#f97316';
  if (label === 'Calcification') return '#a855f7';
  return '#eab308';
}

// ─── Main Annotate Page ────────────────────────────────────────────────────────
const Annotate: React.FC = () => {
  const { imageId } = useParams<{ imageId: string }>();
  const navigate = useNavigate();

  const authRole = useAppStore((state) => state.authRole);
  const organizationId = useAppStore((state) => state.organizationId);
  const authUser = useAppStore((state) => state.authUser);
  const imageRecord = useLiveQuery(() => db.images.get(imageId || ''), [imageId]);
  const annotations = useLiveQuery(() => db.annotations.where('imageId').equals(imageId || '').toArray(), [imageId]);

  const [imageUrl, setImageUrl] = useState<string>('');
  const [img] = useImage(imageUrl);
  const imageRef = useRef<Konva.Image>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 600 });

  // Canvas state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<'pan' | 'bbox' | 'polygon' | 'point' | 'freehand' | 'erase'>('pan');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [brushSize, setBrushSize] = useState(6);
  const [brushColor, setBrushColor] = useState('#f59e0b');
  const [brushOpacity, setBrushOpacity] = useState(0.7);
  const [activeBiRads, setActiveBiRads] = useState('4');
  const [undoStack, setUndoStack] = useState<Annotation[]>([]);
  const [redoStack, setRedoStack] = useState<Annotation[]>([]);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [activeLabel, setActiveLabel] = useState('Malignant');
  const [activeRemarks, setActiveRemarks] = useState('');
  const activeLabelRef = useRef(activeLabel);
  const activeRemarksRef = useRef(activeRemarks);
  const activeBiRadsRef = useRef(activeBiRads);

  // Edit state
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState(false);

  const draftStorageKey = imageId ? `annotate-draft-${imageId}` : null;
  const shouldPromptForNavigation = saveStatus === 'unsaved' || saveStatus === 'saving' || hasUnsavedDraft;

  // Image remarks editing
  const [editingImageRemarks, setEditingImageRemarks] = useState(false);
  const [imageRemarks, setImageRemarks] = useState('');

  // console.log("Route imageId:", imageId);
  // console.log("Loaded image:", imageRecord?.id);

  // ── Responsive canvas sizing ─────────────────────────────────────────────────
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  // //////////////////////////////////////////
  // useEffect(() => {
  //   (async () => {
  //     console.log("Route imageId:", imageId);

  //     const allImages = await db.images.toArray();

  //     console.log("Image count:", allImages.length);
  //     console.log("Image IDs:", allImages.map(i => i.id));

  //     const img = await db.images.get(imageId!);

  //     console.log("Lookup result:", img);
  //   })();
  // }, [imageId]);
  

  // ── Image URL ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (imageRecord?.fileData) {
      const url = URL.createObjectURL(imageRecord.fileData);
      setImageUrl(url);
      setImageRemarks(imageRecord.remarks || '');
      return () => URL.revokeObjectURL(url);
    }
  }, [imageRecord]);

  // ── Fit image to canvas on load ──────────────────────────────────────────────
  useEffect(() => {
    if (img && canvasSize.width > 0) {
      const scaleX = canvasSize.width / img.width;
      const scaleY = canvasSize.height / img.height;
      const fitScale = Math.min(scaleX, scaleY) * 0.9;
      setScale(fitScale);
      setPosition({
        x: (canvasSize.width - img.width * fitScale) / 2,
        y: (canvasSize.height - img.height * fitScale) / 2,
      });
    }
  }, [img, canvasSize]);

  // ── Brightness / Contrast filter ─────────────────────────────────────────────
  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.cache();
      imageRef.current.getLayer()?.batchDraw();
    }
  }, [img, brightness, contrast]);

  useEffect(() => {
    activeLabelRef.current = activeLabel;
  }, [activeLabel]);

  useEffect(() => {
    activeRemarksRef.current = activeRemarks;
  }, [activeRemarks]);

  useEffect(() => {
    activeBiRadsRef.current = activeBiRads;
  }, [activeBiRads]);

  // ── Persist annotation draft per image ─────────────────────────────────────
  useEffect(() => {
    setDraftHydrated(false);
    setHasUnsavedDraft(false);
    if (!draftStorageKey) return;

    const raw = localStorage.getItem(draftStorageKey);
    if (!raw) {
      setDraftHydrated(true);
      return;
    }

    try {
      const saved = JSON.parse(raw) as {
        activeLabel?: string;
        activeRemarks?: string;
        activeBiRads?: string;
        brushSize?: number;
        brushColor?: string;
        brushOpacity?: number;
        tool?: 'pan' | 'bbox' | 'polygon' | 'point' | 'freehand' | 'erase';
      };

      if (saved.activeLabel) setActiveLabel(saved.activeLabel);
      if (typeof saved.activeRemarks === 'string') setActiveRemarks(saved.activeRemarks);
      if (saved.activeBiRads) setActiveBiRads(saved.activeBiRads);
      if (typeof saved.brushSize === 'number') setBrushSize(saved.brushSize);
      if (typeof saved.brushColor === 'string') setBrushColor(saved.brushColor);
      if (typeof saved.brushOpacity === 'number') setBrushOpacity(saved.brushOpacity);
      if (saved.tool) setTool(saved.tool);
    } catch {
      localStorage.removeItem(draftStorageKey);
    } finally {
      setDraftHydrated(true);
      setHasUnsavedDraft(false);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldPromptForNavigation) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldPromptForNavigation]);

  useEffect(() => {
    if (!draftStorageKey || !draftHydrated) return;
    localStorage.setItem(draftStorageKey, JSON.stringify({
      activeLabel,
      activeRemarks,
      activeBiRads,
      brushSize,
      brushColor,
      brushOpacity,
      tool,
    }));
  }, [draftStorageKey, draftHydrated, activeLabel, activeRemarks, activeBiRads, brushSize, brushColor, brushOpacity, tool]);

  // ── Geometry helpers ─────────────────────────────────────────────────────────
  const calculateCenter = (type: string, coords: number[]) => {
    if (type === 'point') return { x: coords[0], y: coords[1] };
    if (type === 'bbox') return { x: (coords[0] + coords[2]) / 2, y: (coords[1] + coords[3]) / 2 };
    let xSum = 0, ySum = 0;
    for (let i = 0; i < coords.length; i += 2) { xSum += coords[i]; ySum += coords[i + 1]; }
    return { x: xSum / (coords.length / 2), y: ySum / (coords.length / 2) };
  };

  const calculateArea = (type: string, coords: number[]) => {
    if (type === 'point') return 0;
    if (type === 'bbox') return Math.abs((coords[2] - coords[0]) * (coords[3] - coords[1]));
    let area = 0, j = coords.length - 2;
    for (let i = 0; i < coords.length; i += 2) {
      area += (coords[j] + coords[i]) * (coords[j + 1] - coords[i + 1]);
      j = i;
    }
    return Math.abs(area / 2);
  };

  const normalizeFreehandPoints = (points: number[]) => {
    if (points.length < 4) return points;
    const normalized: number[] = [points[0], points[1]];

    for (let i = 2; i < points.length; i += 2) {
      const prevX = normalized[normalized.length - 2];
      const prevY = normalized[normalized.length - 1];
      const nextX = points[i];
      const nextY = points[i + 1];
      const movedEnough = Math.hypot(nextX - prevX, nextY - prevY) >= 1;
      if (movedEnough) {
        normalized.push(nextX, nextY);
      }
    }

    return normalized;
  };

  // ── Save annotation ──────────────────────────────────────────────────────────
  const saveAnnotation = async (type: Annotation['type'], coords: number[], style?: { strokeColor?: string; strokeWidth?: number; opacity?: number }) => {
    if (!imageId || !canAnnotateDataset(authRole)) return;
    setSaveStatus('saving');
    const newAnno: Annotation = {
      id: crypto.randomUUID(),
      imageId,
      type,
      coordinates: type === 'freehand' ? normalizeFreehandPoints(coords) : coords,
      tumorCenter: calculateCenter(type, coords),
      tumorArea: calculateArea(type, coords),
      label: activeLabelRef.current,
      remarks: activeRemarksRef.current,
      biRads: activeBiRadsRef.current,
      strokeColor: style?.strokeColor ?? brushColor,
      strokeWidth: style?.strokeWidth ?? brushSize,
      opacity: style?.opacity ?? brushOpacity,
      timestamp: Date.now(),
      organizationId: imageRecord?.organizationId || organizationId || 'sample-hospital',
      createdByUserId: authUser?.id || 'unknown',
    };
    await db.annotations.add(newAnno);
    if (type === 'freehand') {
      setUndoStack(prev => [...prev, newAnno]);
      setRedoStack([]);
    }
    await createAuditLog({
      actorUserId: authUser?.id || 'unknown',
      actorRole: authRole || 'general',
      organizationId: imageRecord?.organizationId || organizationId || 'sample-hospital',
      timestamp: Date.now(),
      action: 'annotation',
      targetType: 'annotation',
      targetId: newAnno.id,
      details: `Created ${type} annotation`,
    });
    if (imageRecord && imageRecord.status === 'Not Reviewed') {
      await db.images.update(imageId, { status: 'In Progress' });
    }
    setHasUnsavedDraft(false);
    setSaveStatus('saved');
  };
  // console.log({
  //   activeLabel,
  //   activeLabelRef: activeLabelRef.current,

  //   activeRemarks,
  //   activeRemarksRef: activeRemarksRef.current,

  //   activeBiRads,
  //   activeBiRadsRef: activeBiRadsRef.current,
  // });
  const deleteAnnotation = async (id: string) => {
    if (!canAnnotateDataset(authRole)) return;
    await db.annotations.delete(id);
    setHasUnsavedDraft(true);
    setSaveStatus('unsaved');
  };

  const updateAnnotation = async (id: string, label: string, remarks: string, biRads: string) => {
    if (!canAnnotateDataset(authRole)) return;
    await db.annotations.update(id, { label, remarks, biRads });
    setHasUnsavedDraft(false);
    setSaveStatus('saved');
  };

  const undoLastFreehand = async () => {
    if (!undoStack.length) return;
    const last = undoStack[undoStack.length - 1];
    await db.annotations.delete(last.id);
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, last]);
    setHasUnsavedDraft(true);
    setSaveStatus('unsaved');
  };

  const redoLastFreehand = async () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    await db.annotations.add(next);
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, next]);
    setHasUnsavedDraft(false);
    setSaveStatus('saved');
  };

  const clearFreehandAnnotations = async () => {
    if (!canAnnotateDataset(authRole)) return;
    const freehandAnnotations = (annotations || []).filter(annotation => annotation.type === 'freehand');
    await Promise.all(freehandAnnotations.map(annotation => db.annotations.delete(annotation.id)));
    setUndoStack([]);
    setRedoStack([]);
    setHasUnsavedDraft(true);
    setSaveStatus('unsaved');
  };

  const saveImageRemarks = async () => {
    if (!imageId || !canManageDataset(authRole)) return;
    await db.images.update(imageId, { remarks: imageRemarks });
    setEditingImageRemarks(false);
  };

  // ── Canvas events ────────────────────────────────────────────────────────────
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    setScale(newScale);
    setPosition({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  };

  const handleMouseDown = (e: any) => {
    if (tool === 'pan') return;
    if (tool === 'erase') {
      const target = e.target;
      const annotationId = target?.attrs?.['data-anno-id'];
      if (annotationId) {
        deleteAnnotation(annotationId);
      }
      return;
    }
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    if (tool === 'point') { saveAnnotation('point', [pos.x, pos.y]); return; }
    if (tool === 'bbox') { setIsDrawing(true); setCurrentPoints([pos.x, pos.y, pos.x, pos.y]); }
    if (tool === 'polygon') { setIsDrawing(true); setCurrentPoints(prev => [...prev, pos.x, pos.y]); }
    if (tool === 'freehand') { setIsDrawing(true); setCurrentPoints([pos.x, pos.y]); }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const pos = stage.getRelativePointerPosition();
    if (tool === 'bbox') {
      setCurrentPoints(prev => { const n = [...prev]; n[2] = pos.x; n[3] = pos.y; return n; });
      return;
    }
    if (tool === 'freehand') {
      setCurrentPoints(prev => {
        if (prev.length === 0) return [pos.x, pos.y];
        const lastX = prev[prev.length - 2];
        const lastY = prev[prev.length - 1];
        if (Math.hypot(pos.x - lastX, pos.y - lastY) < 1) return prev;
        return [...prev, pos.x, pos.y];
      });
    }
  };

  const handleMouseUp = async () => {
    if (!isDrawing || tool === 'pan' || tool === 'polygon') return;
    if (tool === 'bbox') {
      setIsDrawing(false);
      saveAnnotation('bbox', currentPoints);
      setCurrentPoints([]);
      return;
    }
    if (tool === 'freehand') {
      setIsDrawing(false);
      if (currentPoints.length >= 4) {
        await saveAnnotation('freehand', currentPoints, { strokeColor: brushColor, strokeWidth: brushSize, opacity: brushOpacity });
      }
      setCurrentPoints([]);
    }
  };

  const handleDblClick = () => {
    if (tool === 'polygon' && currentPoints.length >= 6) {
      setIsDrawing(false);
      saveAnnotation('polygon', currentPoints);
      setCurrentPoints([]);
    }
  };

  if (!imageRecord || !hasAccess(authRole, organizationId, imageRecord.organizationId)) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-4 text-center">
          <p className="font-medium text-slate-200">Access denied</p>
          <p className="mt-1 text-sm text-slate-500">This image belongs to a different tenant.</p>
        </div>
      </div>
    );
  }

  if (!imageRecord) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Loading image…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 bg-slate-950 overflow-hidden">

      {/* ── Left Tools Sidebar ── */}
      <div className="w-14 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-3 gap-1 shrink-0">
        <button
          onClick={() => {
            if (shouldPromptForNavigation) {
              const confirmed = window.confirm('You have unsaved annotation changes. Leave this page?');
              if (!confirmed) return;
            }
            navigate('/gallery');
          }}
          className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors mb-2"
          title="Back to Gallery"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-px bg-slate-800 my-1" />
        {([
          ['pan', Move, 'Pan & Zoom'],
          ['bbox', Square, 'Bounding Box'],
          ['polygon', Hexagon, 'Polygon — dbl-click to finish'],
          ['point', CircleDot, 'Point'],
          ['freehand', Pencil, 'Freehand Brush'],
          ['erase', Eraser, 'Erase Freehand Region'],
        ] as const).map(([t, Icon, title]) => (
          <button
            key={t}
            onClick={() => {
              setTool(t);
              setHasUnsavedDraft(true);
            }}
            className={`p-2.5 rounded-lg transition-colors ${tool === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title={title}
          >
            <Icon className="w-5 h-5" />
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => void undoLastFreehand()} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Undo freehand stroke">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={() => void redoLastFreehand()} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Redo freehand stroke">
          <Redo2 className="w-4 h-4" />
        </button>
        <button onClick={() => void clearFreehandAnnotations()} className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Clear freehand annotations">
          <Trash2 className="w-4 h-4" />
        </button>
        {/* Save status indicator */}
        <div className={`text-[9px] font-medium px-1 py-0.5 rounded text-center leading-tight ${saveStatus === 'saved' ? 'text-green-400' : saveStatus === 'saving' ? 'text-blue-400' : 'text-amber-400'}`}>
          {saveStatus === 'saved' ? '● Saved' : saveStatus === 'saving' ? '⟳ Saving' : '● Unsaved'}
        </div>
      </div>

      {/* ── Canvas Area ── */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-zinc-950 min-w-0">
        {img && (
          <Stage
            width={canvasSize.width}
            height={canvasSize.height}
            onWheel={handleWheel}
            scaleX={scale}
            scaleY={scale}
            x={position.x}
            y={position.y}
            draggable={tool === 'pan'}
            onDragEnd={e => setPosition({ x: e.target.x(), y: e.target.y() })}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onDblClick={handleDblClick}
            style={{ cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
          >
            <Layer>
              <KonvaImage
                image={img}
                ref={imageRef}
                filters={[Konva.Filters.Brighten, Konva.Filters.Contrast]}
                brightness={brightness}
                contrast={contrast}
              />

              {/* Existing Annotations */}
              {annotations?.map(anno => {
                const color = labelColor(anno.label);
                if (anno.type === 'bbox') {
                  const [x1, y1, x2, y2] = anno.coordinates;
                  return <Rect key={anno.id} x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} stroke={color} strokeWidth={2 / scale} />;
                }
                if (anno.type === 'polygon') {
                  return <Line key={anno.id} points={anno.coordinates} closed stroke={color} strokeWidth={2 / scale} />;
                }
                if (anno.type === 'point') {
                  return <Circle key={anno.id} x={anno.coordinates[0]} y={anno.coordinates[1]} radius={5 / scale} fill={color} opacity={0.9} />;
                }
                if (anno.type === 'freehand') {
                  return <Line key={anno.id} points={anno.coordinates} stroke={anno.strokeColor || color} strokeWidth={(anno.strokeWidth || 6) / scale} opacity={anno.opacity ?? 0.7} lineCap="round" lineJoin="round" tension={0.3} data-anno-id={anno.id} />;
                }
                return null;
              })}

              {/* In-progress drawing */}
              {isDrawing && tool === 'bbox' && currentPoints.length === 4 && (
                <Rect
                  x={Math.min(currentPoints[0], currentPoints[2])}
                  y={Math.min(currentPoints[1], currentPoints[3])}
                  width={Math.abs(currentPoints[2] - currentPoints[0])}
                  height={Math.abs(currentPoints[3] - currentPoints[1])}
                  stroke="cyan" strokeWidth={2 / scale} dash={[6, 4]}
                />
              )}
              {isDrawing && tool === 'polygon' && currentPoints.length > 0 && (
                <Line points={currentPoints} stroke="cyan" strokeWidth={2 / scale} dash={[6, 4]} />
              )}
              {isDrawing && tool === 'freehand' && currentPoints.length > 1 && (
                <Line points={currentPoints} stroke={brushColor} strokeWidth={brushSize / scale} opacity={brushOpacity} lineCap="round" lineJoin="round" tension={0.3} dash={[4, 4]} />
              )}
            </Layer>
          </Stage>
        )}

        {/* Image Controls Overlay (bottom centre) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-sm border border-slate-700 px-5 py-2.5 rounded-full flex items-center gap-5 text-slate-300 z-10 shadow-xl whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 shrink-0" />
            <input type="range" min="-1" max="1" step="0.05" value={brightness} onChange={e => { setBrightness(parseFloat(e.target.value)); setHasUnsavedDraft(true); }} className="w-20 accent-blue-500" />
          </div>
          <div className="flex items-center gap-2">
            <Contrast className="w-4 h-4 shrink-0" />
            <input type="range" min="-100" max="100" step="5" value={contrast} onChange={e => { setContrast(parseFloat(e.target.value)); setHasUnsavedDraft(true); }} className="w-20 accent-blue-500" />
          </div>
          <div className="w-px h-5 bg-slate-700 shrink-0" />
          <button onClick={() => { setScale(s => Math.min(s * 1.2, 10)); setHasUnsavedDraft(true); }}><ZoomIn className="w-4 h-4 hover:text-white transition-colors" /></button>
          <span className="text-xs font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => { setScale(s => Math.max(s / 1.2, 0.05)); setHasUnsavedDraft(true); }}><ZoomOut className="w-4 h-4 hover:text-white transition-colors" /></button>
        </div>
      </div>

      {/* ── Right Properties Panel ── */}
      <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 shadow-2xl">

        {/* Panel Header */}
        <div className="p-4 border-b border-slate-800 shrink-0">
          <h2 className="text-sm font-semibold text-slate-100">Properties</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            {imageRecord.patientId} · {imageRecord.viewCode === 0 ? 'CC' : 'MLO'} · {imageRecord.sideCode === 0 ? 'Left' : 'Right'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── New Annotation Controls ── */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Next Annotation</p>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Label</label>
              <select
                value={activeLabel}
                onChange={e => {
                  setActiveLabel(e.target.value);
                  activeLabelRef.current = e.target.value;
                  setHasUnsavedDraft(true);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              >
                {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">BI-RADS</label>
              <select
                value={activeBiRads}
                onChange={e => {
                  setActiveBiRads(e.target.value);
                  activeBiRadsRef.current = e.target.value;
                  setHasUnsavedDraft(true);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              >
                <option value="0">0 – Incomplete</option>
                <option value="1">1 – Negative</option>
                <option value="2">2 – Benign</option>
                <option value="3">3 – Probably Benign</option>
                <option value="4">4 – Suspicious</option>
                <option value="5">5 – Highly Suggestive of Malignancy</option>
                <option value="6">6 – Known Biopsy-Proven Malignancy</option>
              </select>
            </div>
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <label className="block text-xs font-medium text-slate-400">Brush Style</label>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Size</span>
                  <span>{brushSize}px</span>
                </div>
                <input type="range" min="1" max="24" step="1" value={brushSize} onChange={e => { setBrushSize(parseInt(e.target.value, 10)); setHasUnsavedDraft(true); }} className="w-full accent-blue-500" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Color</span>
                  <span className="font-mono">{brushColor}</span>
                </div>
                <input type="color" value={brushColor} onChange={e => { setBrushColor(e.target.value); setHasUnsavedDraft(true); }} className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900 p-1" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Opacity</span>
                  <span>{brushOpacity.toFixed(2)}</span>
                </div>
                <input type="range" min="0.1" max="1" step="0.05" value={brushOpacity} onChange={e => { setBrushOpacity(parseFloat(e.target.value)); setHasUnsavedDraft(true); }} className="w-full accent-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Remarks</label>
              <textarea
                value={activeRemarks}
                onChange={e => {
                  setActiveRemarks(e.target.value);
                  activeRemarksRef.current = e.target.value;
                  setHasUnsavedDraft(true);
                }}
                placeholder="Notes for this annotation…"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all h-16 resize-none"
              />
            </div>
          </div>

          {/* ── Annotation List ── */}
          <div className="p-4 border-b border-slate-800 space-y-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Annotations ({annotations?.length || 0})
            </p>
            {annotations?.length === 0 && (
              <p className="text-xs text-slate-600 text-center py-3">No annotations yet. Use the tools on the left to draw.</p>
            )}
            {annotations?.map(anno => (
              <div
                key={anno.id}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg p-3 text-sm group transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: labelColor(anno.label) }} />
                    <span className="font-medium text-slate-200 truncate">{anno.label}</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingAnnotation(anno)} className="p-1 text-slate-500 hover:text-blue-400 rounded transition-colors" title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteAnnotation(anno.id)} className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1 capitalize">{anno.type} · {anno.biRads ? `BI-RADS ${anno.biRads}` : 'No BI-RADS'} · {Math.round(anno.tumorArea)} px²</div>
                {anno.remarks && (
                  <div className="text-xs text-slate-400 mt-1.5 italic leading-snug border-l-2 border-slate-700 pl-2">
                    {anno.remarks}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Image Status ── */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Image Status</p>
            <select
              value={imageRecord.status}
              onChange={e => db.images.update(imageRecord.id, { status: e.target.value as MammogramImage['status'] })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
            >
              <option value="Not Reviewed">Not Reviewed</option>
              <option value="In Progress">In Progress</option>
              <option value="Annotated">Annotated</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Approved">Approved</option>
            </select>
          </div>

          {/* ── Image Remarks ── */}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Image Remarks</p>
              {!editingImageRemarks ? (
                <button onClick={() => setEditingImageRemarks(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              ) : (
                <button onClick={saveImageRemarks} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors">
                  <Check className="w-3 h-3" /> Save
                </button>
              )}
            </div>
            {editingImageRemarks ? (
              <textarea
                value={imageRemarks}
                onChange={e => setImageRemarks(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 h-20 resize-none"
                autoFocus
              />
            ) : (
              <p className="text-sm text-slate-400 min-h-[2rem] leading-relaxed">
                {imageRecord.remarks || <span className="text-slate-600 italic">No remarks. Click Edit to add.</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Annotation Modal */}
      {editingAnnotation && (
        <EditAnnotationModal
          annotation={editingAnnotation}
          onSave={updateAnnotation}
          onClose={() => setEditingAnnotation(null)}
        />
      )}
    </div>
  );
};

export default Annotate;
