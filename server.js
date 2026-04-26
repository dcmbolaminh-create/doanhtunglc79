const Fastify = require("fastify");
const axios = require("axios");
const cors = require("@fastify/cors");
const fs = require("fs");
const path = require("path");

const app = Fastify({ logger: false });

const PORT = 3000;

// API gốc
const API_URL = "https://wtxmd52.tele68.com/v1/txmd5/lite-sessions?cp=R&cl=R&pf=web&at=ee2d066f9a42e456cbd7f1ca034b88ea";

// File lưu lịch sử
const HISTORY_FILE = path.join(__dirname, "history.json");

// Đọc lịch sử
function readHistory() {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  return JSON.parse(fs.readFileSync(HISTORY_FILE));
}

// Lưu lịch sử
function saveHistory(data) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
}

// 🧠 AI dự đoán đơn giản (cầu + đảo)
function duDoan(history) {
  if (history.length < 5) return { ketqua: "ĐANG PHÂN TÍCH", doTinCay: 50 };

  const last = history.slice(0, 10).map(x => x.result);

  let tai = last.filter(x => x === "TAI").length;
  let xiu = last.filter(x => x === "XIU").length;

  // cầu bệt
  if (last[0] === last[1] && last[1] === last[2]) {
    return {
      ketqua: last[0],
      doTinCay: 75,
      lydo: "Cầu bệt"
    };
  }

  // cầu đảo
  if (last[0] !== last[1] && last[1] !== last[2]) {
    return {
      ketqua: last[0] === "TAI" ? "XIU" : "TAI",
      doTinCay: 65,
      lydo: "Cầu đảo"
    };
  }

  // theo số đông
  return {
    ketqua: tai > xiu ? "TAI" : "XIU",
    doTinCay: 60,
    lydo: "Theo thống kê"
  };
}

// API chính
app.get("/taixiumd5", async (req, reply) => {
  try {
    const res = await axios.get(API_URL);
    const data = res.data.list;

    let history = readHistory();

    const formatted = data.map(item => ({
      phien: item.id,
      ket_qua: item.resultTruyenThong,
      xuc_xac: item.dices,
      tong: item.point,
      thoi_gian: new Date().toLocaleString("vi-VN")
    }));

    // cập nhật lịch sử
    history = [...formatted, ...history].slice(0, 100);
    saveHistory(history);

    const prediction = duDoan(history);

    return {
      status: "success",
      app: "TÀI XỈU MD5 API - VĂN MINH VIP",
      phien_moi_nhat: formatted[0],
      thong_ke: res.data.typeStat,
      du_doan: {
        ket_qua: prediction.ketqua,
        do_tin_cay: prediction.doTinCay + "%",
        ly_do: prediction.lydo
      },
      lich_su: history.slice(0, 20),
      doanhtung: "🔥 Dữ liệu chỉ mang tính tham khảo - không đảm bảo thắng 🔥"
    };

  } catch (err) {
    return {
      status: "error",
      message: "Không lấy được dữ liệu",
      error: err.message
    };
  }
});

// start server
app.register(cors, { origin: "*" });

app.listen({ port: PORT }, () => {
  console.log("🚀 Server chạy tại http://localhost:" + PORT);
});
