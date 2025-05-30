"use client";

import { useState } from "react";
import { Package2, Download, MapPin } from "lucide-react";
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
import { ShippingCarrier, ShippingMode, Shipment } from "@/types/shipment";
import { getCountryName } from "@/utils/country-names";

interface ConsolidationGroup {
  id: string;
  destination: string;
  carrier: ShippingCarrier;
  mode: ShippingMode;
  shipments: Shipment[];
  totalWeight: number;
  totalVolume: number;
  potentialSavings: number;
}

interface ConsolidationRecommendationsProps {
  shipments: Shipment[];
}

export function ConsolidationRecommendations({
  shipments,
}: ConsolidationRecommendationsProps) {
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [carrierFilter, setCarrierFilter] = useState<ShippingCarrier | "all">(
    "all"
  );
  const [modeFilter, setModeFilter] = useState<ShippingMode | "all">("all");

  // Group shipments by destination, carrier, and mode for consolidation opportunities
  const consolidationGroups: ConsolidationGroup[] = [];
  const groupMap = new Map<string, Shipment[]>();

  shipments.forEach((shipment) => {
    const key = `${shipment.destination}-${shipment.carrier}-${shipment.mode}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(shipment);
  });

  groupMap.forEach((groupShipments, key) => {
    if (groupShipments.length > 1) {
      // Only groups with multiple shipments
      const [destination, carrier, mode] = key.split("-");
      const totalWeight = groupShipments.reduce((sum, s) => sum + s.weight, 0);
      const totalVolume = groupShipments.reduce((sum, s) => sum + s.volume, 0);
      const potentialSavings = Math.round(groupShipments.length * 75 * 0.15); // Estimated 15% savings

      consolidationGroups.push({
        id: key,
        destination: getCountryName(destination as any),
        carrier: carrier as ShippingCarrier,
        mode: mode as ShippingMode,
        shipments: groupShipments,
        totalWeight,
        totalVolume,
        potentialSavings,
      });
    }
  });

  const filteredGroups = consolidationGroups.filter((group) => {
    const matchesCarrier =
      carrierFilter === "all" || group.carrier === carrierFilter;
    const matchesMode = modeFilter === "all" || group.mode === modeFilter;
    return matchesCarrier && matchesMode;
  });

  const handleGroupSelection = (groupId: string, checked: boolean) => {
    if (checked) {
      setSelectedGroups([...selectedGroups, groupId]);
    } else {
      setSelectedGroups(selectedGroups.filter((id) => id !== groupId));
    }
  };

  const generateConsolidationCSV = () => {
    const selectedGroupData = filteredGroups.filter((group) =>
      selectedGroups.includes(group.id)
    );

    const csvData = selectedGroupData.flatMap((group) =>
      group.shipments.map((shipment) => ({
        shipment_id: shipment.shipment_id,
        customer_id: shipment.customer_id,
        origin: shipment.origin,
        destination: shipment.destination,
        weight: shipment.weight,
        volume: shipment.volume,
        carrier: shipment.carrier,
        mode: shipment.mode,
        status: shipment.status,
        arrival_date: shipment.arrival_date,
        departure_date: shipment.departure_date || "",
        delivered_date: shipment.delivered_date || "",
        consolidation_group: group.id,
        potential_savings: group.potentialSavings,
      }))
    );

    const csvContent = [
      Object.keys(csvData[0] || {}).join(","),
      ...csvData.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "consolidation-recommendations.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalPotentialSavings = filteredGroups
    .filter((group) => selectedGroups.includes(group.id))
    .reduce((sum, group) => sum + group.potentialSavings, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package2 className="h-5 w-5" />
          Consolidation Recommendations
        </CardTitle>
        <CardDescription>
          Identify opportunities to consolidate shipments and reduce costs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-4">
            <Select
              value={carrierFilter}
              onValueChange={(value) =>
                setCarrierFilter(value as ShippingCarrier | "all")
              }
            >
              <SelectTrigger className="w-[180px]">
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
              value={modeFilter}
              onValueChange={(value) =>
                setModeFilter(value as ShippingMode | "all")
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="air">Air</SelectItem>
                <SelectItem value="sea">Sea</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={generateConsolidationCSV}
              disabled={selectedGroups.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Selected ({selectedGroups.length})
            </Button>
          </div>
        </div>

        {/* Summary */}
        {selectedGroups.length > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-medium text-green-800">
              Consolidation Summary
            </h3>
            <p className="text-sm text-green-700">
              Selected {selectedGroups.length} consolidation groups with
              potential savings of ${totalPotentialSavings}
            </p>
          </div>
        )}

        {/* Consolidation Groups Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Shipments</TableHead>
                <TableHead>Total Weight</TableHead>
                <TableHead>Total Volume</TableHead>
                <TableHead>Potential Savings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedGroups.includes(group.id)}
                      onCheckedChange={(checked) =>
                        handleGroupSelection(group.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {group.destination}
                    </div>
                  </TableCell>
                  <TableCell>{group.carrier}</TableCell>
                  <TableCell>
                    <Badge
                      variant={group.mode === "air" ? "default" : "secondary"}
                    >
                      {group.mode.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {group.shipments.length} shipments
                    </Badge>
                  </TableCell>
                  <TableCell>{group.totalWeight.toFixed(1)} kg</TableCell>
                  <TableCell>{group.totalVolume.toFixed(2)} m³</TableCell>
                  <TableCell className="text-green-600 font-medium">
                    ${group.potentialSavings}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredGroups.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No consolidation opportunities found with current filters.</p>
            <p className="text-sm">
              Try adjusting your filters or add more shipment data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
