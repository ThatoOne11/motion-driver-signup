select
  admin.bootstrap_create_driver (
    'auth.uid', -- auth user id
    'Driver Name', -- display name
    'driver@example.com', -- email
    '0712345678' -- phone number (unique)
  );