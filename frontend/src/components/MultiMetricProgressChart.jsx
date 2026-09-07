import { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  Box,
  Text,
  HStack,
  Button,
  VStack,
} from "@chakra-ui/react";
import { useThemeColors } from "../hooks/useThemeColors";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const getCssHsl = (variableName, fallback, alpha) => {
  if (typeof window === "undefined") return fallback;

  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(`--${variableName}`)
    .trim();

  if (!value) return fallback;
  return alpha === undefined ? `hsl(${value})` : `hsl(${value} / ${alpha})`;
};

const MultiMetricProgressChart = ({ exerciseProgress }) => {
  const [selectedMetrics, setSelectedMetrics] = useState(["weight", "volume"]);
  const colors = useThemeColors();

  const mutedTextColor = getCssHsl("workout-text-muted", "#94a3b8");
  const popoverTextColor = getCssHsl("popover-foreground", "#f8fafc");
  const gridColor = getCssHsl("border", "rgba(148, 163, 184, 0.22)", 0.45);

  // Color scheme for different metrics
  const metricColors = {
    weight: {
      border: getCssHsl("ring", "rgba(59, 130, 246, 0.85)", 0.85),
      background: getCssHsl("ring", "rgba(59, 130, 246, 0.12)", 0.12),
    },
    volume: {
      border: "rgba(16, 185, 129, 0.85)",
      background: "rgba(16, 185, 129, 0.12)",
    },
    reps: {
      border: "rgba(245, 158, 11, 0.85)",
      background: "rgba(245, 158, 11, 0.12)",
    },
  };

  if (
    !exerciseProgress ||
    !exerciseProgress.dataPoints ||
    exerciseProgress.dataPoints.length === 0
  ) {
    return (
      <Box p={4} textAlign="center">
        <Text color={colors.textMuted}>
          No progress data available for this exercise
        </Text>
      </Box>
    );
  }

  // Sort data points by date
  const sortedDataPoints = [...exerciseProgress.dataPoints].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Prepare datasets based on selected metrics
  const datasets = [];

  if (selectedMetrics.includes("weight")) {
    datasets.push({
      label: "Weight (lbs)",
      data: sortedDataPoints.map((point) => point.weight),
      borderColor: metricColors.weight.border,
      backgroundColor: metricColors.weight.background,
      borderWidth: 3,
      fill: false,
      tension: 0.4,
      pointBackgroundColor: metricColors.weight.border,
      pointBorderColor: "white",
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      yAxisID: "y",
    });
  }

  if (selectedMetrics.includes("volume")) {
    datasets.push({
      label: "Volume (lbs)",
      data: sortedDataPoints.map((point) => point.volume),
      borderColor: metricColors.volume.border,
      backgroundColor: metricColors.volume.background,
      borderWidth: 3,
      fill: false,
      tension: 0.4,
      pointBackgroundColor: metricColors.volume.border,
      pointBorderColor: "white",
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      yAxisID: "y1",
    });
  }

  if (selectedMetrics.includes("reps")) {
    datasets.push({
      label: "Reps",
      data: sortedDataPoints.map((point) => point.reps),
      borderColor: metricColors.reps.border,
      backgroundColor: metricColors.reps.background,
      borderWidth: 3,
      fill: false,
      tension: 0.4,
      pointBackgroundColor: metricColors.reps.border,
      pointBorderColor: "white",
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      yAxisID: "y2",
    });
  }

  const chartData = {
    labels: sortedDataPoints.map((point) =>
      new Date(point.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    ),
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "nearest",
      intersect: true,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: getCssHsl("popover", "rgba(15, 23, 42, 0.95)", 0.95),
        titleColor: popoverTextColor,
        bodyColor: popoverTextColor,
        borderColor: metricColors.weight.border,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        padding: 8,
        caretSize: 4,
        callbacks: {
          label: function (context) {
            const dataPoint = sortedDataPoints[context.dataIndex];
            const labels = [];

            if (selectedMetrics.includes("weight")) {
              labels.push(`${dataPoint.weight} lbs`);
            }
            if (selectedMetrics.includes("volume")) {
              labels.push(`${dataPoint.volume.toLocaleString()} lbs lifted`);
            }
            if (selectedMetrics.includes("reps")) {
              labels.push(`${dataPoint.reps} reps`);
            }

            return labels;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: false,
        },
        grid: {
          display: false,
        },
        ticks: {
          color: mutedTextColor,
          maxRotation: 0,
        },
        border: {
          display: false,
        },
      },
      y: {
        type: "linear",
        display: selectedMetrics.includes("weight"),
        position: "left",
        title: {
          display: false,
        },
        grid: {
          color: gridColor,
        },
        ticks: {
          color: mutedTextColor,
          callback: function (value) {
            return value + " lbs";
          },
        },
        beginAtZero: false,
      },
      y1: {
        type: "linear",
        display: selectedMetrics.includes("volume"),
        position: "right",
        title: {
          display: false,
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: mutedTextColor,
          callback: function (value) {
            return value.toLocaleString() + " lbs";
          },
        },
        beginAtZero: false,
      },
      y2: {
        type: "linear",
        display: selectedMetrics.includes("reps"),
        position: "right",
        title: {
          display: false,
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: mutedTextColor,
        },
        beginAtZero: false,
      },
    },
  };

  const toggleMetric = (metric) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );
  };

  return (
    <VStack spacing={4} align="stretch">
      <HStack spacing={1} justify="flex-start" ml={-2}>
        {[
          { key: "weight", label: "Weight" },
          { key: "volume", label: "Total lifted" },
          { key: "reps", label: "Reps" },
        ].map((metric) => {
          const selected = selectedMetrics.includes(metric.key);
          return (
            <Button
              key={metric.key}
              size="sm"
              variant="ghost"
              fontWeight={selected ? "semibold" : "normal"}
              color={selected ? colors.textPrimary : colors.textMuted}
              bg="transparent"
              _hover={{ bg: "transparent", color: colors.textPrimary }}
              onClick={() => toggleMetric(metric.key)}
            >
              {metric.label}
            </Button>
          );
        })}
      </HStack>

      <Box w="full" h="280px">
        <Line data={chartData} options={options} />
      </Box>
    </VStack>
  );
};

export default MultiMetricProgressChart;
