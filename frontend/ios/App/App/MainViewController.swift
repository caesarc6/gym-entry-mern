import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController {
    private var cropGesturesActive = false
    private var didAttachZoomReset = false
    private var savedScrollEnabled = true
    private var savedDelaysContentTouches = true
    private var didOverrideTouchDelivery = false

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(WorkoutWidgetPlugin())
        bridge?.registerPluginInstance(CropGesturesPlugin())
        attachZoomResetIfNeeded()
        disablePinchZoom()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        attachZoomResetIfNeeded()
        disablePinchZoom()
    }

    /// Page pinch-zoom stays off. During a photo crop the scroll view must
    /// still forward pinch and vertical pans so the cropper can use them.
    func setCropGesturesActive(_ active: Bool) {
        guard active != cropGesturesActive else { return }
        guard let scrollView = webView?.scrollView else { return }
        cropGesturesActive = active
        if active {
            savedScrollEnabled = scrollView.isScrollEnabled
            savedDelaysContentTouches = scrollView.delaysContentTouches
            didOverrideTouchDelivery = true
            scrollView.isScrollEnabled = false
            scrollView.delaysContentTouches = false
            scrollView.pinchGestureRecognizer?.isEnabled = true
            scrollView.pinchGestureRecognizer?.cancelsTouchesInView = false
            scrollView.panGestureRecognizer.cancelsTouchesInView = false
            scrollView.minimumZoomScale = 1
            scrollView.maximumZoomScale = 1
            scrollView.zoomScale = 1
            scrollView.bouncesZoom = false
        } else {
            scrollView.isScrollEnabled = savedScrollEnabled
            if didOverrideTouchDelivery {
                scrollView.delaysContentTouches = savedDelaysContentTouches
                didOverrideTouchDelivery = false
            }
            scrollView.pinchGestureRecognizer?.cancelsTouchesInView = true
            scrollView.panGestureRecognizer.cancelsTouchesInView = true
            scrollView.zoomScale = 1
            disablePinchZoom()
        }
    }

    private func disablePinchZoom() {
        guard !cropGesturesActive else { return }
        guard let scrollView = webView?.scrollView else { return }
        scrollView.pinchGestureRecognizer?.isEnabled = false
        scrollView.minimumZoomScale = 1
        scrollView.maximumZoomScale = 1
        scrollView.bouncesZoom = false
    }

    private func attachZoomResetIfNeeded() {
        guard !didAttachZoomReset, let pinch = webView?.scrollView.pinchGestureRecognizer else { return }
        pinch.addTarget(self, action: #selector(resetWebViewZoom(_:)))
        didAttachZoomReset = true
    }

    @objc private func resetWebViewZoom(_ gesture: UIPinchGestureRecognizer) {
        guard cropGesturesActive, let scrollView = webView?.scrollView else { return }
        if scrollView.zoomScale != 1 {
            scrollView.setZoomScale(1, animated: false)
        }
    }
}

@objc(CropGesturesPlugin)
public class CropGesturesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CropGesturesPlugin"
    public let jsName = "CropGestures"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setActive", returnType: CAPPluginReturnPromise)
    ]

    @objc func setActive(_ call: CAPPluginCall) {
        let active = call.getBool("active") ?? false
        DispatchQueue.main.async { [weak self] in
            if let controller = self?.bridge?.viewController as? MainViewController {
                controller.setCropGesturesActive(active)
            }
            call.resolve()
        }
    }
}
