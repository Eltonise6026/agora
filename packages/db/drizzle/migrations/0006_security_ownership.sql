ALTER TABLE carts ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE checkouts ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_carts_owner ON carts(owner_id);
CREATE INDEX idx_checkouts_owner ON checkouts(owner_id);
CREATE INDEX idx_orders_owner ON orders(owner_id);

ALTER TABLE stores ADD COLUMN owner_id TEXT;
ALTER TABLE webhooks ADD COLUMN owner_id TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_stores_owner ON stores(owner_id);
CREATE INDEX idx_webhooks_owner ON webhooks(owner_id);
