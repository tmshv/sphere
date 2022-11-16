import { InterpreterFrom } from "xstate";
import { createContext } from "react";
import { mapStyleMachine } from "./map-style";

export const AppStateContext = createContext({
    mapStyle: {} as InterpreterFrom<typeof mapStyleMachine>,
});
