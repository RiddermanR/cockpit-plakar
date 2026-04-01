import React from "react";
import { createRoot } from "react-dom/client";
import { Application } from "./app";
import "./app.scss";

document.addEventListener("DOMContentLoaded", () => {
    createRoot(document.getElementById("app")!).render(<Application />);
});
