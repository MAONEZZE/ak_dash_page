import { createRoot } from "react-dom/client";
import "./app/globals.css";
import { Termometro } from "./componentes/Termometro";
createRoot(document.getElementById("r")!).render(
  <div style={{ display: "flex", gap: 16, padding: 16, height: 520 }}>
    {[50000, 200000, 350000].map((v) => (
      <div key={v} style={{ width: 440, display: "flex" }}><Termometro dado={{ realizado: v, meta: 380000 }} /></div>
    ))}
  </div>,
);
