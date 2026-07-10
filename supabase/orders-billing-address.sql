-- Run in Supabase SQL editor to store delivery and billing addresses on orders.
alter table public.orders
  add column if not exists billing_same_as_delivery boolean default true,
  add column if not exists billing_name text,
  add column if not exists billing_address text,
  add column if not exists billing_city text,
  add column if not exists billing_state text,
  add column if not exists billing_pincode text;
