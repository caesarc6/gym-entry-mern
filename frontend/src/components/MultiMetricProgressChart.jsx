import React, { useState } from "react";
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
  useColorModeValue,
  HStack,
  Button,
  VStack,
} from "@chakra-ui/react";

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

const MultiMetricProgressChart = ({ exerciseProgress, exerciseName }) => {
  const [selectedMetrics, setSelectedMetrics] = useState(["weight", "volume"]);

  const textColor = useColorModeValue("gray.800", "white");
  const gridColor = useColorModeValue(
    "rgba(0, 0, 0, 0.1)",
    "rgba(255, 255, 255, 0.1)"
  );

  // Color scheme for different metrics
  const metricColors = {
    weight: {
      border: useColorModeValue(
        "rgba(59, 130, 246, 0.8)",
        "rgba(59, 130, 246, 0.8)"
      ),
      background: useColorModeValue(
        "rgba(59, 130, 246, 0.1)",
        "rgba(59, 130, 246, 0.1)"
      ),
    },
    volume: {
      border: useColorModeValue(
        "rgba(16, 185, 129, 0.8)",
        "rgba(16, 185, 129, 0.8)"
      ),
      background: useColorModeValue(
        "rgba(16, 185, 129, 0.1)",
        "rgba(16, 185, 129, 0.1)"
      ),
    },
    reps: {
      border: useColorModeValue(
        "rgba(245, 158, 11, 0.8)",
        "rgba(245, 158, 11, 0.8)"
      ),
      background: useColorModeValue(
        "rgba(245, 158, 11, 0.1)",
        "rgba(245, 158, 11, 0.1)"
      ),
    },
  };

  if (
    !exerciseProgress ||
    !exerciseProgress.dataPoints ||
    exerciseProgress.dataPoints.length === 0
  ) {
    return (
      <Box p={4} textAlign="center">
        <Text color="gray.500">
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
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: textColor,
          font: {
            size: 14,
            weight: "bold",
          },
        },
      },
      title: {
        display: true,
        text: `${exerciseName} Progress Over Time`,
        color: textColor,
        font: {
          size: 18,
          weight: "bold",
        },
      },
      tooltip: {
        backgroundColor: useColorModeValue(
          "rgba(0, 0, 0, 0.8)",
          "rgba(0, 0, 0, 0.9)"
        ),
        titleColor: "white",
        bodyColor: "white",
        borderColor: metricColors.weight.border,
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const dataPoint = sortedDataPoints[context.dataIndex];
            const labels = [];

            if (selectedMetrics.includes("weight")) {
              labels.push(`Weight: ${dataPoint.weight} lbs`);
            }
            if (selectedMetrics.includes("volume")) {
              labels.push(`Volume: ${dataPoint.volume.toLocaleString()}`);
            }
            if (selectedMetrics.includes("reps")) {
              labels.push(`Reps: ${dataPoint.reps}`);
            }

            return labels;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Date",
          color: textColor,
          font: {
            size: 14,
            weight: "bold",
          },
        },
        grid: {
          color: gridColor,
        },
        ticks: {
          color: textColor,
          maxRotation: 45,
        },
      },
      y: {
        type: "linear",
        display: selectedMetrics.includes("weight"),
        position: "left",
        title: {
          display: true,
          text: "Weight (lbs)",
          color: textColor,
          font: {
            size: 14,
            weight: "bold",
          },
        },
        grid: {
          color: gridColor,
        },
        ticks: {
          color: textColor,
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
          display: true,
          text: "Volume (lbs)",
          color: textColor,
          font: {
            size: 14,
            weight: "bold",
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: textColor,
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
          display: true,
          text: "Reps",
          color: textColor,
          font: {
            size: 14,
            weight: "bold",
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: textColor,
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
      {/* Metric Toggle Buttons */}
      <HStack spacing={2} justify="center">
        <Button
          size="sm"
          variant={selectedMetrics.includes("weight") ? "solid" : "outline"}
          colorScheme="blue"
          onClick={() => toggleMetric("weight")}
        >
          Weight
        </Button>
        <Button
          size="sm"
          variant={selectedMetrics.includes("volume") ? "solid" : "outline"}
          colorScheme="green"
          onClick={() => toggleMetric("volume")}
        >
          Volume
        </Button>
        <Button
          size="sm"
          variant={selectedMetrics.includes("reps") ? "solid" : "outline"}
          colorScheme="orange"
          onClick={() => toggleMetric("reps")}
        >
          Reps
        </Button>
      </HStack>

      {/* Chart */}
      <Box
        w="full"
        h="400px"
        p={4}
        bg={useColorModeValue("white", "gray.800")}
        borderRadius="lg"
        boxShadow="md"
      >
        <Line data={chartData} options={options} />
      </Box>
    </VStack>
  );
};

export default MultiMetricProgressChart;
