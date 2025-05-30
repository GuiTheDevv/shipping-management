import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/db/supabase";

// Zod schema definition (with null support)
const ShipmentSchema = z.object({
  shipment_id: z.number(),
  customer_id: z.number(),
  origin: z.string().nullable(),
  destination: z.enum([
    "GUY",
    "SVG",
    "SLU",
    "BIM",
    "DOM",
    "GRD",
    "SKN",
    "ANU",
    "SXM",
    "FSXM",
  ]),
  weight: z.number(),
  volume: z.number(),
  carrier: z.enum(["FEDEX", "DHL", "USPS", "UPS", "AMAZON"]),
  mode: z.enum(["air", "sea"]),
  status: z.enum(["received", "intransit", "delivered"]),
  arrival_date: z.string().nullable(),
  departure_date: z.string().nullable().optional(),
  delivered_date: z.string().nullable().optional(),
});

export type Shipment = z.infer<typeof ShipmentSchema>;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Filter parameters
    const status = searchParams.get("status");
    const carrier = searchParams.get("carrier");
    const destination = searchParams.get("destination");
    const search = searchParams.get("search");

    const supabase = createClient();

    // Build the query
    let query = supabase.from("shipments").select("*", { count: "exact" });

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (carrier && carrier !== "all") {
      query = query.eq("carrier", carrier);
    }
    if (destination && destination !== "all") {
      query = query.eq("destination", destination);
    }
    if (search) {
      query = query.or(
        `shipment_id.eq.${search},customer_id.eq.${search},origin.ilike.%${search}%,carrier.ilike.%${search}%`
      );
    }

    // Apply pagination and ordering - CHANGED TO ASCENDING ORDER
    query = query
      .order("shipment_id", { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    console.log(
      `Retrieved ${data?.length || 0} shipments (page ${page}, total: ${count})`
    );

    if (error) {
      console.error("Supabase error:", error.message);
      return NextResponse.json(
        {
          error: "Failed to retrieve shipments",
          details: error.message,
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        shipments: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Validate the data
    const validated = data
      .map((item) => ShipmentSchema.safeParse(item))
      .filter(
        (result): result is { success: true; data: Shipment } => result.success
      )
      .map((result) => result.data);

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      shipments: validated,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve shipments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
