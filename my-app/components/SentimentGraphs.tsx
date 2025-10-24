"use client";

import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  PointElement
);

// Types for fetched data
interface SentimentBreakdown {
  positive: number;
  negative: number;
  neutral: number;
}

interface AIParagraphSummary {
  paragraph_summary: string;
  model_used?: string;
}

interface SentimentData {
  metadata: {
    query: string;
    analyzed_at: string;
    sentiment_breakdown: SentimentBreakdown;
    dominant_sentiment: string;
  };
  comments: {
    id: string;
    text: string;
    sentiment: string;
    compound: number;
  }[];
  ai_summary?: AIParagraphSummary;
}

const SentimentGraphs: React.FC = () => {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch latest sentiment data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = sessionStorage.getItem("search_query") || "default";
        const res = await fetch(`http://localhost:5000/api/sentiment/get-analysis/${encodeURIComponent(query)}`);
        const json = await res.json();

        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to connect to backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="text-gray-400 text-center mt-10">Loading sentiment graphs...</div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center mt-10">
        Error: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-gray-500 text-center mt-10">
        No sentiment data available.
      </div>
    );
  }

  // Extract data
  const sentimentData = data.metadata.sentiment_breakdown;
  const query = data.metadata.query;
  const aiSummary = data.ai_summary?.paragraph_summary ?? "No summary available.";

  // Chart: Sentiment Pie
  const sentimentChart = {
    labels: ["Positive", "Negative", "Neutral"],
    datasets: [
      {
        data: [
          sentimentData.positive || 0,
          sentimentData.negative || 0,
          sentimentData.neutral || 0,
        ],
        backgroundColor: ["#22c55e", "#ef4444", "#a1a1aa"],
        borderWidth: 1,
      },
    ],
  };

  // Chart: Bar (counts by sentiment)
  const sentimentBar = {
    labels: ["Positive", "Negative", "Neutral"],
    datasets: [
      {
        label: "Sentiment Breakdown (%)",
        data: [
          sentimentData.positive?.toFixed(2),
          sentimentData.negative?.toFixed(2),
          sentimentData.neutral?.toFixed(2),
        ],
        backgroundColor: ["#16a34a", "#dc2626", "#6b7280"],
      },
    ],
  };

  // Chart: Line (Compound scores)
  const compoundScores = data.comments.slice(0, 30).map((c) => c.compound);
  const compoundChart = {
    labels: data.comments.slice(0, 30).map((c, i) => `#${i + 1}`),
    datasets: [
      {
        label: "Compound Sentiment Score",
        data: compoundScores,
        fill: false,
        borderColor: "#3b82f6",
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Reddit Sentiment Analysis
      </h1>
      <p className="text-sm text-gray-400 mb-2">
        Query: <span className="font-semibold text-blue-400">{query}</span>
      </p>

      {/* --- Summary Section --- */}
      <div className="max-w-3xl text-center mb-10 bg-gray-800 p-5 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-2 text-gray-200">AI Summary</h2>
        <p className="text-gray-300 leading-relaxed">{aiSummary}</p>
      </div>

      {/* --- Sentiment Charts --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-5xl">
        <div className="bg-gray-800 p-5 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Sentiment Distribution (Pie)
          </h2>
          <Pie data={sentimentChart} />
        </div>

        <div className="bg-gray-800 p-5 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Sentiment Comparison (Bar)
          </h2>
          <Bar data={sentimentBar} />
        </div>
      </div>

      {/* --- Compound Sentiment Line Chart --- */}
      <div className="bg-gray-800 mt-10 p-6 rounded-xl shadow-lg w-full max-w-4xl">
        <h2 className="text-xl font-semibold mb-4 text-center">
          Compound Sentiment Trends
        </h2>
        <Line data={compoundChart} />
      </div>
    </div>
  );
};

export default SentimentGraphs;
