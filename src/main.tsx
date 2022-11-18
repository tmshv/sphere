import { listen } from "@tauri-apps/api/event";
import { appWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { App } from "./components/App";
import { actions, store } from "./store";
import "./style.css";

async function handleTheme() {
  const theme = await appWindow.theme();
  if (theme) {
    store.dispatch(actions.app.setDarkTheme(theme === "dark"))
  }

  const e = "tauri://theme-changed"
  const unlisten = await listen(e, (event) => {
    const theme = event.payload as string
    store.dispatch(actions.app.setDarkTheme(theme === "dark"))
  })
}

async function handleVersion() {
  const version = await getVersion();
  store.dispatch(actions.app.setVersion(version))
}

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
handleTheme()
handleVersion()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
