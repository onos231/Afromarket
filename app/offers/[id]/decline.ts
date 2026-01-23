import type { NextApiRequest, NextApiResponse } from "next";
import db from "../../db"; // adjust path if needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    await db.offers.update({ id }, { status: "declined" });
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Error declining offer:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
