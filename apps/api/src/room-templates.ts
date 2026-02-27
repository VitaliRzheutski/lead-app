/**
 * Room-type surface templates. When a room is created with a matching name,
 * these surfaces are auto-created in order. Component/substrate/room_side
 * are derived from the label.
 */

const WALL_SIDES = ["A (front)", "B (left)", "C (back)", "D (right)"] as const;

function wall(equivalent: string, sideIndex: number): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: WALL_SIDES[sideIndex] ?? "N/A", room_equivalent: equivalent, component: "Wall", substrate: "Sheetrock" };
}
function door(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Door", substrate: "Wood" };
}
function closet(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Closet", substrate: "Wood" };
}
function shelf(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Closet Shelf", substrate: "Wood" };
}
function shelfSupport(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Closet Shelf Support", substrate: "Wood" };
}
function ceiling(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Ceiling", substrate: "Plaster" };
}
function floor(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Floor", substrate: "Wood" };
}
function baseboard(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Baseboard", substrate: "Wood" };
}
function radiator(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Radiator", substrate: "Metal" };
}
function window(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Window", substrate: "Wood" };
}
function cabinetDoor(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Door", substrate: "Wood" };
}
function cabinetFrame(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Door", substrate: "Wood" };
}
function shelfItem(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Closet", substrate: "Wood" };
}
function stair(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Floor", substrate: "Wood" };
}
function floorTile(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Floor", substrate: "Tile" };
}
function doorMetal(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Door", substrate: "Metal" };
}
function stairs(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Stairs", substrate: "Wood" };
}
function crownMolding(equivalent: string): { room_side: string; room_equivalent: string; component: string; substrate: string } {
  return { room_side: "N/A", room_equivalent: equivalent, component: "Crown Molding", substrate: "Wood" };
}

const BEDROOM: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Bedroom Wall", 0), wall("Bedroom Wall", 1), wall("Bedroom Wall", 2), wall("Bedroom Wall", 3),
  door("Bedroom Door Panel"), door("Bedroom Door Jamb"), door("Bedroom Door Casing"),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), closet("Inside Closet"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const BATHROOM: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Bath Wall", 0), wall("Bath Wall", 1), wall("Bath Wall", 2), wall("Bath Wall", 3),
  door("Bath Door Panel"), door("Bath Door Jamb"), door("Bath Door Casing"),
  door("Bath Closet Door Panel"), door("Bath Closet Door Jamb"), door("Bath Closet Door Casing"),
  shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), closet("Inside Bath Closet"),
  ceiling("Bath Ceiling"), floor("Bath Floor"), baseboard("Baseboard"), radiator("Radiator"),
  window("Bath Window Sill"), window("Bath Window Side Casing"), window("Bath Window Sash (Mid)"),
];

const KITCHEN: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Kitchen Wall", 0), wall("Kitchen Wall", 1), wall("Kitchen Wall", 2), wall("Kitchen Wall", 3),
  door("Kitchen Door Panel"), door("Kitchen Door Jamb"), door("Kitchen Door Casing"),
  cabinetDoor("Cabinet Door"), cabinetFrame("Cabinet Frame"), closet("Inside Cabinet"),
  shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"),
  radiator("Radiator"), window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const LIVING_ROOM: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Living Room Wall", 0), wall("Living Room Wall", 1), wall("Living Room Wall", 2), wall("Living Room Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), closet("Inside Closet"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const DINING_ROOM: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Dining Room Wall", 0), wall("Dining Room Wall", 1), wall("Dining Room Wall", 2), wall("Dining Room Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), closet("Inside Closet"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const FOYER: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Foyer Wall", 0), wall("Foyer Wall", 1), wall("Foyer Wall", 2), wall("Foyer Wall", 3),
  door("Front Door Panel"), door("Front Door Jamb"), door("Front Door Casing"),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), closet("Inside Closet"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
];

const ENTRANCE_HALLWAY: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Entrance Hallway Wall", 0), wall("Entrance Hallway Wall", 1), wall("Entrance Hallway Wall", 2), wall("Entrance Hallway Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), closet("Inside Closet"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
];

const HALLWAY: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Hallway Wall", 0), wall("Hallway Wall", 1), wall("Hallway Wall", 2), wall("Hallway Wall", 3),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), closet("Inside Closet"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
];

const COMMON_AREA: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Common Wall", 0), wall("Common Wall", 1), wall("Common Wall", 2), wall("Common Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

// Preset common areas (screenshot): Building Entrance Foyer + 1st Floor Hallway / Stairwell
const BUILDING_ENTRANCE_FOYER: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Entrance way Wall", 0), wall("Entrance way Wall", 1), wall("Entrance way Wall", 2), wall("Entrance way Wall", 3),
  floorTile("Entrance Floor"),
  ceiling("Entrance way Ceiling"),
  doorMetal("Front Door Panel"), doorMetal("Front Door Jamb"), doorMetal("Front Door Casing"),
];

const FIRST_FLOOR_HALLWAY_STAIRWELL: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Hallway Wall", 0), wall("Hallway Wall", 1), wall("Hallway Wall", 2), wall("Hallway Wall", 3),
  baseboard("Hallway Baseboard"),
  crownMolding("Crown Molding"),
  floorTile("Floor"),
  radiator("Radiator"),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  stairs("Stairwell Handrail"), stairs("Stairwell Step / Tread"), stairs("Stairwell Stringer"),
  stairs("Balusters"), stairs("Stairwell Step Riser"), stairs("Banister of Stairs"),
];

const CLOSET: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Closet Wall", 0), wall("Closet Wall", 1), wall("Closet Wall", 2), wall("Closet Wall", 3),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), closet("Inside Closet"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"),
];

const WALK_IN_CLOSET: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Walk-In Closet Wall", 0), wall("Walk-In Closet Wall", 1), wall("Walk-In Closet Wall", 2), wall("Walk-In Closet Wall", 3),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  shelf("Closet Shelf"), shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), closet("Inside Closet"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"),
];

const UTILITY_ROOM: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Utility Room Wall", 0), wall("Utility Room Wall", 1), wall("Utility Room Wall", 2), wall("Utility Room Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const LAUNDRY_ROOM: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Laundry Room Wall", 0), wall("Laundry Room Wall", 1), wall("Laundry Room Wall", 2), wall("Laundry Room Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  cabinetDoor("Cabinet Door"), cabinetFrame("Cabinet Frame"), closet("Inside Cabinet"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
];

const STORAGE_ROOM: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Storage Room Wall", 0), wall("Storage Room Wall", 1), wall("Storage Room Wall", 2), wall("Storage Room Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  closet("Inside Storage"), shelfItem("Shelf"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"),
];

const OFFICE: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Office Wall", 0), wall("Office Wall", 1), wall("Office Wall", 2), wall("Office Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), closet("Inside Closet"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const NURSERY: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Nursery Wall", 0), wall("Nursery Wall", 1), wall("Nursery Wall", 2), wall("Nursery Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  shelf("Closet Shelf"), shelfSupport("Closet Shelf Support"), closet("Inside Closet"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const BASEMENT: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Basement Wall", 0), wall("Basement Wall", 1), wall("Basement Wall", 2), wall("Basement Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  stair("Stair Rail"), stair("Stair Tread"), stair("Stair Riser"),
];

const ATTIC: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Attic Wall", 0), wall("Attic Wall", 1), wall("Attic Wall", 2), wall("Attic Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const TEMPLATES: Record<string, { room_side: string; room_equivalent: string; component: string; substrate: string }[]> = {
  "Bedroom": BEDROOM,
  "Bathroom": BATHROOM,
  "Kitchen": KITCHEN,
  "Living Room": LIVING_ROOM,
  "Dining Room": DINING_ROOM,
  "Foyer / Front Door": FOYER,
  "Foyer": FOYER,
  "Entrance Hallway": ENTRANCE_HALLWAY,
  "Hallway": HALLWAY,
  "Closet": CLOSET,
  "Walk-In Closet": WALK_IN_CLOSET,
  "Utility Room": UTILITY_ROOM,
  "Laundry Room": LAUNDRY_ROOM,
  "Storage Room": STORAGE_ROOM,
  "Office": OFFICE,
  "Nursery": NURSERY,
  "Den": LIVING_ROOM,
  "Family Room": LIVING_ROOM,
  "Basement": BASEMENT,
  "Attic": ATTIC,
  "Common Area": COMMON_AREA,
  "Building Entrance Foyer": BUILDING_ENTRANCE_FOYER,
  "1st Floor Hallway / Stairwell": FIRST_FLOOR_HALLWAY_STAIRWELL,
};

export function getSurfacesForRoomType(roomName: string): { room_side: string; room_equivalent: string; component: string; substrate: string }[] | null {
  const key = roomName.trim();
  if (!key) return null;
  if (TEMPLATES[key]) return TEMPLATES[key];
  // "2nd Floor Hallway / Stairwell", "3rd Floor Hallway / Stairwell" etc. -> same surfaces as 1st
  if (key.includes("Hallway / Stairwell")) return FIRST_FLOOR_HALLWAY_STAIRWELL;
  // "2nd Floor Building Entrance Foyer" etc. -> same surfaces as Building Entrance Foyer
  if (key.includes("Building Entrance Foyer")) return BUILDING_ENTRANCE_FOYER;
  // "Bedroom 1", "Bathroom 2" etc. -> look up by base type "Bedroom", "Bathroom"
  const baseType = key.replace(/\s+\d+$/, "");
  if (baseType !== key && TEMPLATES[baseType]) return TEMPLATES[baseType];
  return null;
}

export function getRoomTypeOptions(): string[] {
  return Object.keys(TEMPLATES);
}
