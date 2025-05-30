"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ChartData {
  warehouseUtilizationPieChart: Array<{
    name: string;
    value: number;
    volume: number;
    color: string;
  }>;
  shipmentModeDistribution: Array<{
    mode: string;
    count: number;
    percentage: number;
    volume: number;
    weight: number;
  }>;
  carrierBarChart: Array<{
    carrier: string;
    date: string;
    count: number;
    volume: number;
    weight: number;
  }>;
  warehouseCapacityTimeline: Array<{
    date: string;
    packages: number;
    volume: number;
    cumulativePackages: number;
    cumulativeVolume: number;
  }>;
  destinationDistribution: Array<{
    destination: string;
    count: number;
    percentage: number;
    volume: number;
    weight: number;
    avgDeliveryTime: number | null;
  }>;
}

interface ShipmentChartsProps {
  chartData: ChartData;
  warehouseUtilization?: {
    utilizationPercentage: number;
    capacityVolume: number;
    totalVolume: number;
  };
  detailed?: boolean;
}

export function ShipmentCharts({
  chartData,
  warehouseUtilization,
  detailed = false,
}: ShipmentChartsProps) {
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FF6B6B",
    "#4ECDC4",
  ];

  // Aggregate carrier data by carrier (sum all daily counts)
  const aggregatedCarrierData = chartData.carrierBarChart.reduce(
    (acc, item) => {
      const existing = acc.find((entry) => entry.carrier === item.carrier);
      if (existing) {
        existing.totalCount += item.count;
        existing.totalVolume += item.volume;
        existing.totalWeight += item.weight;
        existing.dayCount += 1;
      } else {
        acc.push({
          carrier: item.carrier,
          totalCount: item.count,
          totalVolume: item.volume,
          totalWeight: item.weight,
          dayCount: 1,
        });
      }
      return acc;
    },
    [] as Array<{
      carrier: string;
      totalCount: number;
      totalVolume: number;
      totalWeight: number;
      dayCount: number;
    }>
  );

  // Sort by total count descending
  const sortedCarrierData = aggregatedCarrierData
    .sort((a, b) => b.totalCount - a.totalCount)
    .map((item) => ({
      ...item,
      avgDaily: item.totalCount / item.dayCount,
    }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Updated Carrier Bar Chart - Total received per carrier */}
      <Card>
        <CardHeader>
          <CardTitle>Total Received Shipments by Carrier</CardTitle>
          <CardDescription>
            Total shipments received per carrier (all time)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              totalCount: {
                label: "Total Received",
                color: "#0088FE",
              },
            }}
            className="h-[350px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedCarrierData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <XAxis
                  dataKey="carrier"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Total Received Shipments",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle" },
                  }}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload as {
                        carrier: string;
                        totalCount: number;
                        totalVolume: number;
                        totalWeight: number;
                        dayCount: number;
                        avgDaily: number;
                      };
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-semibold">{data.carrier}</p>
                          <p className="text-blue-600">
                            Total Received: {data.totalCount.toLocaleString()}
                          </p>
                          <p className="text-green-600">
                            Total Volume: {data.totalVolume.toFixed(1)} m³
                          </p>
                          <p className="text-yellow-600">
                            Total Weight: {data.totalWeight.toFixed(1)} kg
                          </p>
                          <p className="text-purple-600">
                            Avg Daily: {data.avgDaily.toFixed(1)} shipments
                          </p>
                          <p className="text-gray-600">
                            Active Days: {data.dayCount}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="totalCount"
                  fill="#0088FE"
                  name="Total Received"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Updated Shipment Mode Pie Chart - Volume-based */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Volume by Mode</CardTitle>
          <CardDescription>
            Volume distribution between air and sea shipments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              air: {
                label: "Air",
                color: "#0088FE",
              },
              sea: {
                label: "Sea",
                color: "#00C49F",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.shipmentModeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ mode, percentage }) =>
                    `${mode} (${Number(percentage).toFixed(1)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="volume"
                >
                  {chartData.shipmentModeDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload as {
                        mode: string;
                        count: number;
                        percentage: number;
                        volume: number;
                        weight: number;
                      };
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-semibold">
                            {data.mode.toUpperCase()}
                          </p>
                          <p className="text-blue-600">
                            Volume: {data.volume.toFixed(1)} m³
                          </p>
                          <p className="text-green-600">
                            Percentage: {data.percentage.toFixed(1)}%
                          </p>
                          <p className="text-gray-600">
                            Shipments: {data.count.toLocaleString()}
                          </p>
                          <p className="text-yellow-600">
                            Weight: {data.weight.toFixed(1)} kg
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Warehouse Utilization Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Warehouse Utilization</CardTitle>
          <CardDescription>
            Current storage capacity usage (received shipments only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              used: {
                label: "Used",
                color: "#FF6B6B",
              },
              available: {
                label: "Available",
                color: "#4ECDC4",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.warehouseUtilizationPieChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    `${name} (${Number(value).toFixed(1)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.warehouseUtilizationPieChart.map(
                    (entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    )
                  )}
                </Pie>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const data = payload[0].payload as {
                        name: string;
                        value: number;
                        volume: number;
                        color: string;
                      };
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-blue-600">
                            Percentage: {data.value.toFixed(1)}%
                          </p>
                          <p className="text-green-600">
                            Volume: {data.volume.toFixed(1)} m³
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Warehouse Capacity Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Warehouse Capacity Over Time</CardTitle>
          <CardDescription>Daily packages and volume received</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              packages: {
                label: "Daily Packages",
                color: "#0088FE",
              },
              volume: {
                label: "Daily Volume (m³)",
                color: "#00C49F",
              },
              cumulativePackages: {
                label: "Total Packages",
                color: "#FFBB28",
              },
              cumulativeVolume: {
                label: "Total Volume (m³)",
                color: "#FF8042",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData.warehouseCapacityTimeline}
                margin={{ top: 20, right: 80, left: 20, bottom: 60 }}
              >
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis
                  yAxisId="daily"
                  orientation="left"
                  tick={{ fontSize: 11 }}
                  width={60}
                  label={{
                    value: "Daily Count",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle" },
                  }}
                  tickFormatter={(value) => Number(value).toFixed(1)}
                />
                <YAxis
                  yAxisId="cumulative"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  width={80}
                  label={{
                    value: "Cumulative Total",
                    angle: 90,
                    position: "insideRight",
                    style: { textAnchor: "middle" },
                  }}
                  tickFormatter={(value) => Number(value).toFixed(1)}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length > 0) {
                      const date = new Date(label);
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-semibold">
                            {date.toLocaleDateString("en-US", {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          {payload.map((entry, index) => (
                            <p key={index} style={{ color: entry.color }}>
                              {entry.name}:{" "}
                              {typeof entry.value === "number"
                                ? entry.value.toFixed(1)
                                : entry.value}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="line"
                  wrapperStyle={{
                    paddingBottom: "20px",
                    fontSize: "12px",
                  }}
                />

                {/* Daily metrics - solid lines */}
                <Line
                  yAxisId="daily"
                  type="monotone"
                  dataKey="packages"
                  stroke="#0088FE"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#0088FE" }}
                  activeDot={{ r: 4, fill: "#0088FE" }}
                  name="Daily Packages"
                />
                <Line
                  yAxisId="daily"
                  type="monotone"
                  dataKey="volume"
                  stroke="#00C49F"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#00C49F" }}
                  activeDot={{ r: 4, fill: "#00C49F" }}
                  name="Daily Volume (m³)"
                />

                {/* Cumulative metrics - dashed lines */}
                <Line
                  yAxisId="cumulative"
                  type="monotone"
                  dataKey="cumulativePackages"
                  stroke="#FFBB28"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={{ r: 1, fill: "#FFBB28" }}
                  activeDot={{ r: 3, fill: "#FFBB28" }}
                  name="Total Packages"
                />
                <Line
                  yAxisId="cumulative"
                  type="monotone"
                  dataKey="cumulativeVolume"
                  stroke="#FF8042"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={{ r: 1, fill: "#FF8042" }}
                  activeDot={{ r: 3, fill: "#FF8042" }}
                  name="Total Volume (m³)"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Destination Distribution (if detailed view) */}
      {detailed && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Shipments by Destination</CardTitle>
            <CardDescription>
              Caribbean destinations distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Shipments",
                  color: "#8884D8",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.destinationDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ destination, percentage }) =>
                      `${destination} (${Number(percentage).toFixed(1)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {chartData.destinationDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload as {
                          destination: string;
                          count: number;
                          percentage: number;
                          volume: number;
                          weight: number;
                          avgDeliveryTime: number | null;
                        };
                        return (
                          <div className="bg-white p-3 border rounded shadow-lg">
                            <p className="font-semibold">{data.destination}</p>
                            <p className="text-blue-600">
                              Shipments: {data.count.toLocaleString()}
                            </p>
                            <p className="text-green-600">
                              Percentage: {data.percentage.toFixed(1)}%
                            </p>
                            <p className="text-yellow-600">
                              Volume: {data.volume.toFixed(1)} m³
                            </p>
                            <p className="text-purple-600">
                              Weight: {data.weight.toFixed(1)} kg
                            </p>
                            {data.avgDeliveryTime && (
                              <p className="text-gray-600">
                                Avg Delivery: {data.avgDeliveryTime.toFixed(1)}{" "}
                                days
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
