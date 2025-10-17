import React from "react";
import ReactDOM from "react-dom/client";

import { ExampleNEAR, MultichainExample } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ExampleNEAR />
    <MultichainExample />
  </React.StrictMode>
);
