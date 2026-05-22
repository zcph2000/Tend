export type Species = "sheep" | "cattle" | "chickens" | "pigs" | "goats" | "other";
export type GroupColor = "grass" | "amber" | "sky" | "earth" | "red" | "purple";

export interface AnimalGroup {
  id: string;
  farm_id: string;
  name: string;
  species: Species;
  description: string | null;
  color: GroupColor;
  created_at: string;
  animals?: Animal[];
}
export type AnimalSex = "female" | "male" | "castrated" | "unknown";
export type AnimalStatus = "active" | "sold" | "slaughtered" | "dead";
export type EventType =
  | "vaccination"
  | "worming"
  | "tupping"
  | "lambing"
  | "weighing"
  | "treatment"
  | "observation"
  | "note"
  | "slaughtering"
  | "sale";

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  profile: string | null;
  created_at: string;
}

export interface Field {
  id: string;
  farm_id: string;
  name: string;
  area_ha: number;
  geojson: object | null;
  notes: string | null;
  created_at: string;
}

export interface Section {
  id: string;
  field_id: string;
  farm_id: string;
  name: string;
  area_ha: number;
  geojson: object | null;
  purpose: string | null;
  notes: string | null;
  created_at: string;
}

export interface Flock {
  id: string;
  farm_id: string;
  name: string;
  notes: string | null;
  created_at: string;
}

export interface Animal {
  id: string;
  farm_id: string;
  group_id: string | null;
  flock_id: string | null;
  ear_tag: string;
  name: string | null;
  species: Species;
  breed: string | null;
  sex: AnimalSex;
  birth_date: string | null;
  mother_id: string | null;
  father_id: string | null;
  status: AnimalStatus;
  purpose: string | null;
  notes: string | null;
  created_at: string;
  group?: AnimalGroup;
  flock?: Flock;
  mother?: Animal;
  father?: Animal;
}

export interface AnimalEvent {
  id: string;
  animal_id: string;
  farm_id: string;
  event_type: EventType;
  event_date: string;
  data: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}

export interface GrazingRecord {
  id: string;
  farm_id: string;
  section_id: string;
  animal_count: number;
  start_date: string;
  end_date: string | null;
  grass_height_before: number | null;
  grass_height_after: number | null;
  notes: string | null;
  created_at: string;
  section?: Section;
}

export interface WeatherData {
  date: string;
  temp_max: number;
  temp_min: number;
  temp_mean: number;
  precipitation: number;
  wind_speed: number;
  weather_code: number;
}

export interface Observation {
  id: string;
  farm_id: string;
  section_id: string | null;
  observation_date: string;
  grass_height: number | null;
  grass_condition: "excellent" | "good" | "fair" | "poor" | null;
  notes: string | null;
  created_at: string;
}
