insert into
  public.roles (id, name)
values
  (
    '1c404b13-1705-485a-99c7-68c6f5b69a03',
    'super-admin'
  ) on conflict (id) do nothing;

insert into
  public.roles (id, name)
values
  ('fed22552-1609-4e3d-a3ac-09a50eb1ac54', 'admin') on conflict (id) do nothing;

insert into
  public.roles (id, name)
values
  ('686c928b-034c-4858-862c-9ccb32226c2f', 'driver') on conflict (id) do nothing;

-- Seed static lookup tables
insert into
  public.platforms (name)
values
  ('Mr. D'),
  ('Uber Eats'),
  ('Woolies Dash'),
  ('Takealot'),
  ('Checkers 60Sixty'),
  ('Delivery Extreme'),
  ('Direct for Restaurant'),
  ('Other') on conflict (name) do nothing;

insert into
  public.provinces (name)
values
  ('Gauteng'),
  ('KwaZulu-Natal'),
  ('Western Cape'),
  ('Eastern Cape'),
  ('Other') on conflict (name) do nothing;

insert into
  public.bike_ownership_types (name)
values
  ('Rent'),
  ('Own'),
  ('Rent to Own') on conflict (name) do nothing;

-- Document types for driver uploads
insert into
  public.document_types (name)
values
  ('Driver''s Licence'),
  ('Licence Disc'),
  ('ID Proof'),
  ('Banking Proof'),
  ('Top Box Photo') on conflict (name) do nothing;

insert into
  public.years_driving_options (label)
values
  ('Less than 1 year'),
  ('1 - 2 years'),
  ('2 - 3 years'),
  ('More than 3 years') on conflict (label) do nothing;

insert into
  public.days_per_week_options (value)
values
  (0),
  (1),
  (2),
  (3),
  (4),
  (5),
  (6),
  (7) on conflict (value) do nothing;

-- cities seeded with province linkage
insert into
  public.cities (name, province_id)
select
  'Ballito',
  p.id
from
  public.provinces p
where
  p.name = 'KwaZulu-Natal' on conflict (name, province_id) do nothing;

insert into
  public.cities (name, province_id)
select
  'Cape Town',
  p.id
from
  public.provinces p
where
  p.name = 'Western Cape' on conflict (name, province_id) do nothing;

insert into
  public.cities (name, province_id)
select
  'Durban',
  p.id
from
  public.provinces p
where
  p.name = 'KwaZulu-Natal' on conflict (name, province_id) do nothing;

insert into
  public.cities (name, province_id)
select
  'Gqeberha (PE)',
  p.id
from
  public.provinces p
where
  p.name = 'Eastern Cape' on conflict (name, province_id) do nothing;

insert into
  public.cities (name, province_id)
select
  'Johannesburg',
  p.id
from
  public.provinces p
where
  p.name = 'Gauteng' on conflict (name, province_id) do nothing;

insert into
  public.cities (name, province_id)
select
  'Pretoria',
  p.id
from
  public.provinces p
where
  p.name = 'Gauteng' on conflict (name, province_id) do nothing;

insert into
  public.cities (name, province_id)
select
  'Other',
  p.id
from
  public.provinces p
where
  p.name = 'Other' on conflict (name, province_id) do nothing;

-- Seed suburbs (mapped to existing cities)
with
  cities_map as (
    select
      *
    from
      (
        values
          ('Claremont', 'WC-CLM', 'Cape Town'),
          ('Rondebosch', 'WC-RDB', 'Cape Town'),
          ('Sea Point', 'WC-SP', 'Cape Town'),
          ('Stellenbosch', 'WC-STB', 'Cape Town'),
          ('Bellville', 'WC-BLV', 'Cape Town'),
          -- Durban suburbs
          ('Umhlanga', 'KZN-UMH', 'Durban'),
          ('Berea', 'KZN-BER', 'Durban'),
          ('Westville', 'KZN-WVL', 'Durban'),
          ('Pinetown', 'KZN-PNT', 'Durban'),
          ('Chatsworth', 'KZN-CHT', 'Durban'),
          -- Johannesburg suburbs
          ('Sandton', 'GP-SND', 'Johannesburg'),
          ('Soweto', 'GP-SWT', 'Johannesburg'),
          ('Randburg', 'GP-RDB', 'Johannesburg'),
          ('Rosebank', 'GP-RSB', 'Johannesburg'),
          ('Midrand', 'GP-MDR', 'Johannesburg'),
          ('Hatfield', 'GP-HTF', 'Pretoria'),
          ('Brooklyn', 'GP-BKN', 'Pretoria'),
          ('Menlyn', 'GP-MNL', 'Pretoria'),
          ('Centurion', 'GP-CNT', 'Pretoria'),
          ('Arcadia', 'GP-ARC', 'Pretoria'),
          -- Gqeberha (PE) suburbs
          ('Summerstrand', 'EC-SMS', 'Gqeberha (PE)'),
          ('Walmer', 'EC-WLM', 'Gqeberha (PE)'),
          ('Newton Park', 'EC-NWP', 'Gqeberha (PE)'),
          ('Central', 'EC-CBD', 'Gqeberha (PE)'),
          ('Humewood', 'EC-HMD', 'Gqeberha (PE)'),
          -- Ballito suburbs
          ('Salt Rock', 'KZN-SLR', 'Ballito'),
          ('Shaka’s Rock', 'KZN-SKR', 'Ballito'),
          ('Zimbali', 'KZN-ZMB', 'Ballito'),
          ('Ballito Central', 'KZN-BLC', 'Ballito'),
          ('Compensation Beach', 'KZN-CMB', 'Ballito')
      ) as t (name, code, cities_name)
  )
insert into
  public.suburbs (name, code, city_id)
select
  cm.name,
  cm.code,
  c.id
from
  cities_map cm
  join public.cities c on c.name = cm.cities_name on conflict (name) do nothing;

insert into
  public.inspector_options (name)
values
  ('Name'),
  ('Email Address'),
  ('Motion ID') on conflict (name) do nothing;

insert into
  public.motion_support (phone_number)
values
  ('+27823626215') on conflict (phone_number) do nothing;