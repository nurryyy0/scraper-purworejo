import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {

  try {

    const { data, error } =
      await supabase
        .from("berita")
        .select("*")
        .order("tanggal", {
          ascending: false
        })
        .limit(100);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      jumlah: data.length,
      berita: data
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      error: error.message
    });

  }

}