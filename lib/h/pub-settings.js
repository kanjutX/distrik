const { api } = require("../http");
const { getSettings } = require("../settings");

// Setting yang tampil di halaman publik. links/milestones = null kalau admin belum pernah
// menyimpannya (frontend lalu memakai nilai bawaan dari config.js).
module.exports = api(async (req, res) => {
  var s = await getSettings(["launch", "links", "milestones"]);
  var launch = s.launch || {};
  res.status(200).json({
    launchDate: launch.launchDate || "",
    registrationOpen: launch.registrationOpen !== false,
    links: s.links || null,
    milestones: Array.isArray(s.milestones) ? s.milestones : null,
  });
}, { cache: "public, s-maxage=20, stale-while-revalidate=60" });
