import { NextRequest, NextResponse } from "next/server";
import csvParser from "csv-parser";
import {
  DestinationCountry,
  Shipment,
  ShipmentStatus,
  ShippingCarrier,
  ShippingMode,
} from "@/types/shipment";
import { Readable } from "stream";
import { createClient } from "@/db/supabase";

const VALID_STATUSES = ["received", "intransit", "delivered"] as const;
const VALID_CARRIERS = ["FEDEX", "DHL", "USPS", "UPS", "AMAZON"] as const;
const VALID_MODES = ["air", "sea"] as const;
const VALID_DESTINATIONS = [
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
] as const;

const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150MB
const PROGRESS_INTERVAL = 50000;
const CHUNK_SIZE = 1000; // Number of rows per batch insert

// 🔁 Helper: Insert in chunks
async function insertShipmentsInChunks(
  supabase: ReturnType<typeof createClient>,
  shipments: Shipment[],
  chunkSize = CHUNK_SIZE
) {
  for (let i = 0; i < shipments.length; i += chunkSize) {
    const chunk = shipments.slice(i, i + chunkSize);
    const { error } = await supabase.from("shipments").insert(chunk);

    if (error) {
      console.error(`Error inserting chunk at index ${i}:`, error);
      throw new Error(`Failed to insert chunk starting at index ${i}`);
    }

    // Yield to event loop to avoid blocking
    await new Promise((resolve) => setImmediate(resolve));
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = createClient();
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "CSV file is required" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Max size is ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
        },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const uniqueShipmentsMap = new Map<number, Shipment>();
    let processedRows = 0;
    let validRows = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    let missingRequiredFields = 0;
    let invalidEnumValues = 0;

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(
          csvParser({
            headers: [
              "shipment_id",
              "customer_id",
              "origin",
              "destination",
              "weight",
              "volume",
              "carrier",
              "mode",
              "status",
              "arrival_date",
              "departure_date",
              "delivered_date",
            ],
            maxRowBytes: 10000,
          })
        )
        .on("data", async (data) => {
          processedRows++;

          const shipment_id = Number(data.shipment_id);
          const customer_id = Number(data.customer_id);
          const weight = Number(data.weight);
          const volume = Number(data.volume);

          const origin = (data.origin || "").trim();
          const destination = (data.destination || "").trim();
          const carrier = (data.carrier || "").trim();
          const mode = (data.mode || "").trim();
          const status = (data.status || "").trim();
          const arrival_date = (data.arrival_date || "").trim();

          if (!shipment_id || isNaN(shipment_id)) {
            invalidCount++;
            return;
          }

          if (
            !origin ||
            !destination ||
            !carrier ||
            !mode ||
            !status ||
            !arrival_date ||
            !customer_id ||
            isNaN(customer_id) ||
            !weight ||
            isNaN(weight) ||
            !volume ||
            isNaN(volume)
          ) {
            missingRequiredFields++;
            return;
          }

          if (
            !VALID_DESTINATIONS.includes(destination) ||
            !VALID_CARRIERS.includes(carrier) ||
            !VALID_MODES.includes(mode) ||
            !VALID_STATUSES.includes(status)
          ) {
            invalidEnumValues++;
            return;
          }

          if (uniqueShipmentsMap.has(shipment_id)) {
            duplicateCount++;
            return;
          }

          const shipment: Shipment = {
            shipment_id,
            customer_id,
            origin,
            destination: destination as DestinationCountry,
            weight,
            volume,
            carrier: carrier as ShippingCarrier,
            mode: mode as ShippingMode,
            status: status as ShipmentStatus,
            arrival_date,
            departure_date: (data.departure_date || "").trim() || undefined,
            delivered_date: (data.delivered_date || "").trim() || undefined,
          };

          uniqueShipmentsMap.set(shipment_id, shipment);
          validRows++;

          if (validRows % PROGRESS_INTERVAL === 0) {
            console.log(
              `Processed ${processedRows} rows, ${validRows} valid, ${duplicateCount} duplicates`
            );
            await new Promise((resolve) => setImmediate(resolve));
          }
        })
        .on("error", (err) => {
          console.error("CSV parsing error:", err);
          reject(err);
        })
        .on("end", async () => {
          console.log(
            `CSV parse done. Total rows: ${processedRows}, Valid: ${validRows}`
          );
          resolve();
        });
    });

    const shipments = Array.from(uniqueShipmentsMap.values());

    // Clear old records
    const { error: deleteError } = await supabase.rpc("truncate_shipments");

    if (deleteError) {
      console.error("Error clearing shipments table:", deleteError);
      return NextResponse.json(
        {
          error: "Failed to clear shipments table",
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    // Insert in chunks
    try {
      await insertShipmentsInChunks(supabase, shipments);
      console.log("Supabase chunked insert complete");
    } catch (err) {
      console.error("Error inserting shipments:", err);
      return NextResponse.json(
        {
          error: "Failed to insert shipments into Supabase",
          details: err instanceof Error ? err.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      message: "CSV uploaded and processed successfully",
      totalProcessed: processedRows,
      totalValid: validRows,
      totalShipments: shipments.length,
      duplicatesSkipped: duplicateCount,
      invalidIdRows: invalidCount,
      missingFieldRows: missingRequiredFields,
      invalidEnumRows: invalidEnumValues,
      processingTime: `${processingTime}s`,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Failed to process CSV",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
