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

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("shipments").select("*");

    console.log("Retrieved from Supabase:", data?.length || 0);

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
      return NextResponse.json({ shipments: [] });
    }

    const validated = data
      .map((item) => ShipmentSchema.safeParse(item))
      .filter(
        (result): result is { success: true; data: Shipment } => result.success
      )
      .map((result) => result.data);

    return NextResponse.json({ shipments: validated });
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
