# shipping-management

Freight Forwarding Shipment Management take-home assessment

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Design Decisions](#design-decisions)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Trade-offs & Assumptions](#trade-offs--assumptions)

## Features

- **Interactive Dashboard**: Real-time metrics and KPIs for shipment operations
- **Data Visualization**: Charts for carrier performance, warehouse utilization, and more
- **Shipment Management**: Searchable, filterable table with pagination
- **Consolidation Recommendations**: AI-powered suggestions to reduce shipping costs
- **CSV Import/Export**: Bulk data operations for seamless workflow integration
- **Warehouse Tracking**: Monitor capacity utilization and optimize storage

## Getting Started

### Prerequisites

- Node.js
- Supabase account (for database)

### Installation

1. Clone the repository
2. cd/shipping-management (change directory to the project folder)
3. npm install --legacy-peer-deps (intall all dependencies safely)

### Environment Variables

1. Create a `.env.local` file in the root directory with the following variables:
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

### Database Schema

1. Create a new database in Supabase
2. Create a new table in the database with the following columns:

- shipment_id: integer, primary key
- customer_id: integer
- origin: string
- destination: string
- weight: float
- volume: float
- carrier: string
- mode: string
- status: string
- arrival_date: string
- departure_date: string
- delivered_date: string

```SQL
    
```

3. Create the functions in Supabase:

```JSON
[
  {
    "function_name": "get_carrier_performance_fixed",
    "arguments": "date_from date DEFAULT NULL::date, date_to date DEFAULT NULL::date",
    "return_type": "record",
    "full_definition": "CREATE OR REPLACE FUNCTION public.get_carrier_performance_fixed(date_from date DEFAULT NULL::date, date_to date DEFAULT NULL::date)\n RETURNS TABLE(carrier text, arrival_date date, shipment_count bigint, total_volume_cm3 bigint, total_weight_g bigint, total_shipments bigint, delivered_shipments bigint, avg_delivery_time numeric, on_time_delivery_rate numeric, air_shipments bigint, sea_shipments bigint)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  WITH carrier_daily AS (\r\n    SELECT \r\n      s.carrier::TEXT,\r\n      s.arrival_date,\r\n      -- Count only RECEIVED shipments per day per carrier\r\n      COUNT(CASE WHEN s.status = 'received' THEN 1 END)::BIGINT as daily_received_count,\r\n      COALESCE(SUM(CASE WHEN s.status = 'received' THEN s.volume ELSE 0 END), 0)::BIGINT as daily_vol_cm3,\r\n      COALESCE(SUM(CASE WHEN s.status = 'received' THEN s.weight ELSE 0 END), 0)::BIGINT as daily_wt_g\r\n    FROM shipments s\r\n    -- NO DATE FILTERING - ALL DATA\r\n    GROUP BY s.carrier, s.arrival_date\r\n    -- Only include days where there were received shipments\r\n    HAVING COUNT(CASE WHEN s.status = 'received' THEN 1 END) > 0\r\n  ),\r\n  carrier_totals AS (\r\n    SELECT \r\n      s.carrier::TEXT,\r\n      COUNT(*)::BIGINT as total_count,\r\n      COUNT(CASE WHEN s.status = 'delivered' THEN 1 END)::BIGINT as delivered_count,\r\n      -- Average delivery time from departure to delivery\r\n      AVG(\r\n        CASE \r\n          WHEN s.status = 'delivered' AND s.delivered_date IS NOT NULL AND s.departure_date IS NOT NULL\r\n          THEN (s.delivered_date - s.departure_date)\r\n        END\r\n      )::NUMERIC as avg_del_time,\r\n      -- Count delivered shipments with both dates for proper denominator\r\n      COUNT(CASE WHEN s.status = 'delivered' AND s.departure_date IS NOT NULL AND s.delivered_date IS NOT NULL THEN 1 END)::BIGINT as delivered_with_dates_count,\r\n      -- ON-TIME: delivered within 14 days (2 weeks) of departure\r\n      COUNT(CASE WHEN s.status = 'delivered' AND s.departure_date IS NOT NULL AND s.delivered_date IS NOT NULL AND (s.delivered_date - s.departure_date) <= 14 THEN 1 END)::BIGINT as on_time_count,\r\n      COALESCE(SUM(s.volume), 0)::BIGINT as total_vol_cm3,\r\n      COALESCE(SUM(s.weight), 0)::BIGINT as total_wt_g,\r\n      COUNT(CASE WHEN s.mode = 'air' THEN 1 END)::BIGINT as air_count,\r\n      COUNT(CASE WHEN s.mode = 'sea' THEN 1 END)::BIGINT as sea_count\r\n    FROM shipments s\r\n    -- NO DATE FILTERING - ALL DATA\r\n    GROUP BY s.carrier\r\n  )\r\n  SELECT \r\n    cd.carrier,\r\n    cd.arrival_date,\r\n    cd.daily_received_count, -- This is the key change - only received shipments\r\n    cd.daily_vol_cm3,\r\n    cd.daily_wt_g,\r\n    ct.total_count,\r\n    ct.delivered_count,\r\n    ct.avg_del_time,\r\n    -- Use delivered_with_dates_count as denominator for accurate percentage\r\n    CASE WHEN ct.delivered_with_dates_count > 0 THEN (ct.on_time_count::NUMERIC / ct.delivered_with_dates_count * 100) ELSE 0 END,\r\n    ct.air_count,\r\n    ct.sea_count\r\n  FROM carrier_daily cd\r\n  JOIN carrier_totals ct ON cd.carrier = ct.carrier\r\n  ORDER BY cd.arrival_date, cd.carrier;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_consolidation_group_details",
    "arguments": "group_destination text, group_departure_date date, group_carrier text, group_mode text",
    "return_type": "record",
    "full_definition": "CREATE OR REPLACE FUNCTION public.get_consolidation_group_details(group_destination text, group_departure_date date, group_carrier text, group_mode text)\n RETURNS TABLE(shipment_id bigint, customer_id bigint, origin text, weight_g bigint, volume_cm3 bigint, status text, arrival_date date, delivered_date date)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT \r\n    s.shipment_id,\r\n    s.customer_id,\r\n    s.origin,\r\n    s.weight,\r\n    s.volume,\r\n    s.status,\r\n    s.arrival_date,\r\n    s.delivered_date\r\n  FROM shipments s\r\n  WHERE s.destination = group_destination\r\n    AND s.departure_date = group_departure_date\r\n    AND s.carrier = group_carrier\r\n    AND s.mode = group_mode\r\n    AND s.status != 'delivered'  -- Include both 'received' and 'intransit' by excluding only 'delivered'\r\n  ORDER BY s.shipment_id;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_consolidation_groups",
    "arguments": "carrier_filter text DEFAULT 'all'::text, mode_filter text DEFAULT 'all'::text, destination_filter text DEFAULT 'all'::text, min_group_size integer DEFAULT 2",
    "return_type": "record",
    "full_definition": "CREATE OR REPLACE FUNCTION public.get_consolidation_groups(carrier_filter text DEFAULT 'all'::text, mode_filter text DEFAULT 'all'::text, destination_filter text DEFAULT 'all'::text, min_group_size integer DEFAULT 2)\n RETURNS TABLE(group_id text, destination text, departure_date date, carrier text, mode text, shipment_count bigint, total_weight_g bigint, total_volume_cm3 bigint, potential_savings_usd numeric, avg_weight_per_shipment_g numeric, avg_volume_per_shipment_cm3 numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  WITH filtered_shipments AS (\r\n    SELECT \r\n      s.shipment_id,\r\n      s.destination,\r\n      s.departure_date,\r\n      s.carrier,\r\n      s.mode,\r\n      s.weight,\r\n      s.volume,\r\n      s.customer_id,\r\n      s.origin,\r\n      s.status,\r\n      s.arrival_date,\r\n      s.delivered_date\r\n    FROM shipments s\r\n    WHERE s.departure_date IS NOT NULL\r\n      AND s.status != 'delivered'  -- Exclude delivered shipments\r\n      AND (carrier_filter = 'all' OR s.carrier = carrier_filter)\r\n      AND (mode_filter = 'all' OR s.mode = mode_filter)\r\n      AND (destination_filter = 'all' OR s.destination = destination_filter)\r\n  ),\r\n  consolidation_groups AS (\r\n    SELECT \r\n      CONCAT(fs.destination, '-', fs.departure_date, '-', fs.carrier, '-', fs.mode) as cons_group_id,\r\n      fs.destination as cons_destination,\r\n      fs.departure_date as cons_departure_date,\r\n      fs.carrier as cons_carrier,\r\n      fs.mode as cons_mode,\r\n      COUNT(*)::BIGINT as cons_shipment_count,\r\n      COALESCE(SUM(fs.weight), 0)::BIGINT as cons_total_weight_g,\r\n      COALESCE(SUM(fs.volume), 0)::BIGINT as cons_total_volume_cm3,\r\n      -- Calculate potential savings: $50 per shipment that can be consolidated\r\n      ((COUNT(*) - 1) * 50)::NUMERIC as cons_potential_savings,\r\n      CASE WHEN COUNT(*) > 0 THEN (COALESCE(SUM(fs.weight), 0)::NUMERIC / COUNT(*)) ELSE 0 END as cons_avg_weight,\r\n      CASE WHEN COUNT(*) > 0 THEN (COALESCE(SUM(fs.volume), 0)::NUMERIC / COUNT(*)) ELSE 0 END as cons_avg_volume\r\n    FROM filtered_shipments fs\r\n    GROUP BY fs.destination, fs.departure_date, fs.carrier, fs.mode\r\n    HAVING COUNT(*) >= min_group_size\r\n  )\r\n  SELECT \r\n    cg.cons_group_id,\r\n    cg.cons_destination,\r\n    cg.cons_departure_date,\r\n    cg.cons_carrier,\r\n    cg.cons_mode,\r\n    cg.cons_shipment_count,\r\n    cg.cons_total_weight_g,\r\n    cg.cons_total_volume_cm3,\r\n    cg.cons_potential_savings,\r\n    cg.cons_avg_weight,\r\n    cg.cons_avg_volume\r\n  FROM consolidation_groups cg\r\n  ORDER BY cg.cons_potential_savings DESC, cg.cons_shipment_count DESC;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_consolidation_groups_count",
    "arguments": "carrier_filter text DEFAULT 'all'::text, mode_filter text DEFAULT 'all'::text, destination_filter text DEFAULT 'all'::text, min_group_size integer DEFAULT 2",
    "return_type": "int8",
    "full_definition": "CREATE OR REPLACE FUNCTION public.get_consolidation_groups_count(carrier_filter text DEFAULT 'all'::text, mode_filter text DEFAULT 'all'::text, destination_filter text DEFAULT 'all'::text, min_group_size integer DEFAULT 2)\n RETURNS bigint\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN (\r\n    SELECT COUNT(*)::BIGINT\r\n    FROM (\r\n      SELECT \r\n        s.destination,\r\n        s.departure_date,\r\n        s.carrier,\r\n        s.mode,\r\n        COUNT(*) as shipment_count\r\n      FROM shipments s\r\n      WHERE s.status != 'delivered'\r\n        AND s.departure_date IS NOT NULL\r\n        AND (carrier_filter = 'all' OR s.carrier = carrier_filter)\r\n        AND (mode_filter = 'all' OR s.mode = mode_filter)\r\n        AND (destination_filter = 'all' OR s.destination = destination_filter)\r\n      GROUP BY s.destination, s.departure_date, s.carrier, s.mode\r\n      HAVING COUNT(*) >= min_group_size\r\n    ) grouped_shipments\r\n  );\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_consolidation_groups_paginated",
    "arguments": "carrier_filter text DEFAULT 'all'::text, mode_filter text DEFAULT 'all'::text, destination_filter text DEFAULT 'all'::text, min_group_size integer DEFAULT 2, page_offset integer DEFAULT 0, page_limit integer DEFAULT 25",
    "return_type": "record",
    "full_definition": "CREATE OR REPLACE FUNCTION public.get_consolidation_groups_paginated(carrier_filter text DEFAULT 'all'::text, mode_filter text DEFAULT 'all'::text, destination_filter text DEFAULT 'all'::text, min_group_size integer DEFAULT 2, page_offset integer DEFAULT 0, page_limit integer DEFAULT 25)\n RETURNS TABLE(group_id text, destination text, departure_date date, carrier text, mode text, shipment_count bigint, total_weight_g bigint, total_volume_cm3 bigint, potential_savings_usd numeric, avg_weight_per_shipment_g numeric, avg_volume_per_shipment_cm3 numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  WITH consolidation_groups AS (\r\n    SELECT \r\n      s.destination as dest,\r\n      s.departure_date as dep_date,\r\n      s.carrier as carr,\r\n      s.mode as md,\r\n      COUNT(*)::BIGINT as ship_count,\r\n      COALESCE(SUM(s.weight), 0)::BIGINT as total_wt_g,\r\n      COALESCE(SUM(s.volume), 0)::BIGINT as total_vol_cm3,\r\n      (COUNT(*) * 50)::NUMERIC as savings_usd,\r\n      CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(s.weight), 0)::NUMERIC / COUNT(*) ELSE 0 END as avg_wt_g,\r\n      CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(s.volume), 0)::NUMERIC / COUNT(*) ELSE 0 END as avg_vol_cm3\r\n    FROM shipments s\r\n    WHERE s.status != 'delivered'\r\n      AND s.departure_date IS NOT NULL\r\n      AND (carrier_filter = 'all' OR s.carrier = carrier_filter)\r\n      AND (mode_filter = 'all' OR s.mode = mode_filter)\r\n      AND (destination_filter = 'all' OR s.destination = destination_filter)\r\n    GROUP BY s.destination, s.departure_date, s.carrier, s.mode\r\n    HAVING COUNT(*) >= min_group_size\r\n  )\r\n  SELECT \r\n    (cg.dest || '-' || cg.dep_date || '-' || cg.carr || '-' || cg.md)::TEXT,\r\n    cg.dest::TEXT,\r\n    cg.dep_date,\r\n    cg.carr::TEXT,\r\n    cg.md::TEXT,\r\n    cg.ship_count,\r\n    cg.total_wt_g,\r\n    cg.total_vol_cm3,\r\n    cg.savings_usd,\r\n    cg.avg_wt_g,\r\n    cg.avg_vol_cm3\r\n  FROM consolidation_groups cg\r\n  ORDER BY cg.savings_usd DESC, cg.ship_count DESC\r\n  OFFSET page_offset\r\n  LIMIT page_limit;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_consolidation_summary",
    "arguments": "carrier_filter text DEFAULT 'all'::text, mode_filter text DEFAULT 'all'::text, destination_filter text DEFAULT 'all'::text",
    "return_type": "record",
    "full_definition": "CREATE OR REPLACE FUNCTION public.get_consolidation_summary(carrier_filter text DEFAULT 'all'::text, mode_filter text DEFAULT 'all'::text, destination_filter text DEFAULT 'all'::text)\n RETURNS TABLE(total_consolidation_groups bigint, total_consolidatable_shipments bigint, total_potential_savings_usd numeric, avg_shipments_per_group numeric, top_destination text, top_carrier text, top_mode text)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  WITH consolidation_data AS (\r\n    SELECT \r\n      group_id,\r\n      destination,\r\n      carrier,\r\n      mode,\r\n      shipment_count,\r\n      potential_savings_usd\r\n    FROM get_consolidation_groups(carrier_filter, mode_filter, destination_filter, 2)\r\n    -- Note: The get_consolidation_groups function already excludes delivered shipments\r\n  ),\r\n  summary_stats AS (\r\n    SELECT \r\n      COUNT(*)::BIGINT as total_groups,\r\n      COALESCE(SUM(cd.shipment_count), 0)::BIGINT as total_shipments,\r\n      COALESCE(SUM(cd.potential_savings_usd), 0)::NUMERIC as total_savings,\r\n      CASE WHEN COUNT(*) > 0 THEN (COALESCE(SUM(cd.shipment_count), 0)::NUMERIC / COUNT(*)) ELSE 0 END as avg_shipments\r\n    FROM consolidation_data cd\r\n  ),\r\n  top_destination AS (\r\n    SELECT cd.destination\r\n    FROM consolidation_data cd\r\n    GROUP BY cd.destination\r\n    ORDER BY COUNT(*) DESC, SUM(cd.potential_savings_usd) DESC\r\n    LIMIT 1\r\n  ),\r\n  top_carrier AS (\r\n    SELECT cd.carrier\r\n    FROM consolidation_data cd\r\n    GROUP BY cd.carrier\r\n    ORDER BY COUNT(*) DESC, SUM(cd.potential_savings_usd) DESC\r\n    LIMIT 1\r\n  ),\r\n  top_mode AS (\r\n    SELECT cd.mode\r\n    FROM consolidation_data cd\r\n    GROUP BY cd.mode\r\n    ORDER BY COUNT(*) DESC, SUM(cd.potential_savings_usd) DESC\r\n    LIMIT 1\r\n  )\r\n  SELECT \r\n    ss.total_groups,\r\n    ss.total_shipments,\r\n    ss.total_savings,\r\n    ss.avg_shipments,\r\n    COALESCE(td.destination, 'N/A'),\r\n    COALESCE(tc.carrier, 'N/A'),\r\n    COALESCE(tm.mode, 'N/A')\r\n  FROM summary_stats ss\r\n  CROSS JOIN top_destination td\r\n  CROSS JOIN top_carrier tc\r\n  CROSS JOIN top_mode tm;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_dashboard_metrics_fixed",
    "arguments": "date_from date DEFAULT NULL::date, date_to date DEFAULT NULL::date",
    "return_type": "record",
    "full_definition": "CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_fixed(date_from date DEFAULT NULL::date, date_to date DEFAULT NULL::date)\n RETURNS TABLE(total_shipments bigint, delivered_shipments bigint, intransit_shipments bigint, received_shipments bigint, total_volume_cm3 bigint, total_weight_g bigint, avg_volume_per_shipment_cm3 numeric, avg_weight_per_shipment_g numeric, delivery_rate numeric, on_time_delivery_rate numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  WITH shipment_stats AS (\r\n    SELECT \r\n      COUNT(*)::BIGINT as total_count,\r\n      COUNT(CASE WHEN s.status = 'delivered' THEN 1 END)::BIGINT as delivered_count,\r\n      COUNT(CASE WHEN s.status = 'intransit' THEN 1 END)::BIGINT as intransit_count,\r\n      COUNT(CASE WHEN s.status = 'received' THEN 1 END)::BIGINT as received_count,\r\n      COALESCE(SUM(s.volume), 0)::BIGINT as total_vol_cm3,\r\n      COALESCE(SUM(s.weight), 0)::BIGINT as total_wt_g,\r\n      -- Count delivered shipments with both dates for proper denominator\r\n      COUNT(CASE WHEN s.status = 'delivered' AND s.departure_date IS NOT NULL AND s.delivered_date IS NOT NULL THEN 1 END)::BIGINT as delivered_with_dates_count,\r\n      -- ON-TIME: delivered within 14 days (2 weeks) of departure\r\n      COUNT(CASE WHEN s.status = 'delivered' AND s.departure_date IS NOT NULL AND s.delivered_date IS NOT NULL AND (s.delivered_date - s.departure_date) <= 14 THEN 1 END)::BIGINT as on_time_count\r\n    FROM shipments s\r\n    -- NO DATE FILTERING - ALL DATA\r\n  )\r\n  SELECT \r\n    ss.total_count,\r\n    ss.delivered_count,\r\n    ss.intransit_count,\r\n    ss.received_count,\r\n    ss.total_vol_cm3,\r\n    ss.total_wt_g,\r\n    CASE WHEN ss.total_count > 0 THEN ss.total_vol_cm3::NUMERIC / ss.total_count ELSE 0 END,\r\n    CASE WHEN ss.total_count > 0 THEN ss.total_wt_g::NUMERIC / ss.total_count ELSE 0 END,\r\n    CASE WHEN ss.total_count > 0 THEN (ss.delivered_count::NUMERIC / ss.total_count * 100) ELSE 0 END,\r\n    -- Use delivered_with_dates_count as denominator for accurate percentage\r\n    CASE WHEN ss.delivered_with_dates_count > 0 THEN (ss.on_time_count::NUMERIC / ss.delivered_with_dates_count * 100) ELSE 0 END\r\n  FROM shipment_stats ss;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_destination_distribution_fixed",
    "arguments": "date_from date DEFAULT NULL::date, date_to date DEFAULT NULL::date",
    "return_type": "record",
    "full_definition": "CREATE OR REPLACE FUNCTION public.get_destination_distribution_fixed(date_from date DEFAULT NULL::date, date_to date DEFAULT NULL::date)\n RETURNS TABLE(destination text, shipment_count bigint, percentage numeric, total_volume_cm3 bigint, total_weight_g bigint, avg_delivery_time numeric)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  WITH destination_stats AS (\r\n    SELECT \r\n      s.destination::TEXT,\r\n      COUNT(*)::BIGINT as dest_count,\r\n      COALESCE(SUM(s.volume), 0)::BIGINT as dest_vol_cm3,\r\n      COALESCE(SUM(s.weight), 0)::BIGINT as dest_wt_g,\r\n      -- Average delivery time from departure to delivery\r\n      AVG(\r\n        CASE \r\n          WHEN s.status = 'delivered' AND s.delivered_date IS NOT NULL AND s.departure_date IS NOT NULL\r\n          THEN (s.delivered_date - s.departure_date)\r\n        END\r\n      )::NUMERIC as avg_del_time\r\n    FROM shipments s\r\n    -- NO DATE FILTERING - ALL DATA\r\n    GROUP BY s.destination\r\n  ),\r\n  total_shipments AS (\r\n    SELECT COUNT(*)::BIGINT as total_count\r\n    FROM shipments s\r\n    -- NO DATE FILTERING - ALL DATA\r\n  )\r\n  SELECT \r\n    ds.destination,\r\n    ds.dest_count,\r\n    CASE WHEN ts.total_count > 0 THEN (ds.dest_count::NUMERIC / ts.total_count * 100) ELSE 0 END,\r\n    ds.dest_vol_cm3,\r\n    ds.dest_wt_g,\r\n    ds.avg_del_time\r\n  FROM destination_stats ds\r\n  CROSS JOIN total_shipments ts\r\n  ORDER BY ds.dest_count DESC;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_mode_distribution_fixed",
    "arguments": "date_from date DEFAULT NULL::date, date_to date DEFAULT NULL::date",
    "return_type": "record",
    "full_definition": "CREATE OR REPLACE FUNCTION public.get_mode_distribution_fixed(date_from date DEFAULT NULL::date, date_to date DEFAULT NULL::date)\n RETURNS TABLE(mode text, shipment_count bigint, percentage numeric, total_volume_cm3 bigint, total_weight_g bigint)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  WITH mode_stats AS (\r\n    SELECT \r\n      s.mode::TEXT,\r\n      COUNT(*)::BIGINT as mode_count,\r\n      -- Focus on VOLUME by mode as requested\r\n      COALESCE(SUM(s.volume), 0)::BIGINT as mode_vol_cm3,\r\n      COALESCE(SUM(s.weight), 0)::BIGINT as mode_wt_g\r\n    FROM shipments s\r\n    -- NO DATE FILTERING - ALL DATA\r\n    WHERE s.mode IS NOT NULL -- Ensure we have mode data\r\n    GROUP BY s.mode\r\n  ),\r\n  total_shipments AS (\r\n    SELECT \r\n      COUNT(*)::BIGINT as total_count,\r\n      COALESCE(SUM(volume), 0)::BIGINT as total_volume\r\n    FROM shipments s\r\n    WHERE s.mode IS NOT NULL -- Match the filtering above\r\n  )\r\n  SELECT \r\n    ms.mode,\r\n    ms.mode_count,\r\n    -- Calculate percentage based on volume, not just count\r\n    CASE WHEN ts.total_volume > 0 THEN (ms.mode_vol_cm3::NUMERIC / ts.total_volume * 100) ELSE 0 END,\r\n    ms.mode_vol_cm3,\r\n    ms.mode_wt_g\r\n  FROM mode_stats ms\r\n  CROSS JOIN total_shipments ts\r\n  ORDER BY ms.mode_vol_cm3 DESC; -- Order by volume, not count\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_warehouse_capacity_timeline_fixed",
    "arguments": "date_from date DEFAULT NULL::date, date_to date DEFAULT NULL::date",
    "return_type": "record",
    "full_definition": "CREATE OR REPLACE FUNCTION public.get_warehouse_capacity_timeline_fixed(date_from date DEFAULT NULL::date, date_to date DEFAULT NULL::date)\n RETURNS TABLE(date date, packages_received bigint, volume_received_cm3 bigint, cumulative_packages bigint, cumulative_volume_cm3 bigint)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  WITH daily_data AS (\r\n    SELECT \r\n      s.arrival_date as rec_date,\r\n      COUNT(*)::BIGINT as daily_packages,\r\n      COALESCE(SUM(s.volume), 0)::BIGINT as daily_vol_cm3\r\n    FROM shipments s\r\n    -- NO DATE FILTERING - ALL DATA\r\n    GROUP BY s.arrival_date\r\n  ),\r\n  date_range AS (\r\n    SELECT \r\n      MIN(s.arrival_date) as min_date,\r\n      MAX(s.arrival_date) as max_date\r\n    FROM shipments s\r\n  ),\r\n  date_series AS (\r\n    SELECT generate_series(dr.min_date, dr.max_date, '1 day'::interval)::DATE as series_date\r\n    FROM date_range dr\r\n  )\r\n  SELECT \r\n    ds.series_date,\r\n    COALESCE(dd.daily_packages, 0)::BIGINT,\r\n    COALESCE(dd.daily_vol_cm3, 0)::BIGINT,\r\n    SUM(COALESCE(dd.daily_packages, 0)) OVER (ORDER BY ds.series_date)::BIGINT,\r\n    SUM(COALESCE(dd.daily_vol_cm3, 0)) OVER (ORDER BY ds.series_date)::BIGINT\r\n  FROM date_series ds\r\n  LEFT JOIN daily_data dd ON ds.series_date = dd.rec_date\r\n  ORDER BY ds.series_date;\r\nEND;\r\n$function$\n"
  },
  {
    "function_name": "get_warehouse_utilization_fixed",
    "arguments": "",
    "return_type": "record",
    "full_definition": "CREATE OR REPLACE FUNCTION public.get_warehouse_utilization_fixed()\n RETURNS TABLE(warehouse_name text, total_volume_cm3 bigint, shipment_count bigint, capacity_volume_cm3 bigint, utilization_percentage numeric, available_volume_cm3 bigint)\n LANGUAGE plpgsql\nAS $function$BEGIN\r\n  RETURN QUERY\r\n  WITH warehouse_stats AS (\r\n    SELECT \r\n      'Main Warehouse'::TEXT as wh_name,\r\n      COALESCE(SUM(s.volume), 0)::BIGINT as used_vol_cm3,\r\n      COUNT(s.shipment_id)::BIGINT as ship_count,\r\n      60000000000::BIGINT as capacity_cm3\r\n    FROM shipments s\r\n    WHERE s.status IN ('received')\r\n  )\r\n  SELECT \r\n    ws.wh_name,\r\n    ws.used_vol_cm3,\r\n    ws.ship_count,\r\n    ws.capacity_cm3,\r\n    CASE WHEN ws.capacity_cm3 > 0 THEN (ws.used_vol_cm3::NUMERIC / ws.capacity_cm3 * 100) ELSE 0 END,\r\n    (ws.capacity_cm3 - ws.used_vol_cm3)::BIGINT\r\n  FROM warehouse_stats ws;\r\nEND;$function$\n"
  },
  {
    "function_name": "truncate_shipments",
    "arguments": "",
    "return_type": "void",
    "full_definition": "CREATE OR REPLACE FUNCTION public.truncate_shipments()\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nbegin\r\n  truncate table shipments;\r\nend;\r\n$function$\n"
  }
]
```




