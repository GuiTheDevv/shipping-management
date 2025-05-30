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
2. Create a new table in the database with the following columns (see file db-structure.txt):

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

3. Create the functions in Supabase (see file functions.json)

### Design Decisions

1. **Technology Stack**

- **Next.js**: Chosen for its server-side rendering capabilities, API routes, and React integration
- **Supabase**: Provides PostgreSQL database, authentication, and real-time capabilities
- **shadcn/ui**: Component library for consistent, accessible UI elements
- **Recharts**: Flexible charting library for data visualization
- **TypeScript**: For type safety and better developer experience

2. **Architecture**

- **Server-Side Processing**: Heavy data processing is done in PostgreSQL functions to reduce client-side load
- **API-First Design**: All data access is through API endpoints for security and flexibility
- **Component Modularity**: Each feature is encapsulated in its own component for maintainability
- **Responsive Design**: Mobile-first approach ensures usability across devices

3. **Performance Optimizations**

- **Pagination**: Server-side pagination for large datasets
- **Memoization**: React's useMemo and useCallback to prevent unnecessary re-renders
- **Database Indexing**: Strategic indexes on frequently queried columns
- **Data Transformation**: Data is transformed at the API level to minimize client-side processing

4. **User Experience**

- **Loading States**: Skeleton loaders and progress indicators for better feedback
- **Error Handling**: Comprehensive error states with helpful messages
- **Filtering & Sorting**: Intuitive controls for data exploration
- **Responsive Layout**: Adapts to different screen sizes for mobile and desktop use

### Trade-offs

1. **Data Storage vs. Processing Speed**:

- We store weight in grams and volume in cm³ for precision
- This requires conversion for display (to kg and m³) but enables more accurate calculations

2. **Server vs. Client Processing**:

- Heavy data processing is done in PostgreSQL functions
- This increases database load but reduces client-side processing and network transfer

3. **Real-time Updates vs. Performance**:

- Manual refresh button instead of real-time updates
- This improves performance but requires user action to see the latest data

4. **Feature Richness vs. Simplicity**:

- Focus on core logistics features over general-purpose tools
- This makes the app more specialized but less flexible for non-logistics use cases

### Assumptions

1. **Data Volume**:

- The system is designed to handle thousands of shipments
- Pagination and server-side processing support this scale

2. **Warehouse Capacity**:

- Fixed warehouse capacity of 60 billion cm³ (60,000 m³)
- This can be adjusted via environment variables

3. **Consolidation Savings**:

- Estimated savings of $50 per consolidated shipment
- This is configurable in the consolidation API

4. **On-time Delivery**:

- Defined as delivery within 2 weeks (14 days) of departure date
- This definition can be adjusted in the SQL functions

5. **User Roles**:

- Current implementation assumes a single user role with full access
- Future versions could implement role-based access control
