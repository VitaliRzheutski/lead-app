-- Add "Closet Shelf Support" surface to existing rooms that have "Closet Shelf"
-- (so existing rooms get the new surface type without re-creating the room)
INSERT INTO surfaces (room_id, room_side, room_code, room_equivalent, component, substrate, xrf_reading, result, notes)
SELECT DISTINCT s.room_id, 'N/A', NULL, 'Closet Shelf Support', 'Closet Shelf Support', 'Wood', 0, 'negative', NULL
FROM surfaces s
WHERE s.room_equivalent = 'Closet Shelf'
  AND NOT EXISTS (
    SELECT 1 FROM surfaces s2
    WHERE s2.room_id = s.room_id AND s2.room_equivalent = 'Closet Shelf Support'
  );
