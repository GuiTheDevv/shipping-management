"use client";

import {
  Package,
  Clock,
  Warehouse,
  TrendingUp,
  Truck,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStatsProps {
  totalShipments: number;
  deliveredShipments: number;
  intransitShipments: number;
  receivedShipments: number;
  totalVolume: number;
  totalWeight: number;
  dashboardMetrics?: {
    avgVolumePerShipment: number;
    avgWeightPerShipment: number;
    deliveryRate: number;
    onTimeDeliveryRate: number;
  };
  warehouseUtilization?: {
    utilizationPercentage: number;
    totalVolume: number;
    shipmentCount: number;
    capacityVolume: number;
  };
}

export function DashboardStats({
  totalShipments,
  deliveredShipments,
  intransitShipments,
  totalVolume,
  totalWeight,
  dashboardMetrics,
  warehouseUtilization,
}: DashboardStatsProps) {
  const onTimePercentage = dashboardMetrics?.onTimeDeliveryRate || 0;
  const warehouseUtilizationRate =
    warehouseUtilization?.utilizationPercentage || 0;

  const stats = [
    {
      title: "Total Shipments",
      value: totalShipments.toLocaleString(),
      description: `${deliveredShipments} delivered, ${intransitShipments} in transit`,
      icon: Package,
      trend: "+12% from last month",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "On-Time Delivery",
      value: `${onTimePercentage.toFixed(1)}%`,
      description: `${deliveredShipments} of ${totalShipments} delivered`,
      icon: Clock,
      trend: "+5% from last month",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Warehouse Usage",
      value: `${warehouseUtilizationRate.toFixed(1)}%`,
      description: `${warehouseUtilization?.totalVolume.toFixed(
        1
      )}m³ capacity used`,
      icon: Warehouse,
      trend: "+8% from last month",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Total Weight",
      value: `${totalWeight.toFixed(1)}kg`,
      description: `Avg: ${
        dashboardMetrics?.avgWeightPerShipment.toFixed(1) || 0
      }kg per shipment`,
      icon: TrendingUp,
      trend: "+15% from last month",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Total Volume",
      value: `${totalVolume.toFixed(1)}m³`,
      description: `Avg: ${
        dashboardMetrics?.avgVolumePerShipment.toFixed(3) || 0
      }m³ per shipment`,
      icon: Globe,
      trend: "+10% from last month",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Delivery Rate",
      value: `${dashboardMetrics?.deliveryRate.toFixed(1) || 0}%`,
      description: `${deliveredShipments} completed deliveries`,
      icon: Truck,
      trend: "+3% from last month",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
            <p className="text-xs text-green-600 mt-1">{stat.trend}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
