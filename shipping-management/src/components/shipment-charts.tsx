"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Carrier Bar Chart - Received count per carrier, per day */}
      <Card>
        <CardHeader>
          <CardTitle>Shipments by Carrier</CardTitle>
          <CardDescription>Daily received count per carrier</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              count: {
                label: "Shipments",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.carrierBarChart}>
                <XAxis dataKey="carrier" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Shipment Mode Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Volume by Mode</CardTitle>
          <CardDescription>
            Distribution of air vs sea shipments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              air: {
                label: "Air",
                color: "hsl(var(--chart-1))",
              },
              sea: {
                label: "Sea",
                color: "hsl(var(--chart-2))",
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
                  label={({ mode, percentage }) => `${mode} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {chartData.shipmentModeDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Warehouse Utilization Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Warehouse Utilization</CardTitle>
          <CardDescription>Current storage capacity usage</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              used: {
                label: "Used",
                color: "hsl(var(--chart-3))",
              },
              available: {
                label: "Available",
                color: "hsl(var(--chart-4))",
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
                  label={({ name, value }) => `${name} (${value}%)`}
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
                  content={<ChartTooltipContent />}
                  formatter={(value, name, props) => [
                    `${value}% (${props.payload.volume.toFixed(2)}m³)`,
                    props.payload.name,
                  ]}
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
                color: "hsl(var(--chart-1))",
              },
              volume: {
                label: "Daily Volume (m³)",
                color: "hsl(var(--chart-2))",
              },
              cumulativePackages: {
                label: "Total Packages",
                color: "hsl(var(--chart-3))",
              },
              cumulativeVolume: {
                label: "Total Volume (m³)",
                color: "hsl(var(--chart-4))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.warehouseCapacityTimeline}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
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
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "Daily Count",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <YAxis
                  yAxisId="cumulative"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "Cumulative Total",
                    angle: 90,
                    position: "insideRight",
                  }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <Legend />

                {/* Daily metrics */}
                <Line
                  yAxisId="daily"
                  type="monotone"
                  dataKey="packages"
                  stroke="var(--color-packages)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Daily Packages"
                />
                <Line
                  yAxisId="daily"
                  type="monotone"
                  dataKey="volume"
                  stroke="var(--color-volume)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Daily Volume (m³)"
                />

                {/* Cumulative metrics */}
                <Line
                  yAxisId="cumulative"
                  type="monotone"
                  dataKey="cumulativePackages"
                  stroke="var(--color-cumulativePackages)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  name="Total Packages"
                />
                <Line
                  yAxisId="cumulative"
                  type="monotone"
                  dataKey="cumulativeVolume"
                  stroke="var(--color-cumulativeVolume)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
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
                  color: "hsl(var(--chart-3))",
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
                      `${destination} (${percentage}%)`
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
                    content={<ChartTooltipContent />}
                    formatter={(value, name, props) => [
                      `${value} shipments (${props.payload.percentage}%)`,
                      props.payload.destination,
                    ]}
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
