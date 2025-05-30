import type { DestinationCountry } from "@/types/shipment";

export const countryNames: Record<DestinationCountry, string> = {
  GUY: "Guyana",
  SVG: "Saint Vincent and the Grenadines",
  SLU: "Saint Lucia",
  BIM: "Barbados",
  DOM: "Dominican Republic",
  GRD: "Grenada",
  SKN: "Saint Kitts and Nevis",
  ANU: "Antigua and Barbuda",
  SXM: "Sint Maarten",
  FSXM: "French Saint Martin",
};

export const getCountryName = (code: DestinationCountry): string => {
  return countryNames[code] || code;
};
