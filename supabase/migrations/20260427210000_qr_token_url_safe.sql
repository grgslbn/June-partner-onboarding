-- Standardise qr_token default to URL-safe base64 (no +, /, or = padding).
-- Standard base64 requires percent-encoding in URLs and looks ugly in print.
-- Existing tokens are NOT migrated — they're already in live URLs and tests.
-- All new tokens (DB-default or client-generated) will use this format.

alter table public.shops
  alter column qr_token
    set default replace(
      replace(
        replace(
          encode(extensions.gen_random_bytes(9), 'base64'),
          '+', '-'
        ),
        '/', '_'
      ),
      '=', ''
    );
