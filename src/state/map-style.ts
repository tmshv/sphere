import { createMachine } from 'xstate';

export const mapStyleMachine = createMachine({
    id: 'mapStyle',
    initial: "satellite",
    states: {
        vector: { on: { TOGGLE: 'satellite' } },
        satellite: { on: { TOGGLE: 'vector' } },
    }
});
