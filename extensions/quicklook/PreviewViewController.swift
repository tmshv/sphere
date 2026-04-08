import Cocoa
import Quartz
import WebKit

class PreviewViewController: NSViewController, QLPreviewingController {

    var webView: WKWebView!
    private var navigationHandler: NavigationHandler?

    override var nibName: NSNib.Name? {
        return NSNib.Name("PreviewViewController")
    }

    override func loadView() {
        let config = WKWebViewConfiguration()
        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        self.view = webView
    }

    func preparePreviewOfFile(at url: URL, completionHandler handler: @escaping (Error?) -> Void) {
        guard let resourcesURL = Bundle.main.resourceURL else {
            handler(NSError(domain: "SphereQuickLook", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot find bundle resources"]))
            return
        }

        let indexURL = resourcesURL.appendingPathComponent("index.html")

        let nav = NavigationHandler { [weak self] in
            guard let self = self else { return }
            do {
                let data = try Data(contentsOf: url)
                guard let jsonString = String(data: data, encoding: .utf8) else {
                    handler(NSError(domain: "SphereQuickLook", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot decode file as UTF-8"]))
                    return
                }
                let escaped = jsonString
                    .replacingOccurrences(of: "\\", with: "\\\\")
                    .replacingOccurrences(of: "`", with: "\\`")
                let js = "window.loadGeoJSON(`\(escaped)`)"
                self.webView.evaluateJavaScript(js) { _, error in
                    handler(error)
                }
            } catch {
                handler(error)
            }
        }
        navigationHandler = nav
        webView.navigationDelegate = nav
        webView.loadFileURL(indexURL, allowingReadAccessTo: resourcesURL)
    }
}

class NavigationHandler: NSObject, WKNavigationDelegate {
    let onFinish: () -> Void

    init(onFinish: @escaping () -> Void) {
        self.onFinish = onFinish
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        onFinish()
    }
}
