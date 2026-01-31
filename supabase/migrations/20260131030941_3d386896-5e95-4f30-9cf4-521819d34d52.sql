-- Add selected_product_id column to user_supplements
-- This allows linking a user's supplement entry to a specific product (with brand info)

ALTER TABLE user_supplements
ADD COLUMN selected_product_id UUID REFERENCES supplement_products(id);