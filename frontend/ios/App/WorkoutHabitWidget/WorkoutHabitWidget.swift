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

    private var columns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 0), count: columnCount)
    }

    private var activeDaysText: String {
        "\(entry.summary.workoutCount30d) of 30 days"
    }

    private var widgetBackground: some View {
        LinearGradient(
            colors: palette.backgroundColors,
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
        .animation(.easeInOut(duration: 1.0), value: colorScheme)
        .padding(.horizontal, family == .systemSmall ? 6 : 9)
        .padding(.vertical, family == .systemSmall ? 8 : 4)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .workoutWidgetBackground(widgetBackground)
    }

    private var smallLayout: some View {
        VStack(alignment: .leading, spacing: 0) {
            statsHeaderGroup
            Spacer(minLength: 4)
            calendarSection
            Spacer(minLength: 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var mediumLayout: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 0) {
                Spacer(minLength: 0)
                calendarSection
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            statsColumnMedium
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    /// Streak + “7 of 30 days” — primary read for the widget.
    private var statsHeaderGroup: some View {
        VStack(alignment: .leading, spacing: 6) {
            streakBlock(alignment: .leading)
            activeDaysSubline
        }
        .accessibilityElement(children: .combine)
    }

    /// Calendar with a light section label so the grid matches the “of 30 days” copy.
    private var calendarSection: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text("Last 30 days")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(palette.subtleText)
                .textCase(.uppercase)
                .lineLimit(1)
            dayGrid
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
    }

    private var statsColumnMedium: some View {
        VStack(alignment: .leading, spacing: 8) {
            streakBlock(alignment: .leading)
            activeDaysSubline
        }
        .frame(width: 112, alignment: .leading)
        .frame(maxHeight: .infinity, alignment: .center)
        .padding(.leading, 2)
    }

    private var activeDaysSubline: some View {
        Text(activeDaysText)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(palette.secondaryText)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .multilineTextAlignment(.leading)
    }

    private func streakBlock(alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: 2) {
            Text(streakHighlightValue)
                .font((family == .systemMedium ? Font.title : Font.title2).weight(.black))
                .foregroundStyle(palette.primaryText)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(streakHighlightCaption)
                .font(.caption2.weight(.medium))
                .foregroundStyle(palette.subtleText)
                .lineLimit(2)
                .multilineTextAlignment(alignment == .trailing ? .trailing : .leading)
                .minimumScaleFactor(0.65)
        }
    }

    private var streakHighlightValue: String {
        if entry.summary.currentStreak > 0 {
            return "\(entry.summary.currentStreak)"
        }
        if let days = daysSinceLastWorkoutUTC {
            return "\(days)"
        }
        return "—"
    }

    private var streakHighlightCaption: String {
        if entry.summary.currentStreak > 0 {
            return "streak"
        }
        if let days = daysSinceLastWorkoutUTC {
            return days == 1 ? "day since last workout" : "days since last workout"
        }
        return "no workouts"
    }

    /// Calendar days from last workout day to API `today` (UTC), when streak is broken (no workout today).
    private var daysSinceLastWorkoutUTC: Int? {
        guard entry.summary.currentStreak == 0,
              let todayKey = entry.summary.today,
              let lastAt = entry.summary.lastWorkoutAt else {
            return nil
        }
        let lastKey = String(lastAt.prefix(10))
        guard lastKey.count == 10,
              let lastDay = Self.parseUTCDateKey(lastKey),
              let todayDay = Self.parseUTCDateKey(todayKey) else {
            return nil
        }
        let cal = Self.utcCalendar
        let startLast = cal.startOfDay(for: lastDay)
        let startToday = cal.startOfDay(for: todayDay)
        guard let days = cal.dateComponents([.day], from: startLast, to: startToday).day else {
            return nil
        }
        return max(0, days)
    }

    private static let utcCalendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(secondsFromGMT: 0) ?? TimeZone.current
        return cal
    }()

    private static func parseUTCDateKey(_ key: String) -> Date? {
        let parts = key.split(separator: "-")
        guard parts.count == 3,
              let y = Int(parts[0]),
              let m = Int(parts[1]),
              let d = Int(parts[2]) else {
            return nil
        }
        return Self.utcCalendar.date(from: DateComponents(year: y, month: m, day: d))
    }

    private var dayGrid: some View {
        // Overlay + fixedSize keep grid lines sized to the square cells (GeometryReader
        // as a ZStack sibling was stretching taller and misaligning marks).
        ZStack(alignment: .topLeading) {
            calendarCells(blurredOverlay: false)
            blurLayer(smallRadius: 3, mediumRadius: 5, smallOffset: 1, mediumOffset: 2, opacity: 1.0)
            blurLayer(smallRadius: 7, mediumRadius: 10, smallOffset: 2.5, mediumOffset: 4, opacity: 1.0)
            blurLayer(smallRadius: 14, mediumRadius: 20, smallOffset: 4, mediumOffset: 7, opacity: 0.95)
        }
        .overlay {
            gridLineOverlay
        }
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func blurLayer(
        smallRadius: CGFloat,
        mediumRadius: CGFloat,
        smallOffset: CGFloat,
        mediumOffset: CGFloat,
        opacity: Double
    ) -> some View {
        calendarCells(blurredOverlay: true)
            .blur(radius: family == .systemSmall ? smallRadius : mediumRadius)
            .offset(x: family == .systemSmall ? smallOffset : mediumOffset)
            .opacity(opacity)
            .allowsHitTesting(false)
    }

    private func calendarCells(blurredOverlay: Bool) -> some View {
        LazyVGrid(columns: columns, spacing: 0) {
            ForEach(entry.summary.workoutDays.suffix(30), id: \.self) { day in
                dayCell(workedOut: day.workedOut, blurredOverlay: blurredOverlay)
            }
        }
    }

    private var columnCount: Int {
        // Medium: 8×4 grid for 30 days (taller cells, one fewer row than 6×5).
        family == .systemMedium ? 8 : 10
    }

    private func dayCell(workedOut: Bool, blurredOverlay: Bool) -> some View {
        Rectangle()
            .fill(dayCellColor(workedOut: workedOut, blurredOverlay: blurredOverlay))
            .aspectRatio(1, contentMode: .fit)
    }

    private var gridLineOverlay: some View {
        let lineWidth: CGFloat = 0.35
        let columns = columnCount
        let rows = Int(ceil(Double(entry.summary.workoutDays.suffix(30).count) / Double(columns)))

        return GeometryReader { proxy in
            let cellSize = proxy.size.width / CGFloat(columns)
            let gridHeight = cellSize * CGFloat(rows)

            ZStack(alignment: .topLeading) {
                ForEach(0...rows, id: \.self) { row in
                    horizontalGridLine
                        .frame(width: proxy.size.width, height: lineWidth)
                        .position(x: proxy.size.width / 2, y: CGFloat(row) * cellSize)
                }

                ForEach(0...columns, id: \.self) { column in
                    verticalGridLine
                        .frame(width: lineWidth, height: gridHeight)
                        .position(x: CGFloat(column) * cellSize, y: gridHeight / 2)
                }
            }
        }
        .allowsHitTesting(false)
    }

    private var horizontalGridLine: some View {
        LinearGradient(
            colors: [.clear, palette.gridLine, palette.gridLine, .clear],
            startPoint: .leading,
            endPoint: .trailing
        )
    }

    private var verticalGridLine: some View {
        LinearGradient(
            colors: [.clear, palette.gridLine, palette.gridLine, .clear],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private func dayCellColor(workedOut: Bool, blurredOverlay: Bool) -> Color {
        if blurredOverlay {
            return workedOut ? palette.activeDayGlow : .clear
        }

        return workedOut ? palette.activeDayFill : palette.inactiveDay
    }
}

private struct WorkoutWidgetPalette {
    let backgroundColors: [Color]
    let primaryText: Color
    let secondaryText: Color
    let subtleText: Color
    let activeDayFill: Color
    let activeDayGlow: Color
    let inactiveDay: Color
    let gridLine: Color

    init(colorScheme: ColorScheme) {
        if colorScheme == .dark {
            backgroundColors = [
                Color(red: 0.03, green: 0.03, blue: 0.04),
                Color(red: 0.05, green: 0.06, blue: 0.09),
                Color(red: 0.08, green: 0.12, blue: 0.20)
            ]
            primaryText = .white
            secondaryText = .white.opacity(0.72)
            subtleText = .white.opacity(0.62)
            // Lifted slate so marked days read against the near-black gradient.
            activeDayFill = Color(red: 0.26, green: 0.32, blue: 0.42)
            activeDayGlow = Color(red: 0.38, green: 0.46, blue: 0.58).opacity(0.85)
            inactiveDay = .white.opacity(0.94)
            gridLine = Color.black.opacity(0.22)
        } else {
            backgroundColors = [
                Color(red: 0.96, green: 0.97, blue: 0.98),
                Color(red: 0.90, green: 0.91, blue: 0.93),
                Color(red: 0.93, green: 0.95, blue: 0.98)
            ]
            primaryText = Color(red: 0.12, green: 0.16, blue: 0.22)
            secondaryText = Color(red: 0.29, green: 0.33, blue: 0.39)
            subtleText = Color(red: 0.42, green: 0.45, blue: 0.50)
            activeDayFill = Color(red: 0.15, green: 0.21, blue: 0.30).opacity(0.14)
            activeDayGlow = Color(red: 0.08, green: 0.13, blue: 0.20).opacity(0.8)
            inactiveDay = .white
            gridLine = Color.black.opacity(0.18)
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
