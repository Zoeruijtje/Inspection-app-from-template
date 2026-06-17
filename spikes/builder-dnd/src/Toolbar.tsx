// Phase 3A0-A — Toolbar with undo/redo/save controls

import { useCallback, useState } from 'react';
import { useBuilder, getSimulateFailure, setSimulateFailure } from './BuilderContext';
import type { SaveStatus } from './types';

export function Toolbar() {
  const { state, dispatch, handleSave } = useBuilder();
  const [, setTick] = useState(0);

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  const saveStatusLabel: Record<SaveStatus, string> = {
    saved: '✅ Saved',
    unsaved: '⚠️ Unsaved changes',
    saving: '⏳ Saving...',
    failed: '❌ Save failed — reverted',
  };

  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);

  const toggleFailure = useCallback(() => {
    setSimulateFailure(!getSimulateFailure());
    setTick(t => t + 1);
  }, []);

  return (
    <div className="toolbar" role="toolbar" aria-label="Builder toolbar">
      <div className="toolbar-left">
        <span className="toolbar-title">🏗️ Form Builder — Phase 3A0-A Spike</span>
      </div>
      <div className="toolbar-center">
        <button
          className="toolbar-btn"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo last action"
        >
          ↩ Undo
        </button>
        <button
          className="toolbar-btn"
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo last undone action"
        >
          ↪ Redo
        </button>
        <button
          className="toolbar-btn toolbar-btn-save"
          onClick={handleSave}
          disabled={state.saveStatus === 'saving'}
          title="Save template"
          aria-label="Save template"
        >
          💾 Save
        </button>
      </div>
      <div className="toolbar-right">
        <label className="toolbar-toggle" title="When enabled, save will simulate a server error">
          <input
            type="checkbox"
            checked={getSimulateFailure()}
            onChange={toggleFailure}
          />
          <span>Simulate save failure</span>
        </label>
        <span className={`toolbar-status status-${state.saveStatus}`}>
          {saveStatusLabel[state.saveStatus]}
        </span>
      </div>
    </div>
  );
}
