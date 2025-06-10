/// <reference types="vinxi/types/client" />

// Import polyfill first to ensure it runs before any code that might use File API
import './polyfill';

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import "./styles.css";

import { createRouter } from "./router";

// Set up a Router instance
const router = createRouter();

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}
