const Fastify = require("fastify");
const axios = require("axios");
const cors = require("@fastify/cors");
const fs = require("fs");
const path = require("path");

const app = Fastify({ logger: false });

const PORT = 3000;
const API_URL = "https://wtxmd52.tele68.com/v1/txmd5/lite-sessions?cp=R&cl=R&pf=web&at=ee2d066f9a42e456cbd7f1ca034b88ea";

const HISTORY_FILE = path.join(__dirname, "history.json");

let history = [];
let cache = null;
let lastFetch = 0;
const CACHE_TIME = 3000;

// ===== LOAD HISTORY =====
if (fs.existsSync(HISTORY_FILE)) {
  history = JSON.parse(fs.readFileSync(HISTORY_FILE));
}

// ===== SAVE HISTORY =====
function saveHistory() {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// ===== CACHE API =====
async function getData() {
  const now = Date.now();

  if (cache && now - lastFetch < CACHE_TIME) {
    return cache;
  }

  const res = await axios.get(API_URL);
  cache = res.data;
  lastFetch = now;

  return cache;
}

// ===== 🧠 AI VIP =====
function duDoan(data) {
  const last = data.slice(0, 12).map(i => i.resultTruyenThong);

  let tai = last.filter(i => i === "TAI").length;
  let xiu = last.filter(i => i === "XIU").length;

  let prediction = tai > xiu ? "TAI" : "XIU";

  // ===== 🔥 BỆT =====
  let streak = 1;
  for (let i = 1; i < last.length; i++) {
    if (last[i] === last[0]) streak++;
    else break;
  }

  if (streak >= 3) {
    prediction = last[0];
  }

  // ===== 🧠 ZIGZAG =====
  let zigzag = true;
  for (let i = 0; i < 6; i++) {
    if (last[i] === last[i + 1]) {
      zigzag = false;
      break;
    }
  }

  if (zigzag) {
    prediction = last[0] === "TAI" ? "XIU" : "TAI";
  }

  // ===== 📈 ĐẢO CẦU =====
  let daoCau = false;
  for (let i = 0; i < 6; i++) {
    if (
      last[i] === last[i + 1] &&
      last[i + 2] === last[i + 3] &&
      last[i] !== last[i + 2]
    ) {
      daoCau = true;
      break;
    }
  }

  if (daoCau) {
    prediction = last[0] === "TAI" ? "XIU" : "TAI";
  }

  // ===== CONFIDENCE =====
  let confidence =
    Math.abs(tai - xiu) * 8 +
    streak * 6 +
    (zigzag ? 15 : 0) +
    (daoCau ? 15 : 0);

  return {
    du_doan: prediction,
    do_tin_cay: Math.min(confidence, 95) + "%",
    phan_tich: {
      tai,
      xiu,
      bet: streak,
      zigzag,
      dao_cau: daoCau
    }
  };
}

// ===== MIDDLEWARE =====
app.register(cors);

// ================= API FULL =================
app.get("/api/taixiu", async () => {
  try {
    const res = await getData();
    const data = res.list;

    const phanTich = duDoan(data);

    // lưu lịch sử
    history.unshift({
      time: new Date().toLocaleString("vi-VN"),
      phien: data[0].id,
      ket_qua: data[0].resultTruyenThong
    });

    history = history.slice(0, 100);
    saveHistory();

    return {
      status: "success",
      thong_bao: "🔥 API Tài Xỉu VIP Hoạt Động",

      ket_qua_moi_nhat: {
        phien: data[0].id,
        ket_qua: data[0].resultTruyenThong,
        xuc_xac: data[0].dices,
        tong: data[0].point
      },

      thong_ke: res.typeStat,

      du_doan: phanTich,

      lich_su: history,

      doanhtung: "Văn Minh VIP – AI cầu + zigzag + đảo cầu 🔥"
    };

  } catch (err) {
    return {
      status: "error",
      message: "Lỗi API",
      doanhtung: "Văn Minh VIP"
    };
  }
});

// ================= API MD5 =================
app.get("/api/taixiumd5", async () => {
  try {
    const res = await getData();
    const data = res.list;

    const phanTich = duDoan(data);

    const cau = data.slice(0, 6).map(i => i.resultTruyenThong).join("-");

    let streak = 1;
    for (let i = 1; i < data.length; i++) {
      if (data[i].resultTruyenThong === data[0].resultTruyenThong) {
        streak++;
      } else break;
    }

    return {
      status: "success",

      phien: data[0].id,

      ket_qua: data[0].resultTruyenThong,

      chi_tiet: {
        xuc_xac: data[0].dices,
        tong: data[0].point
      },

      cau,

      cau_bet: {
        loai: data[0].resultTruyenThong,
        do_dai: streak
      },

      thong_ke: res.typeStat,

      du_doan: phanTich,

      doanhtung: "Văn Minh MD5 VIP – AI phân tích nâng cao 🔥"
    };

  } catch (err) {
    return {
      status: "error",
      message: "Lỗi API MD5",
      doanhtung: "Văn Minh VIP"
    };
  }
});

// ===== TEST =====
app.get("/", async () => {
  return {
    message: "🚀 Server Tài Xỉu đang chạy...",
    api: [
      "/api/taixiu",
      "/api/taixiumd5"
    ],
    author: "Văn Minh VIP"
  };
});

// ===== START =====
app.listen({ port: PORT, host: "0.0.0.0" }, () => {
  console.log("🔥 Server chạy tại http://localhost:" + PORT);
});
