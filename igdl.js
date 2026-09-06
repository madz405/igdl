/*
 * Created by : febry.is-a.dev
 * GitHub     : vandebry10-star
 * Date       : 30-08-2026
 * * Do not remove the creator's watermark, please respect the creator.
 */

import axios from "axios";
import crypto from "crypto";
import fakeUserAgent from "fake-useragent";

class InstaVideoSave {
  constructor() {
    this.client = axios.create({
      headers: {
        Accept: "*/*",
        Origin: "https://fastvideosave.net",
        Referer: "https://fastvideosave.net/",
        "User-Agent": fakeUserAgent(),
      },
    });
  }

  encodeUrl(text) {
    const key = "qwertyuioplkjhgf";
    const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
    return cipher.update(text, "utf8", "hex") + cipher.final("hex");
  }

  async download({ url, link, target, ...rest }) {
    const targetUrl = url || link || target;

    if (!targetUrl) {
      throw {
        status: 400,
        message: "Parameter 'url', 'link', atau 'target' wajib diisi.",
      };
    }

    if (!targetUrl.includes("instagram.com")) {
      throw {
        status: 400,
        message: "URL yang dimasukkan bukan URL Instagram yang valid.",
      };
    }

    try {
      const encryptedUrl = this.encodeUrl(targetUrl);
      const { data } = await this.client.get(
        "https://api.videodropper.app/allinone",
        {
          headers: {
            Url: encryptedUrl,
          },
        }
      );
      return data;
    } catch (err) {
      const errMessage =
        err.response?.data?.message ||
        err.message ||
        "Gagal mengambil data dari FastVideoSave.";
      throw {
        status: err.status || err.response?.status || 500,
        message: errMessage,
      };
    }
  }
}

// Inisialisasi Instance Scraper
const instaVideo = new InstaVideoSave();

// Handler HTTP Serverless / Vercel API Route
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const { action, url, link, target } = params;

  const targetUrl = url || link || target;

  const availableActions = {
    fastvideosave_actions: ["download"],
  };

  if (!action && !targetUrl) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'url' atau 'action' wajib diisi.",
      available_actions: availableActions,
    });
  }

  try {
    const response = await instaVideo.download({
      url: targetUrl,
      ...params,
    });
    return res.status(200).json({
      status: true,
      result: response,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      status: false,
      error: error.message || "Terjadi kesalahan internal pada server.",
    });
  }
}

// CLI Terminal Tester Runner
(async () => {
  const args = process.argv.slice(2);
  if (args.length === 0) return;

  const urlVal = ["download"].includes(args[0]) ? args[1] : args[0];

  if (!urlVal) {
    console.log(
      JSON.stringify(
        {
          error: "URL Instagram wajib diisi",
          usage:
            'node igdl2.js download "https://www.instagram.com/reel/xxxxx/"',
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  try {
    console.log(`[+] Memproses download FastVideoSave untuk URL: ${urlVal}...`);
    const res = await instaVideo.download({ url: urlVal });
    console.log(JSON.stringify({ status: true, result: res }, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify(
        { status: false, error: error.message || error },
        null,
        2
      )
    );
  }
})();

export { InstaVideoSave };
