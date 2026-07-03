import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// [key, name, emoji, color, audience, tier, metric, threshold]
const ACH: [string,string,string,string,string,string,string,number][] = [
  // Customer
  ["ach_explorer_b","Explorer","🧭","#cd7f32","customer","bronze","taps",10],
  ["ach_explorer_s","Explorer","🧭","#c0c0c0","customer","silver","taps",50],
  ["ach_explorer_g","Explorer","🧭","#eab308","customer","gold","taps",100],
  ["ach_explorer_p","Explorer","🧭","#7dd3fc","customer","platinum","taps",500],
  ["ach_adventurer_b","Local Adventurer","🗺️","#cd7f32","customer","bronze","distinct_businesses",5],
  ["ach_adventurer_s","Local Adventurer","🗺️","#c0c0c0","customer","silver","distinct_businesses",15],
  ["ach_adventurer_g","Local Adventurer","🗺️","#eab308","customer","gold","distinct_businesses",30],
  ["ach_regular_b","Regular","🔥","#cd7f32","customer","bronze","streak",3],
  ["ach_regular_s","Loyalist","🔥","#c0c0c0","customer","silver","streak",7],
  ["ach_regular_g","Devotee","🔥","#eab308","customer","gold","streak",30],
  // Business
  ["ach_buzzing_b","Buzzing","🐝","#cd7f32","business","bronze","biz_taps",100],
  ["ach_buzzing_s","Popular","🐝","#c0c0c0","business","silver","biz_taps",1000],
  ["ach_buzzing_g","Landmark","🐝","#eab308","business","gold","biz_taps",10000],
  ["ach_favorite_b","Community Favorite","❤️","#cd7f32","business","bronze","biz_customers",50],
  ["ach_favorite_s","Community Favorite","❤️","#c0c0c0","business","silver","biz_customers",250],
  ["ach_favorite_g","Community Favorite","❤️","#eab308","business","gold","biz_customers",1000],
];
await pool.query(`ALTER TABLE "badge_definitions" ADD COLUMN IF NOT EXISTS "criteria" jsonb;`);
let n=0;
for (const [key,name,emoji,color,audience,tier,metric,threshold] of ACH) {
  const r = await pool.query(
    `INSERT INTO badge_definitions (key,name,emoji,color,audience,awardable_by,tier,criteria,is_custom,description)
     VALUES ($1,$2,$3,$4,$5,'system',$6,$7,false,$8) ON CONFLICT (key) DO NOTHING`,
    [key,name,emoji,color,audience,tier,JSON.stringify({metric,threshold}),`Reach ${threshold} ${metric.replace('_',' ')}`]);
  n += r.rowCount ?? 0;
}
console.log(`Applied criteria col; seeded ${n} achievement badges.`);
await pool.end();
