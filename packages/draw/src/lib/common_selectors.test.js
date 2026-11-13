import { expect, it } from "vitest"
import * as commonSelectors from "./common_selectors"

it("commonSelectors.isOfMetaType", () => {
    const isFoo = commonSelectors.isOfMetaType("foo")
    expect(typeof isFoo).toBe("function")
    expect(
        isFoo({
            featureTarget: {
                properties: {
                    meta: "foo",
                },
            },
        }),
    ).toBeTruthy()
    expect(isFoo({})).toBeFalsy()
    expect(
        isFoo({
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
        commonSelectors.isShiftMousedown({
            originalEvent: {
                shiftKey: true,
                button: 0,
            },
        }),
    ).toBeTruthy()

    expect(
        commonSelectors.isShiftMousedown({
            originalEvent: {
                shiftKey: false,
                button: 0,
            },
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isShiftMousedown({
            originalEvent: {
                shiftKey: true,
                button: 1,
            },
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isShiftMousedown({
            nothing: false,
        }),
    ).toBeFalsy()
})

it("commonSelectors.isActiveFeature", () => {
    expect(
        commonSelectors.isActiveFeature({
            featureTarget: {
                properties: {
                    active: "true",
                    meta: "feature",
                },
            },
        }),
    ).toBeTruthy()

    expect(
        commonSelectors.isActiveFeature({
            foo: "bar",
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isActiveFeature({
            featureTarget: {
                properties: {
                    active: "false",
                    meta: "feature",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isActiveFeature({
            featureTarget: {
                properties: {
                    active: "true",
                    meta: "something",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isActiveFeature({
            featureTarget: {
                properties: {
                    active: true,
                    meta: "Feature",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isActiveFeature({
            nothing: false,
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isActiveFeature({
            featureTarget: {},
        }),
    ).toBeFalsy()
})

it("commonSelectors.isInactiveFeature", () => {
    expect(
        commonSelectors.isInactiveFeature({
            featureTarget: {
                properties: {
                    active: "false",
                    meta: "feature",
                },
            },
        }),
    ).toBeTruthy()

    expect(
        commonSelectors.isInactiveFeature({
            foo: "bar",
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isInactiveFeature({
            featureTarget: {
                properties: {
                    active: "true",
                    meta: "feature",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isInactiveFeature({
            featureTarget: {
                properties: {
                    active: "false",
                    meta: "something",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isInactiveFeature({
            featureTarget: {
                properties: {
                    active: false,
                    meta: "Feature",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isInactiveFeature({
            nothing: false,
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isInactiveFeature({
            featureTarget: {},
        }),
    ).toBeFalsy()
})

it("commonSelectors.noTarget", () => {
    expect(
        commonSelectors.noTarget({
            something: 1,
        }),
    ).toBeTruthy()

    expect(
        commonSelectors.noTarget({
            FeatureTarget: 1,
        }),
    ).toBeTruthy()

    expect(
        commonSelectors.noTarget({
            featureTarget: {},
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.noTarget({
            featureTarget: null,
        }),
    ).toBeFalsy()
})

it("commonSelectors.isFeature", () => {
    expect(
        commonSelectors.isFeature({
            featureTarget: {
                properties: {
                    meta: "feature",
                },
            },
        }),
    ).toBeTruthy()

    expect(
        commonSelectors.isFeature({
            feee: 2,
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isFeature({
            featureTarget: {
                properties: {
                    meta: "nonfeature",
                },
            },
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isFeature({
            nothing: false,
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isFeature({
            featureTarget: {},
        }),
    ).toBeFalsy()
})

it("commonSelectors.isShiftDown", () => {
    expect(
        commonSelectors.isShiftDown({
            originalEvent: {
                shiftKey: true,
            },
        }),
    ).toBeTruthy()

    expect(
        commonSelectors.isShiftDown({
            originalEvent: {
                shiftKey: false,
            },
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isShiftDown({
            originalEvent: {},
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isShiftDown({
            nothing: true,
        }),
    ).toBeFalsy()
})

it("commonSelectors.isEscapeKey", () => {
    expect(
        commonSelectors.isEscapeKey({
            keyCode: 27,
        }),
    ).toBeTruthy()

    expect(
        commonSelectors.isEscapeKey({
            keyCode: 13,
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isEscapeKey({
            originalEvent: {},
        }),
    ).toBeFalsy()
})

it("commonSelectors.isEnterKey", () => {
    expect(
        commonSelectors.isEnterKey({
            keyCode: 13,
        }),
    ).toBeTruthy()

    expect(
        commonSelectors.isEnterKey({
            keyCode: 27,
        }),
    ).toBeFalsy()

    expect(
        commonSelectors.isEnterKey({
            originalEvent: {},
        }),
    ).toBeFalsy()
})

it("commonSelectors.true", () => {
    expect(commonSelectors.isTrue()).toBeTruthy()
    expect(commonSelectors.isTrue(false)).toBeTruthy()
})
