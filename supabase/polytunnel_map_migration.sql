-- Tilføjer kortplacering til polytunnels, samme mønster som beds/bed_sections
alter table polytunnels
  add column if not exists center_lat numeric,
  add column if not exists center_lng numeric,
  add column if not exists orientation_degrees numeric default 0;
