"use client";

import React from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

interface SentimentChartsProps {
  sentimentData: {
    sentiments: { positive: number; negative: number; neutral: number };
    rawCounts: { positive: number; negative: number; neutral: number };
    allComments?: any[];
  };
}

const COLORS = {
  positive: "#10b981",
  negative: "#ef4444",
  neutral: "#f59e0b",
  cyan: "#06b6d4",
  purple: "#a855f7"
};

const SentimentCharts: React.FC<SentimentChartsProps> = ({ sentimentData }) => {
  if (!sentimentData) return null;

  const sentiments = {
    positive: Number(sentimentData.sentiments.positive) || 0,
    negative: Number(sentimentData.sentiments.negative) || 0,
    neutral: Number(sentimentData.sentiments.neutral) || 0
  };

  const rawCounts = {
    positive: Number(sentimentData.rawCounts.positive) || 0,
    negative: Number(sentimentData.rawCounts.negative) || 0,
    neutral: Number(sentimentData.rawCounts.neutral) || 0
  };

  const pieData = [
    { name: "Positive", value: rawCounts.positive, color: COLORS.positive, percentage: sentiments.positive },
    { name: "Negative", value: rawCounts.negative, color: COLORS.negative, percentage: sentiments.negative },
    { name: "Neutral", value: rawCounts.neutral, color: COLORS.neutral, percentage: sentiments.neutral }
  ];

  const barData = [
    { name: "Positive", count: rawCounts.positive, fill: COLORS.positive },
    { name: "Negative", count: rawCounts.negative, fill: COLORS.negative },
    { name: "Neutral", count: rawCounts.neutral, fill: COLORS.neutral }
  ];

  const radarData = [
    { subject: "Positive", value: sentiments.positive },
    { subject: "Negative", value: sentiments.negative },
    { subject: "Neutral", value: sentiments.neutral }
  ];

  const confidenceData = sentimentData.allComments?.length
    ? [
        { range: "90-100%", count: sentimentData.allComments.filter(c => (c.confidence || 0) >= 0.9).length },
        { range: "80-90%", count: sentimentData.allComments.filter(c => (c.confidence || 0) >= 0.8 && c.confidence < 0.9).length },
        { range: "70-80%", count: sentimentData.allComments.filter(c => (c.confidence || 0) >= 0.7 && c.confidence < 0.8).length },
        { range: "60-70%", count: sentimentData.allComments.filter(c => (c.confidence || 0) >= 0.6 && c.confidence < 0.7).length }
      ]
    : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      return (
        <div className="bg-gray-900/90 border border-cyan-400/40 rounded-lg p-3 text-sm text-white">
          <p className="font-semibold text-cyan-400">{p.name}</p>
          <p>Count: {p.value}</p>
          {p.payload.percentage && <p>{p.payload.percentage.toFixed(1)}%</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900/50 p-8 rounded-2xl border border-cyan-500/20 shadow-xl mt-10">
      <h2 className="text-3xl font-bold mb-6 text-cyan-300 flex items-center gap-3">
        Sentiment Overview
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-cyan-500/20">
          <h3 className="text-xl font-semibold text-cyan-300 mb-4">Sentiment Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={120} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-purple-500/20">
          <h3 className="text-xl font-semibold text-purple-300 mb-4">Comment Counts</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.4} />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Confidence Distribution */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-yellow-500/20 col-span-1 md:col-span-2">
          <h3 className="text-xl font-semibold text-yellow-300 mb-4">Confidence Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={confidenceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis type="category" dataKey="range" stroke="#9ca3af" width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 10, 10, 0]} fill={COLORS.cyan} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-green-500/20 col-span-1 md:col-span-2">
          <h3 className="text-xl font-semibold text-green-300 mb-4">Sentiment Radar</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="subject" stroke="#9ca3af" />
              <PolarRadiusAxis stroke="#9ca3af" />
              <Radar name="Sentiment" dataKey="value" stroke={COLORS.cyan} fill={COLORS.cyan} fillOpacity={0.6} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SentimentCharts;
