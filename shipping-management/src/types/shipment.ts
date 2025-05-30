export type ShipmentStatus = "received" | "intransit" | "delivered";

export type ShippingCarrier = "FEDEX" | "DHL" | "USPS" | "UPS" | "AMAZON";

export type ShippingMode = "air" | "sea";

export type DestinationCountry =
  | "GUY"
  | "SVG"
  | "SLU"
  | "BIM"
  | "DOM"
  | "GRD"
  | "SKN"
  | "ANU"
  | "SXM"
  | "FSXM";

export interface Shipment {
  shipment_id: number;
  customer_id: number;
  origin: string;
  destination: DestinationCountry;
  weight: number;
  volume: number;
  carrier: ShippingCarrier;
  mode: ShippingMode;
  status: ShipmentStatus;
  arrival_date: string;
  departure_date?: string;
  delivered_date?: string;
}
