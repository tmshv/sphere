import { listen } from "@tauri-apps/api/event";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { App } from "./components/App";
import { actions, store } from "./store";
import "./style.css";

async function main() {
  const e = "tauri://file-drop"
  // const e = "tauri://file-drop-hover"
  // const e = "tauri://file-drop-cancelled"

  const unlisten = await listen(e, (event) => {
    const files = event.payload as string[]
    store.dispatch(actions.source.readFromFiles(files))
  })
}
main()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
