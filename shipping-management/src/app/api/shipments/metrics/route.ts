import { createClient } from "@/db/supabase";
import { NextResponse } from "next/server";

const supabase = createClient();

// Type definitions for database responses
interface MetricsData {
  total_shipments: number;
  delivered_shipments: number;
  intransit_shipments: number;
  received_shipments: number;
  total_volume_cm3: number;
  total_weight_g: number;
  avg_volume_per_shipment_cm3: number;
  avg_weight_per_shipment_g: number;
  delivery_rate: number;
  on_time_delivery_rate: number;
}

interface WarehouseData {
  warehouse_name: string;
  total_volume_cm3: number;
  shipment_count: number;
  capacity_volume_cm3: number;
  utilization_percentage: number;
  available_volume_cm3: number;
}

interface CarrierDataRaw {
  carrier: string;
  arrival_date: string;
  shipment_count: number;
  total_volume_cm3: number;
  total_weight_g: number;
  total_shipments: number;
  delivered_shipments: number;
  avg_delivery_time: number | null;
  on_time_delivery_rate: number;
  air_shipments: number;
  sea_shipments: number;
}

interface DestinationDataRaw {
  destination: string;
  shipment_count: number;
  percentage: number;
  total_volume_cm3: number;
  total_weight_g: number;
  avg_delivery_time: number | null;
}

interface TimelineDataRaw {
  date: string;
  packages_received: number;
  volume_received_cm3: number;
  cumulative_packages: number;
  cumulative_volume_cm3: number;
}

interface ModeDataRaw {
  mode: string;
  shipment_count: number;
  percentage: number;
  total_volume_cm3: number;
  total_weight_g: number;
}

// Type definitions for response data
interface DashboardMetrics {
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
}

interface WarehouseUtilization {
  warehouseName: string;
  totalVolume: number;
  shipmentCount: number;
  capacityVolume: number;
  utilizationPercentage: number;
  availableVolume: number;
}

interface PieChartData {
  name: string;
  value: number;
  volume: number;
  color: string;
}

interface ModeDistribution {
  mode: string;
  count: number;
  percentage: number;
  volume: number;
  weight: number;
}

interface CarrierBarChart {
  carrier: string;
  date: string;
  count: number;
  volume: number;
  weight: number;
}

interface CapacityTimeline {
  date: string;
  packages: number;
  volume: number;
  cumulativePackages: number;
  cumulativeVolume: number;
}

interface DestinationDistribution {
  destination: string;
  count: number;
  percentage: number;
  volume: number;
  weight: number;
  avgDeliveryTime: number | null;
}

interface CarrierPerformance {
  carrier: string;
  totalShipments: number;
  deliveredShipments: number;
  avgDeliveryTime: number | null;
  onTimeDeliveryRate: number;
  totalVolume: number;
  totalWeight: number;
  airShipments: number;
  seaShipments: number;
}

interface Charts {
  warehouseUtilizationPieChart: PieChartData[];
  shipmentModeDistribution: ModeDistribution[];
  carrierBarChart: CarrierBarChart[];
  warehouseCapacityTimeline: CapacityTimeline[];
  destinationDistribution: DestinationDistribution[];
  carrierPerformance: CarrierPerformance[];
}

interface DashboardResponse {
  totalShipments: number;
  deliveredShipments: number;
  intransitShipments: number;
  receivedShipments: number;
  totalVolume: number;
  totalWeight: number;
  dashboardMetrics: DashboardMetrics;
  warehouseUtilization: WarehouseUtilization;
  charts: Charts;
  dateRange: {
    from: string;
    to: string;
  };
  lastUpdated: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Default to last 30 days if no dates provided
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const dateFrom =
      searchParams.get("dateFrom") || thirtyDaysAgo.toISOString().split("T")[0];
    const dateTo =
      searchParams.get("dateTo") || today.toISOString().split("T")[0];

    // Fetch basic shipment metrics
    const { data: metricsData, error: metricsError } = await supabase.rpc(
      "get_dashboard_metrics_fixed",
      {
        date_from: dateFrom,
        date_to: dateTo,
      }
    );

    if (metricsError) {
      console.error("Metrics error:", metricsError);
      throw new Error(`Failed to fetch metrics: ${metricsError.message}`);
    }

    // Fetch warehouse utilization
    const { data: warehouseData, error: warehouseError } = await supabase.rpc(
      "get_warehouse_utilization_fixed"
    );

    if (warehouseError) {
      console.error("Warehouse error:", warehouseError);
      throw new Error(
        `Failed to fetch warehouse data: ${warehouseError.message}`
      );
    }

    // Fetch carrier performance
    const { data: carrierData, error: carrierError } = await supabase.rpc(
      "get_carrier_performance_fixed",
      {
        date_from: dateFrom,
        date_to: dateTo,
      }
    );

    if (carrierError) {
      console.error("Carrier error:", carrierError);
      throw new Error(`Failed to fetch carrier data: ${carrierError.message}`);
    }

    // Fetch destination distribution
    const { data: destinationData, error: destinationError } =
      await supabase.rpc("get_destination_distribution_fixed", {
        date_from: dateFrom,
        date_to: dateTo,
      });

    if (destinationError) {
      console.error("Destination error:", destinationError);
      throw new Error(
        `Failed to fetch destination data: ${destinationError.message}`
      );
    }

    // Fetch warehouse capacity timeline
    const { data: timelineData, error: timelineError } = await supabase.rpc(
      "get_warehouse_capacity_timeline_fixed",
      {
        date_from: dateFrom,
        date_to: dateTo,
      }
    );

    if (timelineError) {
      console.error("Timeline error:", timelineError);
      throw new Error(
        `Failed to fetch timeline data: ${timelineError.message}`
      );
    }

    // Fetch mode distribution
    const { data: modeData, error: modeError } = await supabase.rpc(
      "get_mode_distribution_fixed",
      {
        date_from: dateFrom,
        date_to: dateTo,
      }
    );

    if (modeError) {
      console.error("Mode error:", modeError);
      throw new Error(`Failed to fetch mode data: ${modeError.message}`);
    }

    // Process the data with proper typing
    const metrics: MetricsData = (metricsData as MetricsData[])?.[0] || {
      total_shipments: 0,
      delivered_shipments: 0,
      intransit_shipments: 0,
      received_shipments: 0,
      total_volume_cm3: 0,
      total_weight_g: 0,
      avg_volume_per_shipment_cm3: 0,
      avg_weight_per_shipment_g: 0,
      delivery_rate: 0,
      on_time_delivery_rate: 0,
    };

    const warehouse: WarehouseData = (
      warehouseData as WarehouseData[]
    )?.[0] || {
      warehouse_name: "Main Warehouse",
      total_volume_cm3: 0,
      shipment_count: 0,
      capacity_volume_cm3: 60000000000,
      utilization_percentage: 0,
      available_volume_cm3: 60000000000,
    };

    // Convert units for display (cm³ to m³, g to kg)
    const totalVolumeM3 = Number(metrics.total_volume_cm3) / 1000000;
    const totalWeightKg = Number(metrics.total_weight_g) / 1000;
    const avgVolumeM3 = Number(metrics.avg_volume_per_shipment_cm3) / 1000000;
    const avgWeightKg = Number(metrics.avg_weight_per_shipment_g) / 1000;
    const warehouseTotalVolumeM3 = Number(warehouse.total_volume_cm3) / 1000000;
    const warehouseCapacityM3 = Number(warehouse.capacity_volume_cm3) / 1000000;
    const warehouseAvailableM3 =
      Number(warehouse.available_volume_cm3) / 1000000;

    // Build response with proper typing
    const dashboardData: DashboardResponse = {
      totalShipments: Number(metrics.total_shipments),
      deliveredShipments: Number(metrics.delivered_shipments),
      intransitShipments: Number(metrics.intransit_shipments),
      receivedShipments: Number(metrics.received_shipments),
      totalVolume: totalVolumeM3,
      totalWeight: totalWeightKg,
      dashboardMetrics: {
        totalShipments: Number(metrics.total_shipments),
        deliveredShipments: Number(metrics.delivered_shipments),
        intransitShipments: Number(metrics.intransit_shipments),
        receivedShipments: Number(metrics.received_shipments),
        totalVolume: totalVolumeM3,
        totalWeight: totalWeightKg,
        avgVolumePerShipment: avgVolumeM3,
        avgWeightPerShipment: avgWeightKg,
        deliveryRate: Number(metrics.delivery_rate),
        onTimeDeliveryRate: Number(metrics.on_time_delivery_rate),
      },
      warehouseUtilization: {
        warehouseName: warehouse.warehouse_name,
        totalVolume: warehouseTotalVolumeM3,
        shipmentCount: Number(warehouse.shipment_count),
        capacityVolume: warehouseCapacityM3,
        utilizationPercentage: Number(warehouse.utilization_percentage),
        availableVolume: warehouseAvailableM3,
      },
      charts: {
        warehouseUtilizationPieChart: [
          {
            name: "Used",
            value: Number(warehouse.utilization_percentage),
            volume: warehouseTotalVolumeM3,
            color: "#FF6B6B",
          },
          {
            name: "Available",
            value: 100 - Number(warehouse.utilization_percentage),
            volume: warehouseAvailableM3,
            color: "#4ECDC4",
          },
        ],
        shipmentModeDistribution: ((modeData as ModeDataRaw[]) || []).map(
          (item) => ({
            mode: item.mode.charAt(0).toUpperCase() + item.mode.slice(1),
            count: Number(item.shipment_count),
            percentage: Number(item.percentage),
            volume: Number(item.total_volume_cm3) / 1000000,
            weight: Number(item.total_weight_g) / 1000,
          })
        ),
        carrierBarChart: ((carrierData as CarrierDataRaw[]) || []).map(
          (item) => ({
            carrier: item.carrier,
            date: item.arrival_date,
            count: Number(item.shipment_count),
            volume: Number(item.total_volume_cm3) / 1000000,
            weight: Number(item.total_weight_g) / 1000,
          })
        ),
        warehouseCapacityTimeline: (
          (timelineData as TimelineDataRaw[]) || []
        ).map((item) => ({
          date: item.date,
          packages: Number(item.packages_received),
          volume: Number(item.volume_received_cm3) / 1000000,
          cumulativePackages: Number(item.cumulative_packages),
          cumulativeVolume: Number(item.cumulative_volume_cm3) / 1000000,
        })),
        destinationDistribution: (
          (destinationData as DestinationDataRaw[]) || []
        ).map((item) => ({
          destination: item.destination,
          count: Number(item.shipment_count),
          percentage: Number(item.percentage),
          volume: Number(item.total_volume_cm3) / 1000000,
          weight: Number(item.total_weight_g) / 1000,
          avgDeliveryTime: item.avg_delivery_time
            ? Number(item.avg_delivery_time)
            : null,
        })),
        carrierPerformance: ((carrierData as CarrierDataRaw[]) || []).reduce(
          (acc: CarrierPerformance[], item: CarrierDataRaw) => {
            if (!acc.some((c) => c.carrier === item.carrier)) {
              acc.push({
                carrier: item.carrier,
                totalShipments: Number(item.total_shipments),
                deliveredShipments: Number(item.delivered_shipments),
                avgDeliveryTime: item.avg_delivery_time
                  ? Number(item.avg_delivery_time)
                  : null,
                onTimeDeliveryRate: Number(item.on_time_delivery_rate),
                totalVolume: Number(item.total_volume_cm3) / 1000000,
                totalWeight: Number(item.total_weight_g) / 1000,
                airShipments: Number(item.air_shipments),
                seaShipments: Number(item.sea_shipments),
              });
            }
            return acc;
          },
          []
        ),
      },
      dateRange: {
        from: dateFrom,
        to: dateTo,
      },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
