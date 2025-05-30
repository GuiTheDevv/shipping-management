"use client";

import { useState, useEffect } from "react";
import { Upload, Package, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { DashboardStats } from "@/components/dashboard-stats";
import { ShipmentCharts } from "@/components/shipment-charts";
import { ShipmentTable } from "@/components/shipment-table";
import { ConsolidationRecommendations } from "@/components/consolidation-recommendations";

interface DashboardData {
  totalShipments: number;
  deliveredShipments: number;
  intransitShipments: number;
  receivedShipments: number;
  totalVolume: number;
  totalWeight: number;
  dashboardMetrics: {
    totalShipments: number;
    deliveredShipments: number;
    intransitShipments: number;
    receivedShipments: number;
    totalVolume: number;
    totalWeight: number;
    avgVolumePerShipment: number;
    avgWeightPerShipment: number;
    deliveryRate: number;
    onTimeDeliveryRate: number;
  };
  warehouseUtilization: {
    warehouseName: string;
    totalVolume: number;
    shipmentCount: number;
    capacityVolume: number;
    utilizationPercentage: number;
    availableVolume: number;
  };
  charts: {
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
    carrierPerformance: Array<{
      carrier: string;
      totalShipments: number;
      deliveredShipments: number;
      avgDeliveryTime: number | null;
      onTimeDeliveryRate: number;
      totalVolume: number;
      totalWeight: number;
      airShipments: number;
      seaShipments: number;
    }>;
  };
  dateRange: {
    from: string;
    to: string;
  };
  lastUpdated: string;
}

export default function Dashboard() {
  const [progress, setProgress] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  // Fetch dashboard data from API
  const fetchDashboardData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`/api/shipments/metrics`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`);
      }

      const data = await response.json();
      setDashboardData(data);

      console.log("Dashboard data updated:", data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setDashboardData(null);
    } finally {
      setLoading(false);
      if (showRefreshIndicator) setRefreshing(false);
    }
  };

  // Updated upload handler
  const handleFileUpload = async (file: File) => {
    const sizeInKB = file.size / 1024;
    const durationPerKB = 2.882; // ms per KB
    const totalDuration = Math.max(sizeInKB * durationPerKB, 2000); // at least 2s

    const updateInterval = 100; // ms
    const maxProgress = 99;
    const steps = Math.floor(totalDuration / updateInterval);
    const increment = maxProgress / steps;

    let currentProgress = 0;
    let progressInterval: NodeJS.Timeout | undefined;

    try {
      setLoading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      console.log("Starting file upload...");

      progressInterval = setInterval(() => {
        currentProgress += increment;
        if (currentProgress >= maxProgress) {
          currentProgress = maxProgress;
          clearInterval(progressInterval!);
        }
        setProgress(Math.floor(currentProgress));
      }, updateInterval);

      const response = await fetch("/api/shipments/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Upload failed:", errorData);
        throw new Error("Upload failed");
      }

      console.log("Upload succeeded. Waiting for cache revalidation...");
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchDashboardData();

      clearInterval(progressInterval!);
      setProgress(100);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (error) {
      console.error("Upload error:", error);
      clearInterval(progressInterval!);
      setProgress(0);
      setError(true);
      setTimeout(() => setError(false), 2500);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 1000);
    }
  };

  // Load dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Shipment Management Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor and manage your Caribbean logistics operations
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <div className="flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold">CariLogistics</span>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Shipment Data
            </CardTitle>
            <CardDescription>
              Upload your CSV file containing shipment data for processing and
              analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload onFileUpload={handleFileUpload} />
            {success && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✓ File uploaded successfully
                </p>
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">✗ Failed to upload file</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading ? (
          <Card>
            <CardContent className="block items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading dashboard data...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-md h-2 mt-4 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300 ease-in-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ) : dashboardData ? (
          /* Main Dashboard */
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="shipments">Shipments</TabsTrigger>
              <TabsTrigger value="consolidation">Consolidation</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <DashboardStats
                totalShipments={dashboardData.totalShipments}
                deliveredShipments={dashboardData.deliveredShipments}
                intransitShipments={dashboardData.intransitShipments}
                receivedShipments={dashboardData.receivedShipments}
                totalVolume={dashboardData.totalVolume}
                totalWeight={dashboardData.totalWeight}
                dashboardMetrics={dashboardData.dashboardMetrics}
                warehouseUtilization={dashboardData.warehouseUtilization}
              />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <ShipmentCharts
                chartData={dashboardData.charts}
                warehouseUtilization={dashboardData.warehouseUtilization}
                detailed
              />
              <Card>
                <CardHeader>
                  <CardTitle>Carrier Performance Analysis</CardTitle>
                  <CardDescription>
                    Detailed performance metrics by carrier
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {dashboardData.charts.carrierPerformance.map((carrier) => (
                      <div
                        key={carrier.carrier}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold">{carrier.carrier}</h3>
                          <span className="text-sm text-muted-foreground">
                            {carrier.totalShipments} shipments
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              On-time Rate:
                            </span>
                            <div className="font-medium">
                              {carrier.onTimeDeliveryRate.toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Avg Delivery:
                            </span>
                            <div className="font-medium">
                              {carrier.avgDeliveryTime
                                ? `${carrier.avgDeliveryTime.toFixed(1)} days`
                                : "N/A"}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Air/Sea:
                            </span>
                            <div className="font-medium">
                              {carrier.airShipments}/{carrier.seaShipments}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Total Volume:
                            </span>
                            <div className="font-medium">
                              {carrier.totalVolume.toFixed(1)}m³
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="shipments" className="space-y-6">
              <ShipmentTable />
            </TabsContent>

            <TabsContent value="consolidation" className="space-y-6">
              <ConsolidationRecommendations />
            </TabsContent>
          </Tabs>
        ) : (
          /* No Data State */
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No dashboard data available.</p>
                <p className="text-sm">
                  Upload a CSV file or check your database connection.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data freshness indicator */}
        {dashboardData && (
          <div className="text-center text-xs text-muted-foreground">
            Last updated: {new Date(dashboardData.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
