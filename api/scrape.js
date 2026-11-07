import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = "https://purworejokab.go.id";
const INDEX_URL = `${BASE_URL}/web/berita`;

export default async function handler(req, res) {
  try {

    console.log("Mengakses:", INDEX_URL);

    const response = await fetch(INDEX_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    const urls = [];
    const seen = new Set();

    const regex =
      /href=["']([^"']*\/web\/berita\/detail\/[^"']*)["']/gi;

    let match;

    while ((match = regex.exec(html)) !== null) {

      let url = match[1];

      if (!url.startsWith("http")) {
        url =
          BASE_URL +
          "/" +
          url.replace(/^\/+/, "");
      }

      if (!seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }

    const links = urls.slice(0, 30);

    console.log(
      `Ditemukan ${links.length} artikel`
    );

    const berita = [];

    for (let i = 0; i < links.length; i++) {

      const url = links[i];

      console.log(
        `Memproses ${i + 1}/${links.length}: ${url}`
      );

      try {

        const detailResponse = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
          }
        });

        if (!detailResponse.ok) {
          console.log(
            `Gagal HTTP ${detailResponse.status}`
          );
          continue;
        }

        const detail =
          await detailResponse.text();

        // Ambil H1
        let titleMatch =
          detail.match(
            /<h1[^>]*>([\s\S]*?)<\/h1>/i
          );

        if (!titleMatch) {
          titleMatch =
            detail.match(
              /<h2[^>]*>([\s\S]*?)<\/h2>/i
            );
        }

        let judul =
          titleMatch
            ? titleMatch[1]
                .replace(/<[^>]+>/g, "")
                .replace(/\s+/g, " ")
                .trim()
            : "Judul Tidak Diketahui";

        // Ambil tanggal
        const dateMatch =
          detail.match(
            /\b(20\d{2}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)\b/
          );

        const tanggal =
          dateMatch
            ? dateMatch[1]
            : "Tanggal tidak ditemukan";

        berita.push({
          tanggal,
          judul,
          url
        });

      } catch (error) {

        console.log(
          `Gagal memproses ${url}: ${error.message}`
        );

      }
    }

    // Simpan ke Supabase
    if (berita.length > 0) {

      const { error } =
        await supabase
          .from("berita")
          .upsert(
            berita,
            {
              onConflict: "url"
            }
          );

      if (error) {
        throw error;
      }
    }

    return res.status(200).json({
      success: true,
      jumlah_ditemukan: links.length,
      jumlah_disimpan: berita.length,
      berita
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message
    });

  }
}