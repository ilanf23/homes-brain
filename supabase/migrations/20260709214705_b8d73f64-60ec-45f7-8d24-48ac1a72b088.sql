
-- 1. trades catalog
CREATE TABLE IF NOT EXISTS public.trades (
  id text PRIMARY KEY,
  label text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trades TO anon, authenticated;
GRANT ALL ON public.trades TO service_role;

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trades public read" ON public.trades;
CREATE POLICY "trades public read" ON public.trades FOR SELECT USING (true);

-- 2. trade_fields config
CREATE TABLE IF NOT EXISTS public.trade_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id text NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  input_type text NOT NULL CHECK (input_type IN ('text','number','select','date','toggle')),
  options jsonb,
  unit text,
  required boolean NOT NULL DEFAULT false,
  help text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (trade_id, key)
);

GRANT SELECT ON public.trade_fields TO anon, authenticated;
GRANT ALL ON public.trade_fields TO service_role;

ALTER TABLE public.trade_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trade_fields public read" ON public.trade_fields;
CREATE POLICY "trade_fields public read" ON public.trade_fields FOR SELECT USING (true);

-- 3. equipment.attributes
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4. seed trades
INSERT INTO public.trades (id, label, sort_order) VALUES
  ('hvac','HVAC',10),
  ('plumbing','Plumbing',20),
  ('water_treatment','Water treatment',30),
  ('electrical','Electrical',40),
  ('appliance','Appliance repair',50),
  ('roofing','Roofing',60),
  ('pool_spa','Pool & spa',70),
  ('solar','Solar',80),
  ('generator','Generator',90),
  ('septic','Septic',100),
  ('irrigation','Irrigation',110),
  ('garage_door','Garage door',120),
  ('pest_control','Pest control',130),
  ('security','Security & smart home',140)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, active = true;

-- 5. seed trade_fields
INSERT INTO public.trade_fields (trade_id, key, label, input_type, options, unit, required, sort_order) VALUES
-- HVAC
('hvac','system_type','System type','select','["Furnace","Central AC","Heat pump","Mini-split","Boiler","Package unit"]'::jsonb,NULL,true,10),
('hvac','fuel','Fuel','select','["Gas","Electric","Oil","Propane","Dual-fuel"]'::jsonb,NULL,false,20),
('hvac','tonnage','Cooling capacity','number',NULL,'tons',false,30),
('hvac','btu','Heating capacity','number',NULL,'BTU/h',false,40),
('hvac','efficiency','Efficiency (SEER2/AFUE)','text',NULL,NULL,false,50),
('hvac','refrigerant','Refrigerant','select','["R-410A","R-454B","R-32","R-22"]'::jsonb,NULL,false,60),
('hvac','filter_size','Filter size','text',NULL,NULL,false,70),
('hvac','filter_merv','Filter MERV','number',NULL,NULL,false,80),
('hvac','next_service','Next service due','date',NULL,NULL,false,90),
-- Plumbing
('plumbing','fixture_type','Type','select','["Water heater","Tankless heater","Sump pump","Well pump","Repipe","Fixture","Backflow"]'::jsonb,NULL,true,10),
('plumbing','wh_style','Water-heater style','select','["Tank","Tankless"]'::jsonb,NULL,false,20),
('plumbing','fuel','Fuel','select','["Gas","Electric","Propane"]'::jsonb,NULL,false,30),
('plumbing','capacity_gal','Capacity','number',NULL,'gal',false,40),
('plumbing','pipe_material','Pipe material','select','["Copper","PEX","PVC","CPVC","Galvanized","Cast iron"]'::jsonb,NULL,false,50),
('plumbing','water_pressure','Water pressure','number',NULL,'PSI',false,60),
('plumbing','anode_replaced','Anode rod replaced','date',NULL,NULL,false,70),
('plumbing','last_flush','Last flush','date',NULL,NULL,false,80),
('plumbing','shutoff_location','Main shutoff location','text',NULL,NULL,false,90),
-- Water treatment
('water_treatment','system_type','System type','select','["Softener","Carbon filter","RO","Whole-house filter","UV","Iron filter","Well system"]'::jsonb,NULL,true,10),
('water_treatment','grain_capacity','Grain capacity','number',NULL,'grains',false,20),
('water_treatment','water_hardness','Water hardness','number',NULL,'gpg',false,30),
('water_treatment','salt_type','Salt type','select','["Pellets","Crystals","Potassium"]'::jsonb,NULL,false,40),
('water_treatment','media_type','Media/resin type','text',NULL,NULL,false,50),
('water_treatment','media_changed','Media last changed','date',NULL,NULL,false,60),
('water_treatment','filter_micron','Filter micron','number',NULL,NULL,false,70),
('water_treatment','regen_schedule','Regeneration schedule','text',NULL,NULL,false,80),
-- Electrical
('electrical','work_type','Type','select','["Panel","Sub-panel","Generator","EV charger","Wiring","Lighting","Surge protection"]'::jsonb,NULL,true,10),
('electrical','panel_amperage','Panel amperage','select','["100A","150A","200A","400A"]'::jsonb,NULL,false,20),
('electrical','panel_brand','Panel brand','text',NULL,NULL,false,30),
('electrical','open_slots','Open breaker slots','number',NULL,NULL,false,40),
('electrical','grounding','Grounding type','select','["Ground rod","Ufer","Water pipe"]'::jsonb,NULL,false,50),
('electrical','ev_level','EV charger level','select','["Level 1","Level 2"]'::jsonb,NULL,false,60),
('electrical','ev_amperage','EV charger amperage','number',NULL,'A',false,70),
('electrical','gfci_afci','GFCI/AFCI protected','toggle',NULL,NULL,false,80),
-- Appliance
('appliance','appliance_type','Appliance','select','["Refrigerator","Washer","Dryer","Dishwasher","Range/Oven","Microwave","Disposal","Freezer"]'::jsonb,NULL,true,10),
('appliance','fuel','Fuel','select','["Electric","Gas"]'::jsonb,NULL,false,20),
('appliance','capacity','Capacity','text',NULL,NULL,false,30),
('appliance','purchase_date','Purchase date','date',NULL,NULL,false,40),
('appliance','warranty_type','Warranty','select','["Manufacturer","Extended","None"]'::jsonb,NULL,false,50),
('appliance','parts_replaced','Parts replaced','text',NULL,NULL,false,60),
-- Roofing
('roofing','material','Roof material','select','["Asphalt shingle","Metal","Tile","Slate","Flat/TPO","Wood shake"]'::jsonb,NULL,true,10),
('roofing','install_year','Install year','number',NULL,'year',false,20),
('roofing','layers','Number of layers','number',NULL,NULL,false,30),
('roofing','pitch','Pitch/slope','text',NULL,NULL,false,40),
('roofing','warranty_years','Warranty','number',NULL,'years',false,50),
('roofing','last_inspection','Last inspection','date',NULL,NULL,false,60),
-- Pool & spa
('pool_spa','pool_type','Type','select','["In-ground","Above-ground","Spa/Hot tub"]'::jsonb,NULL,true,10),
('pool_spa','surface','Surface','select','["Plaster","Vinyl","Fiberglass","Tile"]'::jsonb,NULL,false,20),
('pool_spa','gallons','Volume','number',NULL,'gal',false,30),
('pool_spa','pump_hp','Pump HP','number',NULL,NULL,false,40),
('pool_spa','filter_type','Filter type','select','["Cartridge","Sand","DE"]'::jsonb,NULL,false,50),
('pool_spa','sanitizer','Sanitizer','select','["Chlorine","Salt","Bromine","Mineral"]'::jsonb,NULL,false,60),
('pool_spa','heater','Heater','select','["None","Gas","Electric/Heat pump","Solar"]'::jsonb,NULL,false,70),
-- Solar
('solar','system_type','Type','select','["PV (electric)","Solar thermal (water)"]'::jsonb,NULL,true,10),
('solar','system_kw','System size','number',NULL,'kW',false,20),
('solar','panel_count','Number of panels','number',NULL,NULL,false,30),
('solar','inverter_type','Inverter','select','["String","Microinverter","Hybrid"]'::jsonb,NULL,false,40),
('solar','battery','Battery storage','toggle',NULL,NULL,false,50),
('solar','battery_kwh','Battery capacity','number',NULL,'kWh',false,60),
('solar','warranty_years','Warranty','number',NULL,'years',false,70),
-- Generator
('generator','gen_type','Type','select','["Standby (whole-home)","Portable"]'::jsonb,NULL,true,10),
('generator','fuel','Fuel','select','["Natural gas","Propane","Diesel","Gasoline"]'::jsonb,NULL,false,20),
('generator','kw','Output','number',NULL,'kW',false,30),
('generator','transfer_switch','Automatic transfer switch','toggle',NULL,NULL,false,40),
('generator','run_hours','Run hours','number',NULL,NULL,false,50),
('generator','next_service','Next service due','date',NULL,NULL,false,60),
-- Septic
('septic','system_type','Type','select','["Conventional","Aerobic (ATU)","Mound","Chamber"]'::jsonb,NULL,true,10),
('septic','tank_size','Tank size','number',NULL,'gal',false,20),
('septic','tank_material','Tank material','select','["Concrete","Fiberglass","Plastic"]'::jsonb,NULL,false,30),
('septic','last_pumped','Last pumped','date',NULL,NULL,false,40),
('septic','pump_interval','Pump interval','number',NULL,'years',false,50),
('septic','riser','Riser installed','toggle',NULL,NULL,false,60),
-- Irrigation
('irrigation','zones','Number of zones','number',NULL,NULL,true,10),
('irrigation','controller_type','Controller','select','["Standard","Smart/Wi-Fi"]'::jsonb,NULL,false,20),
('irrigation','controller_brand','Controller brand','text',NULL,NULL,false,30),
('irrigation','head_type','Head type','select','["Spray","Rotor","Drip"]'::jsonb,NULL,false,40),
('irrigation','water_source','Water source','select','["Municipal","Well","Reclaimed"]'::jsonb,NULL,false,50),
('irrigation','last_backflow_test','Last backflow test','date',NULL,NULL,false,60),
-- Garage door
('garage_door','door_material','Door material','select','["Steel","Aluminum","Wood","Composite"]'::jsonb,NULL,true,10),
('garage_door','opener_brand','Opener brand','text',NULL,NULL,false,20),
('garage_door','drive_type','Drive type','select','["Chain","Belt","Screw","Direct"]'::jsonb,NULL,false,30),
('garage_door','spring_type','Spring type','select','["Torsion","Extension"]'::jsonb,NULL,false,40),
('garage_door','opener_hp','Opener HP','number',NULL,NULL,false,50),
('garage_door','smart_enabled','Smart/Wi-Fi enabled','toggle',NULL,NULL,false,60),
-- Pest control
('pest_control','service_type','Service type','select','["General pest","Termite","Rodent","Mosquito","Bed bug"]'::jsonb,NULL,true,10),
('pest_control','target_pest','Target pest','text',NULL,NULL,false,20),
('pest_control','treatment','Treatment/product','text',NULL,NULL,false,30),
('pest_control','warranty_bond','Warranty/bond','select','["None","Retreatment","Repair"]'::jsonb,NULL,false,40),
('pest_control','station_count','Bait stations','number',NULL,NULL,false,50),
('pest_control','next_treatment','Next treatment','date',NULL,NULL,false,60),
-- Security
('security','system_type','Type','select','["Alarm","Cameras","Smart lock","Doorbell","Thermostat","Smart hub"]'::jsonb,NULL,true,10),
('security','brand','Brand','text',NULL,NULL,false,20),
('security','monitoring','Monitoring','select','["Self","Professional","None"]'::jsonb,NULL,false,30),
('security','device_count','Number of devices','number',NULL,NULL,false,40),
('security','connectivity','Connectivity','select','["Wi-Fi","Cellular","Wired"]'::jsonb,NULL,false,50)
ON CONFLICT (trade_id, key) DO UPDATE SET
  label = EXCLUDED.label,
  input_type = EXCLUDED.input_type,
  options = EXCLUDED.options,
  unit = EXCLUDED.unit,
  required = EXCLUDED.required,
  sort_order = EXCLUDED.sort_order,
  active = true;
