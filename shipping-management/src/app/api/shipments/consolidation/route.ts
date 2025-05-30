import { NextResponse } from "next/server";
import { createClient } from "@/db/supabase";

interface ConsolidationGroup {
  id: string;
  destination: string;
  departureDate: string;
  carrier: string;
  mode: string;
  shipmentCount: number;
  totalWeight: number;
  totalVolume: number;
  potentialSavings: number;
  avgWeightPerShipment: number;
  avgVolumePerShipment: number;
  shipments?: Array<{
    shipment_id: number;
    customer_id: number;
    origin: string;
    weight: number;
    volume: number;
    status: string;
    arrival_date: string;
    delivered_date: string | null;
  }>;
}

interface ConsolidationSummary {
  totalGroups: number;
  totalShipments: number;
  totalPotentialSavings: number;
  avgShipmentsPerGroup: number;
  topDestination: string;
  topCarrier: string;
  topMode: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Type definitions for database responses
interface ConsolidationGroupRaw {
  group_id: string;
  destination: string;
  departure_date: string;
  carrier: string;
  mode: string;
  shipment_count: string;
  total_weight_g: number;
  total_volume_cm3: number;
  potential_savings_usd: string;
  avg_weight_per_shipment_g: number;
  avg_volume_per_shipment_cm3: number;
}

interface ShipmentDetailRaw {
  shipment_id: number;
  customer_id: number;
  origin: string | null;
  weight_g: number;
  volume_cm3: number;
  status: string;
  arrival_date: string;
  delivered_date: string | null;
}

interface ConsolidationSummaryRaw {
  total_consolidation_groups: string;
  total_consolidatable_shipments: string;
  total_potential_savings_usd: string;
  avg_shipments_per_group: string;
  top_destination: string;
  top_carrier: string;
  top_mode: string;
}

interface ConsolidationResponse {
  consolidationGroups: ConsolidationGroup[];
  summary: ConsolidationSummary;
  pagination: PaginationInfo;
  filters: {
    carrier: string;
    mode: string;
    destination: string;
    minGroupSize: number;
  };
  lastUpdated: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const carrier = searchParams.get("carrier") || "all";
    const mode = searchParams.get("mode") || "all";
    const destination = searchParams.get("destination") || "all";
    const includeDetails = searchParams.get("includeDetails") === "true";
    const minGroupSize = Number.parseInt(
      searchParams.get("minGroupSize") || "2"
    );
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "25");

    const supabase = createClient();

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const { data: countData, error: countError } = await supabase.rpc(
      "get_consolidation_groups_count",
      {
        carrier_filter: carrier,
        mode_filter: mode,
        destination_filter: destination,
        min_group_size: minGroupSize,
      }
    );

    if (countError) {
      console.error("Error fetching consolidation groups count:", countError);
      return NextResponse.json(
        {
          error: "Failed to fetch consolidation groups count",
          details: countError.message,
        },
        { status: 500 }
      );
    }

    const totalItems = Number(countData) || 0;
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch consolidation groups with pagination
    const { data: groupsData, error: groupsError } = await supabase.rpc(
      "get_consolidation_groups_paginated",
      {
        carrier_filter: carrier,
        mode_filter: mode,
        destination_filter: destination,
        min_group_size: minGroupSize,
        page_offset: offset,
        page_limit: limit,
      }
    );

    if (groupsError) {
      console.error("Error fetching consolidation groups:", groupsError);
      return NextResponse.json(
        {
          error: "Failed to fetch consolidation groups",
          details: groupsError.message,
        },
        { status: 500 }
      );
    }

    // Process consolidation groups
    const consolidationGroups: ConsolidationGroup[] = [];

    for (const group of (groupsData as ConsolidationGroupRaw[]) || []) {
      const consolidationGroup: ConsolidationGroup = {
        id: group.group_id,
        destination: group.destination,
        departureDate: group.departure_date,
        carrier: group.carrier,
        mode: group.mode,
        shipmentCount: Number.parseInt(group.shipment_count),
        totalWeight: group.total_weight_g / 1000, // Convert grams to kg
        totalVolume: group.total_volume_cm3 / 1000000, // Convert cm³ to m³
        potentialSavings: Number.parseFloat(group.potential_savings_usd),
        avgWeightPerShipment: group.avg_weight_per_shipment_g / 1000, // Convert to kg
        avgVolumePerShipment: group.avg_volume_per_shipment_cm3 / 1000000, // Convert to m³
      };

      // Fetch detailed shipment information if requested
      if (includeDetails) {
        const { data: detailsData, error: detailsError } = await supabase.rpc(
          "get_consolidation_group_details",
          {
            group_destination: group.destination,
            group_departure_date: group.departure_date,
            group_carrier: group.carrier,
            group_mode: group.mode,
          }
        );

        if (!detailsError && detailsData) {
          consolidationGroup.shipments = (
            detailsData as ShipmentDetailRaw[]
          ).map((shipment: ShipmentDetailRaw) => ({
            shipment_id: shipment.shipment_id,
            customer_id: shipment.customer_id,
            origin: shipment.origin || "Unknown",
            weight: shipment.weight_g / 1000, // Convert to kg
            volume: shipment.volume_cm3 / 1000000, // Convert to m³
            status: shipment.status,
            arrival_date: shipment.arrival_date,
            delivered_date: shipment.delivered_date,
          }));
        }
      }

      consolidationGroups.push(consolidationGroup);
    }

    // Fetch summary statistics
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      "get_consolidation_summary",
      {
        carrier_filter: carrier,
        mode_filter: mode,
        destination_filter: destination,
      }
    );

    if (summaryError) {
      console.error("Error fetching consolidation summary:", summaryError);
      return NextResponse.json(
        {
          error: "Failed to fetch consolidation summary",
          details: summaryError.message,
        },
        { status: 500 }
      );
    }

    // Process summary data
    const summary: ConsolidationSummary = (
      summaryData as ConsolidationSummaryRaw[]
    )?.[0]
      ? {
          totalGroups: Number.parseInt(
            summaryData[0].total_consolidation_groups
          ),
          totalShipments: Number.parseInt(
            summaryData[0].total_consolidatable_shipments
          ),
          totalPotentialSavings: Number.parseFloat(
            summaryData[0].total_potential_savings_usd
          ),
          avgShipmentsPerGroup: Number.parseFloat(
            summaryData[0].avg_shipments_per_group
          ),
          topDestination: summaryData[0].top_destination,
          topCarrier: summaryData[0].top_carrier,
          topMode: summaryData[0].top_mode,
        }
      : {
          totalGroups: 0,
          totalShipments: 0,
          totalPotentialSavings: 0,
          avgShipmentsPerGroup: 0,
          topDestination: "N/A",
          topCarrier: "N/A",
          topMode: "N/A",
        };

    // Create pagination info
    const pagination: PaginationInfo = {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    const response: ConsolidationResponse = {
      consolidationGroups,
      summary,
      pagination,
      filters: {
        carrier,
        mode,
        destination,
        minGroupSize,
      },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve consolidation data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
