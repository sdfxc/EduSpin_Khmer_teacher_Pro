import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Notebook, 
  NotebookPage, 
  ToolType, 
  PenType, 
  EraserMode, 
  ShapeType, 
  PaperTemplate, 
  ImageElement,
  EquationElement,
  HistoryAction 
} from './types';
import { 
  loadNotebooks, 
  saveNotebooks, 
  loadActiveNotebookId, 
  saveActiveNotebookId,
  createDefaultNotebook 
} from './storage';
import NotebookHeader from './NotebookHeader';
import SmartToolbar from './SmartToolbar';
import SmartCanvas from './SmartCanvas';
import PageThumbnailsSidebar from './PageThumbnailsSidebar';
import EquationEditorModal from './EquationEditorModal';
import ExportModal from './ExportModal';
import SearchModal from './SearchModal';
import NotebooksListModal from './NotebooksListModal';

interface SmartNotesAppProps {
  isDarkMode: boolean;
  onClose?: () => void;
}

export default function SmartNotesApp({ isDarkMode }: SmartNotesAppProps) {
  // Master Notebooks state
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => loadNotebooks());
  const [activeNotebookId, setActiveNotebookId] = useState<string>(() => {
    const savedId = loadActiveNotebookId();
    const loaded = loadNotebooks();
    if (savedId && loaded.some(nb => nb.id === savedId)) {
      return savedId;
    }
    return loaded[0]?.id || '';
  });

  // Current Notebook & Active Page
  const activeNotebook = notebooks.find(nb => nb.id === activeNotebookId) || notebooks[0] || createDefaultNotebook();
  const currentPageIndex = Math.min(activeNotebook.activePageIndex || 0, activeNotebook.pages.length - 1);
  const activePage = activeNotebook.pages[currentPageIndex] || activeNotebook.pages[0];

  // Tool states
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [penType, setPenType] = useState<PenType>('ballpoint');
  const [currentColor, setCurrentColor] = useState<string>('#2563eb');
  const [currentWidth, setCurrentWidth] = useState<number>(3.0);
  const [eraserMode, setEraserMode] = useState<EraserMode>('stroke');
  const [shapeType, setShapeType] = useState<ShapeType>('rectangle');
  const [autoRecognizeShapes, setAutoRecognizeShapes] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1.0);

  // Undo / Redo History Stacks
  const [historyStack, setHistoryStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  // UI Panels and Modals
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEquationModalOpen, setIsEquationModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Container Ref for Fullscreen
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-Save Effect
  useEffect(() => {
    if (notebooks.length > 0) {
      saveNotebooks(notebooks);
    }
  }, [notebooks]);

  useEffect(() => {
    if (activeNotebookId) {
      saveActiveNotebookId(activeNotebookId);
    }
  }, [activeNotebookId]);

  // Push current page state into history stack before a mutating action
  const pushHistory = useCallback(() => {
    if (!activePage) return;
    const currentSnapshot: HistoryAction = {
      pageId: activePage.id,
      strokes: JSON.parse(JSON.stringify(activePage.strokes || [])),
      shapes: JSON.parse(JSON.stringify(activePage.shapes || [])),
      texts: JSON.parse(JSON.stringify(activePage.texts || [])),
      images: JSON.parse(JSON.stringify(activePage.images || [])),
      equations: JSON.parse(JSON.stringify(activePage.equations || []))
    };
    setHistoryStack(prev => [...prev.slice(-30), currentSnapshot]);
    setRedoStack([]); // Clear redo on new action
  }, [activePage]);

  // Undo Action
  const handleUndo = useCallback(() => {
    if (historyStack.length === 0 || !activePage) return;
    const previousSnapshot = historyStack[historyStack.length - 1];
    const newHistory = historyStack.slice(0, -1);

    // Save current state to redo stack
    const currentSnapshot: HistoryAction = {
      pageId: activePage.id,
      strokes: JSON.parse(JSON.stringify(activePage.strokes || [])),
      shapes: JSON.parse(JSON.stringify(activePage.shapes || [])),
      texts: JSON.parse(JSON.stringify(activePage.texts || [])),
      images: JSON.parse(JSON.stringify(activePage.images || [])),
      equations: JSON.parse(JSON.stringify(activePage.equations || []))
    };
    setRedoStack(prev => [...prev, currentSnapshot]);
    setHistoryStack(newHistory);

    // Apply previous snapshot
    setNotebooks(prev => prev.map(nb => {
      if (nb.id !== activeNotebook.id) return nb;
      return {
        ...nb,
        pages: nb.pages.map(p => {
          if (p.id !== activePage.id) return p;
          return {
            ...p,
            strokes: previousSnapshot.strokes,
            shapes: previousSnapshot.shapes,
            texts: previousSnapshot.texts,
            images: previousSnapshot.images,
            equations: previousSnapshot.equations,
            updatedAt: Date.now()
          };
        })
      };
    }));
  }, [historyStack, activePage, activeNotebook.id]);

  // Redo Action
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !activePage) return;
    const nextSnapshot = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);

    // Save current state to history
    const currentSnapshot: HistoryAction = {
      pageId: activePage.id,
      strokes: JSON.parse(JSON.stringify(activePage.strokes || [])),
      shapes: JSON.parse(JSON.stringify(activePage.shapes || [])),
      texts: JSON.parse(JSON.stringify(activePage.texts || [])),
      images: JSON.parse(JSON.stringify(activePage.images || [])),
      equations: JSON.parse(JSON.stringify(activePage.equations || []))
    };
    setHistoryStack(prev => [...prev, currentSnapshot]);
    setRedoStack(newRedo);

    // Apply next snapshot
    setNotebooks(prev => prev.map(nb => {
      if (nb.id !== activeNotebook.id) return nb;
      return {
        ...nb,
        pages: nb.pages.map(p => {
          if (p.id !== activePage.id) return p;
          return {
            ...p,
            strokes: nextSnapshot.strokes,
            shapes: nextSnapshot.shapes,
            texts: nextSnapshot.texts,
            images: nextSnapshot.images,
            equations: nextSnapshot.equations,
            updatedAt: Date.now()
          };
        })
      };
    }));
  }, [redoStack, activePage, activeNotebook.id]);

  // Update active page helper
  const handleUpdatePage = useCallback((updater: (prev: NotebookPage) => NotebookPage) => {
    setNotebooks(prev => prev.map(nb => {
      if (nb.id !== activeNotebook.id) return nb;
      const updatedPages = nb.pages.map((p, idx) => {
        if (idx !== currentPageIndex) return p;
        return updater(p);
      });
      return {
        ...nb,
        pages: updatedPages,
        updatedAt: Date.now()
      };
    }));
  }, [activeNotebook.id, currentPageIndex]);

  // Add Page
  const handleAddPage = useCallback(() => {
    pushHistory();
    const newPage: NotebookPage = {
      id: `page-${Date.now()}`,
      title: `ទំព័រទី ${activeNotebook.pages.length + 1}`,
      template: activePage?.template || 'ruled',
      strokes: [],
      shapes: [],
      texts: [],
      images: [],
      equations: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setNotebooks(prev => prev.map(nb => {
      if (nb.id !== activeNotebook.id) return nb;
      const newPages = [...nb.pages, newPage];
      return {
        ...nb,
        pages: newPages,
        activePageIndex: newPages.length - 1,
        updatedAt: Date.now()
      };
    }));
  }, [activeNotebook.id, activeNotebook.pages.length, activePage?.template, pushHistory]);

  // Duplicate Page
  const handleDuplicatePage = useCallback((index: number) => {
    pushHistory();
    const target = activeNotebook.pages[index];
    if (!target) return;

    const cloned: NotebookPage = {
      ...JSON.parse(JSON.stringify(target)),
      id: `page-${Date.now()}`,
      title: `${target.title} (ចម្លង)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setNotebooks(prev => prev.map(nb => {
      if (nb.id !== activeNotebook.id) return nb;
      const newPages = [...nb.pages];
      newPages.splice(index + 1, 0, cloned);
      return {
        ...nb,
        pages: newPages,
        activePageIndex: index + 1,
        updatedAt: Date.now()
      };
    }));
  }, [activeNotebook.id, activeNotebook.pages, pushHistory]);

  // Delete Page
  const handleDeletePage = useCallback((index: number) => {
    if (activeNotebook.pages.length <= 1) return;
    pushHistory();

    setNotebooks(prev => prev.map(nb => {
      if (nb.id !== activeNotebook.id) return nb;
      const newPages = nb.pages.filter((_, i) => i !== index);
      const nextActive = Math.min(index, newPages.length - 1);
      return {
        ...nb,
        pages: newPages,
        activePageIndex: nextActive,
        updatedAt: Date.now()
      };
    }));
  }, [activeNotebook.id, activeNotebook.pages.length, pushHistory]);

  // Move Page Order
  const handleMovePage = useCallback((fromIndex: number, toIndex: number) => {
    setNotebooks(prev => prev.map(nb => {
      if (nb.id !== activeNotebook.id) return nb;
      const newPages = [...nb.pages];
      const [moved] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, moved);
      return {
        ...nb,
        pages: newPages,
        activePageIndex: toIndex,
        updatedAt: Date.now()
      };
    }));
  }, [activeNotebook.id]);

  // Clear entire page content
  const handleClearPage = useCallback(() => {
    if (window.confirm('តើលោកអ្នកចង់លុបសម្អាតទំព័រនេះទាំងមូលមែនទេ?')) {
      pushHistory();
      handleUpdatePage(prev => ({
        ...prev,
        strokes: [],
        shapes: [],
        texts: [],
        images: [],
        equations: []
      }));
    }
  }, [pushHistory, handleUpdatePage]);

  // Change Paper Template
  const handleChangePaperTemplate = useCallback((template: PaperTemplate) => {
    handleUpdatePage(prev => ({
      ...prev,
      template
    }));
  }, [handleUpdatePage]);

  // Insert LaTeX Equation
  const handleInsertEquation = useCallback((latex: string, color: string, fontSize: number) => {
    pushHistory();
    const newEq: EquationElement = {
      id: `eq-${Date.now()}`,
      x: 120,
      y: 200,
      latex,
      color,
      fontSize
    };
    handleUpdatePage(prev => ({
      ...prev,
      equations: [...prev.equations, newEq]
    }));
  }, [pushHistory, handleUpdatePage]);

  // Upload & Insert Image
  const handleUploadImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        pushHistory();
        const newImg: ImageElement = {
          id: `img-${Date.now()}`,
          x: 100,
          y: 150,
          width: 320,
          height: 240,
          dataUrl
        };
        handleUpdatePage(prev => ({
          ...prev,
          images: [...prev.images, newImg]
        }));
      }
    };
    reader.readAsDataURL(file);
  }, [pushHistory, handleUpdatePage]);

  // Create New Notebook
  const handleCreateNotebook = (title: string, subject: string, coverColor: string, coverIcon: string) => {
    const newNb: Notebook = {
      id: `nb-${Date.now()}`,
      title,
      subject,
      coverColor,
      coverIcon,
      pages: [
        {
          id: `page-${Date.now()}-1`,
          title: 'ទំព័រទី១',
          template: 'ruled',
          strokes: [],
          shapes: [],
          texts: [],
          images: [],
          equations: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      activePageIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updated = [...notebooks, newNb];
    setNotebooks(updated);
    setActiveNotebookId(newNb.id);
  };

  // Close Notebook Tab
  const handleCloseNotebookTab = (id: string) => {
    if (notebooks.length <= 1) return;
    const remaining = notebooks.filter(nb => nb.id !== id);
    setNotebooks(remaining);
    if (activeNotebookId === id) {
      setActiveNotebookId(remaining[0].id);
    }
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.error(err));
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full flex flex-col overflow-hidden select-none font-sans ${
        isDarkMode ? 'bg-[#0b0f19] text-white' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* 1. Header Notebook Tabs & Global Utilities */}
      <NotebookHeader
        notebooks={notebooks}
        activeNotebookId={activeNotebook.id}
        onSelectNotebook={setActiveNotebookId}
        onCloseNotebookTab={handleCloseNotebookTab}
        onNewNotebook={() => handleCreateNotebook('សៀវភៅថ្មី', 'ទូទៅ', '#4f46e5', '📘')}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        isDarkMode={isDarkMode}
      />

      {/* 2. Main Smart Toolbar */}
      <SmartToolbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        penType={penType}
        onChangePenType={setPenType}
        currentColor={currentColor}
        onChangeColor={setCurrentColor}
        currentWidth={currentWidth}
        onChangeWidth={setCurrentWidth}
        eraserMode={eraserMode}
        onChangeEraserMode={setEraserMode}
        shapeType={shapeType}
        onChangeShapeType={setShapeType}
        autoRecognizeShapes={autoRecognizeShapes}
        onToggleAutoRecognizeShapes={() => setAutoRecognizeShapes(!autoRecognizeShapes)}
        paperTemplate={activePage?.template || 'ruled'}
        onChangePaperTemplate={handleChangePaperTemplate}
        onAddPage={handleAddPage}
        onPrevPage={() => {
          if (currentPageIndex > 0) {
            setNotebooks(prev => prev.map(nb => nb.id === activeNotebook.id ? { ...nb, activePageIndex: currentPageIndex - 1 } : nb));
          }
        }}
        onNextPage={() => {
          if (currentPageIndex < activeNotebook.pages.length - 1) {
            setNotebooks(prev => prev.map(nb => nb.id === activeNotebook.id ? { ...nb, activePageIndex: currentPageIndex + 1 } : nb));
          }
        }}
        currentPageIndex={currentPageIndex}
        totalPages={activeNotebook.pages.length}
        canUndo={historyStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearPage={handleClearPage}
        zoom={zoom}
        onZoomIn={() => setZoom(prev => Math.min(2.5, prev + 0.1))}
        onZoomOut={() => setZoom(prev => Math.max(0.4, prev - 0.1))}
        onResetZoom={() => setZoom(1.0)}
        onOpenEquationModal={() => setIsEquationModalOpen(true)}
        onUploadImage={handleUploadImage}
        isDarkMode={isDarkMode}
      />

      {/* 3. Workspace: Sidebar + High-Performance Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        <PageThumbnailsSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          pages={activeNotebook.pages}
          activePageIndex={currentPageIndex}
          onSelectPage={(index) => {
            setNotebooks(prev => prev.map(nb => nb.id === activeNotebook.id ? { ...nb, activePageIndex: index } : nb));
          }}
          onAddPage={handleAddPage}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onMovePage={handleMovePage}
          isDarkMode={isDarkMode}
        />

        {activePage && (
          <SmartCanvas
            page={activePage}
            onUpdatePage={handleUpdatePage}
            currentTool={currentTool}
            penType={penType}
            currentColor={currentColor}
            currentWidth={currentWidth}
            eraserMode={eraserMode}
            shapeType={shapeType}
            autoRecognizeShapes={autoRecognizeShapes}
            zoom={zoom}
            onZoomChange={setZoom}
            isDarkMode={isDarkMode}
            onPushHistory={pushHistory}
            onOpenEquationEdit={(eq) => {
              setIsEquationModalOpen(true);
            }}
          />
        )}
      </div>

      {/* 4. Modals */}
      <EquationEditorModal
        isOpen={isEquationModalOpen}
        onClose={() => setIsEquationModalOpen(false)}
        onInsertEquation={handleInsertEquation}
        isDarkMode={isDarkMode}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        notebook={activeNotebook}
        currentPageIndex={currentPageIndex}
        isDarkMode={isDarkMode}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        notebooks={notebooks}
        onSelectResult={(nbId, pIndex) => {
          setActiveNotebookId(nbId);
          setNotebooks(prev => prev.map(nb => nb.id === nbId ? { ...nb, activePageIndex: pIndex } : nb));
        }}
        isDarkMode={isDarkMode}
      />

      <NotebooksListModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        notebooks={notebooks}
        activeNotebookId={activeNotebook.id}
        onSelectNotebook={setActiveNotebookId}
        onCreateNotebook={handleCreateNotebook}
        onDeleteNotebook={(id) => {
          const remaining = notebooks.filter(nb => nb.id !== id);
          setNotebooks(remaining);
          if (activeNotebookId === id && remaining.length > 0) {
            setActiveNotebookId(remaining[0].id);
          }
        }}
        onImportNotebook={(imported) => {
          setNotebooks(prev => [...prev, imported]);
          setActiveNotebookId(imported.id);
          setIsLibraryOpen(false);
        }}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
