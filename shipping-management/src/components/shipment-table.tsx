"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Eye,
  Package,
  MapPin,
  Truck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import { getCountryName } from "@/utils/country-names";

type ShipmentStatus = "received" | "intransit" | "delivered";
type ShippingCarrier = "FEDEX" | "DHL" | "USPS" | "UPS" | "AMAZON";
type DestinationCountry =
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

interface Shipment {
  shipment_id: number;
  customer_id: number;
  origin: string | null;
  destination: DestinationCountry;
  weight: number;
  volume: number;
  carrier: ShippingCarrier;
  mode: "air" | "sea";
  status: ShipmentStatus;
  arrival_date: string | null;
  departure_date?: string | null;
  delivered_date?: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function ShipmentTable() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);
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

  const fetchShipments = async (page = 1, customLimit?: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: (customLimit || pagination.limit).toString(),
      });

      if (statusFilter !== "all") params.append("status", statusFilter);
      if (carrierFilter !== "all") params.append("carrier", carrierFilter);
      if (destinationFilter !== "all")
        params.append("destination", destinationFilter);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const response = await fetch(`/api/shipments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch shipments");

      const data = await response.json();
      setShipments(data.shipments);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch shipments when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchShipments(1); // Reset to page 1 when filters change
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, carrierFilter, destinationFilter]);

  // Initial load
  useEffect(() => {
    fetchShipments();
  }, []);

  const handlePageChange = (newPage: number) => {
    fetchShipments(newPage);
  };

  const handlePageSizeChange = (newLimit: string) => {
    const newLimitNumber = Number.parseInt(newLimit);
    setPagination((prev) => ({ ...prev, limit: newLimitNumber, page: 1 }));

    // Use the new limit value directly in the API call
    const params = new URLSearchParams({
      page: "1",
      limit: newLimitNumber.toString(),
    });

    if (statusFilter !== "all") params.append("status", statusFilter);
    if (carrierFilter !== "all") params.append("carrier", carrierFilter);
    if (destinationFilter !== "all")
      params.append("destination", destinationFilter);
    if (searchTerm.trim()) params.append("search", searchTerm.trim());

    setLoading(true);
    fetch(`/api/shipments?${params}`)
      .then((response) => response.json())
      .then((data) => {
        setShipments(data.shipments);
        setPagination(data.pagination);
      })
      .catch((error) => {
        console.error("Error fetching shipments:", error);
        setShipments([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

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
    if (
      shipment.status !== "delivered" ||
      !shipment.delivered_date ||
      !shipment.departure_date
    )
      return null;

    const departureDate = new Date(shipment.departure_date);
    const deliveredDate = new Date(shipment.delivered_date);
    const daysDiff = Math.ceil(
      (deliveredDate.getTime() - departureDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return daysDiff <= 14 ? "On Time" : "Delayed";
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

        {/* Results info and page size selector */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} shipments
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={pagination.limit.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading shipments...
                  </TableCell>
                </TableRow>
              ) : shipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No shipments found
                  </TableCell>
                </TableRow>
              ) : (
                shipments.map((shipment) => (
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
                    <TableCell>
                      {(shipment.weight / 1000).toFixed(1)}kg
                    </TableCell>
                    <TableCell>
                      {(shipment.volume / 1000000).toFixed(2)}m³
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedShipment(shipment)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
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
                                    {calculateDeliveryStatus(
                                      selectedShipment
                                    ) || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Weight
                                  </label>
                                  <p className="text-sm text-muted-foreground">
                                    {(selectedShipment.weight / 1000).toFixed(
                                      1
                                    )}{" "}
                                    kg
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Volume
                                  </label>
                                  <p className="text-sm text-muted-foreground">
                                    {(
                                      selectedShipment.volume / 1000000
                                    ).toFixed(2)}{" "}
                                    m³
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Arrival Date
                                  </label>
                                  <p className="text-sm text-muted-foreground">
                                    {selectedShipment.arrival_date || "Not set"}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Departure Date
                                  </label>
                                  <p className="text-sm text-muted-foreground">
                                    {selectedShipment.departure_date ||
                                      "Not set"}
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
                                    {selectedShipment.origin || "Not specified"}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">
                                    Destination
                                  </label>
                                  <p className="text-sm text-muted-foreground">
                                    {getCountryName(
                                      selectedShipment.destination
                                    )}{" "}
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
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
