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
2. Create a new table in the database with the following columns (see file db-structure.json):

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


3. Create the functions in Supabase (see File functions.json)

### Design Decisions


### Trade-offs and Assumpions



