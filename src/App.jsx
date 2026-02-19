import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      // 1) OCR: enviar PDF
      const formData = new FormData();
      formData.append("file", file);

      const ocrRes = await fetch(`${API_URL}/api/ocr`, {
        method: "POST",
        body: formData,
      });

      if (!ocrRes.ok) {
        const txt = await ocrRes.text();
        throw new Error(`Erro OCR (${ocrRes.status}): ${txt}`);
      }

      const ocrData = await ocrRes.json();

      // tentar apanhar o texto independentemente do nome do campo
      const extractedText =
        ocrData.text ||
        ocrData.extractedText ||
        ocrData.result ||
        ocrData.parsedText ||
        "";

      if (!extractedText || extractedText.trim().length === 0) {
        setResult({ error: "OCR não devolveu texto. Tente outro PDF." });
        setLoading(false);
        return;
      }

      // 2) Analyze: enviar texto
      const analyzeRes = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText }),
      });

      if (!analyzeRes.ok) {
        const txt = await analyzeRes.text();
        throw new Error(`Erro Analyze (${analyzeRes.status}): ${txt}`);
      }

      const analyzeData = await analyzeRes.json();
      setResult(analyzeData);
    } catch (e) {
      setResult({ error: e.message || "Erro ao comunicar com o backend." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40, fontFamily: "Arial", maxWidth: 900 }}>
      <h1>Fertility MVP</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <br />
      <br />

      <button onClick={handleUpload} disabled={!file || loading}>
        {loading ? "A processar..." : "Enviar e Analisar"}
      </button>

      <br />
      <br />

      {result && (
        <pre style={{ background: "#f4f4f4", padding: 20, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
