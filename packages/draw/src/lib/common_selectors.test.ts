import { expect, it } from "vitest"
import * as commonSelectors from "./common_selectors"

// The selectors take loosely shaped events; the tests feed them malformed ones on purpose.
function call(fn: (...args: never[]) => boolean, ...args: unknown[]): boolean {
    return Reflect.apply(fn, undefined, args)
}

it("commonSelectors.isOfMetaType", () => {
    const isFoo = commonSelectors.isOfMetaType("foo")
    expect(typeof isFoo).toBe("function")
    expect(
        call(isFoo, {
            featureTarget: {
                properties: {
                    meta: "foo",
                },
            },
        }),
    ).toBeTruthy()
    expect(call(isFoo, {})).toBeFalsy()
    expect(
        call(isFoo, {
            featureTarget: {
                properties: {
                    meta: "bar",
                },
            },
        }),
    ).toBeFalsy()
})

it("commonSelectors.isShiftMousedown", () => {
    expect(
        call(commonSelectors.isShiftMousedown, {
            originalEvent: {
                shiftKey: true,
                button: 0,
            },
        }),
    ).toBeTruthy()

    expect(
        call(commonSelectors.isShiftMousedown, {
            originalEvent: {
                shiftKey: false,
                button: 0,
            },
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isShiftMousedown, {
            originalEvent: {
                shiftKey: true,
                button: 1,
            },
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isShiftMousedown, {
            nothing: false,
        }),
    ).toBeFalsy()
})

it("commonSelectors.isActiveFeature", () => {
    expect(
        call(commonSelectors.isActiveFeature, {
            featureTarget: {
                properties: {
                    active: "true",
                    meta: "feature",
                },
            },
        }),
    ).toBeTruthy()

    expect(
        call(commonSelectors.isActiveFeature, {
            foo: "bar",
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isActiveFeature, {
            featureTarget: {
                properties: {
                    active: "false",
                    meta: "feature",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isActiveFeature, {
            featureTarget: {
                properties: {
                    active: "true",
                    meta: "something",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isActiveFeature, {
            featureTarget: {
                properties: {
                    active: true,
                    meta: "Feature",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isActiveFeature, {
            nothing: false,
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isActiveFeature, {
            featureTarget: {},
        }),
    ).toBeFalsy()
})

it("commonSelectors.isInactiveFeature", () => {
    expect(
        call(commonSelectors.isInactiveFeature, {
            featureTarget: {
                properties: {
                    active: "false",
                    meta: "feature",
                },
            },
        }),
    ).toBeTruthy()

    expect(
        call(commonSelectors.isInactiveFeature, {
            foo: "bar",
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isInactiveFeature, {
            featureTarget: {
                properties: {
                    active: "true",
                    meta: "feature",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isInactiveFeature, {
            featureTarget: {
                properties: {
                    active: "false",
                    meta: "something",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isInactiveFeature, {
            featureTarget: {
                properties: {
                    active: false,
                    meta: "Feature",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isInactiveFeature, {
            nothing: false,
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isInactiveFeature, {
            featureTarget: {},
        }),
    ).toBeFalsy()
})

it("commonSelectors.noTarget", () => {
    expect(
        call(commonSelectors.noTarget, {
            something: 1,
        }),
    ).toBeTruthy()

    expect(
        call(commonSelectors.noTarget, {
            FeatureTarget: 1,
        }),
    ).toBeTruthy()

    expect(
        call(commonSelectors.noTarget, {
            featureTarget: {},
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.noTarget, {
            featureTarget: null,
        }),
    ).toBeFalsy()
})

it("commonSelectors.isFeature", () => {
    expect(
        call(commonSelectors.isFeature, {
            featureTarget: {
                properties: {
                    meta: "feature",
                },
            },
        }),
    ).toBeTruthy()

    expect(
        call(commonSelectors.isFeature, {
            feee: 2,
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isFeature, {
            featureTarget: {
                properties: {
                    meta: "nonfeature",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isFeature, {
            nothing: false,
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isFeature, {
            featureTarget: {},
        }),
    ).toBeFalsy()
})

it("commonSelectors.isShiftDown", () => {
    expect(
        call(commonSelectors.isShiftDown, {
            originalEvent: {
                shiftKey: true,
            },
        }),
    ).toBeTruthy()

    expect(
        call(commonSelectors.isShiftDown, {
            originalEvent: {
                shiftKey: false,
            },
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isShiftDown, {
            originalEvent: {},
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isShiftDown, {
            nothing: true,
        }),
    ).toBeFalsy()
})

it("commonSelectors.isEscapeKey", () => {
    expect(
        call(commonSelectors.isEscapeKey, {
            keyCode: 27,
        }),
    ).toBeTruthy()

    expect(
        call(commonSelectors.isEscapeKey, {
            keyCode: 13,
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isEscapeKey, {
            originalEvent: {},
        }),
    ).toBeFalsy()
})

it("commonSelectors.isEnterKey", () => {
    expect(
        call(commonSelectors.isEnterKey, {
            keyCode: 13,
        }),
    ).toBeTruthy()

    expect(
        call(commonSelectors.isEnterKey, {
            keyCode: 27,
        }),
    ).toBeFalsy()

    expect(
        call(commonSelectors.isEnterKey, {
            originalEvent: {},
        }),
    ).toBeFalsy()
})

it("commonSelectors.true", () => {
    expect(call(commonSelectors.isTrue)).toBeTruthy()
    expect(call(commonSelectors.isTrue, false)).toBeTruthy()
})
