const axios = require("axios");
const cheerio = require("cheerio");

async function scrape(url) {
  try {
    const cleanUrl = url.trim().split("?")[0];
    const regex =
      /https:\/\/(?:m|www|vm|vt|lite)?\.?tiktok\.com\/((?:.*\b(?:(?:usr|v|embed|user|video|photo)\/|\?shareId=|\&item_id=)(\d+))|\w+)/;
    if (!regex.test(cleanUrl)) {
      throw new Error("Must be a valid TikTok URL.");
    }

    const { data: res } = await axios.post(
      "https://tikdownloader.io/api/ajaxSearch",
      `q=${encodeURIComponent(cleanUrl)}&vt=id`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Origin: "https://tikdownloader.io",
          Referer: "https://tikdownloader.io/id",
        },
        timeout: 15000,
      }
    );

    let json = res;
    if (typeof res === "string") {
      const trimmed = res.trim();
      if (trimmed.startsWith("<") || trimmed.startsWith("<!DOCTYPE")) {
        throw new Error("TikDownloader returned an HTML error page (blocked or rate-limited).");
      }
      json = JSON.parse(trimmed);
    }

    if (!json || json.status !== "ok" || !json.data) {
      throw new Error(json?.msg || "TikDownloader extraction failed.");
    }

    const $ = cheerio.load(json.data);
    const title =
      $(".clearfix h3").first().text().trim() ||
      $("h3").first().text().trim() ||
      "TikTok Content";
    const thumbnail =
      $(".image-tik img").first().attr("src") ||
      $("img").first().attr("src") ||
      "";

    const downloads = [];

    $("a.tik-button-dl").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const text = $(el).text().trim().toLowerCase();

      if (text.includes("hd")) {
        downloads.push({ quality: "1080p", type: "video", url: href });
      } else if (text.includes("mp4 [1]") || text.includes("without watermark") || text.includes("mp4")) {
        downloads.push({ quality: "720p", type: "video", url: href });
      } else if (text.includes("mp3") || text.includes("audio")) {
        downloads.push({ quality: "audio", type: "audio", url: href });
      } else if (text.includes("photo") || text.includes("image")) {
        downloads.push({ quality: "photo", type: "photo", url: href });
      }
    });

    $(".image-item img, .photo-item img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && !downloads.some((d) => d.url === src)) {
        downloads.push({ quality: "photo", type: "photo", url: src });
      }
    });

    if (downloads.length === 0) {
      throw new Error("No download links found from TikDownloader.");
    }

    const authorMatch = cleanUrl.match(/@([^\/]+)/);
    const author = authorMatch ? authorMatch[1] : "TikTok User";

    return {
      status: true,
      result: {
        title,
        author: { name: author },
        thumbnail,
        type: downloads.some((d) => d.type === "photo") ? "photo" : "video",
        downloads,
      },
    };
  } catch (err) {
    return {
      status: false,
      message: err.message || "Failed to scrape TikTok via TikDownloader.",
    };
  }
}

module.exports = { scrape };/*
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
