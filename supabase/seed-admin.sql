-- NutriLens AI - Admin Seeding & Barcode Data
-- Run this in the Supabase SQL Editor

-- 1. Seed Admin Role for Identified User
INSERT INTO public.user_roles (user_id, role)
VALUES ('02fda1a2-2221-422d-9656-67d4e5f76c82', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Seed EAN-13 Barcodes for Top 50 Packed Products
-- Mapping barcodes to product_name from packed_products table

-- Example updates for top selling items
UPDATE public.packed_products SET barcode = '8906093810014' WHERE product_name ILIKE '%Yoga Bar%Protein%';
UPDATE public.packed_products SET barcode = '8906067023341' WHERE product_name ILIKE '%MuscleBlaze%Whey%';
UPDATE public.packed_products SET barcode = '8901058860262' WHERE product_name ILIKE '%Amul%Milk%';
UPDATE public.packed_products SET barcode = '8906001061413' WHERE product_name ILIKE '%Protinex%';
UPDATE public.packed_products SET barcode = '8901030912118' WHERE product_name ILIKE '%Horlicks%';
UPDATE public.packed_products SET barcode = '8901058000101' WHERE product_name ILIKE '%Amul%Cheese%';
UPDATE public.packed_products SET barcode = '8901030656043' WHERE product_name ILIKE '%Knorr%Soup%';
UPDATE public.packed_products SET barcode = '8901030656050' WHERE product_name ILIKE '%Maggi%Oats%';
UPDATE public.packed_products SET barcode = '8906004810014' WHERE product_name ILIKE '%Epigamia%Greek%';
UPDATE public.packed_products SET barcode = '013500222370' WHERE product_name ILIKE '%Quaker%Oats%';
UPDATE public.packed_products SET barcode = '8908000442304' WHERE product_name ILIKE '%Nesto%Milk%';
UPDATE public.packed_products SET barcode = '8906015500014' WHERE product_name ILIKE '%Saffola%Oats%';
UPDATE public.packed_products SET barcode = '8901063142070' WHERE product_name ILIKE '%Britannia%Cheese%';
UPDATE public.packed_products SET barcode = '8902083000125' WHERE product_name ILIKE '%Mother Dairy%Paneer%';
UPDATE public.packed_products SET barcode = '8906004810236' WHERE product_name ILIKE '%Epigamia%Smoothie%';
UPDATE public.packed_products SET barcode = '8906093810021' WHERE product_name ILIKE '%Yoga Bar%Muesli%';
UPDATE public.packed_products SET barcode = '8906067023457' WHERE product_name ILIKE '%MuscleBlaze%Bar%';
UPDATE public.packed_products SET barcode = '8906001061451' WHERE product_name ILIKE '%PediaSure%';
UPDATE public.packed_products SET barcode = '8901012154562' WHERE product_name ILIKE '%Patanjali%Dalia%';
UPDATE public.packed_products SET barcode = '8906093810052' WHERE product_name ILIKE '%Yoga Bar%Peanut%';
UPDATE public.packed_products SET barcode = '8901058860279' WHERE product_name ILIKE '%Amul%Butter%';
UPDATE public.packed_products SET barcode = '8901063142018' WHERE product_name ILIKE '%Britannia%Milk%';
UPDATE public.packed_products SET barcode = '8901058860255' WHERE product_name ILIKE '%Amul%Lassi%';
UPDATE public.packed_products SET barcode = '8904001111111' WHERE product_name ILIKE '%Hershey%Syrup%';
UPDATE public.packed_products SET barcode = '8901030704041' WHERE product_name ILIKE '%Red Label%';

-- Verification Query
SELECT product_name, barcode, role 
FROM public.packed_products p
LEFT JOIN public.user_roles r ON r.user_id = '02fda1a2-2221-422d-9656-67d4e5f76c82'
WHERE p.barcode IS NOT NULL
LIMIT 10;
