import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(WorkoutWidgetPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Let CSS backdrop-filter / glass docks sample content through the WKWebView.
        view.backgroundColor = .clear
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.backgroundColor = .clear
    }
}
