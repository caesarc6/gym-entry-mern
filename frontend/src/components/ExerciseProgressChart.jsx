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

const ExerciseProgressChart = ({ exerciseProgress, exerciseName }) => {
  const colors = useThemeColors();
  const textColor = getCssHsl("workout-text-primary", "#f8fafc");
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
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: borderColor,
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: textColor,
          font: {
            size: 14,
            weight: 'bold',
          },
        },
      },
      title: {
        display: true,
        text: `${exerciseName} Progress Over Time`,
        color: textColor,
        font: {
          size: 18,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: getCssHsl("popover", "rgba(15, 23, 42, 0.95)", 0.95),
        titleColor: popoverTextColor,
        bodyColor: popoverTextColor,
        borderColor: borderColor,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const dataPoint = sortedDataPoints[context.dataIndex];
            return [
              `Weight: ${dataPoint.weight} lbs`,
              `Reps: ${dataPoint.reps}`,
              `Volume: ${dataPoint.volume.toLocaleString()}`,
              `Sets: ${dataPoint.sets}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
          color: textColor,
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          color: gridColor,
        },
        ticks: {
          color: mutedTextColor,
          maxRotation: 45,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Weight (lbs)',
          color: textColor,
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          color: gridColor,
        },
        ticks: {
          color: mutedTextColor,
          callback: function(value) {
            return value + ' lbs';
          },
        },
        beginAtZero: false,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        hoverBackgroundColor: borderColor,
      },
    },
  };

  return (
    <Box 
      w="full" 
      h="400px" 
      p={4} 
      bg={colors.card}
      border="1px solid"
      borderColor={colors.borderColorLight}
      borderRadius="lg"
      boxShadow="sm"
    >
      <Line data={chartData} options={options} />
    </Box>
  );
};

export default ExerciseProgressChart;
