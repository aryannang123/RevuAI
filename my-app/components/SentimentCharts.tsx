"use client";

import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SentimentData {
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  raw_counts: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topic_analysis?: {
    summary: { [key: string]: number };
    top_topics: [string, number][];
  };
}

interface SentimentChartsProps {
  sentimentData: SentimentData;
}

const COLORS = {
  NEGATIVE: "#ef4444", // red
  NEUTRAL: "#6366f1",  // indigo
  POSITIVE: "#22c55e", // green
  TOPIC: "#facc15",    // yellow
  GRID: "#374151",
  AXIS: "#9ca3af",
};

export default function SentimentCharts({ sentimentData }: SentimentChartsProps) {
  const totalComments =
    sentimentData.raw_counts.negative +
    sentimentData.raw_counts.neutral +
    sentimentData.raw_counts.positive;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const name = item.name;
      const rawCount = item.payload.rawCount || item.value;
      const percentage = ((rawCount / totalComments) * 100).toFixed(1);

      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-white shadow-xl">
          <p className="font-semibold text-cyan-400">{name}</p>
          <p>Count: {rawCount.toLocaleString()}</p>
          <p>Percentage: {percentage}%</p>
        </div>
      );
    }
    return null;
  };

  // ✅ Fix: use properly typed data label function
  const renderLabel = (props: any) => {
    if (!props || typeof props.percent !== "number") return "";
    return `${(props.percent * 100).toFixed(0)}%`;
  };

  const { pieData, barData, topicBarData } = useMemo(() => {
    const { sentiment_breakdown, raw_counts, topic_analysis } = sentimentData;

    const pieData = [
      { name: "Negative", value: raw_counts.negative, rawCount: raw_counts.negative, fill: COLORS.NEGATIVE },
      { name: "Neutral", value: raw_counts.neutral, rawCount: raw_counts.neutral, fill: COLORS.NEUTRAL },
      { name: "Positive", value: raw_counts.positive, rawCount: raw_counts.positive, fill: COLORS.POSITIVE },
    ];

    const barData = [
      { name: "Negative", count: raw_counts.negative, fill: COLORS.NEGATIVE },
      { name: "Neutral", count: raw_counts.neutral, fill: COLORS.NEUTRAL },
      { name: "Positive", count: raw_counts.positive, fill: COLORS.POSITIVE },
    ];

    const topicBarData = topic_analysis?.top_topics
      ? topic_analysis.top_topics.slice(0, 5).map(([name, count]) => ({
          name,
          count,
          fill: COLORS.TOPIC,
        }))
      : null;

    return { pieData, barData, topicBarData };
  }, [sentimentData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ==== PIE CHART ==== */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl h-96 flex flex-col items-center justify-center">
        <h3 className="text-lg font-semibold text-cyan-300 mb-4">
          Sentiment Distribution (%)
        </h3>
        <ResponsiveContainer width="100%" height="80%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderLabel}
              labelLine={false}
              animationDuration={1000}
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} stroke="#1e293b" strokeWidth={3} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" wrapperStyle={{ color: "white" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ==== BAR CHART ==== */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl h-96">
        <h3 className="text-lg font-semibold text-cyan-300 mb-4">
          Raw Comment Counts
        </h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRID} opacity={0.5} />
            <XAxis dataKey="name" stroke={COLORS.AXIS} />
            <YAxis stroke={COLORS.AXIS} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={1000}>
              {barData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ==== TOPIC CHART ==== */}
      {topicBarData && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl h-96">
          <h3 className="text-lg font-semibold text-cyan-300 mb-4">
            Top 5 Comment Topics
          </h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart
              data={topicBarData}
              layout="vertical"
              margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRID} opacity={0.5} />
              <XAxis type="number" stroke={COLORS.AXIS} />
              <YAxis dataKey="name" type="category" stroke={COLORS.AXIS} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill={COLORS.TOPIC} radius={[0, 6, 6, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
