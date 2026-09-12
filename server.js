import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";

// Public marketing / platform-level
import authRoutes from "./routes/authRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import superadminRoutes from "./routes/superadminRoutes.js";

// Authenticated, shop-scoped (owner / staff / customer)
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import posRoutes from "./routes/posRoutes.js";

import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── CORS ──
// In production, set CORS_ORIGINS in .env as a comma-separated list of
// allowed frontend URLs (e.g. your Netlify/Vercel domain for the platform).
const allowedOrigins = (process.env.CORS_ORIGINS || 'https://storeos-pink.vercel.app')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile apps, Postman, curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Platform-level routes ──
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);      // /api/public/:shopSlug/... (no login needed)
app.use("/api/superadmin", superadminRoutes);

// ── Shop-scoped routes (require login; shop resolved from the logged-in user's token) ──
app.use("/api/shop/products", productRoutes);
app.use("/api/shop/categories", categoryRoutes);
app.use("/api/shop/orders", orderRoutes);
app.use("/api/shop/users", adminRoutes);
app.use("/api/shop/wishlist", wishlistRoutes);
app.use("/api/shop/settings", settingsRoutes);
app.use("/api/shop/staff", staffRoutes);
app.use("/api/shop/pos", posRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Multi-tenant Shop Platform API Running" });
});

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Not Found - ${req.originalUrl}` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
