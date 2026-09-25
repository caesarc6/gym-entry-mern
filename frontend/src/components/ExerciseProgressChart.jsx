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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, Text } from '@chakra-ui/react';
import { useThemeColors } from '../hooks/useThemeColors';

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

const ExerciseProgressChart = ({ exerciseProgress }) => {
  const colors = useThemeColors();
  const mutedTextColor = getCssHsl("workout-text-muted", "#94a3b8");
  const popoverTextColor = getCssHsl("popover-foreground", "#f8fafc");
  const gridColor = getCssHsl("border", "rgba(148, 163, 184, 0.22)", 0.45);
  const borderColor = getCssHsl("ring", "rgba(59, 130, 246, 0.85)", 0.85);
  const backgroundColor = getCssHsl("ring", "rgba(59, 130, 246, 0.12)", 0.12);

  if (!exerciseProgress || !exerciseProgress.dataPoints || exerciseProgress.dataPoints.length === 0) {
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

  // Prepare chart data
  const chartData = {
    labels: sortedDataPoints.map(point => 
      new Date(point.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    ),
    datasets: [
      {
        label: 'Weight (lbs)',
        data: sortedDataPoints.map(point => point.weight),
        borderColor: borderColor,
        backgroundColor: backgroundColor,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: borderColor,
        pointBorderColor: 'white',
        pointBorderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
        borderColor: borderColor,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        padding: 8,
        caretSize: 4,
        callbacks: {
          label: function(context) {
            const dataPoint = sortedDataPoints[context.dataIndex];
            return [
              `${dataPoint.weight} lbs`,
              `${dataPoint.reps} reps`,
              `${dataPoint.sets} sets`,
            ];
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
        title: {
          display: false,
        },
        grid: {
          color: gridColor,
        },
        ticks: {
          color: mutedTextColor,
          callback: function(value) {
            return value;
          },
        },
        beginAtZero: false,
      },
    },
    interaction: {
      intersect: true,
      mode: 'nearest',
    },
    elements: {
      point: {
        hoverBackgroundColor: borderColor,
      },
    },
  };

  return (
    <Box w="full" h="200px">
      <Line data={chartData} options={options} />
    </Box>
  );
};

export default ExerciseProgressChart;
