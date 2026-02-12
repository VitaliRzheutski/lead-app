import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "./db";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not set. Please define it in your .env file before starting the API."
  );
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

function validateEmail(email: unknown): string | null {
  if (typeof email !== "string" || !email.includes("@")) {
    return "Please provide a valid email address.";
  }

  if (email.length > 255) {
    return "Email is too long.";
  }

  return null;
}

function validatePassword(password: unknown): string | null {
  if (typeof password !== "string") {
    return "Password is required.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (password.length > 100) {
    return "Password is too long.";
  }

  return null;
}

function createToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    JWT_SECRET as string,
    { expiresIn: "7d" }
  );
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.header("authorization") || req.header("Authorization");

  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ error: "Authorization token is missing." });
    return;
  }

  const token = header.slice("bearer ".length).trim();

  if (!token) {
    res.status(401).json({ error: "Authorization token is missing." });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as {
      id: string;
      email: string;
    };

    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (_err) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

export const authRouter = Router();

authRouter.post(
  "/register",
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body ?? {};

    const emailError = validateEmail(email);
    if (emailError) {
      res.status(400).json({ error: emailError });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }

    const normalizedEmail = (email as string).toLowerCase();

    try {
      const existing = await query<UserRow>(
        "SELECT id FROM users WHERE email = $1",
        [normalizedEmail]
      );

      if (existing.rows.length > 0) {
        res
          .status(409)
          .json({ error: "A user with this email already exists." });
        return;
      }

      const passwordHash = await bcrypt.hash(password as string, 10);

      const created = await query<UserRow>(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
        [normalizedEmail, passwordHash]
      );

      const user: AuthenticatedUser = {
        id: created.rows[0].id,
        email: created.rows[0].email,
      };

      const token = createToken(user);

      res.status(201).json({ token, user });
    } catch (err) {
      // Log minimal error details in non-production environments
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to register user." });
    }
  }
);

authRouter.post(
  "/login",
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body ?? {};

    const emailError = validateEmail(email);
    if (emailError) {
      res.status(400).json({ error: emailError });
      return;
    }

    if (typeof password !== "string" || password.length === 0) {
      res.status(400).json({ error: "Password is required." });
      return;
    }

    const normalizedEmail = (email as string).toLowerCase();

    try {
      const result = await query<UserRow>(
        "SELECT id, email, password_hash FROM users WHERE email = $1",
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      const userRow = result.rows[0];

      const isMatch = await bcrypt.compare(
        password as string,
        userRow.password_hash
      );

      if (!isMatch) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      const user: AuthenticatedUser = {
        id: userRow.id,
        email: userRow.email,
      };

      const token = createToken(user);

      res.status(200).json({ token, user });
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.status(500).json({ error: "Failed to log in." });
    }
  }
);

