"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package2,
  Download,
  MapPin,
  Calendar,
  Truck,
  RefreshCw,
  Eye,
  X,
  AlertCircle,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCountryName } from "@/utils/country-names";
import { DestinationCountry } from "@/types/shipment";

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

export function ConsolidationRecommendations() {
  // State
  const [consolidationGroups, setConsolidationGroups] = useState<
    ConsolidationGroup[]
  >([]);
  const [summary, setSummary] = useState<ConsolidationSummary | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 25,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [carrierFilter, setCarrierFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [destinationFilter, setDestinationFilter] = useState<string>("all");
  const [selectedGroupForDialog, setSelectedGroupForDialog] =
    useState<ConsolidationGroup | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Simple notification system
  const showNotification = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 5000);
    },
    []
  );

  // Fetch consolidation data with pagination
  const fetchConsolidationData = useCallback(
    async (page = 1, itemsPerPage = pagination.itemsPerPage) => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();

        params.append("page", page.toString());
        params.append("limit", itemsPerPage.toString());

        if (carrierFilter !== "all") params.append("carrier", carrierFilter);
        if (modeFilter !== "all") params.append("mode", modeFilter);
        if (destinationFilter !== "all")
          params.append("destination", destinationFilter);

        const response = await fetch(
          `/api/shipments/consolidation?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch consolidation data: ${response.status}`
          );
        }

        const data = await response.json();
        setConsolidationGroups(data.consolidationGroups || []);
        setSummary(data.summary || null);

        // Update pagination info
        setPagination((prev) => ({
          ...prev,
          currentPage: data.pagination?.currentPage || 1,
          totalPages: data.pagination?.totalPages || 1,
          totalItems: data.pagination?.totalItems || 0,
          itemsPerPage: itemsPerPage,
          hasNextPage: data.pagination?.hasNextPage || false,
          hasPreviousPage: data.pagination?.hasPreviousPage || false,
        }));

        // Clear selections when changing pages/filters
        setSelectedGroups([]);
      } catch (error) {
        console.error("Error fetching consolidation data:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load consolidation data"
        );
        setConsolidationGroups([]);
      } finally {
        setLoading(false);
      }
    },
    [carrierFilter, modeFilter, destinationFilter]
  );

  // Fetch detailed shipments for a specific group
  const fetchGroupDetails = useCallback(
    async (group: ConsolidationGroup) => {
      try {
        setDialogLoading(true);
        const params = new URLSearchParams({
          includeDetails: "true",
          carrier: group.carrier,
          mode: group.mode,
          destination: group.destination,
        });

        const response = await fetch(
          `/api/shipments/consolidation?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch group details");
        }

        const data = await response.json();
        const detailedGroup = data.consolidationGroups?.find(
          (g: ConsolidationGroup) => g.id === group.id
        );

        if (detailedGroup?.shipments) {
          // Update the group with detailed shipment information
          setConsolidationGroups((prev) =>
            prev.map((g) =>
              g.id === group.id
                ? { ...g, shipments: detailedGroup.shipments }
                : g
            )
          );
          return detailedGroup;
        }
        return null;
      } catch (error) {
        console.error("Error fetching group details:", error);
        showNotification("Failed to load shipment details", "error");
        return null;
      } finally {
        setDialogLoading(false);
      }
    },
    [showNotification]
  );

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchConsolidationData(1);

    // Count active filters
    let count = 0;
    if (carrierFilter !== "all") count++;
    if (modeFilter !== "all") count++;
    if (destinationFilter !== "all") count++;
    setActiveFilters(count);
  }, [carrierFilter, modeFilter, destinationFilter, fetchConsolidationData]);

  // Handle pagination
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= pagination.totalPages) {
        fetchConsolidationData(newPage);
      }
    },
    [fetchConsolidationData, pagination.totalPages]
  );

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (newPageSize: string) => {
      const newSize = Number.parseInt(newPageSize);
      setPagination((prev) => ({
        ...prev,
        itemsPerPage: newSize,
        currentPage: 1,
      }));
      fetchConsolidationData(1, newSize);
    },
    [fetchConsolidationData]
  );

  // Handle group selection
  const handleGroupSelection = useCallback(
    (groupId: string, checked: boolean) => {
      setSelectedGroups((prev) => {
        if (checked) {
          return [...prev, groupId];
        } else {
          return prev.filter((id) => id !== groupId);
        }
      });
    },
    []
  );

  // Handle select all groups (current page only)
  const handleSelectAll = useCallback(() => {
    if (selectedGroups.length === consolidationGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(consolidationGroups.map((group) => group.id));
    }
  }, [consolidationGroups, selectedGroups.length]);

  // Handle view group dialog
  const handleViewGroupDialog = useCallback(
    async (group: ConsolidationGroup) => {
      // Fetch details if not already loaded
      if (!group.shipments) {
        const detailedGroup = await fetchGroupDetails(group);
        if (detailedGroup) {
          setSelectedGroupForDialog(detailedGroup);
        } else {
          setSelectedGroupForDialog(group);
        }
      } else {
        setSelectedGroupForDialog(group);
      }
    },
    [fetchGroupDetails]
  );

  // Generate CSV export
  const generateConsolidationCSV = useCallback(() => {
    const selectedGroupData = consolidationGroups.filter((group) =>
      selectedGroups.includes(group.id)
    );

    // Check if we need to fetch details first
    const needsDetails = selectedGroupData.some((group) => !group.shipments);

    if (needsDetails) {
      showNotification(
        "Preparing export... Fetching shipment details for selected groups."
      );

      // Fetch all missing details
      Promise.all(
        selectedGroupData
          .filter((group) => !group.shipments)
          .map((group) => fetchGroupDetails(group))
      ).then(() => {
        // Now generate CSV with updated data
        const updatedGroups = consolidationGroups.filter((group) =>
          selectedGroups.includes(group.id)
        );
        generateCSV(updatedGroups);
      });
    } else {
      // Generate CSV immediately
      generateCSV(selectedGroupData);
    }
  }, [
    consolidationGroups,
    selectedGroups,
    fetchGroupDetails,
    showNotification,
  ]);

  // Helper function to generate and download CSV
  const generateCSV = useCallback(
    (groups: ConsolidationGroup[]) => {
      const csvData = groups.flatMap(
        (group) =>
          group.shipments?.map((shipment) => ({
            shipment_id: shipment.shipment_id,
            customer_id: shipment.customer_id,
            origin: shipment.origin,
            destination: group.destination,
            weight_kg: shipment.weight.toFixed(3),
            volume_m3: shipment.volume.toFixed(6),
            carrier: group.carrier,
            mode: group.mode,
            status: shipment.status,
            arrival_date: shipment.arrival_date,
            departure_date: group.departureDate,
            delivered_date: shipment.delivered_date || "",
            consolidation_group_id: group.id,
            consolidation_departure_date: group.departureDate,
            potential_savings_usd: group.potentialSavings,
            group_shipment_count: group.shipmentCount,
            group_total_weight_kg: group.totalWeight.toFixed(3),
            group_total_volume_m3: group.totalVolume.toFixed(6),
          })) || []
      );

      if (csvData.length === 0) {
        showNotification(
          "No data to export. Please select consolidation groups first.",
          "error"
        );
        return;
      }

      const csvContent = [
        Object.keys(csvData[0]).join(","),
        ...csvData.map((row) => Object.values(row).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `consolidation-recommendations-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      showNotification(
        `Exported ${csvData.length} shipments from ${groups.length} consolidation groups.`
      );
    },
    [showNotification]
  );

  // Status badge helper
  const getStatusBadge = useCallback((status: string) => {
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

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {labels[status as keyof typeof labels] || status.toUpperCase()}
      </Badge>
    );
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setCarrierFilter("all");
    setModeFilter("all");
    setDestinationFilter("all");
  }, []);

  // Memoized calculations
  const totalPotentialSavings = useMemo(
    () =>
      consolidationGroups
        .filter((group) => selectedGroups.includes(group.id))
        .reduce((sum, group) => sum + group.potentialSavings, 0),
    [consolidationGroups, selectedGroups]
  );

  const totalShipments = useMemo(
    () =>
      consolidationGroups
        .filter((group) => selectedGroups.includes(group.id))
        .reduce((sum, group) => sum + group.shipmentCount, 0),
    [consolidationGroups, selectedGroups]
  );

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package2 className="h-5 w-5" />
          Consolidation Recommendations
        </CardTitle>
        <CardDescription>
          Group shipments by destination and departure date to reduce shipping
          costs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification */}
        {notification && (
          <Alert
            variant={notification.type === "error" ? "destructive" : "default"}
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )}

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-4 flex-wrap">
            <Select
              value={destinationFilter}
              onValueChange={setDestinationFilter}
            >
              <SelectTrigger className="w-[180px] cursor-pointer">
                <SelectValue placeholder="Filter by destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">
                  All Destinations
                </SelectItem>
                <SelectItem value="GUY" className="cursor-pointer">
                  Guyana
                </SelectItem>
                <SelectItem value="SVG" className="cursor-pointer">
                  Saint Vincent and the Grenadines
                </SelectItem>
                <SelectItem value="SLU" className="cursor-pointer">
                  Saint Lucia
                </SelectItem>
                <SelectItem value="BIM" className="cursor-pointer">
                  Barbados
                </SelectItem>
                <SelectItem value="DOM" className="cursor-pointer">
                  Dominican Republic
                </SelectItem>
                <SelectItem value="GRD" className="cursor-pointer">
                  Grenada
                </SelectItem>
                <SelectItem value="SKN" className="cursor-pointer">
                  Saint Kitts and Nevis
                </SelectItem>
                <SelectItem value="ANU" className="cursor-pointer">
                  Antigua and Barbuda
                </SelectItem>
                <SelectItem value="SXM" className="cursor-pointer">
                  Sint Maarten
                </SelectItem>
                <SelectItem value="FSXM" className="cursor-pointer">
                  French Saint Martin
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={carrierFilter} onValueChange={setCarrierFilter}>
              <SelectTrigger className="w-[180px] cursor-pointer">
                <SelectValue placeholder="Filter by carrier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">
                  All Carriers
                </SelectItem>
                <SelectItem value="FEDEX" className="cursor-pointer">
                  FedEx
                </SelectItem>
                <SelectItem value="UPS" className="cursor-pointer">
                  UPS
                </SelectItem>
                <SelectItem value="DHL" className="cursor-pointer">
                  DHL
                </SelectItem>
                <SelectItem value="USPS" className="cursor-pointer">
                  USPS
                </SelectItem>
                <SelectItem value="AMAZON" className="cursor-pointer">
                  Amazon
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="w-[180px] cursor-pointer">
                <SelectValue placeholder="Filter by mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">
                  All Modes
                </SelectItem>
                <SelectItem value="air" className="cursor-pointer">
                  Air
                </SelectItem>
                <SelectItem value="sea" className="cursor-pointer">
                  Sea
                </SelectItem>
              </SelectContent>
            </Select>
            {activeFilters > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3 w-3" />
                Clear Filters ({activeFilters})
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchConsolidationData(pagination.currentPage)}
              disabled={loading}
              className="cursor-pointer"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={generateConsolidationCSV}
              disabled={selectedGroups.length === 0}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Export Selected ({selectedGroups.length})
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm text-muted-foreground">
                Total Groups
              </span>
              <div className="text-2xl font-bold">{summary.totalGroups}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                Total Shipments
              </span>
              <div className="text-2xl font-bold">{summary.totalShipments}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                Potential Savings
              </span>
              <div className="text-2xl font-bold text-green-600">
                ${summary.totalPotentialSavings}
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                Avg. Group Size
              </span>
              <div className="text-2xl font-bold">
                {summary.avgShipmentsPerGroup.toFixed(1)}
              </div>
            </div>
          </div>
        )}

        {/* Selection Summary */}
        {selectedGroups.length > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-medium text-green-800">
              Consolidation Summary
            </h3>
            <p className="text-sm text-green-700">
              Selected {selectedGroups.length} consolidation groups with{" "}
              {totalShipments} shipments and potential savings of $
              {totalPotentialSavings}
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <Select
              value={pagination.itemsPerPage.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-[80px] cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10" className="cursor-pointer">
                  10
                </SelectItem>
                <SelectItem value="25" className="cursor-pointer">
                  25
                </SelectItem>
                <SelectItem value="50" className="cursor-pointer">
                  50
                </SelectItem>
                <SelectItem value="100" className="cursor-pointer">
                  100
                </SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing{" "}
              {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{" "}
              {Math.min(
                pagination.currentPage * pagination.itemsPerPage,
                pagination.totalItems
              )}{" "}
              of {pagination.totalItems} results
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage || loading}
              className="cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm font-medium">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage || loading}
              className="cursor-pointer"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading consolidation opportunities...</span>
            </div>
            <div className="space-y-2">
              {Array.from({ length: pagination.itemsPerPage }, (_, i) => (
                <div
                  key={i}
                  className="flex gap-4 items-center p-4 border rounded-md"
                >
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[60px]" />
                  <Skeleton className="h-4 w-[40px]" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Consolidation Groups Table */
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        consolidationGroups.length > 0 &&
                        selectedGroups.length === consolidationGroups.length
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all groups"
                      className="translate-y-[2px] cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Departure Date</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Shipments</TableHead>
                  <TableHead>Total Weight</TableHead>
                  <TableHead>Total Volume</TableHead>
                  <TableHead>Potential Savings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consolidationGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Package2 className="h-8 w-8 mb-2 opacity-50" />
                        <p>No consolidation opportunities found</p>
                        <p className="text-sm">
                          {activeFilters > 0
                            ? "Try adjusting or clearing your filters"
                            : "Consolidation requires 2+ shipments with the same destination and departure date"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  consolidationGroups.map((group) => (
                    <TableRow
                      key={group.id}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedGroups.includes(group.id)}
                          onCheckedChange={(checked) =>
                            handleGroupSelection(group.id, checked as boolean)
                          }
                          aria-label={`Select group ${group.id}`}
                          className="cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {getCountryName(
                              group.destination as DestinationCountry
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {new Date(group.departureDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-500" />
                          {group.carrier}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            group.mode === "air" ? "default" : "secondary"
                          }
                        >
                          {group.mode.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {group.shipmentCount} shipments
                        </Badge>
                      </TableCell>
                      <TableCell>{group.totalWeight.toFixed(1)} kg</TableCell>
                      <TableCell>{group.totalVolume.toFixed(3)} m³</TableCell>
                      <TableCell className="font-medium text-green-600">
                        ${group.potentialSavings}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewGroupDialog(group)}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Consolidation Group Details
                              </DialogTitle>
                              <DialogDescription>
                                {getCountryName(
                                  group.destination as DestinationCountry
                                )}{" "}
                                -{" "}
                                {new Date(
                                  group.departureDate
                                ).toLocaleDateString()}{" "}
                                - {group.carrier} ({group.mode.toUpperCase()})
                              </DialogDescription>
                            </DialogHeader>
                            {dialogLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                                <span>Loading shipment details...</span>
                              </div>
                            ) : (
                              selectedGroupForDialog?.shipments && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                                    <div>
                                      <span className="text-sm font-medium">
                                        Total Shipments:
                                      </span>
                                      <div className="text-lg font-bold">
                                        {selectedGroupForDialog.shipmentCount}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium">
                                        Total Weight:
                                      </span>
                                      <div className="text-lg font-bold">
                                        {selectedGroupForDialog.totalWeight.toFixed(
                                          1
                                        )}{" "}
                                        kg
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium">
                                        Total Volume:
                                      </span>
                                      <div className="text-lg font-bold">
                                        {selectedGroupForDialog.totalVolume.toFixed(
                                          3
                                        )}{" "}
                                        m³
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-sm font-medium">
                                        Potential Savings:
                                      </span>
                                      <div className="text-lg font-bold text-green-600">
                                        $
                                        {
                                          selectedGroupForDialog.potentialSavings
                                        }
                                      </div>
                                    </div>
                                  </div>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Shipment ID</TableHead>
                                        <TableHead>Customer ID</TableHead>
                                        <TableHead>Origin</TableHead>
                                        <TableHead>Weight</TableHead>
                                        <TableHead>Volume</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Arrival Date</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {selectedGroupForDialog.shipments.map(
                                        (shipment) => (
                                          <TableRow key={shipment.shipment_id}>
                                            <TableCell className="font-medium">
                                              #{shipment.shipment_id}
                                            </TableCell>
                                            <TableCell>
                                              {shipment.customer_id}
                                            </TableCell>
                                            <TableCell>
                                              {shipment.origin}
                                            </TableCell>
                                            <TableCell>
                                              {shipment.weight.toFixed(2)} kg
                                            </TableCell>
                                            <TableCell>
                                              {shipment.volume.toFixed(4)} m³
                                            </TableCell>
                                            <TableCell>
                                              {getStatusBadge(shipment.status)}
                                            </TableCell>
                                            <TableCell>
                                              {new Date(
                                                shipment.arrival_date
                                              ).toLocaleDateString()}
                                            </TableCell>
                                          </TableRow>
                                        )
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              )
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
        )}
      </CardContent>
    </Card>
  );
}
