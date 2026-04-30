import SwiftUI
import WidgetKit

private let appGroupIdentifier = "group.com.etherealgains.gymentry"
private let summaryKey = "workoutHabitSummary"

struct WorkoutDay: Codable, Hashable {
    let date: String
    let workedOut: Bool
}

struct WorkoutHabitSummary: Codable {
    let generatedAt: String?
    let windowDays: Int?
    let today: String?
    let lastWorkoutName: String?
    let lastWorkoutAt: String?
    let workoutDays: [WorkoutDay]
    let workoutCount30d: Int
    let currentStreak: Int

    static let empty = WorkoutHabitSummary(
        generatedAt: nil,
        windowDays: 30,
        today: nil,
        lastWorkoutName: nil,
        lastWorkoutAt: nil,
        workoutDays: WorkoutHabitSummary.emptyDays(),
        workoutCount30d: 0,
        currentStreak: 0
    )

    private static func emptyDays() -> [WorkoutDay] {
        let calendar = Calendar(identifier: .gregorian)
        let today = calendar.startOfDay(for: Date())
        return (0..<30).compactMap { offset in
            guard let day = calendar.date(byAdding: .day, value: offset - 29, to: today) else {
                return nil
            }
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withFullDate]
            return WorkoutDay(date: formatter.string(from: day), workedOut: false)
        }
    }
}

struct WorkoutHabitEntry: TimelineEntry {
    let date: Date
    let summary: WorkoutHabitSummary
}

struct WorkoutHabitProvider: TimelineProvider {
    func placeholder(in context: Context) -> WorkoutHabitEntry {
        WorkoutHabitEntry(date: Date(), summary: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (WorkoutHabitEntry) -> Void) {
        completion(WorkoutHabitEntry(date: Date(), summary: loadSummary()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WorkoutHabitEntry>) -> Void) {
        let entry = WorkoutHabitEntry(date: Date(), summary: loadSummary())
        let nextRefresh = Calendar.current.date(byAdding: .hour, value: 3, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func loadSummary() -> WorkoutHabitSummary {
        guard
            let defaults = UserDefaults(suiteName: appGroupIdentifier),
            let json = defaults.string(forKey: summaryKey),
            let data = json.data(using: .utf8)
        else {
            return .empty
        }

        return (try? JSONDecoder().decode(WorkoutHabitSummary.self, from: data)) ?? .empty
    }
}

struct WorkoutHabitWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: WorkoutHabitEntry

    private var columns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: family == .systemSmall ? 4 : 5), count: 10)
    }

    private var lastWorkoutText: String {
        guard let name = entry.summary.lastWorkoutName, !name.isEmpty else {
            return "Log your first workout"
        }
        return name
    }

    private var widgetBackground: some View {
        LinearGradient(
            colors: [Color(red: 0.05, green: 0.06, blue: 0.09), Color(red: 0.08, green: 0.12, blue: 0.2)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    var body: some View {
        Group {
            if family == .systemMedium {
                mediumLayout
            } else {
                smallLayout
            }
        }
        .padding(family == .systemSmall ? 12 : 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
        .workoutWidgetBackground(widgetBackground)
    }

    private var smallLayout: some View {
        VStack(alignment: .leading, spacing: 8) {
            workoutInfo(alignment: .horizontal)
            dayGrid
        }
    }

    private var mediumLayout: some View {
        HStack(alignment: .center, spacing: 16) {
            dayGrid
                .frame(maxWidth: .infinity)

            workoutInfo(alignment: .vertical)
                .frame(width: 128)
                .frame(maxHeight: .infinity, alignment: .center)
        }
    }

    @ViewBuilder
    private func workoutInfo(alignment: InfoAlignment) -> some View {
        if alignment == .horizontal {
            HStack(alignment: .top, spacing: 8) {
                workoutName
                Spacer(minLength: 4)
                streakBlock(alignment: .trailing)
            }
        } else {
            VStack(alignment: .leading, spacing: 12) {
                workoutName
                streakBlock(alignment: .leading)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var workoutName: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Last workout")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.white.opacity(0.62))
                .textCase(.uppercase)
                .lineLimit(1)

            Text(lastWorkoutText)
                .font((family == .systemSmall ? Font.subheadline : Font.headline).weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.72)
        }
    }

    private func streakBlock(alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: 0) {
            Text("\(entry.summary.currentStreak)")
                .font((family == .systemMedium ? Font.title : Font.title2).weight(.black))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text("day streak")
                .font(.caption2.weight(.medium))
                .foregroundStyle(.white.opacity(0.62))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
    }

    private var dayGrid: some View {
        LazyVGrid(columns: columns, spacing: family == .systemSmall ? 4 : 5) {
            ForEach(entry.summary.workoutDays.suffix(30), id: \.self) { day in
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .fill(day.workedOut ? Color(red: 0.45, green: 0.68, blue: 1.0) : Color.white.opacity(0.14))
                    .overlay(
                        RoundedRectangle(cornerRadius: 4, style: .continuous)
                            .stroke(Color.white.opacity(day.workedOut ? 0.0 : 0.1), lineWidth: 1)
                    )
                    .aspectRatio(1, contentMode: .fit)
            }
        }
    }

    private enum InfoAlignment {
        case horizontal
        case vertical
    }
}

private extension View {
    @ViewBuilder
    func workoutWidgetBackground(_ background: some View) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(for: .widget) {
                background
            }
        } else {
            self.background(background)
        }
    }
}

@main
struct WorkoutHabitWidget: Widget {
    let kind = "WorkoutHabitWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WorkoutHabitProvider()) { entry in
            WorkoutHabitWidgetView(entry: entry)
        }
        .configurationDisplayName("Workout Habit")
        .description("See your 30-day workout rhythm and latest workout from the Home Screen.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
