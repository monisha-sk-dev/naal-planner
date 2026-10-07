"use client";

import { useEffect } from "react";

export interface ToastData {
  id: number;
  message: string;
  onUndo?: () => void;
}

export default function Toast({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 6000);
    return () => clearTimeout(id);
  }, [toast.id, onClose]);

  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      {toast.onUndo && (
        <button className="toast-undo" onClick={() => { toast.onUndo!(); onClose(); }}>Undo</button>
      )}
    </div>
  );
}
