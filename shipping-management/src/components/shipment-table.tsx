"use client";

import { useState } from "react";
import { Search, Eye, Package, MapPin, Truck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shipment,
  ShipmentStatus,
  ShippingCarrier,
  DestinationCountry,
} from "@/types/shipment";
import { getCountryName } from "@/utils/country-names";

interface ShipmentTableProps {
  shipments: Shipment[];
}

export function ShipmentTable({ shipments }: ShipmentTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "all">(
    "all"
  );
  const [carrierFilter, setCarrierFilter] = useState<ShippingCarrier | "all">(
    "all"
  );
  const [destinationFilter, setDestinationFilter] = useState<
    DestinationCountry | "all"
  >("all");
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null
  );

  const filteredShipments = shipments.filter((shipment) => {
    const countryName = getCountryName(shipment.destination);
    const matchesSearch =
      shipment.shipment_id.toString().includes(searchTerm) ||
      shipment.customer_id.toString().includes(searchTerm) ||
      countryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.origin.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || shipment.status === statusFilter;
    const matchesCarrier =
      carrierFilter === "all" || shipment.carrier === carrierFilter;
    const matchesDestination =
      destinationFilter === "all" || shipment.destination === destinationFilter;

    return (
      matchesSearch && matchesStatus && matchesCarrier && matchesDestination
    );
  });

  const getStatusBadge = (status: ShipmentStatus) => {
    const variants = {
      delivered: "default",
      intransit: "secondary",
      received: "outline",
    } as const;

    const labels = {
      delivered: "DELIVERED",
      intransit: "IN TRANSIT",
      received: "RECEIVED",
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getModeBadge = (mode: string) => {
    return (
      <Badge variant={mode === "air" ? "default" : "secondary"}>
        {mode.toUpperCase()}
      </Badge>
    );
  };

  const calculateDeliveryStatus = (shipment: Shipment) => {
    if (shipment.status !== "delivered" || !shipment.delivered_date)
      return null;

    const arrivalDate = new Date(shipment.arrival_date);
    const deliveredDate = new Date(shipment.delivered_date);
    const isOnTime = deliveredDate <= arrivalDate;

    return isOnTime ? "On Time" : "Delayed";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Shipment Management
        </CardTitle>
        <CardDescription>
          Search, filter, and manage all shipments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shipments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as ShipmentStatus | "all")
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="intransit">In Transit</SelectItem>
              <SelectItem value="received">Received</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={carrierFilter}
            onValueChange={(value) =>
              setCarrierFilter(value as ShippingCarrier | "all")
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by carrier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Carriers</SelectItem>
              <SelectItem value="FEDEX">FedEx</SelectItem>
              <SelectItem value="UPS">UPS</SelectItem>
              <SelectItem value="DHL">DHL</SelectItem>
              <SelectItem value="USPS">USPS</SelectItem>
              <SelectItem value="AMAZON">Amazon</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={destinationFilter}
            onValueChange={(value) =>
              setDestinationFilter(value as DestinationCountry | "all")
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by destination" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Destinations</SelectItem>
              <SelectItem value="GUY">Guyana</SelectItem>
              <SelectItem value="SVG">
                Saint Vincent and the Grenadines
              </SelectItem>
              <SelectItem value="SLU">Saint Lucia</SelectItem>
              <SelectItem value="BIM">Barbados</SelectItem>
              <SelectItem value="DOM">Dominican Republic</SelectItem>
              <SelectItem value="GRD">Grenada</SelectItem>
              <SelectItem value="SKN">Saint Kitts and Nevis</SelectItem>
              <SelectItem value="ANU">Antigua and Barbuda</SelectItem>
              <SelectItem value="SXM">Sint Maarten</SelectItem>
              <SelectItem value="FSXM">French Saint Martin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredShipments.length} of {shipments.length} shipments
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Customer ID</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.map((shipment) => (
                <TableRow key={shipment.shipment_id}>
                  <TableCell className="font-medium">
                    #{shipment.shipment_id}
                  </TableCell>
                  <TableCell>{shipment.customer_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {shipment.carrier}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {getCountryName(shipment.destination)}
                    </div>
                  </TableCell>
                  <TableCell>{getModeBadge(shipment.mode)}</TableCell>
                  <TableCell>{getStatusBadge(shipment.status)}</TableCell>
                  <TableCell>{shipment.weight}kg</TableCell>
                  <TableCell>{shipment.volume}m³</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          className="hover:cursor-pointer "
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedShipment(shipment)}
                        >
                          <Eye className="h-4 w-4" />
                          <p>View Details</p>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            Shipment Details - #{shipment.shipment_id}
                          </DialogTitle>
                          <DialogDescription>
                            Complete information for this shipment
                          </DialogDescription>
                        </DialogHeader>
                        {selectedShipment && (
                          <div className="grid gap-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">
                                  Shipment ID
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  #{selectedShipment.shipment_id}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Customer ID
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {selectedShipment.customer_id}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Carrier
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {selectedShipment.carrier}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Mode
                                </label>
                                <div className="mt-1">
                                  {getModeBadge(selectedShipment.mode)}
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Status
                                </label>
                                <div className="mt-1">
                                  {getStatusBadge(selectedShipment.status)}
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Delivery Status
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {calculateDeliveryStatus(selectedShipment) ||
                                    "N/A"}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Weight
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {selectedShipment.weight} kg
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Volume
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {selectedShipment.volume} m³
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Arrival Date
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {selectedShipment.arrival_date}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Departure Date
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {selectedShipment.departure_date || "Not set"}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Delivered Date
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {selectedShipment.delivered_date ||
                                    "Not delivered"}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <label className="text-sm font-medium">
                                  Origin
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {selectedShipment.origin}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Destination
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {getCountryName(selectedShipment.destination)}{" "}
                                  ({selectedShipment.destination})
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
