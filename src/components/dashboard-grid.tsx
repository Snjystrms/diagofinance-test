'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
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
import { Eye, EyeOff, Settings2, RotateCcw, X } from 'lucide-react';
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
  presetLayout?: Layout[];
  presetHiddenWidgets?: string[];
  editable?: boolean;
  cols?: number;
  rowHeight?: number;
  className?: string;
}

const STORAGE_PREFIX = 'dashboard_grid_';

export function DashboardGrid({
  widgets,
  storageKey = 'default',
  presetLayout = [],
  presetHiddenWidgets = [],
  editable = true,
  cols = 12,
  rowHeight = 100,
  className = '',
}: DashboardGridProps) {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(new Set());
  const [isResizeMode, setIsResizeMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  const buildResolvedLayouts = useCallback(
    (sourceLayouts?: Layout[]) =>
      widgets.map((widget) => {
        const savedLayout = sourceLayouts?.find((layout) => layout.i === widget.id);
        if (savedLayout) {
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

        return { i: widget.id, ...widget.defaultLayout };
      }),
    [widgets]
  );

  useEffect(() => {
    if (!widgets.length) return;

    if (!editable) {
      setLayouts(buildResolvedLayouts(presetLayout));
      setHiddenWidgets(new Set(presetHiddenWidgets));
      return;
    }

    const savedLayouts = localStorage.getItem(`${STORAGE_PREFIX}layouts_${storageKey}`);
    const savedHidden = localStorage.getItem(`${STORAGE_PREFIX}hidden_${storageKey}`);

    if (savedLayouts) {
      try {
        setLayouts(buildResolvedLayouts(JSON.parse(savedLayouts)));
      } catch (error) {
        console.error('Error parsing saved layouts:', error);
        setLayouts(buildResolvedLayouts(presetLayout));
      }
    } else {
      setLayouts(buildResolvedLayouts(presetLayout));
    }

    if (savedHidden) {
      try {
        setHiddenWidgets(new Set(JSON.parse(savedHidden)));
      } catch (error) {
        console.error('Error parsing saved hidden widgets:', error);
        setHiddenWidgets(new Set(presetHiddenWidgets));
      }
    } else {
      setHiddenWidgets(new Set(presetHiddenWidgets));
    }
  }, [buildResolvedLayouts, editable, presetHiddenWidgets, presetLayout, storageKey, widgets]);

  const saveLayouts = useCallback(
    (newLayouts: Layout[]) => {
      const layoutsToSave = newLayouts.map((layout) => {
        const widget = widgets.find((item) => item.id === layout.i);
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
        if (editable) {
          localStorage.setItem(`${STORAGE_PREFIX}layouts_${storageKey}`, JSON.stringify(layoutsToSave));
        }
        setLayouts(layoutsToSave);
      } catch (error) {
        console.error('Error saving layouts to localStorage:', error);
        setLayouts(layoutsToSave);
      }
    },
    [editable, storageKey, widgets]
  );

  const saveHiddenWidgets = useCallback(
    (hidden: Set<string>) => {
      if (editable) {
        localStorage.setItem(`${STORAGE_PREFIX}hidden_${storageKey}`, JSON.stringify(Array.from(hidden)));
      }
      setHiddenWidgets(hidden);
    },
    [editable, storageKey]
  );

  const onLayoutChange = useCallback(
    (layout: Layout[]) => {
      if (!editable) return;
      saveLayouts(layout);
    },
    [editable, saveLayouts]
  );

  const onResizeStop = useCallback(
    (layout: Layout[]) => {
      if (!editable) return;
      saveLayouts(layout);
    },
    [editable, saveLayouts]
  );

  const toggleWidgetVisibility = useCallback(
    (widgetId: string, showNotification = true) => {
      if (!editable) return;

      const widget = widgets.find((item) => item.id === widgetId);
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
    [editable, hiddenWidgets, saveHiddenWidgets, widgets]
  );

  const resetLayout = useCallback(() => {
    const defaultLayouts = widgets.map((widget) => ({ i: widget.id, ...widget.defaultLayout }));
    saveLayouts(defaultLayouts);
    saveHiddenWidgets(new Set());
    toast.success('Dashboard layout reset to default!');
  }, [saveHiddenWidgets, saveLayouts, widgets]);

  const visibleWidgets = widgets.filter((widget) => !hiddenWidgets.has(widget.id));
  const currentLayout = layouts.filter((layout) => !hiddenWidgets.has(layout.i));

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
      `}</style>

      {editable ? (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-2">
          <p className="text-sm text-muted-foreground">
            Drag to rearrange. {isResizeMode ? 'Resize is enabled.' : 'Enable resize to adjust widget size.'}
          </p>

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
                  <DialogDescription>Show or hide widgets on your dashboard</DialogDescription>
                </DialogHeader>
                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                  {widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50"
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
      ) : null}

      <GridLayout
        className="layout"
        layout={currentLayout}
        cols={cols}
        rowHeight={rowHeight}
        width={containerWidth}
        onLayoutChange={onLayoutChange}
        onResizeStop={onResizeStop}
        isDraggable={editable}
        isResizable={editable && isResizeMode}
        resizeHandles={['se', 'sw', 'nw', 'ne', 'w', 'e', 'n', 's']}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        compactType={null}
        preventCollision={false}
      >
        {visibleWidgets.map((widget) => (
          <div key={widget.id} className="group relative h-full" style={{ overflow: 'visible' }}>
            <div
              className="h-full w-full rounded-lg transition-all"
              style={{ overflow: 'hidden', cursor: editable ? 'move' : 'default' }}
            >
              {widget.component}
            </div>
            {editable ? (
              <div className="remove-widget-btn absolute right-2 top-2 z-20 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7 rounded-full bg-destructive/90 shadow-lg transition-transform hover:scale-110 hover:bg-destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    toggleWidgetVisibility(widget.id, true);
                  }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                  }}
                  title={`Remove ${widget.title}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
            {editable && isResizeMode ? (
              <div className="pointer-events-none absolute bottom-1 right-1 z-10">
                <div className="rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary/60 backdrop-blur-sm">
                  Resize
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </GridLayout>

      {visibleWidgets.length === 0 ? (
        <Card className="p-12 text-center">
          <EyeOff className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">All widgets are hidden</h3>
          <p className="mb-4 text-muted-foreground">
            {editable
              ? 'Use the Widget Settings button to show widgets on your dashboard.'
              : 'This dashboard preset currently hides all widgets.'}
          </p>
          <Button onClick={() => saveHiddenWidgets(new Set())} variant="outline" disabled={!editable}>
            Show All Widgets
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
