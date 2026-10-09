-- Migration: 20261002000008_courier_tracking.sql
-- Description: Add courier tracking fields to orders table

ALTER TABLE public.orders
ADD COLUMN courier_name TEXT,
ADD COLUMN tracking_number TEXT,
ADD COLUMN tracking_url TEXT;
