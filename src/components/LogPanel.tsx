import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearDiagLogs,
  getDiagLogs,
  logDiag,
  subscribeDiagLogs,
} from "../lib/logger";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function LogPanel() {
  const [logs, setLogs] = useState<string[]>(() => getDiagLogs());
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const copiedResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return subscribeDiagLogs((entry) => {
      setLogs((previousLogs) => {
        const nextLogs = [...previousLogs, entry];
        if (nextLogs.length > 500) {
          return nextLogs.slice(nextLogs.length - 500);
        }
        return nextLogs;
      });
    });
  }, []);

  useEffect(() => {
    if (collapsed) return;
    const node = bodyRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [logs, collapsed]);

  const textContent = useMemo(() => logs.join("\n"), [logs]);

  const handleCopy = async () => {
    if (!textContent) return;
    const ok = await copyText(textContent);
    setCopied(ok);
    if (ok) {
      logDiag(`diag: panel copied lines=${logs.length}`);
      if (copiedResetTimerRef.current !== null) {
        window.clearTimeout(copiedResetTimerRef.current);
      }
      copiedResetTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedResetTimerRef.current = null;
      }, 3000);
    }
  };

  const handleClear = () => {
    clearDiagLogs();
    setLogs([]);
    logDiag("diag: panel cleared");
  };

  return (
    <section className="log-panel" aria-label="Diagnostic logs">
      <header className="log-panel-header">
        <button
          type="button"
          className="log-panel-toggle"
          onClick={() => setCollapsed((value) => !value)}
        >
          Logs ({logs.length})
        </button>
        <div className="log-panel-actions">
          <button type="button" className="log-panel-btn" onClick={handleCopy}>
            {copied ? "\u2713" : "\u29c9"}
          </button>
          <button type="button" className="log-panel-btn" onClick={handleClear}>
            Clear
          </button>
        </div>
      </header>
      {!collapsed ? (
        <div ref={bodyRef} className="log-panel-body">
          {logs.length === 0 ? (
            <div className="log-panel-empty">No logs yet</div>
          ) : (
            logs.map((entry, index) => (
              <pre className="log-panel-line" key={`${index}-${entry}`}>
                {entry}
              </pre>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
