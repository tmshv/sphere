import { render, screen } from "../test-utils"
// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { PropertiesViewer } from "."

const URL_VALUE = "https://example.com/photo.jpg"

describe("PropertiesViewer", () => {
    it("renders a row with key, value and copy button per property", () => {
        render(
            <PropertiesViewer
                properties={[
                    { key: "name", value: "Berlin" },
                    { key: "population", value: "3600000" },
                ]}
            />,
        )
        expect(screen.getAllByRole("row")).toHaveLength(2)
        expect(screen.getByText("name")).toBeInTheDocument()
        expect(screen.getByText("Berlin")).toBeInTheDocument()
        expect(screen.getByText("population")).toBeInTheDocument()
        expect(screen.getByText("3600000")).toBeInTheDocument()
        expect(screen.getAllByRole("button")).toHaveLength(2)
    })

    it("renders url values as text by default", () => {
        render(<PropertiesViewer properties={[{ key: "photo", value: URL_VALUE }]} />)
        expect(screen.getByText(URL_VALUE)).toBeInTheDocument()
        expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })

    it("renders url values as images when checkUrls is set", () => {
        render(<PropertiesViewer properties={[{ key: "photo", value: URL_VALUE }]} checkUrls />)
        expect(screen.getByRole("img")).toHaveAttribute("src", URL_VALUE)
        expect(screen.queryByText(URL_VALUE)).not.toBeInTheDocument()
    })
})
