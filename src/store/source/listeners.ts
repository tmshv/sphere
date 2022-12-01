import { createListenerMiddleware } from "@reduxjs/toolkit";
import { actions } from './';

export const sourceListener = createListenerMiddleware();
sourceListener.startListening({
    actionCreator: actions.addRemote,
    effect: async (action, listenerApi) => {
        return 
    },
});
