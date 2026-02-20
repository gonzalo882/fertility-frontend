import { useMemo, useState } from "react";
import { Upload, FileText, Download } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [phase, setPhase] = useState(""); // status line
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileCountLabel = useMemo(() => {
    if (files.length === 0) return "0 files";
    return `${files.length} ${files.length === 1 ? "file" : "files"}`;
  }, [files.length]);

  function validateAndWarn(list) {
    for (const file of list) {
      // hard limit
      if (file.size > 50 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 50MB limit.`);
        return false;
      }
      // soft warning
      if (file.size > 20 * 1024 * 1024) {
        alert(`"${file.name}" is large and may take up to 3 minutes to process.`);
      }
    }
    return true;
  }

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    setError("");
    if (!validateAndWarn(selected)) return;

    setFiles((prev) => [...prev, ...selected]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length === 0) return;

    setError("");
    if (!validateAndWarn(dropped)) return;

    setFiles((prev) => [...prev, ...dropped]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  async function ocrFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL}/api/ocr`, { method: "POST", body: formData });

    if (!res.ok) {
      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json") ? await res.json() : await res.text();
      const details =
        typeof body === "string" ? body.slice(0, 400) : JSON.stringify(body, null, 2).slice(0, 900);
      throw new Error(`OCR error (${res.status}): ${details}`);
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
      const contentType = res.headers.get("content-type") || "";
      const body = contentType.includes("application/json") ? await res.json() : await res.text();
      const details =
        typeof body === "string" ? body.slice(0, 400) : JSON.stringify(body, null, 2).slice(0, 900);
      throw new Error(`Analyze error (${res.status}): ${details}`);
    }

    const data = await res.json();
    return data?.report ? data.report : JSON.stringify(data, null, 2);
  }

  const run = async () => {
    if (!API_URL) {
      setError("Configuration error: missing VITE_API_URL.");
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one PDF file.");
      return;
    }

    setProcessing(true);
    setError("");
    setReport("");

    try {
      setPhase("Extracting document content (OCR)");
      const parts = [];
      for (const f of files) parts.push(await ocrFile(f));
      const combined = parts.join("\n\n");

      setPhase("Structuring clinical data using AI");
      const r = await analyzeText(combined);

      setPhase("Generating standardized consultation note");
      setReport(r);
    } catch (e) {
      setError("We encountered a temporary processing issue. Please try again.");
      console.error(e);
    } finally {
      setProcessing(false);
      setPhase("");
    }
  };

  const reset = () => {
    setFiles([]);
    setReport("");
    setError("");
    setPhase("");
  };

  const downloadTxt = () => {
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `first_visit_note_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <div className="center">
        <div className="badge" title="Exclusive prototype">
          <span>
            Proprietary MVP developed exclusively for ARA Group
            <br />
            <span style={{ fontWeight: 600, opacity: 0.9 }}>
              by ProEx (AI &amp; Operational Excellence)
            </span>
          </span>
        </div>

        <div className="h1">
          Advanced Clinical Documentation Engine
          <br />
          for Assisted Reproductive Technology
        </div>

        <p className="p">
          This prototype system processes laboratory and clinical documentation and generates a structured First Visit
          Note aligned with ART/IVF consultation standards.
        </p>
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
                accept=".pdf"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              <div className="iconBox">
                <Upload size={26} />
              </div>

              <p className="dropTitle">Upload Clinical Documentation</p>
              <p className="dropSub">Supports PDF files up to 50MB.</p>
              <p className="dropHint">
                Large documents may require up to 3 minutes for processing.
                <br />
                The system performs OCR extraction and AI-assisted structuring of uploaded medical documentation.
              </p>
            </div>

            {files.length > 0 && (
              <div className="files">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <p style={{ margin: 0, fontWeight: 750 }}>{fileCountLabel}</p>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                    Total size: {fmtMB(files.reduce((a, f) => a + f.size, 0))} MB
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
                        <p className="fileMeta">{fmtMB(file.size)} MB</p>
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
                <p className="h2">{phase || "Processing..."}</p>
                <p className="small">
                  For large PDFs, processing may take up to 2–3 minutes.
                  <br />
                  Please keep this tab open until completion.
                </p>
              </div>
            )}

            <button className="btn" onClick={run} disabled={processing || files.length === 0}>
              {processing ? "Processing..." : "Generate First Visit Report"}
            </button>
          </>
        ) : (
          <>
            <div className="resultsHead">
              <div className="h2">Structured First Visit Note (AI-Generated)</div>
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

            <p className="small" style={{ marginTop: 0 }}>
              Please review clinical accuracy before use in medical decision-making.
            </p>

            <div className="report">
              <pre>{report}</pre>
            </div>
          </>
        )}
      </div>

      <div className="footer">
        This prototype solution has been developed exclusively for ARA Group by ProEx.
        <br />
        Outputs are AI-assisted and require professional clinical validation before clinical application.
      </div>
    </div>
  );
}