'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import GridLayout, { Layout, ItemCallback } from 'react-grid-layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Eye, EyeOff, GripVertical, Settings2, RotateCcw, X } from 'lucide-react';
import 'react-grid-layout/css/styles.css';

export interface DashboardWidget {
  id: string;
  title: string;
  component: React.ReactNode;
  defaultLayout: {
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  };
}

interface DashboardGridProps {
  widgets: DashboardWidget[];
  storageKey?: string;
  cols?: number;
  rowHeight?: number;
  className?: string;
}

const STORAGE_PREFIX = 'dashboard_grid_';

export function DashboardGrid({
  widgets,
  storageKey = 'default',
  cols = 12,
  rowHeight = 100,
  className = '',
}: DashboardGridProps) {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(new Set());
  const [isResizeMode, setIsResizeMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  // Load preferences from localStorage on mount and when storageKey/widgets change
  useEffect(() => {
    // Only load if widgets are available
    if (!widgets || widgets.length === 0) {
      return;
    }

    const savedLayouts = localStorage.getItem(`${STORAGE_PREFIX}layouts_${storageKey}`);
    const savedHidden = localStorage.getItem(`${STORAGE_PREFIX}hidden_${storageKey}`);

    if (savedLayouts) {
      try {
        const parsed = JSON.parse(savedLayouts);
        // Validate and merge with default layouts to ensure all properties are present
        const validatedLayouts = widgets.map(widget => {
          const savedLayout = parsed.find((l: Layout) => l.i === widget.id);
          if (savedLayout) {
            // Merge saved layout with defaults to ensure all properties (x, y, w, h) are present
            // This preserves resize data (w, h) and position (x, y) from localStorage
            return {
              i: widget.id,
              x: typeof savedLayout.x === 'number' ? savedLayout.x : widget.defaultLayout.x,
              y: typeof savedLayout.y === 'number' ? savedLayout.y : widget.defaultLayout.y,
              w: typeof savedLayout.w === 'number' ? savedLayout.w : widget.defaultLayout.w,
              h: typeof savedLayout.h === 'number' ? savedLayout.h : widget.defaultLayout.h,
              minW: savedLayout.minW ?? widget.defaultLayout.minW,
              minH: savedLayout.minH ?? widget.defaultLayout.minH,
              maxW: savedLayout.maxW ?? widget.defaultLayout.maxW,
              maxH: savedLayout.maxH ?? widget.defaultLayout.maxH,
            };
          }
          // If no saved layout, use default
          return { i: widget.id, ...widget.defaultLayout };
        });
        setLayouts(validatedLayouts);
      } catch (error) {
        console.error('Error parsing saved layouts:', error);
        // Fallback to default layouts
        setLayouts(widgets.map(w => ({ i: w.id, ...w.defaultLayout })));
      }
    } else {
      // Initialize with default layouts if no saved data exists
      // These default layouts match the normal dashboard structure (same as reset layout)
      const defaultLayouts = widgets.map(w => ({ i: w.id, ...w.defaultLayout }));
      setLayouts(defaultLayouts);
    }

    if (savedHidden) {
      try {
        const parsed = JSON.parse(savedHidden);
        setHiddenWidgets(new Set(parsed));
      } catch (error) {
        console.error('Error parsing saved hidden widgets:', error);
        setHiddenWidgets(new Set());
      }
    } else {
      // Initialize with empty set if no saved hidden widgets
      setHiddenWidgets(new Set());
    }
  }, [storageKey, widgets]);

  // Save layouts to localStorage
  const saveLayouts = useCallback(
    (newLayouts: Layout[]) => {
      // Ensure all layout items have complete data (x, y, w, h) before saving
      const layoutsToSave = newLayouts.map((layout) => {
        const widget = widgets.find(w => w.id === layout.i);
        return {
          i: layout.i,
          x: typeof layout.x === 'number' ? layout.x : (widget?.defaultLayout.x ?? 0),
          y: typeof layout.y === 'number' ? layout.y : (widget?.defaultLayout.y ?? 0),
          w: typeof layout.w === 'number' ? layout.w : (widget?.defaultLayout.w ?? 4),
          h: typeof layout.h === 'number' ? layout.h : (widget?.defaultLayout.h ?? 3),
          minW: layout.minW ?? widget?.defaultLayout.minW,
          minH: layout.minH ?? widget?.defaultLayout.minH,
          maxW: layout.maxW ?? widget?.defaultLayout.maxW,
          maxH: layout.maxH ?? widget?.defaultLayout.maxH,
        };
      });
      
      try {
        localStorage.setItem(`${STORAGE_PREFIX}layouts_${storageKey}`, JSON.stringify(layoutsToSave));
        setLayouts(layoutsToSave);
      } catch (error) {
        console.error('Error saving layouts to localStorage:', error);
        // Still update state even if localStorage fails
        setLayouts(layoutsToSave);
      }
    },
    [storageKey, widgets]
  );

  // Save hidden widgets to localStorage
  const saveHiddenWidgets = useCallback(
    (hidden: Set<string>) => {
      localStorage.setItem(`${STORAGE_PREFIX}hidden_${storageKey}`, JSON.stringify(Array.from(hidden)));
      setHiddenWidgets(hidden);
    },
    [storageKey]
  );

  // Handle layout change (called on drag, resize, or any layout change)
  const onLayoutChange: ItemCallback = useCallback(
    (layout: Layout[]) => {
      // Save layout immediately when it changes (includes resize data: w, h)
      saveLayouts(layout);
    },
    [saveLayouts]
  );

  // Toggle widget visibility
  const toggleWidgetVisibility = useCallback(
    (widgetId: string, showNotification = true) => {
      const widget = widgets.find(w => w.id === widgetId);
      const newHidden = new Set(hiddenWidgets);
      if (newHidden.has(widgetId)) {
        newHidden.delete(widgetId);
        if (showNotification) {
          toast.success(`${widget?.title || 'Widget'} restored`);
        }
      } else {
        newHidden.add(widgetId);
        if (showNotification) {
          toast.success(`${widget?.title || 'Widget'} removed from dashboard`);
        }
      }
      saveHiddenWidgets(newHidden);
    },
    [hiddenWidgets, saveHiddenWidgets, widgets]
  );

  // Reset to default layout (matches normal dashboard layout)
  const resetLayout = useCallback(() => {
    // Use default layouts from widgets - these match the normal dashboard structure
    const defaultLayouts = widgets.map(w => ({ i: w.id, ...w.defaultLayout }));
    saveLayouts(defaultLayouts);
    saveHiddenWidgets(new Set());
    toast.success('Dashboard layout reset to default!');
  }, [widgets, saveLayouts, saveHiddenWidgets]);

  // Get visible widgets
  const visibleWidgets = widgets.filter(w => !hiddenWidgets.has(w.id));

  // Get current layout for visible widgets only
  const currentLayout = layouts.filter(l => !hiddenWidgets.has(l.i));

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div ref={containerRef} className={`dashboard-grid-container ${className}`}>
      <style jsx global>{`
        .react-grid-layout {
          position: relative;
        }
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
          cursor: move;
          overflow: visible !important;
        }
        .react-grid-item:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }
        .react-grid-item.resizing {
          transition: none;
          z-index: 1;
          will-change: width, height;
        }
        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 3;
          will-change: transform;
          cursor: grabbing !important;
          opacity: 0.9;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }
        .react-grid-item.react-draggable-dragging * {
          pointer-events: none;
        }
        .react-grid-item .remove-widget-btn {
          pointer-events: auto;
        }
        .react-grid-item.react-draggable-dragging .remove-widget-btn {
          pointer-events: none;
        }
        .react-grid-item.dropping {
          visibility: hidden;
        }
        .react-grid-item.react-grid-placeholder {
          background: hsl(var(--primary) / 0.15);
          opacity: 0.3;
          transition-duration: 100ms;
          z-index: 2;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -o-user-select: none;
          user-select: none;
          border-radius: 0.5rem;
          border: 2px dashed hsl(var(--primary) / 0.5);
        }
        .react-grid-item > .react-resizable-handle {
          position: absolute;
          z-index: 30;
          background: transparent;
          pointer-events: auto;
        }
        /* Bottom-right corner (se) */
        .react-grid-item > .react-resizable-handle-se {
          width: 24px;
          height: 24px;
          bottom: 0;
          right: 0;
          cursor: se-resize;
        }
        .react-grid-item > .react-resizable-handle-se::after {
          content: "";
          position: absolute;
          right: 2px;
          bottom: 2px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0 16px 16px;
          border-color: transparent transparent hsl(var(--primary) / 0.5) transparent;
          pointer-events: none;
        }
        .react-grid-item > .react-resizable-handle-se:hover::after {
          border-color: transparent transparent hsl(var(--primary)) transparent;
        }
        /* Bottom-left corner (sw) */
        .react-grid-item > .react-resizable-handle-sw {
          width: 24px;
          height: 24px;
          bottom: 0;
          left: 0;
          cursor: sw-resize;
        }
        .react-grid-item > .react-resizable-handle-sw::after {
          content: "";
          position: absolute;
          left: 2px;
          bottom: 2px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0 16px 16px;
          border-color: transparent transparent transparent hsl(var(--primary) / 0.5);
          pointer-events: none;
        }
        .react-grid-item > .react-resizable-handle-sw:hover::after {
          border-color: transparent transparent transparent hsl(var(--primary));
        }
        /* Top-right corner (ne) */
        .react-grid-item > .react-resizable-handle-ne {
          width: 24px;
          height: 24px;
          top: 0;
          right: 0;
          cursor: ne-resize;
        }
        .react-grid-item > .react-resizable-handle-ne::after {
          content: "";
          position: absolute;
          right: 2px;
          top: 2px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 16px 16px 0 0;
          border-color: hsl(var(--primary) / 0.5) transparent transparent transparent;
          pointer-events: none;
        }
        .react-grid-item > .react-resizable-handle-ne:hover::after {
          border-color: hsl(var(--primary)) transparent transparent transparent;
        }
        /* Top-left corner (nw) */
        .react-grid-item > .react-resizable-handle-nw {
          width: 24px;
          height: 24px;
          top: 0;
          left: 0;
          cursor: nw-resize;
        }
        .react-grid-item > .react-resizable-handle-nw::after {
          content: "";
          position: absolute;
          left: 2px;
          top: 2px;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 16px 16px 0 0;
          border-color: hsl(var(--primary) / 0.5) transparent transparent transparent;
          pointer-events: none;
        }
        .react-grid-item > .react-resizable-handle-nw:hover::after {
          border-color: hsl(var(--primary)) transparent transparent transparent;
        }
        /* Right edge (e) */
        .react-grid-item > .react-resizable-handle-e {
          width: 8px;
          height: 100%;
          top: 0;
          right: 0;
          cursor: e-resize;
        }
        .react-grid-item > .react-resizable-handle-e::after {
          content: "";
          position: absolute;
          right: 2px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 20px;
          background: hsl(var(--primary) / 0.3);
          border-radius: 2px;
          pointer-events: none;
        }
        .react-grid-item > .react-resizable-handle-e:hover::after {
          background: hsl(var(--primary));
        }
        /* Left edge (w) */
        .react-grid-item > .react-resizable-handle-w {
          width: 8px;
          height: 100%;
          top: 0;
          left: 0;
          cursor: w-resize;
        }
        .react-grid-item > .react-resizable-handle-w::after {
          content: "";
          position: absolute;
          left: 2px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 20px;
          background: hsl(var(--primary) / 0.3);
          border-radius: 2px;
          pointer-events: none;
        }
        .react-grid-item > .react-resizable-handle-w:hover::after {
          background: hsl(var(--primary));
        }
        /* Bottom edge (s) */
        .react-grid-item > .react-resizable-handle-s {
          width: 100%;
          height: 8px;
          bottom: 0;
          left: 0;
          cursor: s-resize;
        }
        .react-grid-item > .react-resizable-handle-s::after {
          content: "";
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 4px;
          background: hsl(var(--primary) / 0.3);
          border-radius: 2px;
          pointer-events: none;
        }
        .react-grid-item > .react-resizable-handle-s:hover::after {
          background: hsl(var(--primary));
        }
        /* Top edge (n) */
        .react-grid-item > .react-resizable-handle-n {
          width: 100%;
          height: 8px;
          top: 0;
          left: 0;
          cursor: n-resize;
        }
        .react-grid-item > .react-resizable-handle-n::after {
          content: "";
          position: absolute;
          top: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 4px;
          background: hsl(var(--primary) / 0.3);
          border-radius: 2px;
          pointer-events: none;
        }
        .react-grid-item > .react-resizable-handle-n:hover::after {
          background: hsl(var(--primary));
        }
        /* Resizing state */
        .react-grid-item.resizing > .react-resizable-handle::after {
          opacity: 1;
        }
      `}</style>
      {/* Control Bar */}
      <div className="flex items-center justify-between mb-4 p-2 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            💡 Drag to rearrange • {isResizeMode ? 'Drag edges/corners to resize width & height • ' : 'Enable resize to adjust size • '}Hover to remove
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={isResizeMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsResizeMode(!isResizeMode)}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            {isResizeMode ? 'Disable Resize' : 'Enable Resize'}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Widget Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Widget Settings</DialogTitle>
                <DialogDescription>
                  Show or hide widgets on your dashboard
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {widgets.map(widget => (
                  <div
                    key={widget.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50"
                  >
                    <span className="font-medium">{widget.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWidgetVisibility(widget.id)}
                      className="gap-2"
                    >
                      {hiddenWidgets.has(widget.id) ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Show
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Hide
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={resetLayout} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset Layout
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grid Layout */}
      <GridLayout
        className="layout"
        layout={currentLayout}
        cols={cols}
        rowHeight={rowHeight}
        width={containerWidth}
        onLayoutChange={onLayoutChange}
        onResizeStop={onLayoutChange}
        isDraggable={true}
        isResizable={isResizeMode}
        resizeHandles={['se', 'sw', 'nw', 'ne', 'w', 'e', 'n', 's']}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType={null}
        preventCollision={false}
      >
        {visibleWidgets.map(widget => {
          const widgetLayout = layouts.find(l => l.i === widget.id) || {
            i: widget.id,
            ...widget.defaultLayout,
          };

          return (
            <div key={widget.id} className="relative h-full group" style={{ overflow: 'visible' }}>
              <div className="h-full w-full cursor-move hover:ring-2 hover:ring-primary/20 rounded-lg transition-all" style={{ overflow: 'hidden' }}>
                {widget.component}
              </div>
              {/* Remove Button - Always visible on hover */}
              <div 
                className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity remove-widget-btn"
              >
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7 rounded-full shadow-lg hover:scale-110 transition-transform bg-destructive/90 hover:bg-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleWidgetVisibility(widget.id, true);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  title={`Remove ${widget.title}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {/* Resize Mode Indicator - Visual feedback when resize is enabled */}
              {isResizeMode && (
                <div className="absolute bottom-1 right-1 z-10 pointer-events-none">
                  <div className="text-[10px] text-primary/60 font-semibold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 backdrop-blur-sm">
                    Resize
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </GridLayout>

      {/* Empty State */}
      {visibleWidgets.length === 0 && (
        <Card className="p-12 text-center">
          <EyeOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">All widgets are hidden</h3>
          <p className="text-muted-foreground mb-4">
            Use the Widget Settings button to show widgets on your dashboard.
          </p>
          <Button onClick={() => saveHiddenWidgets(new Set())} variant="outline">
            Show All Widgets
          </Button>
        </Card>
      )}
    </div>
  );
}

