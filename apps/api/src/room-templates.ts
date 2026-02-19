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
  return { room_side: "N/A", room_equivalent: equivalent, component: "Closet", substrate: "Wood" };
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

const BEDROOM: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Bedroom Wall", 0), wall("Bedroom Wall", 1), wall("Bedroom Wall", 2), wall("Bedroom Wall", 3),
  door("Bedroom Door Panel"), door("Bedroom Door Jamb"), door("Bedroom Door Casing"),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  closet("Inside Closet"), shelf("Closet Shelf"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const BATHROOM: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Bath Wall", 0), wall("Bath Wall", 1), wall("Bath Wall", 2), wall("Bath Wall", 3),
  door("Bath Door Panel"), door("Bath Door Jamb"), door("Bath Door Casing"),
  door("Bath Closet Door Panel"), door("Bath Closet Door Jamb"), door("Bath Closet Door Casing"),
  closet("Inside Bath Closet"), shelf("Closet Shelf"),
  ceiling("Bath Ceiling"), floor("Bath Floor"), radiator("Radiator"),
  window("Bath Window Sill"), window("Bath Window Side Casing"), window("Bath Window Sash (Mid)"),
];

const KITCHEN: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Kitchen Wall", 0), wall("Kitchen Wall", 1), wall("Kitchen Wall", 2), wall("Kitchen Wall", 3),
  door("Kitchen Door Panel"), door("Kitchen Door Jamb"), door("Kitchen Door Casing"),
  cabinetDoor("Cabinet Door"), cabinetFrame("Cabinet Frame"), closet("Inside Cabinet"),
  shelf("Closet Shelf"), ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"),
  radiator("Radiator"), window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const LIVING_ROOM: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Living Room Wall", 0), wall("Living Room Wall", 1), wall("Living Room Wall", 2), wall("Living Room Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  closet("Inside Closet"), shelf("Closet Shelf"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const FOYER: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  door("Front Door Panel"), door("Front Door Jamb"), door("Front Door Casing"),
  wall("Foyer Wall", 0), wall("Foyer Wall", 1), wall("Foyer Wall", 2), wall("Foyer Wall", 3),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  closet("Inside Closet"), shelf("Closet Shelf"),
];

const HALLWAY: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Hallway Wall", 0), wall("Hallway Wall", 1), wall("Hallway Wall", 2), wall("Hallway Wall", 3),
  door("Closet Door Panel"), door("Closet Door Jamb"), door("Closet Door Casing"),
  closet("Inside Closet"), shelf("Closet Shelf"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
];

const COMMON_AREA: { room_side: string; room_equivalent: string; component: string; substrate: string }[] = [
  wall("Common Wall", 0), wall("Common Wall", 1), wall("Common Wall", 2), wall("Common Wall", 3),
  door("Door Panel"), door("Door Jamb"), door("Door Casing"),
  ceiling("Ceiling"), floor("Floor"), baseboard("Baseboard"), radiator("Radiator"),
  window("Window Sill"), window("Window Side Casing"), window("Window Sash (Mid)"),
];

const TEMPLATES: Record<string, { room_side: string; room_equivalent: string; component: string; substrate: string }[]> = {
  "Bedroom": BEDROOM,
  "Bathroom": BATHROOM,
  "Kitchen": KITCHEN,
  "Living Room": LIVING_ROOM,
  "Foyer / Front Door": FOYER,
  "Foyer": FOYER,
  "Entrance Hallway": HALLWAY,
  "Hallway": HALLWAY,
  "Common Area": COMMON_AREA,
};

export function getSurfacesForRoomType(roomName: string): { room_side: string; room_equivalent: string; component: string; substrate: string }[] | null {
  const key = roomName.trim();
  if (!key) return null;
  if (TEMPLATES[key]) return TEMPLATES[key];
  return null;
}

export function getRoomTypeOptions(): string[] {
  return Object.keys(TEMPLATES);
}
