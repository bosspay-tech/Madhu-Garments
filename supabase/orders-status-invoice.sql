-- Run in Supabase SQL editor to store order status and invoice status on orders.
alter table public.orders
  add column if not exists order_status text default 'pending',
  add column if not exists invoice_status text default 'draft';
