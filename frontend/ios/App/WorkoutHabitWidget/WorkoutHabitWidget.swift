import SwiftUI
import WidgetKit

private let appGroupIdentifier = "group.com.etherealgains.gymentry"
private let summaryKey = "workoutHabitSummary"
private let summaryDataKey = "workoutHabitSummaryData"
private let calendarBlurStyle: CalendarBlurStyle = .stackedShadow
private let showCalendarBlurComparison = true

private enum CalendarBlurStyle {
    case nearShadow
    case wideGlow
    case heavyWash
    case stackedShadow
    case bestWidgetShadow
}

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
        Array(repeating: GridItem(.flexible(), spacing: 0), count: columnCount(compact: false))
    }

    private var compactColumns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 0), count: columnCount(compact: true))
    }

    private var lastWorkoutText: String {
        guard let name = entry.summary.lastWorkoutName, !name.isEmpty else {
            return "Log your first workout"
        }
        return name
    }

    private var activeDaysText: String {
        "\(entry.summary.workoutCount30d) active days in the last 30 days"
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
        .padding(.horizontal, family == .systemSmall ? 6 : 9)
        .padding(.vertical, family == .systemSmall ? 8 : 4)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .workoutWidgetBackground(widgetBackground)
    }

    private var smallLayout: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top, spacing: 8) {
                workoutName
                Spacer(minLength: 4)
                streakBlock(alignment: .trailing)
            }
            dayGrid
            footerStats
        }
    }

    private var mediumLayout: some View {
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 8) {
                dayGrid
                Text(activeDaysText)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(palette.secondaryText)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)

            workoutInfo(alignment: .vertical)
                .frame(width: 118)
                .frame(maxHeight: .infinity, alignment: .center)
        }
    }

    private var footerStats: some View {
        HStack {
            Text(activeDaysText)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(palette.secondaryText)
                .lineLimit(1)
                .minimumScaleFactor(0.8)

            Spacer(minLength: 0)
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
            VStack(alignment: .leading, spacing: 10) {
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
                .foregroundStyle(palette.subtleText)
                .textCase(.uppercase)
                .lineLimit(1)

            Text(lastWorkoutText)
                .font((family == .systemSmall ? Font.subheadline : Font.headline).weight(.bold))
                .foregroundStyle(palette.primaryText)
                .lineLimit(family == .systemSmall ? 2 : 3)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
                .minimumScaleFactor(0.78)
        }
    }

    private func streakBlock(alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: 0) {
            Text("\(entry.summary.currentStreak)")
                .font((family == .systemMedium ? Font.title : Font.title2).weight(.black))
                .foregroundStyle(palette.primaryText)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text("day streak")
                .font(.caption2.weight(.medium))
                .foregroundStyle(palette.subtleText)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
    }

    @ViewBuilder
    private var dayGrid: some View {
        if showCalendarBlurComparison {
            blurComparisonGrid
        } else {
            standardDayGrid(style: calendarBlurStyle)
        }
    }

    private var blurComparisonGrid: some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 4 : 7) {
            comparisonCalendar(title: "Near shadow+", style: .nearShadow)
            comparisonCalendar(title: "Best widget shadow", style: .bestWidgetShadow)
        }
    }

    private func comparisonCalendar(title: String, style: CalendarBlurStyle) -> some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 1 : 2) {
            Text(title)
                .font(.system(size: family == .systemSmall ? 6 : 8, weight: .semibold))
                .foregroundStyle(palette.subtleText)
                .lineLimit(1)

            standardDayGrid(style: style, compact: true)
        }
    }

    private func standardDayGrid(style: CalendarBlurStyle, compact: Bool = false) -> some View {
        ZStack(alignment: .topLeading) {
            calendarCells(blurredOverlay: false, compact: compact)
            blurOverlays(style: style, compact: compact)
            gridLineOverlay(compact: compact)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func blurOverlays(style: CalendarBlurStyle, compact: Bool = false) -> some View {
        switch style {
        case .nearShadow:
            blurLayer(smallRadius: 3, mediumRadius: 5, smallOffset: 1, mediumOffset: 2, opacity: 1.0, compact: compact)
            blurLayer(smallRadius: 7, mediumRadius: 10, smallOffset: 2.5, mediumOffset: 4, opacity: 1.0, compact: compact)
            blurLayer(smallRadius: 14, mediumRadius: 20, smallOffset: 4, mediumOffset: 7, opacity: 0.95, compact: compact)
        case .wideGlow:
            blurLayer(smallRadius: 24, mediumRadius: 36, smallOffset: 8, mediumOffset: 14, opacity: 0.8, compact: compact)
        case .heavyWash:
            blurLayer(smallRadius: 44, mediumRadius: 64, smallOffset: 10, mediumOffset: 18, opacity: 1.0, compact: compact)
        case .stackedShadow:
            blurLayer(smallRadius: 6, mediumRadius: 9, smallOffset: 2, mediumOffset: 4, opacity: 0.85, compact: compact)
            blurLayer(smallRadius: 12, mediumRadius: 18, smallOffset: 4, mediumOffset: 7, opacity: 0.8, compact: compact)
            blurLayer(smallRadius: 30, mediumRadius: 44, smallOffset: 10, mediumOffset: 18, opacity: 0.65, compact: compact)
        case .bestWidgetShadow:
            blurLayer(smallRadius: 4, mediumRadius: 6, smallOffset: 1.5, mediumOffset: 2.5, opacity: 1.0, compact: compact)
            blurLayer(smallRadius: 9, mediumRadius: 13, smallOffset: 3, mediumOffset: 5, opacity: 0.9, compact: compact)
            blurLayer(smallRadius: 18, mediumRadius: 26, smallOffset: 5, mediumOffset: 9, opacity: 0.55, compact: compact)
        }
    }

    private func blurLayer(
        smallRadius: CGFloat,
        mediumRadius: CGFloat,
        smallOffset: CGFloat,
        mediumOffset: CGFloat,
        opacity: Double,
        compact: Bool = false
    ) -> some View {
        calendarCells(blurredOverlay: true, compact: compact)
            .blur(radius: blurValue(small: smallRadius, medium: mediumRadius, compact: compact))
            .offset(x: blurValue(small: smallOffset, medium: mediumOffset, compact: compact))
            .opacity(opacity)
            .allowsHitTesting(false)
    }

    private func blurValue(small: CGFloat, medium: CGFloat, compact: Bool) -> CGFloat {
        let baseValue = family == .systemSmall ? small : medium
        return compact ? baseValue * 0.6 : baseValue
    }

    private func calendarCells(blurredOverlay: Bool, compact: Bool = false) -> some View {
        LazyVGrid(columns: compact ? compactColumns : columns, spacing: 0) {
            ForEach(entry.summary.workoutDays.suffix(30), id: \.self) { day in
                dayCell(workedOut: day.workedOut, blurredOverlay: blurredOverlay)
            }
        }
    }

    private func columnCount(compact: Bool) -> Int {
        if compact {
            return 10
        }

        return family == .systemMedium ? 6 : 10
    }

    private func dayCell(workedOut: Bool, blurredOverlay: Bool) -> some View {
        Rectangle()
            .fill(dayCellColor(workedOut: workedOut, blurredOverlay: blurredOverlay))
            .aspectRatio(1, contentMode: .fit)
    }

    private func gridLineOverlay(compact: Bool) -> some View {
        let lineWidth: CGFloat = 0.35
        let columns = columnCount(compact: compact)
        let rows = Int(ceil(Double(entry.summary.workoutDays.suffix(30).count) / Double(columns)))

        return GeometryReader { proxy in
            let cellWidth = proxy.size.width / CGFloat(columns)
            let cellHeight = proxy.size.height / CGFloat(rows)

            ZStack(alignment: .topLeading) {
                ForEach(0...rows, id: \.self) { row in
                    horizontalGridLine
                        .frame(width: proxy.size.width, height: lineWidth)
                        .position(x: proxy.size.width / 2, y: CGFloat(row) * cellHeight)
                }

                ForEach(0...columns, id: \.self) { column in
                    verticalGridLine
                        .frame(width: lineWidth, height: proxy.size.height)
                        .position(x: CGFloat(column) * cellWidth, y: proxy.size.height / 2)
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

        return workedOut ? palette.activeDay.opacity(0.14) : palette.inactiveDay
    }

    private enum InfoAlignment {
        case horizontal
        case vertical
    }
}

private struct WorkoutWidgetPalette {
    let backgroundColors: [Color]
    let primaryText: Color
    let secondaryText: Color
    let subtleText: Color
    let activeDay: Color
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
            activeDay = Color(red: 0.15, green: 0.21, blue: 0.30)
            activeDayGlow = Color(red: 0.08, green: 0.13, blue: 0.20).opacity(0.9)
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
            activeDay = Color(red: 0.15, green: 0.21, blue: 0.30)
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
        .description("See your 30-day workout rhythm and latest workout from the Home Screen.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
