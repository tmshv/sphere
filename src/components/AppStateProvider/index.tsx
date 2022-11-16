import { useInterpret } from "@xstate/react";
import { AppStateContext } from "../../state";
import { mapStyleMachine } from "../../state/map-style";

export type AppStateProviderProps = {
    children: React.ReactNode
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
    const mapStyle = useInterpret(mapStyleMachine);

    return (
        <AppStateContext.Provider value={{
            mapStyle,
        }}>
            {children}
        </AppStateContext.Provider>
    );
};
