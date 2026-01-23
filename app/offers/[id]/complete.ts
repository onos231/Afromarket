import type { NextApiRequest, NextApiResponse } from "next";
import db from "../../db"; // adjust path if your db file is elsewhere

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const { code } = req.body; // confirmation code from modal

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // Optional: validate confirmation code here
    if (!code) {
      return res.status(400).json({ success: false, error: "Confirmation code required" });
    }

    await db.offers.update({ id }, { status: "completed", confirmation_code: code });
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Error completing offer:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
