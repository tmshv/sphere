import { visualCases } from "../visual/visualCases"
import { Heading, Text, type TextTone, type TextWeight } from "."

const TONES: ReadonlyArray<TextTone> = ["default", "dimmed", "warning"]
const WEIGHTS: ReadonlyArray<TextWeight> = ["normal", "medium", "semibold"]

const toneWeightCases = Object.fromEntries(
    TONES.flatMap(tone =>
        WEIGHTS.map(weight => [
            `${tone}-${weight}`,
            {
                render: () => (
                    <Text tone={tone} weight={weight}>
                        Sample text
                    </Text>
                ),
            },
        ]),
    ),
)

visualCases("Text", {
    ...toneWeightCases,
    uppercase: {
        render: () => (
            <Text weight="semibold" uppercase tone="dimmed">
                Section title
            </Text>
        ),
    },
    heading: { render: () => <Heading>Heading text</Heading> },
})
