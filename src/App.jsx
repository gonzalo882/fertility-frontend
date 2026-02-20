import { useMemo, useState } from "react";
import { Upload, FileText, Download, Sparkles } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileCountLabel = useMemo(() => {
    if (files.length === 0) return "0 files";
    return `${files.length} ${files.length === 1 ? "file" : "files"}`;
  }, [files.length]);

const handleFileSelect = (e) => {
  const selected = Array.from(e.target.files || []);
  if (selected.length === 0) return;

  for (const file of selected) {

    // BLOQUEAR > 50MB
    if (file.size > 50 * 1024 * 1024) {
      setError(`"${file.name}" exceeds the 50MB limit.`);
      return;
    }

    // AVISAR > 20MB
    if (file.size > 20 * 1024 * 1024) {
      alert(`"${file.name}" is large and may take up to 3 minutes to process.`);
    }
  }

  setFiles((prev) => [...prev, ...selected]);
  setError("");
};
 const handleDrop = (e) => {
  e.preventDefault();
  setDragOver(false);

  const dropped = Array.from(e.dataTransfer.files || []);
  if (dropped.length === 0) return;

  for (const file of dropped) {

    if (file.size > 50 * 1024 * 1024) {
      setError(`"${file.name}" exceeds the 50MB limit.`);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert(`"${file.name}" is large and may take up to 3 minutes to process.`);
    }
  }

  setFiles((prev) => [...prev, ...dropped]);
  setError("");
};
  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  async function ocrFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/api/ocr`, { method: "POST", body: formData });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OCR erro (${res.status}): ${txt}`);
    }
    const data = await res.json();
    const text = data?.text || "";
    return `Document: ${file.name}\n\n${text}\n`;
  }

  async function analyzeText(text) {
    const res = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Analyze erro (${res.status}): ${txt}`);
    }
    const data = await res.json();
    return data?.report ? data.report : JSON.stringify(data, null, 2);
  }

  const run = async () => {
    if (files.length === 0) {
      setError("Please upload at least one file");
      return;
    }

    setProcessing(true);
    setError("");
    setReport("");

    try {
      const parts = [];
      for (const f of files) parts.push(await ocrFile(f));
      const combined = parts.join("\n\n");
      const r = await analyzeText(combined);
      setReport(r);
    } catch (e) {
      setError(e.message || "Processing error");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setReport("");
    setError("");
  };

  const downloadTxt = () => {
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medical_report_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <div className="center">
        <div className="badge">
          <Sparkles size={16} />
          Powered by AI
        </div>

        <div className="h1">
          Medical Report
          <br />
          Analyzer
        </div>

        <p className="p">Intelligent analysis for fertility documents</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        {!report ? (
          <>
            <div
              className={`drop ${dragOver ? "over" : ""}`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => document.getElementById("fileInput").click()}
            >
              <input
                id="fileInput"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              <div className="iconBox">
                <Upload size={28} />
              </div>

              <p className="dropTitle">Drop medical files here</p>
              <p className="dropSub">or click to browse</p>
              <p className="dropHint">Supports PDF, JPG, PNG</p>
            </div>

            {files.length > 0 && (
              <div className="files">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <p style={{ margin: 0, fontWeight: 750 }}>{fileCountLabel}</p>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                    Tip: multi-file works (OCR each, then one combined report)
                  </p>
                </div>

                {files.map((file, idx) => (
                  <div className="fileRow" key={`${file.name}-${idx}`}>
                    <div className="fileLeft">
                      <div className="fileIcon">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="fileName">{file.name}</p>
                        <p className="fileMeta">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button className="x" onClick={() => removeFile(idx)} aria-label="Remove file">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {processing && (
              <div className="progress">
                <div className="spinner" />
                <p className="h2">Analyzing with AI</p>
                <p className="small">
                  Processing document with OCR and generating a compact first visit note.
                  <br />
                  (May take 30–90 seconds)
                </p>
              </div>
            )}

            <button className="btn" onClick={run} disabled={processing || files.length === 0}>
              {processing ? "Processing..." : "Analyze Documents"}
            </button>
          </>
        ) : (
          <>
            <div className="resultsHead">
              <div className="h2">Generated Report</div>
              <div className="actions">
                <button className="btn2 primary" onClick={downloadTxt}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <Download size={16} />
                    Download
                  </span>
                </button>
                <button className="btn2 ghost" onClick={reset}>
                  New Analysis
                </button>
              </div>
            </div>

            <div className="report">
              <pre>{report}</pre>
            </div>
          </>
        )}
      </div>

      <div className="footer">MVP Demo • AI-powered medical analysis</div>
    </div>
  );
}
