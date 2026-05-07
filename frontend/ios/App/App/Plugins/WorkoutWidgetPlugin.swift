import Capacitor
import Foundation
import WidgetKit

@objc(WorkoutWidgetPlugin)
public class WorkoutWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WorkoutWidgetPlugin"
    public let jsName = "WorkoutWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateSummary", returnType: CAPPluginReturnPromise)
    ]

    private let appGroupIdentifier = "group.com.etherealgains.gymentry"
    private let summaryKey = "workoutHabitSummary"
    private let summaryDataKey = "workoutHabitSummaryData"

    @objc func updateSummary(_ call: CAPPluginCall) {
        guard let summary = call.getObject("summary") else {
            call.reject("Missing summary")
            return
        }

        guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
            call.reject("Unable to open shared App Group storage")
            return
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: summary, options: [])
            guard let json = String(data: data, encoding: .utf8) else {
                call.reject("Unable to encode widget summary")
                return
            }

            defaults.set(json, forKey: summaryKey)
            defaults.set(data, forKey: summaryDataKey)
            defaults.set(Date().timeIntervalSince1970, forKey: "workoutHabitSummaryUpdatedAt")
            defaults.synchronize()

            WidgetCenter.shared.reloadTimelines(ofKind: "WorkoutHabitWidget")
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve([
                "saved": true,
                "appGroupIdentifier": appGroupIdentifier,
                "workoutDaysCount": (summary["workoutDays"] as? [Any])?.count ?? 0,
                "activeDaysCount": (summary["workoutDays"] as? [[String: Any]])?.filter { $0["workedOut"] as? Bool == true }.count ?? 0,
                "jsonLength": json.count
            ])
        } catch {
            call.reject("Unable to save widget summary", nil, error)
        }
    }
}
