import React from 'react';
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
import { Box, Text, useColorModeValue } from '@chakra-ui/react';

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

const ExerciseProgressChart = ({ exerciseProgress, exerciseName }) => {
  const textColor = useColorModeValue('gray.800', 'white');
  const gridColor = useColorModeValue('rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.1)');
  const borderColor = useColorModeValue('rgba(59, 130, 246, 0.8)', 'rgba(59, 130, 246, 0.8)');
  const backgroundColor = useColorModeValue('rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.1)');

  if (!exerciseProgress || !exerciseProgress.dataPoints || exerciseProgress.dataPoints.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Text color="gray.500">No progress data available for this exercise</Text>
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
        backgroundColor: useColorModeValue('rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.9)'),
        titleColor: 'white',
        bodyColor: 'white',
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
          color: textColor,
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
          color: textColor,
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
      bg={useColorModeValue('white', 'gray.800')}
      borderRadius="lg"
      boxShadow="md"
    >
      <Line data={chartData} options={options} />
    </Box>
  );
};

export default ExerciseProgressChart;
