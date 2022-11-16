import { createMachine } from 'xstate';

export const mapStyleMachine = createMachine({
    id: 'mapStyle',
    initial: "vector",
    states: {
        vector: { on: { TOGGLE: 'satellite' } },
        satellite: { on: { TOGGLE: 'vector' } },
    }
});
