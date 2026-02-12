import { Router, Response } from "express";
import { query } from "./db";
import { requireAuth, AuthenticatedRequest } from "./auth";

interface RoomRow {
  id: string;
}

export const roomsRouter = Router();

roomsRouter.use(requireAuth);

// DELETE /rooms/:roomId - delete a room if it belongs to the authenticated user
roomsRouter.delete(
  "/:roomId",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const roomId = req.params.roomId;

    if (!roomId) {
      res.status(400).json({ error: "Room id is required." });
      return;
    }

    try {
      const result = await query<RoomRow>(
        `DELETE FROM rooms
         WHERE id = $1
           AND inspection_id IN (
             SELECT id FROM inspections WHERE user_id = $2
           )
         RETURNING id`,
        [roomId, userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Room not found." });
        return;
      }

      res.status(200).json({ deleted: true });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to delete room." });
    }
  }
);

