import SwiftUI
import WidgetKit

private let appGroupIdentifier = "group.com.etherealgains.gymentry"
private let summaryKey = "workoutHabitSummary"
private let summaryDataKey = "workoutHabitSummaryData"

struct WorkoutDay: Codable, Hashable {
    let date: String
    let workedOut: Bool
    let entryId: String?
    let workoutName: String?
    let workoutDescription: String?

    init(
        date: String,
        workedOut: Bool,
        entryId: String? = nil,
        workoutName: String? = nil,
        workoutDescription: String? = nil
    ) {
        self.date = date
        self.workedOut = workedOut
        self.entryId = entryId
        self.workoutName = workoutName
        self.workoutDescription = workoutDescription
    }
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

    static func emptyDays() -> [WorkoutDay] {
        let calendar = Calendar(identifier: .gregorian)
        let today = calendar.startOfDay(for: Date())
        let formatter = ISO8601DateFormatter()
        formatter.timeZone = calendar.timeZone
        formatter.formatOptions = [.withFullDate]
        return (0..<30).compactMap { offset in
            guard let day = calendar.date(byAdding: .day, value: offset - 29, to: today) else {
                return nil
            }
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
        guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
            return .empty
        }

        if let data = defaults.data(forKey: summaryDataKey),
           let summary = try? JSONDecoder().decode(WorkoutHabitSummary.self, from: data) {
            return summary
        }

        guard
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
    @Environment(\.colorScheme) private var colorScheme
    let entry: WorkoutHabitEntry

    private var palette: WorkoutWidgetPalette {
        WorkoutWidgetPalette(colorScheme: colorScheme)
    }

    private var isSmall: Bool {
        family == .systemSmall
    }

    private var legacyPadding: CGFloat {
        if #available(iOSApplicationExtension 17.0, *) {
            return 2
        }
        return isSmall ? 14 : 16
    }

    var body: some View {
        Group {
            if isSmall {
                smallLayout
            } else {
                mediumLayout
            }
        }
        .padding(legacyPadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .workoutWidgetBackground(palette.background)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilitySummary)
    }

    private var smallLayout: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                streakNumber
                Text("streak")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(palette.secondaryText)
                Spacer(minLength: 0)
            }
            dayGrid
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private var mediumLayout: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                streakNumber
                Text("streak")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(palette.secondaryText)
                Spacer(minLength: 8)
                Text(activeDaysText)
                    .font(.subheadline.weight(.medium).monospacedDigit())
                    .foregroundStyle(palette.secondaryText)
            }
            dayGrid
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private var streakNumber: some View {
        Text("\(currentStreakValue)")
            .font(.system(size: isSmall ? 22 : 28, weight: .semibold, design: .rounded))
            .foregroundStyle(palette.primaryText)
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.75)
    }

    private var activeDaysText: String {
        "\(workoutCount)/30"
    }

    private var workoutCount: Int {
        displayedDays.filter(\.workedOut).count
    }

    private var accessibilitySummary: String {
        "\(currentStreakValue) day streak. \(workoutCount) of 30 days."
    }

    private var currentStreakValue: Int {
        let days = displayedDays
        var streak = 0
        for day in days.reversed() {
            if day.workedOut {
                streak += 1
            } else {
                break
            }
        }
        if streak == 0 && days.count >= 2 && !days[days.count - 1].workedOut {
            for day in days.dropLast().reversed() {
                if day.workedOut {
                    streak += 1
                } else {
                    break
                }
            }
        }
        return max(streak, entry.summary.currentStreak)
    }

    private var displayedDays: [WorkoutDay] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let formatter = ISO8601DateFormatter()
        formatter.timeZone = cal.timeZone
        formatter.formatOptions = [.withFullDate]
        let todayKey = formatter.string(from: today)

        let days = entry.summary.workoutDays
        guard !days.isEmpty else {
            return WorkoutHabitSummary.emptyDays()
        }

        if entry.summary.today == todayKey {
            return Array(days.suffix(30))
        }

        let existingMap = Dictionary(days.map { ($0.date, $0) }, uniquingKeysWith: { first, _ in first })
        return (0..<30).compactMap { offset in
            guard let day = cal.date(byAdding: .day, value: offset - 29, to: today) else {
                return nil
            }
            let dateKey = formatter.string(from: day)
            if let existing = existingMap[dateKey] {
                return existing
            }
            return WorkoutDay(date: dateKey, workedOut: false)
        }
    }

    private var gridColumns: Int {
        isSmall ? 6 : 10
    }

    private var gridRows: Int {
        isSmall ? 5 : 3
    }

    private var dayGrid: some View {
        GeometryReader { geo in
            let metrics = gridMetrics(in: geo.size)
            ZStack(alignment: .topLeading) {
                calendarCells(metrics: metrics, glow: false)
                // Same stack as WorkoutHabitWidgetPreview: blur(9/18/52px), translateX(4/8/22px).
                glowLayer(metrics: metrics, radius: 9, offset: 4, opacity: 0.85)
                glowLayer(metrics: metrics, radius: 18, offset: 8, opacity: 0.8)
                glowLayer(metrics: metrics, radius: 52, offset: 22, opacity: 0.65)
            }
            .frame(width: metrics.gridWidth, height: metrics.gridHeight, alignment: .topLeading)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
    }

    private func gridMetrics(in size: CGSize) -> DayGridMetrics {
        let spacing: CGFloat = isSmall ? 3 : 4
        let columns = gridColumns
        let rows = gridRows
        let width = max(size.width, 1)
        let height = max(size.height, 1)
        let cellW = (width - spacing * CGFloat(columns - 1)) / CGFloat(columns)
        let cellH = (height - spacing * CGFloat(rows - 1)) / CGFloat(rows)
        return DayGridMetrics(
            cell: max(1, min(cellW, cellH)),
            spacing: spacing,
            columns: columns,
            rows: rows
        )
    }

    private func glowLayer(
        metrics: DayGridMetrics,
        radius: CGFloat,
        offset: CGFloat,
        opacity: Double
    ) -> some View {
        calendarCells(metrics: metrics, glow: true)
            .blur(radius: radius)
            .offset(x: offset)
            .opacity(opacity)
            .allowsHitTesting(false)
    }

    private func calendarCells(metrics: DayGridMetrics, glow: Bool) -> some View {
        VStack(spacing: metrics.spacing) {
            ForEach(0..<metrics.rows, id: \.self) { row in
                HStack(spacing: metrics.spacing) {
                    ForEach(0..<metrics.columns, id: \.self) { column in
                        dayCell(at: row * metrics.columns + column, size: metrics.cell, glow: glow)
                    }
                }
            }
        }
        .frame(width: metrics.gridWidth, height: metrics.gridHeight, alignment: .topLeading)
    }

    @ViewBuilder
    private func dayCell(at index: Int, size: CGFloat, glow: Bool) -> some View {
        let corner = isSmall ? min(3, size * 0.2) : min(4, size * 0.18)
        if displayedDays.indices.contains(index) {
            RoundedRectangle(cornerRadius: corner, style: .continuous)
                .fill(cellColor(workedOut: displayedDays[index].workedOut, glow: glow))
                .frame(width: size, height: size)
        } else {
            Color.clear
                .frame(width: size, height: size)
        }
    }

    private func cellColor(workedOut: Bool, glow: Bool) -> Color {
        if glow {
            return workedOut ? palette.activeDayGlow : .clear
        }
        return workedOut ? palette.activeDay : palette.inactiveDay
    }
}

private struct DayGridMetrics {
    let cell: CGFloat
    let spacing: CGFloat
    let columns: Int
    let rows: Int

    var gridWidth: CGFloat {
        cell * CGFloat(columns) + spacing * CGFloat(max(columns - 1, 0))
    }

    var gridHeight: CGFloat {
        cell * CGFloat(rows) + spacing * CGFloat(max(rows - 1, 0))
    }
}

private struct WorkoutWidgetPalette {
    let background: Color
    let primaryText: Color
    let secondaryText: Color
    let activeDay: Color
    let activeDayGlow: Color
    let inactiveDay: Color

    init(colorScheme: ColorScheme) {
        // Exact HSL → RGB of the in-app CSS variables. Do not use SwiftUI
        // hue/saturation/brightness here — that is HSV and turns --primary
        // (lightness 98%) into a vivid sky blue.
        if colorScheme == .dark {
            background = Color(red: 0.114, green: 0.118, blue: 0.126) // --workout-card
            primaryText = .white // --workout-text-primary
            secondaryText = Color(red: 0.569, green: 0.569, blue: 0.569) // --workout-text-muted
            let primary = Color(red: 0.972, green: 0.980, blue: 0.988) // --primary #F8FAFC
            activeDay = primary.opacity(0.11)
            activeDayGlow = primary.opacity(0.52)
            inactiveDay = Color(red: 0.008, green: 0.032, blue: 0.090).opacity(0.92) // --card
        } else {
            background = .white // --workout-card
            primaryText = Color(red: 0.459, green: 0.541, blue: 0.623) // --workout-text-primary
            secondaryText = Color(red: 0.648, green: 0.652, blue: 0.694) // --workout-text-muted
            let primary = Color(red: 0.059, green: 0.090, blue: 0.165) // --primary
            activeDay = primary.opacity(0.11)
            activeDayGlow = primary.opacity(0.52)
            inactiveDay = Color.white.opacity(0.92) // --card
        }
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
        .description("Your last 30 days on the Home Screen.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
