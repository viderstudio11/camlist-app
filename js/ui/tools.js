import { esc, icons, toast } from './dom.js';
import { toolIcon, deptIcon } from './icons.js';
import { createMedia } from '../tools/media.js';
import { timeFromAngle, angleFromTime, asFraction, flicker, slowMotion, FRAME_RATES, shutterChoices } from '../tools/shutter.js';
import { PRIME_SET, SHOTS, lensFor, frameAt, pickLens, toUnit, fromUnit } from '../tools/fov.js';
import { sunDay, sunStatus, zoneOf, localTime, todayIn } from '../tools/solar.js';
import { offload, transfer, READERS, DRIVES, PORTS, UNIT_GROUPS, convert, cToF, fToC, mahToWh, whToMah, hoursReport, ndFrom, flightCheck } from '../tools/convert.js';
import { num, hm } from '../format.js';
import { activeProject } from '../home.js';
import { feel } from '../feel.js';
import { openViewfinder, closeViewfinder, rulerStops } from './viewfinder.js';

// Tool labels live here rather than in the global dictionary: they are only ever used on this screen,
// and keeping the pair next to the tool makes it obvious when one side is missing.
const L = {
  tools:      { he: 'כלי עזר', en: 'Tools' },
  tools_sub:  { he: 'מחשבונים לשטח — לא נכנסים לרשימה ולא להדפסה', en: 'Field calculators — they stay out of the list and out of the print' },
  media:      { he: 'מדיה', en: 'Media' },
  media_sub:  { he: 'כמה כרטיסים ליום צילום', en: 'How many cards a shoot day needs' },
  fov:        { he: 'בחירת עדשה', en: 'Lens choice' },
  fov_sub:    { he: 'איזה מוקד מכסה את הפריים מהמרחק הזה', en: 'Which focal length covers the frame from there' },
  shutter:    { he: 'פריים רייט ושאטר', en: 'Frame rate & shutter' },
  shutter_sub:{ he: 'זווית תריס, מהירות, ופליקר', en: 'Shutter angle, speed and flicker' },
  offload:    { he: 'זמן העתקה', en: 'Offload time' },
  offload_sub:{ he: 'כמה זמן ייקח הדאמפ בסוף היום', en: 'How long the dump takes at wrap' },
  sun:        { he: 'שקיעה וזריחה', en: 'Sun times' },
  sun_sub:    { he: 'שעת זהב, שעה כחולה, אורך יום', en: 'Golden hour, blue hour, day length' },
  units:      { he: 'המרת מידות', en: 'Unit conversion' },
  units_sub2: { he: '', en: '' },
  luts:       { he: 'מאגר לוטים', en: 'LUT bank' },
  luts_sub:   { he: 'איזה לוט הולך עם איזה לוג, ומאיפה מורידים', en: 'Which LUT goes with which log, and where to get it' },
  lut_pick:   { he: 'בחר מצלמה — נראה איזה לוג היא מצלמת ואיפה היצרן מפרסם את הלוט', en: 'Pick a camera — see the log it records and where its maker publishes the LUT' },
  lut_records:{ he: '{cam} מצלמת', en: '{cam} records' },
  lut_monitor:{ he: 'לניטור על הסט', en: 'Monitor with' },
  lut_download:{ he: 'הורדת הלוטים הרשמיים', en: 'Download the official LUTs' },
  lut_also:   { he: 'גם', en: 'Also' },
  lut_files:  { he: 'לוטים', en: 'LUTs' },
  brand_pick: { he: 'מותג', en: 'Brand' },
  country: { he: 'מדינה', en: 'Country' },
  hours: { he: 'דוח שעות', en: 'Hours report' },
  hours_sub: { he: 'קול טיים, ראפ, שעות נוספות וטרנאראונד', en: 'Call, wrap, overtime and turnaround' },
  call_time: { he: 'קול טיים', en: 'Call time' },
  wrap_time: { he: 'ראפ', en: 'Wrap' },
  break_min: { he: 'הפסקות (דקות)', en: 'Breaks (minutes)' },
  turnaround_h: { he: 'טרנאראונד נדרש', en: 'Required turnaround' },
  worked: { he: 'שעות עבודה', en: 'Hours worked' },
  next_call: { he: 'הקול המוקדם ביותר מחר', en: 'Earliest call tomorrow' },
  next_day: { he: 'למחרת', en: 'next day' },
  hr_regular: { he: 'רגילות', en: 'regular' },
  hr_at:      { he: 'ב־{p}%', en: 'at {p}%' },
  hr_pay:     { he: 'לתשלום', en: 'Pay' },
  hr_pay_split: { he: 'יום {day} + נוספות {ot}', en: 'day {day} + overtime {ot}' },
  hr_rest:    { he: '{h} שעות מנוחה', en: '{h} h rest' },
  hr_times:   { he: 'שעות', en: 'Times' },
  hr_breaks:  { he: 'הפסקות', en: 'Breaks' },
  hr_rules:   { he: 'שעות נוספות', en: 'Overtime' },
  hr_day:     { he: 'יום עבודה', en: 'Day length' },
  hr_first:   { he: 'תעריף ראשון', en: 'First tier' },
  hr_after:   { he: 'אחר כך', en: 'After that' },
  hr_rate:    { he: 'תעריף יומי (לא חובה)', en: 'Day rate (optional)' },
  hr_rate_note: { he: 'התעריף היומי מכסה את שעות היום; השעות הנוספות מחושבות לפי התעריף השעתי שיוצא ממנו', en: 'The day rate covers the day’s hours; overtime is paid on the hourly rate it implies' },
  u_length: { he: 'אורך', en: 'Length' }, u_weight: { he: 'משקל', en: 'Weight' }, u_data: { he: 'נתונים', en: 'Data' }, u_rate: { he: 'קצב', en: 'Rate' },
  u_battery: { he: 'סוללה', en: 'Battery' }, u_nd: { he: 'ND', en: 'ND' }, u_temp: { he: 'טמפרטורה', en: 'Temperature' },
  fly_ok:     { he: 'מותרת בטיסה — בתיק היד', en: 'Allowed on a flight — in carry-on' },
  fly_approval: { he: 'מעל 100Wh — רק באישור חברת התעופה, עד 2 רזרביות', en: 'Over 100 Wh — only with the airline’s approval, two spares at most' },
  fly_no:     { he: 'מעל 160Wh — אסורה בכבודת נוסע', en: 'Over 160 Wh — not allowed in passenger baggage' },
  fly_src_short: { he: 'כללי ליתיום לנוסעים', en: 'lithium rules for passengers' },
  fly_src:    { he: 'IATA: סוללת ליתיום־יון עד 100Wh מותרת בתיק היד; 100–160Wh באישור חברת התעופה (עד שתי רזרביות); מעל 160Wh אסורה בכבודת נוסע. רזרביות תמיד בתיק היד. בדוק גם את חברת התעופה שלך.', en: 'IATA: lithium-ion up to 100 Wh is allowed in carry-on; 100–160 Wh with the airline’s approval (two spares at most); over 160 Wh not in passenger baggage. Spares always in carry-on. Check your airline too.' },
  nd_density: { he: 'צפיפות', en: 'Density' }, nd_factor: { he: 'מקדם', en: 'Factor' }, nd_stops: { he: 'סטופים', en: 'Stops' }, nd_light: { he: 'אור שעובר', en: 'Light through' },
  lut_disclaimer: { he: 'הערות החשיפה הן נוהג מקובל על הסט, לא הוראה של היצרן. תמיד בדוק על הגוף שלך.', en: 'Exposure notes are common practice on set, not manufacturer instruction. Always test on your own body.' },
  units_sub:  { he: 'מטרי ואימפריאלי, נתונים, סוללות', en: 'Metric and imperial, data, batteries' },

  codec: { he: 'קודק', en: 'Codec' },
  camera_pick: { he: 'מצלמה', en: 'Camera' },
  format_pick: { he: 'פורמט', en: 'Format' },
  manual_fmt: { he: 'בחירה ידנית', en: 'Choose manually' },
  res: { he: 'רזולוציה', en: 'Resolution' },
  fps: { he: 'פריים רייט', en: 'Frame rate' },
  card: { he: 'גודל כרטיס', en: 'Card size' },
  bitrate: { he: 'קצב נתונים', en: 'Data rate' },
  per_hour: { he: 'לשעה', en: 'Per hour' },
  on_card: { he: 'על כרטיס אחד', en: 'On one card' },
  cards_needed: { he: 'כרטיסים ליום', en: 'Cards per day' },
  shoot_hours: { he: 'שעות צילום ביום', en: 'Shoot hours per day' },
  source: { he: 'מקור', en: 'Source' },

  sensor_f: { he: 'פורמט חיישן', en: 'Sensor format' },
  from_camera: { he: 'לפי מצלמה מהמאגר', en: 'From a camera in the catalog' },
  any_camera: { he: 'בחירה חופשית', en: 'Free choice' },
  matching_lenses: { he: 'עדשות שמתאימות', en: 'Lenses that fit' },
  no_lenses: { he: 'לא נמצאו עדשות מתאימות במאגר', en: 'No matching lenses in the catalog' },
  lens_count: { he: '{n} מהמאגר', en: '{n} in the catalog' },
  distance: { he: 'מרחק (מטר)', en: 'Distance (m)' },
  subject: { he: 'גודל פריים', en: 'Frame size' },
  frame_w: { he: 'רוחב פריים (מטר)', en: 'Frame width (m)' },
  need_lens: { he: 'המוקד הדרוש', en: 'Focal length needed' },
  nearest: { he: 'העדשה הקרובה בסט', en: 'Nearest prime in the set' },
  lens_note: { he: 'מסומנות העדשות שמכסות את המוקד הזה', en: 'The lenses that cover this focal length are marked' },
  covers: { he: 'מכסה', en: 'Covers' },
  angle_h: { he: 'זווית אופקית', en: 'Horizontal angle' },
  check_lens: { he: 'בדיקה הפוכה — מה עדשה נתונה מכסה', en: 'The other way round — what a given lens covers' },
  framing: { he: 'איך זה ייראה', en: 'How it frames' },
  person_note: { he: 'הדמות בגובה 1.75 מ׳ — לפי זה אפשר לקרוא את הפריים', en: 'The figure is 1.75 m — read the frame against it' },
  viewfinder: { he: 'ויופיינדר חי', en: 'Live viewfinder' },
  vf_start: { he: 'פתח את מצלמת הטלפון', en: 'Open the phone camera' },
  vf_ruler: { he: 'בחירת מוקד', en: 'Focal length' },
  rec_format: { he: 'פורמט צילום', en: 'Recording format' },
  same_frame: { he: 'אותו פריים כמו {list}', en: 'same frame as {list}' },
  n_formats: { he: '{n} פורמטים', en: '{n} formats' },
  mode_approx: { he: 'היצרן מפרסם את המצב הזה כיחס קרופ ולא במ״מ — הגודל מחושב ממנו', en: 'The maker gives this mode as a crop factor, not in mm — the size is worked out from it' },
  sensor_format: { he: 'פורמט חיישן', en: 'Sensor format' },
  fmt_all: { he: 'הכל', en: 'All' },
  fmt_FF: { he: 'פול־פריים', en: 'Full frame' },
  fmt_S35: { he: 'Super 35', en: 'Super 35' },
  fmt_MFT: { he: 'MFT', en: 'MFT' },
  frame_at: { he: '{mm} מ״מ מ־{d} {u}: פריים {w} × {h} {u}', en: '{mm} mm from {d} {u}: frame {w} × {h} {u}' },
  vf_at: { he: 'מ־{d} {u}: {w} × {h} {u}', en: 'At {d} {u}: {w} × {h} {u}' },
  lens_now: { he: 'עדשה', en: 'Lens' },
  lens_wider: { he: 'עדשה רחבה יותר', en: 'Wider lens' },
  lens_longer: { he: 'עדשה ארוכה יותר', en: 'Longer lens' },
  vf_hold: { he: 'גוללים את החוגה או מחליקים על התמונה. החזקה ארוכה על עדשה משווה אותה לנוכחית.', en: 'Turn the dial or swipe the picture. Hold a lens to compare it with the current one.' },
  vf_cmp_clear: { he: 'בטל השוואה', en: 'Clear comparison' },
  vf_turn: { he: 'החלפה בין רוחב לאורך', en: 'Switch between landscape and portrait' },
  vf_to_landscape: { he: 'לרוחב', en: 'Landscape' },
  vf_to_portrait: { he: 'לאורך', en: 'Portrait' },
  maker: { he: 'יצרן', en: 'Maker' },
  model_of: { he: 'דגם · {brand}', en: 'Model · {brand}' },
  pick_maker_first: { he: 'בחר יצרן כדי לראות את הדגמים', en: 'Pick a maker to see its models' },
  vf_rotate: { he: 'העדשה הזו רחבה מהטלפון כשהוא עומד — סובב את הטלפון לרוחב ותראה את כל הפריים.', en: 'This lens is wider than the phone held upright — turn the phone sideways to see the whole frame.' },
  calc_by_distance: { he: 'חישוב לפי מרחק וגודל שוט', en: 'Work it out from distance and shot size' },
  in_catalog: { he: 'במאגר', en: 'In the catalog' },
  from_project: { he: 'מהפרויקט הפעיל', en: 'From the active project' },
  change: { he: 'החלפה', en: 'Change' },
  vf_stop: { he: 'סגור', en: 'Close' },
  vf_hint: { he: 'רואים במצלמת הטלפון מה כל עדשה תתפוס על {cam} מהמקום שאתה עומד בו. גוללים בין העדשות והמסגרת משתנה בלייב.', en: 'See on your phone camera what each lens takes in on the {cam} from where you stand. Scroll through lenses and the frame follows live.' },
  vf_wider: { he: 'העדשה הזו רחבה יותר ממה שהטלפון רואה — כל המסך בתוך הפריים. התרחק או בחר עדשה ארוכה יותר.', en: 'This lens is wider than the phone sees — the whole screen is inside the frame. Step back or pick a longer lens.' },
  vf_denied: { he: 'אין גישה למצלמה. צריך לאשר הרשאה בדפדפן.', en: 'No camera access. The browser needs permission.' },
  vf_approx: { he: 'הערכה לפי המצלמה הראשית של הטלפון (1×). גוללים בפס או מחליקים על התמונה.', en: 'An estimate based on the phone’s main (1×) camera. Scroll the strip or swipe the picture.' },
  focal: { he: 'מוקד (מ״מ)', en: 'Focal length (mm)' },
  camera_step: { he: 'מצלמה', en: 'Camera' },
  distance_step: { he: 'מרחק מהמצולם', en: 'Distance to subject' },
  shot_step: { he: 'סוג שוט', en: 'Shot size' },
  meters: { he: 'מ׳', en: 'm' },
  feet: { he: 'רגל', en: 'ft' },
  verified_only: { he: 'מופיעות רק מצלמות שגודל החיישן שלהן אומת מול היצרן', en: 'Only cameras whose sensor size has been verified with the maker are listed' },
  sensor_line: { he: 'חיישן {w}×{h} מ״מ · {mode}', en: 'Sensor {w}×{h} mm · {mode}' },
  choose_camera_first: { he: 'בחר מצלמה — לפי החיישן שלה נחשב איזו עדשה צריך', en: 'Pick a camera — its sensor decides which lens you need' },
  need_sentence: { he: 'מ־{d} {u}, שוט {shot} על {cam} — מדויק: {mm} מ״מ', en: 'From {d} {u}, a {shot} on {cam} — exactly {mm} mm' },
  frame_line: { he: 'הפריים: {w}×{h} {u} · זווית {a}°', en: 'Frame: {w}×{h} {u} · {a}° wide' },
  lenses_for: { he: 'עדשות מהמאגר שמתאימות ל־{cam}', en: 'Lenses in the catalog that fit {cam}' },
  standard_primes: { he: 'פריימים סטנדרטיים', en: 'Standard primes' },
  tap_lens_hint: { he: 'לחיצה על עדשה מראה בציור מה היא נותנת', en: 'Tap a lens to see what it gives in the drawing' },
  prime_lbl: { he: 'פריים', en: 'Prime' },
  zoom_lbl: { he: 'זום', en: 'Zoom' },
  back_to_rec: { he: 'חזרה להמלצה ({mm} מ״מ)', en: 'Back to the pick ({mm} mm)' },

  angle: { he: 'זווית תריס', en: 'Shutter angle' },
  speed: { he: 'מהירות תריס', en: 'Shutter speed' },
  mains: { he: 'תדר רשת החשמל', en: 'Mains frequency' },
  flicker_ok: { he: 'נקי מפליקר', en: 'Flicker free' },
  flicker_bad: { he: 'עלול להבהב בתאורת רשת', en: 'May flicker under mains light' },
  safe_angles: { he: 'זוויות בטוחות בפריים רייט הזה', en: 'Safe angles at this frame rate' },
  project_fps: { he: 'פריים רייט של הפרויקט', en: 'Project frame rate' },
  shutter_lbl: { he: 'שאטר', en: 'Shutter' },
  media_pick_first: { he: 'בחר מצלמה — הפורמטים והקצבים מגיעים מהיצרן שלה', en: 'Pick a camera — its formats and rates come from its maker' },
  cards_of:   { he: 'כרטיסים של {card}', en: 'cards of {card}' },
  media_sentence: { he: '{h} שעות {fmt} ב־{fps} על {cam} = {total}. כרטיס אחד מחזיק {per}.', en: '{h} hours of {fmt} at {fps} on {cam} = {total}. One card holds {per}.' },
  src_official: { he: 'נתון רשמי', en: 'Official' },
  src_estimate: { he: 'הערכה', en: 'Estimate' },
  max_rate:   { he: 'עד {r} Mbps — הקצב המרבי שהיצרן מפרסם, לכן החישוב מחמיר (לעולם לא חסר)', en: 'up to {r} Mbps — the maximum the maker publishes, so this errs on the safe side' },
  cap_rate:   { he: '{r} Mbps — התקרה של המצלמה ({mb} MB/s), כך שבקצב הזה ה־R3D נדחס יותר', en: '{r} Mbps — the camera’s top write speed ({mb} MB/s), so R3D compresses harder at this rate' },
  usable_note: { he: '(בפועל {u} לכרטיס)', en: '({u} usable per card)' },
  backup_lbl: { he: 'גיבוי — הקלטה לשני הכרטיסים במקביל', en: 'Backup — record to both slots at once' },
  backup_note: { he: 'עם גיבוי, כל טייק נשמר על שני כרטיסים.', en: 'With backup, every take is on two cards.' },
  to_offload: { he: 'כמה זמן לפרוק {total}? ←', en: 'Offload time for {total} →' },
  src_more:   { he: 'מקור', en: 'Source' },
  card_src:   { he: 'גדלי כרטיסים: {s}', en: 'Card sizes: {s}' },
  eff_rate:   { he: '≈{r} Mbps בפועל, לפי זמני ההקלטה של היצרן', en: '≈{r} Mbps effective, from the maker’s recording times' },
  speed_short: { he: 'מהירות', en: 'Speed' },
  angle_short: { he: 'זווית', en: 'Angle' },
  recommended: { he: 'מומלץ', en: 'best' },
  other_val:  { he: 'אחר…', en: 'Other…' },
  mains_50:   { he: '50Hz · ישראל ואירופה', en: '50 Hz · Israel & Europe' },
  mains_60:   { he: '60Hz · ארה״ב', en: '60 Hz · USA' },
  sh_safe:    { he: 'לא יהבהב בתאורת חשמל של {hz}Hz', en: 'No flicker under {hz} Hz mains light' },
  sh_unsafe:  { he: 'עלול להבהב בתאורת חשמל של {hz}Hz — עדיף {rec}', en: 'May flicker under {hz} Hz mains light — use {rec}' },
  sh_none:    { he: 'בפריים רייט הזה אין שאטר שלא מהבהב ב־{hz}Hz — צריך תאורה בלי הבהוב (LED איכותי או HMI אלקטרוני)', en: 'No shutter at this frame rate avoids {hz} Hz flicker — use flicker-free lights (good LED or electronic HMI)' },
  sh_realtime: { he: 'מהירות רגילה', en: 'real time' },
  sh_slow:    { he: 'הילוך איטי פי {n}', en: '{n}× slow motion' },
  sh_fast:    { he: 'הילוך מהיר פי {n}', en: '{n}× fast motion' },
  sh_hint:    { he: '✓ = לא מהבהב בתאורת חשמל. "מומלץ" = הכי קרוב ל־180°, התנועה הטבעית שהעין רגילה אליה.', en: '✓ = no mains flicker. "best" = nearest to 180°, the motion blur the eye is used to.' },
  slowmo: { he: 'סלואו מושן', en: 'Slow motion' },

  footage: { he: 'כמות חומר', en: 'Footage' },
  off_source: { he: 'מקור — הכרטיס בקורא', en: 'Source — the card in its reader' },
  off_for:    { he: 'שעות לפריקת {gb}', en: 'to offload {gb}' },
  off_sentence: { he: '{gb} מ־{src} אל {dst}, {n} עותקים אחד אחרי השני.', en: '{gb} from {src} to {dst}, {n} copies one after another.' },
  off_verify: { he: 'כל עותק נקרא בחזרה לאימות.', en: 'Each copy is read back to verify it.' },
  off_noverify: { he: 'בלי אימות.', en: 'No verify.' },
  off_each:   { he: '{n} מעברים × {t} · צריך {space} בכוננים', en: '{n} passes × {t} · needs {space} across the drives' },
  off_limit_src: { he: 'הקורא הוא צוואר הבקבוק — כונן מהיר יותר לא יקצר.', en: 'The card reader sets the pace — a faster drive won’t help.' },
  off_limit_src2: { he: 'הקוראים הם צוואר הבקבוק — כונן מהיר יותר לא יקצר.', en: 'The card readers set the pace — a faster drive won’t help.' },
  off_limit_port: { he: 'יציאת המחשב היא צוואר הבקבוק — יציאה מהירה יותר תקצר.', en: 'The computer’s port sets the pace — a faster port would cut the time.' },
  off_per_card: { he: 'בכל החלפת כרטיס: {card} לוקח {t}, כולל העותקים.', en: 'Each card change: {card} takes {t}, copies included.' },
  off_readers: { he: 'קוראים במקביל', en: 'Readers at once' },
  off_port:   { he: 'יציאה במחשב', en: 'Computer port' },
  off_limit_dst: { he: 'הכונן הוא צוואר הבקבוק — כונן מהיר יותר יקצר את הזמן.', en: 'The drive sets the pace — a faster drive would cut the time.' },
  off_maker:  { he: 'נתון יצרן', en: 'Maker spec' },
  off_caveat: { he: 'המהירות המרבית שהיצרן מפרסם — בפועל זה לרוב קצת יותר לאט', en: 'the top speed the maker publishes — real offloads usually run a little slower' },
  off_from_media: { he: 'מכלי המדיה: יום הצילום שחישבת', en: 'From the media tool: the shoot day you worked out' },
  drive: { he: 'יעד', en: 'Destination' },
  copies: { he: 'מספר עותקים', en: 'Copies' },
  verify: { he: 'כולל אימות', en: 'Verify each copy' },

  place: { he: 'מקום', en: 'Place' },
  date: { he: 'תאריך', en: 'Date' },
  my_location: { he: 'המיקום שלי', en: 'My location' },
  sunrise: { he: 'זריחה', en: 'Sunrise' },
  sunset: { he: 'שקיעה', en: 'Sunset' },
  golden_am: { he: 'שעת זהב · בוקר', en: 'Golden hour · morning' },
  golden_pm: { he: 'שעת זהב · ערב', en: 'Golden hour · evening' },
  blue_am: { he: 'שעה כחולה · בוקר', en: 'Blue hour · morning' },
  blue_pm: { he: 'שעה כחולה · ערב', en: 'Blue hour · evening' },
  noon: { he: 'שיא היום', en: 'Solar noon' },
  day_len: { he: 'אורך יום', en: 'Day length' },
  sun_at:     { he: 'שקיעה · {place} · {day}', en: 'sunset · {place} · {day}' },
  sun_morning: { he: 'בוקר: זריחה {rise} · שעת זהב {gold} · שעה כחולה {blue} · אורך היום {len}', en: 'Morning: sunrise {rise} · golden {gold} · blue {blue} · day length {len}' },
  tz_note:    { he: 'השעות לפי השעון המקומי ב{place} ({tz})', en: 'Times are local to {place} ({tz})' },
  sun_calc:   { he: 'מחושב לפי משוואות השמש של NOAA', en: 'worked out with NOAA’s solar equations' },
  sun_src:    { he: 'זריחה ושקיעה: מרכז השמש 0.833° מתחת לאופק (כולל שבירת אור). שעת זהב: השמש עד 6° מעל האופק. שעה כחולה: השמש בין 0° ל־6° מתחת לאופק (דמדומים אזרחיים).', en: 'Sunrise and sunset: the sun’s centre 0.833° below the horizon (allowing for refraction). Golden hour: the sun up to 6° above the horizon. Blue hour: the sun 0–6° below it (civil twilight).' },
  golden:     { he: 'שעת זהב', en: 'Golden hour' },
  blue:       { he: 'שעה כחולה', en: 'Blue hour' },
  dark:       { he: 'חושך', en: 'Dark' },
  st_sunrise_in: { he: 'הזריחה בעוד {t}', en: 'Sunrise in {t}' },
  st_golden_in:  { he: 'שעת הזהב מתחילה בעוד {t}', en: 'Golden hour starts in {t}' },
  st_golden_now: { he: 'שעת הזהב עכשיו — השקיעה בעוד {t}', en: 'Golden hour now — sunset in {t}' },
  st_blue_now:   { he: 'השעה הכחולה עכשיו — חושך בעוד {t}', en: 'Blue hour now — dark in {t}' },
  st_dark:       { he: 'השמש כבר שקעה להיום', en: 'The sun has set for today' },
  today:      { he: 'היום', en: 'Today' },
  tomorrow:   { he: 'מחר', en: 'Tomorrow' },
  other_date: { he: 'תאריך אחר…', en: 'Other date…' },
  polar: { he: 'במקום הזה השמש לא זורחת או לא שוקעת בתאריך הזה', en: 'At this place the sun does not rise or set on this date' },

  volts: { he: 'מתח (V)', en: 'Voltage (V)' },
  back_tools: { he: 'כל הכלים', en: 'All tools' },
};

let media = createMedia({});
export const setCodecs = (data) => { media = createMedia(data); };

let lutData = { logs: [] };
export const setLuts = (data) => { lutData = data || lutData; };

let placeData = { countries: [], defaultCountry: 'IL' };
export const setPlaces = (data) => { placeData = data || placeData; };

// Everything the user typed, kept while the app is open so switching tools does not reset the work.
const S = {
  media: { brand: 'Sony', cam: 'fx6', fmt: '', fps: 25, mtype: '', card: 0, cardPicked: false, customCard: false, backup: false, hours: 10, customHours: false },
  fov: { distance: 4, unit: 'm', shot: 'waist', focal: 0, cam: '', camBrand: '', fmt: '', modes: {}, picking: false, fromProject: false, calcOpen: false },
  shutter: { fps: 25, mode: 'speed', speed: 50, angle: 180, mains: 50, projectFps: 25, customFps: false },
  offload: { gb: 1000, reader: 'CFexpress A', drive: 'ssd10', copies: 2, verify: true, customGb: false, fromMedia: false, readOther: false, readMBs: 800, writeOther: false, writeMBs: 1000, readers: 1, port: 'tb', cardGb: 0 },
  sun: { country: 'IL', city: 0, date: new Date().toISOString().slice(0, 10), dateMode: 'today', lat: null, lon: null },
  units: { group: 'length', from: 'm', value: 1, mah: 6600, volts: 14.4, batMode: 'mah', wh: 98, ndKind: 'density', nd: 0.9, temp: 20, tempUnit: 'c' },
  luts: { brand: '', model: '' },
  hours: { call: '07:00', wrap: '19:30', breaks: 60, customBreaks: false, base: 10, tier1h: 2, tier1pct: 125, tier2pct: 150, turnaround: 11, dayRate: 0 },
};

// The lens tool remembers its camera and last lens on this phone, so opening it again picks up where
// the user left off. Kept in this browser only; losing it just means starting from the project's camera.
const FOV_KEY = 'camlist.fov';
const FOV_KEEP = ['cam', 'camBrand', 'fmt', 'modes', 'focal', 'distance', 'unit', 'shot'];
try {
  const kept = JSON.parse(localStorage.getItem(FOV_KEY) || '{}');
  for (const k of FOV_KEEP) if (kept[k] != null) S.fov[k] = kept[k];
} catch { /* private window or blocked storage */ }
const keepFov = () => { try { localStorage.setItem(FOV_KEY, JSON.stringify(Object.fromEntries(FOV_KEEP.map(k => [k, S.fov[k]])))); } catch { /* ignore */ } };

// Short labels for places outside the tools screen (the home screen's tool row).
export const toolLabel = (k, lang) => L[k]?.[lang] ?? L[k]?.he ?? k;

const TOOLS = ['media', 'fov', 'shutter', 'hours', 'offload', 'sun', 'luts', 'units'];


export function render(ctx, { tool: id }, root) {
  const lang = ctx.lang();
  const T = (k) => L[k]?.[lang] ?? L[k]?.he ?? k;

  if (!id) {
    closeViewfinder();
    ctx.setTopbar({ title: esc(T('tools')), back: '#/' });
    root.innerHTML = `
      <p class="screen-sub">${esc(T('tools_sub'))}</p>
      <div class="tool-grid">${TOOLS.map(k => `
        <button class="tool-tile" data-tool="${k}">
          <span class="tool-ico">${toolIcon(k)}</span>
          <b>${esc(T(k))}</b>
          <small>${esc(T(`${k}_sub`))}</small>
        </button>`).join('')}</div>`;
    root.querySelectorAll('[data-tool]').forEach(btn => {
      btn.onclick = () => ctx.navigate(`#/tools/${btn.dataset.tool}`);
    });
    return;
  }

  if (id !== 'fov') closeViewfinder();
  ctx.setTopbar({ title: esc(T(id)), back: '#/tools' });
  const body = { media: mediaTool, fov: fovTool, shutter: shutterTool, hours: hoursTool, offload: offloadTool, sun: sunTool, luts: lutsTool, units: unitsTool }[id];
  if (!body) { ctx.navigate('#/tools'); return; }
  root.innerHTML = `<div class="tool">${body(T, lang, ctx)}</div>`;
  wire(root, ctx, id, T, lang);
}

// ---------- shared field helpers ----------
const field = (label, inner) => `<label class="tfield"><span>${esc(label)}</span>${inner}</label>`;
const sel = (name, options, value) => `<select data-f="${name}">${options.map(o =>
  `<option value="${esc(o.v)}" ${String(o.v) === String(value) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
const numIn = (name, value, { min = 0, max = 100000, step = 'any' } = {}) =>
  `<input type="number" data-f="${name}" value="${esc(value)}" min="${min}" max="${max}" step="${step}" inputmode="decimal">`;
const out = (rows) => `<div class="tout">${rows.map(([k, v, cls = '']) =>
  `<div class="torow ${cls}"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>`;

// Every tool leads with its answer. The form is what you adjust; this is what you came for.
const headline = (value, unit, caption, cls = '') => `<div class="thead ${cls}">
  <div class="thead-v"><b>${value}</b>${unit ? `<i>${esc(unit)}</i>` : ''}</div>
  ${caption ? `<div class="thead-c">${caption}</div>` : ''}
</div>`;

// ---------- media ----------
const HOUR_CHIPS = [2, 4, 6, 8, 10, 12, 14];
const fpsVal = (v) => (/i$/.test(v) ? v : Number(v));

function mediaTool(T) {
  const s = S.media;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const chip = (attr, val, label, on, extra = '') => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}${extra}</button>`;
  const gb = (x) => (x >= 1000 ? `${num(x / 1000, x % 1000 ? 2 : 0)} TB` : `${num(x, 0)} GB`);

  // Maker first, then the body, then what that body records: three short lists, never a long one.
  const cams = media.cameras.filter(c => c.brand && c.brand !== '—' && c.formats?.length);
  const brands = [...new Set(cams.map(c => c.brand))];
  const cam = cams.find(c => c.id === s.cam) || null;
  if (cam && !s.brand) s.brand = cam.brand;
  const models = cams.filter(c => c.brand === s.brand);
  const fmts = cam ? media.formatsOf(cam) : [];
  const fmt = fmts.find(f => f.key === s.fmt) || fmts[0] || null;
  if (fmt) {
    s.fmt = fmt.key;
    if (!fmt.fps.includes(s.fps)) s.fps = [...fmt.fps].sort((a, b) => Math.abs(parseFloat(a) - 25) - Math.abs(parseFloat(b) - 25))[0];
  }

  // The cards this camera takes. Until the user picks one, the card the maker's own table used.
  const types = cam ? media.mediaOf(cam) : [];
  const kinds = types.length ? types : [{ type: '', sizes: media.cards }];
  if (!s.cardPicked || !kinds.some(t => t.type === s.mtype)) {
    const d = media.defaultCard(cam, fmt) || { type: kinds[0].type, size: kinds[0].sizes[kinds[0].sizes.length >> 1] };
    s.mtype = d.type; s.card = d.size;
  }
  const kind = kinds.find(t => t.type === s.mtype) || kinds[0];
  const usable = media.usableGb(s.mtype, s.card);
  const copies = s.backup && !cam?.oneSlot ? 2 : 1;

  const rate = fmt ? fmt.rate(s.fps) : 0;
  const onCard = media.hoursOn(usable, rate);
  const cards = media.cardsFor(s.hours, usable, rate, copies);
  const totalGb = media.gbPerHour(rate) * s.hours;
  const cardName = `${gb(s.card)}${s.mtype ? ` ${s.mtype}` : ''}`;

  const pick = `<div class="card sh-sec" data-part="cam">
    <div class="tsub">1 · ${esc(T('camera_step'))}</div>
    <div class="chips">${brands.map(b => chip('data-mbrand', b, esc(b), b === s.brand)).join('')}</div>
    ${models.length ? `<div class="chips fov-models">${models.map(c => chip('data-mcam', c.id, esc(c.label), cam && c.id === cam.id)).join('')}</div>` : ''}
  </div>`;
  if (!cam) return `<div class="card sh-answer warn"><p class="sh-line">${esc(T('media_pick_first'))}</p></div>${pick}`;

  // How the rate was reached, in one line; where it comes from, one tap away.
  const rateLine = fmt.capped?.(s.fps) ? Tp('cap_rate', { r: num(rate, 0), mb: num(rate / 8, 0) })
    : fmt.maxOnly ? Tp('max_rate', { r: num(rate, 0) })
      : fmt.fromTimes ? Tp('eff_rate', { r: num(rate, 0) }) : `${num(rate, 0)} Mbps`;
  const sources = [fmt.src, kind.src ? Tp('card_src', { s: kind.src }) : ''].filter(Boolean);

  const shown = Math.min(cards, 24);
  const answer = `<div class="card sh-answer ok">
    <div class="fov-top"><b class="sh-big">${cards || '—'}</b><span class="sh-small">${esc(Tp('cards_of', { card: cardName }))}</span></div>
    <p class="sh-line">${esc(Tp('media_sentence', { h: s.hours, fmt: fmt.label, fps: s.fps, cam: cam.label, total: gb(Math.round(totalGb)), per: hm(onCard) }))}${usable !== s.card ? ` ${esc(Tp('usable_note', { u: gb(usable) }))}` : ''}${copies > 1 ? ` ${esc(T('backup_note'))}` : ''}</p>
    ${cards ? `<div class="cards">${Array.from({ length: shown }, (_, i) => {
      // with a backup, the cards come in identical pairs; the last pair is the part-filled one
      const set = Math.floor(i / copies), sets = cards / copies;
      const part = set === sets - 1 ? (s.hours / onCard) % 1 || 1 : 1;
      return `<span class="cardchip${copies > 1 && i % 2 ? ' twin' : ''}"><i style="height:${(part * 100).toFixed(0)}%"></i><em>${gb(s.card)}</em></span>`;
    }).join('')}${cards > 24 ? `<span class="cardmore">+${cards - 24}</span>` : ''}</div>` : ''}
    <details class="src-more">
      <summary><span class="src-badge ${fmt.official ? 'ok' : 'est'}">${esc(T(fmt.official ? 'src_official' : 'src_estimate'))}</span> ${esc(rateLine)} <span class="src-i" aria-label="${esc(T('src_more'))}">ⓘ</span></summary>
      ${sources.map(x => `<p>${esc(x)}</p>`).join('')}
    </details>
    ${totalGb > 0 ? `<button class="to-offload" data-to-offload="${Math.round(totalGb)}">${esc(Tp('to_offload', { total: gb(Math.round(totalGb)) }))}</button>` : ''}
  </div>`;

  // Frame size first, then the codecs recorded at it: two short rows instead of one long one.
  const groups = media.groupFormats(fmts);
  const group = groups.find(g => g.formats.includes(fmt)) || groups[0];
  const hoursOther = !HOUR_CHIPS.includes(s.hours) || s.customHours;
  const cardOther = !kind.sizes.includes(s.card) || s.customCard;

  return `${answer}${pick}
    <div class="card sh-sec">
      <div class="tsub">2 · ${esc(T('format_pick'))}</div>
      ${groups.length > 1 ? `<div class="chips">${groups.map(g => chip('data-mres', g.res, esc(g.res), g === group)).join('')}</div>` : `<p class="tnote">${esc(group.res)}</p>`}
      <div class="chips fov-models">${group.formats.map(f => chip('data-mfmt', f.key, esc(f.codec), f.key === fmt.key)).join('')}</div>
    </div>
    <div class="card sh-sec">
      <div class="tsub">3 · ${esc(T('fps'))}</div>
      <div class="chips">${fmt.fps.map(x => chip('data-mfps', x, String(x), x === s.fps)).join('')}</div>
    </div>
    <div class="card sh-sec">
      <div class="tsub">4 · ${esc(T('card'))}</div>
      ${kinds.length > 1 ? `<div class="chips">${kinds.map(t => chip('data-mtype', t.type, esc(t.type), t.type === s.mtype)).join('')}</div>` : kind.type ? `<p class="tnote">${esc(kind.type)}</p>` : ''}
      <div class="chips fov-models">${kind.sizes.map(x => chip('data-mcard', x, gb(x), !cardOther && x === s.card)).join('')}${chip('data-mcard-custom', 1, esc(T('other_val')), cardOther)}</div>
      ${cardOther ? `<div class="sh-custom">${field('GB', numIn('card', s.card, { min: 1, max: 100000, step: 1 }))}</div>` : ''}
      ${cam.oneSlot ? '' : `<label class="switch"><span>${esc(T('backup_lbl'))}</span><input type="checkbox" data-f="backup" ${s.backup ? 'checked' : ''}></label>`}
    </div>
    <div class="card sh-sec">
      <div class="tsub">5 · ${esc(T('shoot_hours'))}</div>
      <div class="chips">${HOUR_CHIPS.map(x => chip('data-mhours', x, String(x), !hoursOther && x === s.hours)).join('')}${chip('data-mhours-custom', 1, esc(T('other_val')), hoursOther)}</div>
      ${hoursOther ? `<div class="sh-custom">${field(T('shoot_hours'), numIn('hours', s.hours, { min: 0.5, max: 48, step: 0.5 }))}</div>` : ''}
    </div>`;
}

// ---------- field of view ----------
// A 1.75 m figure drawn once in a 60 × 175 box — one unit to the centimetre — then placed with a
// transform, so the proportions hold at any size. Seven and a half heads tall.
const FIG_W = 60, FIG_H = 175;
const FIG = [
  '<ellipse cx="30" cy="14" rx="8.6" ry="11"/>',
  '<path d="M26.6 24.6 L26.6 29 L33.4 29 L33.4 24.6"/>',
  '<path d="M13 33 Q13 29.4 16.6 29 L43.4 29 Q47 29.4 47 33 L44.6 67 L46.4 90 L13.6 90 L15.4 67 Z"/>',
  '<path d="M13.4 33.4 L8.6 35.6 L5.6 88 L10.8 89 L15.2 66"/>',
  '<path d="M46.6 33.4 L51.4 35.6 L54.4 88 L49.2 89 L44.8 66"/>',
  '<path d="M15.6 90 L28.4 90 L27.6 128 L26.4 168 L17.6 168 L18.2 128 Z"/>',
  '<path d="M44.4 90 L31.6 90 L32.4 128 L33.6 168 L42.4 168 L41.8 128 Z"/>',
  '<path d="M16.4 168 L11.6 172 L11.6 174.4 L27 174.4 L27 168"/>',
  '<path d="M43.6 168 L48.4 172 L48.4 174.4 L33 174.4 L33 168"/>',
].join('');

// Distance slider: logarithmic, 0.5 m to 30 m, so the short distances where a step matters get
// most of the travel.
const DIST_MIN = 0.5, DIST_MAX = 30;
const distToSlider = (d) => Math.round((Math.log(d / DIST_MIN) / Math.log(DIST_MAX / DIST_MIN)) * 1000);
const sliderToDist = (v) => {
  const d = DIST_MIN * (DIST_MAX / DIST_MIN) ** (v / 1000);
  return d < 3 ? Math.round(d * 10) / 10 : d < 10 ? Math.round(d * 4) / 4 : Math.round(d);
};

// What the full-screen viewfinder needs, from the tool's last render.
let fovView = null;
function fovTool(T, lang, ctx) {
  fovView = null;
  const s = S.fov;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const name = (o) => (lang === 'he' ? o.he : o.en);
  const unit = s.unit === 'ft' ? 'ft' : 'm';
  const uLabel = T(unit === 'ft' ? 'feet' : 'meters');
  // A distance in the chosen unit, rounded the way a tape measure is read.
  const dist = (m) => { const v = toUnit(m, unit); return num(v, v < 10 ? 1 : 0); };

  // Only cameras whose recording sensor area has been verified are offered — the answer is only
  // as right as that number, so a camera without it is left out rather than guessed.
  const cams = (ctx?.compat?.profiles || [])
    .filter(p => p.sensor)
    .map(p => { const product = ctx.catalog.byId(p.id); return { prof: product ? ctx.compat.profileFor(product) : null, product }; })
    .filter(x => x.product && x.prof)
    .sort((a, b) => (b.prof.year || 0) - (a.prof.year || 0) || a.product.name.localeCompare(b.product.name));
  const FORMATS = ['FF', 'S35', 'MFT'].filter(k => cams.some(c => c.prof.format === k));
  if (s.fmt && !FORMATS.includes(s.fmt)) s.fmt = '';
  const inFmt = s.fmt ? cams.filter(c => c.prof.format === s.fmt) : cams;
  const brands = [...new Map(inFmt.map(c => [c.product.brand, c.product.brandName || c.product.brand])).entries()];
  if (s.camBrand && !brands.some(([b]) => b === s.camBrand) && s.picking) s.camBrand = '';
  if (!s.camBrand && brands.length === 1) s.camBrand = brands[0][0];
  // Catalog names carry the maker's marketing tail ('8K Digital Motion Picture Camera'); the model is enough here.
  const short = (c) => c.product.name.replace(/s+(d+Ks+)?(Digital Motion Picture|Digital Cinema|Mirrorless|Cinema|Full[- ]Frame)?s*Camera.*$/i, '').trim() || c.product.name;
  const frameKey = (c) => (c.prof.sensor.modes?.length ? JSON.stringify(c.prof.sensor.modes.map(m => [m.w, m.h])) : `${c.prof.sensor.w}x${c.prof.sensor.h}`);
  const groupBy = (list) => { const g = new Map(); for (const c of list) { const k = frameKey(c); if (!g.has(k)) g.set(k, []); g.get(k).push(c); } return [...g.values()]; };
  const models = groupBy(inFmt.filter(c => c.product.brand === s.camBrand));
  const fmtCount = (k) => new Set(cams.filter(c => c.prof.format === k).map(frameKey)).size;
  if (!s.cam && !s.picking) {
    const p = activeProject(ctx.store.state.projects || []);
    const pc = p && cams.find(c => String(c.product.id) === String(p.buildCameraId));
    if (pc) Object.assign(s, { cam: String(pc.prof.id), camBrand: pc.product.brand, fromProject: true });
  }
  const cam = cams.find(c => String(c.prof.id) === String(s.cam)) || null;
  const shot = SHOTS.find(x => x.id === s.shot) || SHOTS[3];
  const chip = (attr, val, label, on, extra = '') => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}${extra}</button>`;

  // The camera: one line once chosen; the brand and model lists open only to change it.
  const modesOf = (c) => c?.prof.sensor.modes || [];
  const modeOf = (c) => { const ms = modesOf(c); return ms.find(m => m.id === s.modes?.[c.prof.id]) || ms[0] || null; };
  const areaOf = (c) => { const m = modeOf(c); return m ? { w: m.w, h: m.h, mode: m.label } : c.prof.sensor; };
  const curArea = cam ? areaOf(cam) : null;
  const sensorNote = cam ? [T('fmt_' + cam.prof.format), curArea.mode].filter(Boolean).join(' · ') : '';
  // Each recording format reads a different window of the sensor, so the choice changes the frame.
  const modeRow = cam && modesOf(cam).length > 1
    ? `<div class="fov-modes"><div class="tsub">${esc(T('rec_format'))}</div><div class="chips">${modesOf(cam).map(m => chip('data-cmode', m.id, esc(m.label), modeOf(cam).id === m.id)).join('')}</div>${modeOf(cam).pending ? `<p class="tnote">${esc(T('mode_approx'))}</p>` : ''}</div>`
    : '';
  const pickCard = cam && !s.picking
    ? `<div class="card sh-sec fov-cam" data-part="cam">
        <div class="fov-cam-row"><span class="fov-cam-ico" aria-hidden="true">${deptIcon('cameras')}</span><div class="fov-cam-txt"><div class="tsub">${esc(T('camera_step'))}${s.fromProject ? ` · ${esc(T('from_project'))}` : ''}</div><b>${esc(short(cam))}</b><p class="tnote">${esc(sensorNote)}</p></div>
        <button class="btn sm" data-cchange>${esc(T('change'))}</button></div>
        ${modeRow}
      </div>`
    : `<div class="card sh-sec" data-part="cam">
        <div class="tsub">1 · ${esc(T('sensor_format'))}</div>
        <div class="chips">${chip('data-cfmt', '', esc(T('fmt_all')), !s.fmt)}${FORMATS.map(k => chip('data-cfmt', k, `${esc(T('fmt_' + k))} <i class="n">${fmtCount(k)}</i>`, s.fmt === k)).join('')}</div>
        <div class="tsub" style="margin-top:12px">2 · ${esc(T('maker'))}</div>
        <div class="chips">${brands.map(([slug, n]) => chip('data-cbrand', slug, esc(n), slug === s.camBrand)).join('')}</div>
        <div class="fov-models-box">
          <div class="tsub">3 · ${esc(s.camBrand ? Tp('model_of', { brand: (brands.find(([b]) => b === s.camBrand) || [])[1] || '' }) : T('pick_maker_first'))}</div>
          ${models.length ? `<div class="model-list">${models.map(g => { const c = g[0]; const same = g.slice(1).map(short); const sub = [c.prof.year, modesOf(c).length > 1 ? Tp('n_formats', { n: modesOf(c).length }) : '', same.length ? Tp('same_frame', { list: same.slice(0, 2).join(', ') + (same.length > 2 ? ` +${same.length - 2}` : '') }) : ''].filter(Boolean).join(' · '); return `<button class="model-row ${cam && g.includes(cam) ? 'on' : ''}" data-cmodel="${esc(c.prof.id)}"><b>${esc(short(c))}</b><small>${esc(sub)}</small></button>`; }).join('')}</div>` : ''}
        </div>
        <p class="tnote">${esc(T('verified_only'))}</p>
      </div>`;

  const distCard = `<div class="card sh-sec" data-part="dist">
    <div class="sh-head"><div class="tsub">${esc(T('distance_step'))}</div>
      <div class="seg sh-mode"><button class="${unit === 'm' ? 'active' : ''}" data-unit="m">${esc(T('meters'))}</button><button class="${unit === 'ft' ? 'active' : ''}" data-unit="ft">${esc(T('feet'))}</button></div></div>
    <div class="fov-dist"><input type="range" min="0" max="1000" step="1" value="${distToSlider(s.distance)}" data-dist aria-label="${esc(T('distance_step'))}">
      <label class="fov-dnum"><input type="number" data-fdist value="${esc(dist(s.distance))}" min="0.2" max="600" step="0.1" inputmode="decimal"><span>${esc(uLabel)}</span></label></div>
    <div class="tsub" style="margin-top:12px">${esc(T('shot_step'))}</div>
    <div class="chips">${SHOTS.map(x => chip('data-shot', x.id, esc(name(x)), x.id === shot.id)).join('')}</div>
  </div>`;

  if (!cam) {
    return `<div class="card sh-answer warn" data-part="answer"><p class="sh-line">${esc(T('choose_camera_first'))}</p></div>${pickCard}`;
  }

  const sn = curArea;
  const need = lensFor(sn, s.distance, shot.height);

  // The lenses in the catalog that mount on this camera, read as focal ranges off their names.
  const focalOf = (nm = '') => {
    const zoom = nm.match(/(\d{1,4})\s*[-–]\s*(\d{1,4})\s*mm/i);
    if (zoom) return { min: Number(zoom[1]), max: Number(zoom[2]) };
    const prime = nm.match(/(\d{1,4}(?:\.\d)?)\s*mm/i);
    return prime ? { min: Number(prime[1]), max: Number(prime[1]) } : null;
  };
  const byLabel = new Map();
  for (const p of ctx.catalog.products) {
    if (ctx.catalog.deptKey(p.dept) !== 'lenses') continue;
    const f = focalOf(p.name);
    if (!f) continue;
    const v = ctx.compat.verdict(p, cam.prof);
    if (v.status !== 'native' && v.status !== 'adapter') continue;
    const label = f.min === f.max ? `${f.min}` : `${f.min}-${f.max}`;
    if (!byLabel.has(label)) byLabel.set(label, { ...f, label, adapter: v.status === 'adapter' });
  }
  const catalogLenses = [...byLabel.values()].sort((a, b) => a.min - b.min || a.max - b.max);
  const lenses = catalogLenses.length ? catalogLenses : PRIME_SET.map(x => ({ min: x, max: x, label: `${x}` }));
  const rec = pickLens(need, lenses);
  const focal = s.focal > 0 ? s.focal : rec.focal;
  const fr = frameAt(sn, focal, s.distance);
  const isRec = !(s.focal > 0) || s.focal === rec.focal;
  // Which lens that focal length is on: a prime of exactly that length, else the narrowest zoom holding it.
  const onLens = lenses.find(l => l.min === l.max && l.min === focal)
    || lenses.filter(l => l.min <= focal && focal <= l.max).sort((x, y) => (x.max / x.min) - (y.max / y.min))[0];
  const lensName = onLens ? (onLens.min === onLens.max ? T('prime_lbl') : `${T('zoom_lbl')} ${onLens.label}`) : '';

  // Where the frame sits on a 1.75 m person, in metres above the ground: a frame taller than the
  // person stands on the ground; a tighter one sits on the upper body with a little headroom,
  // where an operator would put it. Both drawings below use this, so they always agree.
  const PERSON_M = 1.75;
  const bottomM = fr.heightM >= PERSON_M ? 0 : PERSON_M + fr.heightM * 0.12 - fr.heightM;
  const two = fr.widthM >= PERSON_M * 2.4;
  const figureAt = (x, groundY, h) => {
    const k = h / FIG_H;
    return `<g class="fig" transform="translate(${(x - (FIG_W * k) / 2).toFixed(2)} ${(groundY - h).toFixed(2)}) scale(${k.toFixed(4)})">${FIG}</g>`;
  };

  // 1. The monitor: exactly what the camera sees, in the sensor's own aspect ratio.
  const MW = 320, MH = Math.round((MW * sn.h) / sn.w);
  const mpx = MW / fr.widthM;
  const mGround = MH + bottomM * mpx;
  const people = two ? [MW / 2 - fr.widthM * 0.22 * mpx, MW / 2 + fr.widthM * 0.22 * mpx] : [MW / 2];
  const monitor = `<svg viewBox="0 0 ${MW} ${MH}" class="fov-monitor" role="img" aria-label="${esc(T('framing'))}">
    <defs><clipPath id="fov-clip"><rect width="${MW}" height="${MH}" rx="6"/></clipPath></defs>
    <rect width="${MW}" height="${MH}" rx="6" class="mon-bg"/>
    <g clip-path="url(#fov-clip)"><rect y="${mGround.toFixed(1)}" width="${MW}" height="${MH}" class="mon-floor"/>${people.map(x => figureAt(x, mGround, PERSON_M * mpx)).join('')}</g>
    <rect x="${MW * 0.05}" y="${MH * 0.05}" width="${MW * 0.9}" height="${MH * 0.9}" class="mon-safe"/>
    <path d="M${MW / 2 - 8} ${MH / 2}h16M${MW / 2} ${MH / 2 - 8}v16" class="mon-cross"/>
    <text x="10" y="${MH - 10}" class="mon-mm">${focal}mm</text>
    <rect width="${MW}" height="${MH}" rx="6" class="mon-edge"/>
  </svg>`;

  // 2. The measurement: the same frame on the person against a height scale, with its real size.
  const box = 150, top = 18, L = 28;
  const tallest = Math.max(fr.heightM + bottomM, PERSON_M) * 1.08;
  const px = (box - top) / tallest;
  const fw = fr.widthM * px, fh = fr.heightM * px, ph = PERSON_M * px;
  const vw = Math.max(fw + 30, 200) + L + 40;
  const cx = L + (vw - L - 40) / 2;
  const gy = box - 2;
  const fx0 = cx - fw / 2, fx1 = cx + fw / 2, fy = gy - (bottomM + fr.heightM) * px;
  const step = unit === 'ft' ? 0.6096 : 0.5; // a tick every 2 ft or every half metre
  const ticks = [];
  for (let m = 0; m <= tallest + 1e-9; m += step) {
    const y = gy - m * px;
    ticks.push(`<line x1="${L - 6}" y1="${y.toFixed(1)}" x2="${L}" y2="${y.toFixed(1)}" class="ms-tick"/><text x="${L - 8}" y="${(y + 3.5).toFixed(1)}" class="ms-num" text-anchor="end">${num(toUnit(m, unit), unit === 'ft' ? 0 : 1)}</text>`);
  }
  const measured = `<svg viewBox="0 0 ${vw.toFixed(0)} ${box}" class="fov-measure" role="img">
    <line x1="${L}" y1="${top - 6}" x2="${L}" y2="${gy}" class="ms-tick"/>${ticks.join('')}
    <line x1="${L}" y1="${gy}" x2="${vw}" y2="${gy}" class="ms-ground"/>
    ${(two ? [cx - fw * 0.22, cx + fw * 0.22] : [cx]).map(x => figureAt(x, gy, ph)).join('')}
    <rect x="${fx0.toFixed(1)}" y="${fy.toFixed(1)}" width="${fw.toFixed(1)}" height="${fh.toFixed(1)}" class="ms-frame"/>
    <path d="M${(fx1 + 8).toFixed(1)} ${fy.toFixed(1)}v${fh.toFixed(1)}M${(fx1 + 4).toFixed(1)} ${fy.toFixed(1)}h8M${(fx1 + 4).toFixed(1)} ${(fy + fh).toFixed(1)}h8" class="ms-dim"/>
    <text x="${(fx1 + 13).toFixed(1)}" y="${(fy + fh / 2 + 4).toFixed(1)}" class="ms-lbl">${num(toUnit(fr.heightM, unit), 2)}</text>
    <path d="M${fx0.toFixed(1)} ${(fy - 7).toFixed(1)}h${fw.toFixed(1)}M${fx0.toFixed(1)} ${(fy - 11).toFixed(1)}v8M${fx1.toFixed(1)} ${(fy - 11).toFixed(1)}v8" class="ms-dim"/>
    <text x="${cx.toFixed(1)}" y="${(fy - 12).toFixed(1)}" class="ms-lbl" text-anchor="middle">${num(toUnit(fr.widthM, unit), 2)} ${esc(uLabel)}</text>
  </svg>`;

  const answer = `<div class="card sh-answer ok" data-part="answer">
    <div class="fov-top"><b class="sh-big">${focal}<small>mm</small></b>${lensName ? `<span class="sh-small">${esc(lensName)}</span>` : ''}${isRec ? `<span class="sh-rec">${esc(T('recommended'))}</span>` : `<button class="linkbtn" data-lens-reset>${esc(Tp('back_to_rec', { mm: rec.focal }))}</button>`}</div>
    <p class="sh-line">${esc(Tp('need_sentence', { d: dist(s.distance), u: uLabel, shot: name(shot), cam: cam.product.name, mm: num(need, 1) }))}</p>
    ${monitor}
    <details class="fov-more"><summary>${esc(Tp('frame_line', { w: num(toUnit(fr.widthM, unit), 2), h: num(toUnit(fr.heightM, unit), 2), u: uLabel, a: num(fr.hFov, 0) }))}</summary>${measured}</details>
  </div>`;

  const stops = rulerStops([], PRIME_SET);
  const at = stops.reduce((b, x, i) => (Math.abs(x.mm - focal) < Math.abs(stops[b].mm - focal) ? i : b), 0);
  const shown = stops[at].mm;
  // An arc from 180° to 0°: the lit part runs up to this lens's place among the stops.
  const R = 70, CX = 80, CY = 76;
  const pt = (t) => [CX - R * Math.cos(Math.PI * t), CY - R * Math.sin(Math.PI * t)];
  const tEnd = stops.length > 1 ? at / (stops.length - 1) : 0;
  const [x0, y0] = pt(0), [x1, y1] = pt(Math.max(tEnd, 0.001));
  const viewfinder = `<div class="card fov-dialcard" data-part="vf">
    <div class="tsub">${esc(T('lens_now'))}</div>
    <div class="fov-dial">
      <button class="fov-step" data-fstep="-1" aria-label="${esc(T('lens_wider'))}" ${at === 0 ? 'aria-disabled="true"' : ''}>‹</button>
      <svg viewBox="0 0 160 84" class="fov-arc" role="img" aria-label="${shown} mm">
        <path d="M${x0} ${y0} A${R} ${R} 0 0 1 ${CX + R} ${CY}" class="arc-bg"/>
        <path d="M${x0} ${y0} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" class="arc-on"/>
        <text x="80" y="70" text-anchor="middle" class="arc-mm">${shown}<tspan class="arc-u" dx="2">mm</tspan></text>
      </svg>
      <button class="fov-step" data-fstep="1" aria-label="${esc(T('lens_longer'))}" ${at === stops.length - 1 ? 'aria-disabled="true"' : ''}>›</button>
    </div>
    <p class="tnote">${esc(Tp('vf_hint', { cam: cam.product.name }))}</p>
  </div>
`;
  const frameAtLine = (mm) => { const z = frameAt(sn, mm, s.distance); return Tp('frame_at', { mm, d: dist(s.distance), u: uLabel, w: num(toUnit(z.widthM, unit), 2), h: num(toUnit(z.heightM, unit), 2) }); };
  const distRow = `<div class="card fov-distrow" data-part="distrow">
    <label class="fov-distin"><span class="tsub">${esc(T('distance_step'))}</span>
      <input type="number" data-fdist2 value="${esc(dist(s.distance))}" min="0.2" max="600" step="0.1" inputmode="decimal" aria-label="${esc(T('distance_step'))}"></label>
    <div class="seg sh-mode"><button class="${unit === 'm' ? 'active' : ''}" data-unit="m">${esc(T('meters'))}</button><button class="${unit === 'ft' ? 'active' : ''}" data-unit="ft">${esc(T('feet'))}</button></div>
    <p class="fov-frameline">${esc(frameAtLine(shown))}</p>
  </div>`;
  const cta = `<div class="fov-cta-space"></div><div class="bottombar fabbar"><button class="btn fab fov-cta" data-vf-start>${toolIcon('fov')}${esc(T('vf_start'))}</button></div>`;

  fovView = { cam: { name: short(cam), w: sn.w, h: sn.h, mode: sn.mode }, stops, focal: shown,
    modes: modesOf(cam), modeId: modeOf(cam)?.id, onMode: (id) => { S.fov.modes = { ...(S.fov.modes || {}), [cam.prof.id]: id }; keepFov(); },
    frameLine: (mm, area = sn) => { const z = frameAt(area, mm, s.distance); return Tp('vf_at', { d: dist(s.distance), u: uLabel, w: num(toUnit(z.widthM, unit), 2), h: num(toUnit(z.heightM, unit), 2) }); } };
  keepFov();

  // The page is the camera and the viewfinder; the calculation from a distance waits folded.
  return `${pickCard}${viewfinder}${distRow}<details class="card fov-calc" ${s.calcOpen ? 'open' : ''} data-calc><summary>${esc(T('calc_by_distance'))}</summary>${distCard}${answer}</details>${cta}`;
}

// ---------- shutter ----------
function shutterTool(T) {
  const s = S.shutter;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const { options, recommended, anySafe } = shutterChoices(s.fps, s.mains, s.mode);
  const seconds = s.mode === 'angle' ? timeFromAngle(s.fps, s.angle) : 1 / s.speed;
  const angle = Math.round(angleFromTime(s.fps, seconds) * 10) / 10;
  const f = flicker(seconds, s.mains);
  const slow = slowMotion(s.fps, s.projectFps);
  const fmt = (n) => String(n);
  const isOn = (o) => (s.mode === 'angle' ? Math.abs(o.value - s.angle) < 0.06 : o.value === s.speed);

  // The answer in words: what you are shooting, whether the lights will flicker, what it plays back as.
  const flickerLine = f.safe ? Tp('sh_safe', { hz: s.mains })
    : anySafe ? Tp('sh_unsafe', { hz: s.mains, rec: recommended.label })
      : Tp('sh_none', { hz: s.mains });
  const slowLine = Math.abs(slow.factor - 1) < 0.01 ? T('sh_realtime')
    : slow.factor > 1 ? Tp('sh_slow', { n: Math.round(slow.factor * 100) / 100 })
      : Tp('sh_fast', { n: Math.round((1 / slow.factor) * 100) / 100 });

  const a = Math.max(1, Math.min(angle, 360));
  const r = 42, cxy = 50;
  const [ex, ey] = [cxy + r * Math.sin((a * Math.PI) / 180), cxy - r * Math.cos((a * Math.PI) / 180)];
  const dial = `<svg viewBox="0 0 100 100" class="dial-svg" role="img" aria-label="${a}°">
    <circle cx="${cxy}" cy="${cxy}" r="${r}" class="d-ring"/>
    <path d="M${cxy} ${cxy} L${cxy} ${cxy - r} A${r} ${r} 0 ${a > 180 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)} Z" class="d-open"/>
    <circle cx="${cxy}" cy="${cxy}" r="3" class="d-hub"/>
  </svg>`;

  const chip = (attr, val, label, on, extra = '') => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${val}">${label}${extra}</button>`;

  return `
    <div class="card sh-answer ${f.safe ? 'ok' : 'warn'}">
      <div class="sh-top">${dial}
        <div class="sh-main">
          <b class="sh-big">${s.mode === 'angle' ? `${fmt(s.angle)}°` : asFraction(seconds)}</b>
          <span class="sh-small">${s.mode === 'angle' ? asFraction(seconds) : `${angle}°`} · ${fmt(s.fps)} fps</span>
        </div>
      </div>
      <p class="sh-line ${f.safe ? 'ok' : 'warn'}">${f.safe ? '✓' : '⚠'} ${esc(flickerLine)}</p>
      <p class="sh-line">${esc(T('slowmo'))}: ${esc(slowLine)}</p>
    </div>

    <div class="card sh-sec">
      <div class="tsub">${esc(T('fps'))}</div>
      <div class="chips">${FRAME_RATES.map(x => chip('data-fps', x, fmt(x), !s.customFps && x === s.fps)).join('')}${chip('data-fps-custom', 1, esc(T('other_val')), s.customFps || !FRAME_RATES.includes(s.fps))}</div>
      ${s.customFps || !FRAME_RATES.includes(s.fps) ? `<div class="sh-custom">${field(T('fps'), numIn('fps', s.fps, { min: 1, max: 1000, step: 'any' }))}</div>` : ''}
    </div>

    <div class="card sh-sec">
      <div class="sh-head"><div class="tsub">${esc(T('shutter_lbl'))}</div>
        <div class="seg sh-mode"><button class="${s.mode === 'speed' ? 'active' : ''}" data-shmode="speed">${esc(T('speed_short'))}</button><button class="${s.mode === 'angle' ? 'active' : ''}" data-shmode="angle">${esc(T('angle_short'))}</button></div></div>
      <div class="chips">${options.map(o => chip('data-shv', o.value, esc(o.label), isOn(o),
        `${o.safe ? '<i class="sh-ok">✓</i>' : ''}${recommended && o.value === recommended.value ? `<i class="sh-rec">${esc(T('recommended'))}</i>` : ''}`)).join('')}</div>
      <p class="tnote">${esc(T('sh_hint'))}</p>
    </div>

    <div class="card sh-sec">
      <div class="tsub">${esc(T('mains'))}</div>
      <div class="chips">${chip('data-mains', 50, esc(T('mains_50')), s.mains === 50)}${chip('data-mains', 60, esc(T('mains_60')), s.mains === 60)}</div>
      <div class="tsub" style="margin-top:14px">${esc(T('project_fps'))}</div>
      <div class="chips">${[23.98, 24, 25, 29.97, 30].map(x => chip('data-proj', x, fmt(x), x === s.projectFps)).join('')}</div>
    </div>`;
}

// ---------- offload ----------
const GB_CHIPS = [256, 512, 1000, 2000, 4000];

function offloadTool(T, lang) {
  const s = S.offload;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const chip = (attr, val, label, on) => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;
  const gb = (x) => (x >= 1000 ? `${num(x / 1000, x % 1000 ? 2 : 0)} TB` : `${num(x, 0)} GB`);
  const name = (x) => (lang === 'he' ? x.he : x.en);

  // One end is the card in its reader, the other the drive; the slower one sets the pace.
  const rd = READERS.find(x => x.id === s.reader) || READERS[0];
  const dv = DRIVES.find(x => x.id === s.drive) || DRIVES[0];
  const readMBs = s.readOther ? s.readMBs : rd.mbPerSec;
  const writeMBs = s.writeOther ? s.writeMBs : dv.mbPerSec;
  const port = (PORTS.find(x => x.id === s.port) || PORTS[2]).mbPerSec;
  const t = transfer(readMBs, writeMBs, { readers: s.readers, port });
  const r = offload({ gb: s.gb, mbPerSec: t.mbPerSec, copies: s.copies, verify: s.verify });
  // one card at a time, as it comes off the camera during the day
  const perCard = s.cardGb ? offload({ gb: s.cardGb, mbPerSec: transfer(readMBs, writeMBs, { port }).mbPerSec, copies: s.copies, verify: s.verify }).totalHours : 0;
  const srcName = `${s.readers > 1 ? `${s.readers} × ` : ''}${s.readOther ? `${num(readMBs, 0)} MB/s` : `${name(rd)} (${num(readMBs, 0)} MB/s)`}`;
  const dstName = s.writeOther ? `${num(writeMBs, 0)} MB/s` : `${name(dv)} (${num(writeMBs, 0)} MB/s)`;
  const sources = [!s.readOther && rd.src, !s.writeOther && dv.src].filter(Boolean);

  const gbOther = !GB_CHIPS.includes(s.gb) || s.customGb;
  const answer = `<div class="card sh-answer ok">
    <div class="fov-top"><b class="sh-big">${r.totalHours ? hm(r.totalHours) : '—'}</b><span class="sh-small">${esc(Tp('off_for', { gb: gb(s.gb) }))}</span></div>
    <p class="sh-line">${esc(Tp('off_sentence', { gb: gb(s.gb), src: srcName, dst: dstName, n: s.copies }))} ${esc(T(s.verify ? 'off_verify' : 'off_noverify'))}</p>
    ${r.passes ? `<div class="passes">${Array.from({ length: r.passes }, (_, i) => {
      const check = s.verify && i % 2;
      return `<span class="pass ${check ? 'verify' : ''}">${check ? '✓' : Math.floor(i / (s.verify ? 2 : 1)) + 1}</span>`;
    }).join('')}</div>
    <p class="tnote">${esc(Tp('off_each', { n: r.passes, t: hm(r.perCopyHours), space: gb(r.totalGb) }))}</p>` : ''}
    ${perCard ? `<p class="sh-line">${esc(Tp('off_per_card', { card: gb(s.cardGb), t: hm(perCard) }))}</p>` : ''}
    <p class="sh-line ${t.limit === 'source' ? '' : 'warn'}">${esc(T({ source: s.readers > 1 ? 'off_limit_src2' : 'off_limit_src', dest: 'off_limit_dst', port: 'off_limit_port' }[t.limit]))}</p>
    <details class="src-more">
      <summary><span class="src-badge ok">${esc(T('off_maker'))}</span> ${esc(T('off_caveat'))} <span class="src-i">ⓘ</span></summary>
      ${sources.map(x => `<p>${esc(x)}</p>`).join('')}
    </details>
  </div>`;

  return `${answer}
    <div class="card sh-sec">
      <div class="tsub">1 · ${esc(T('footage'))}</div>
      ${s.fromMedia ? `<p class="tnote">${esc(T('off_from_media'))}</p>` : ''}
      <div class="chips">${GB_CHIPS.map(x => chip('data-ogb', x, gb(x), !gbOther && x === s.gb)).join('')}${chip('data-ogb-custom', 1, esc(T('other_val')), gbOther)}</div>
      ${gbOther ? `<div class="sh-custom">${field('GB', numIn('gb', s.gb, { min: 1, max: 200000, step: 1 }))}</div>` : ''}
    </div>
    <div class="card sh-sec">
      <div class="tsub">2 · ${esc(T('off_source'))}</div>
      <div class="chips">${READERS.map(x => chip('data-oread', x.id, esc(name(x)), !s.readOther && x.id === rd.id)).join('')}${chip('data-oread-custom', 1, esc(T('other_val')), s.readOther)}</div>
      ${s.readOther ? `<div class="sh-custom">${field('MB/s', numIn('readMBs', s.readMBs, { min: 1, max: 10000, step: 10 }))}</div>` : ''}
      <div class="sh-row"><span>${esc(T('off_readers'))}</span><div class="chips">${[1, 2].map(x => chip('data-oreaders', x, String(x), x === s.readers)).join('')}</div></div>
    </div>
    <div class="card sh-sec">
      <div class="tsub">3 · ${esc(T('drive'))}</div>
      <div class="chips">${DRIVES.map(x => chip('data-odrive', x.id, esc(name(x)), !s.writeOther && x.id === dv.id)).join('')}${chip('data-odrive-custom', 1, esc(T('other_val')), s.writeOther)}</div>
      ${s.writeOther ? `<div class="sh-custom">${field('MB/s', numIn('writeMBs', s.writeMBs, { min: 1, max: 10000, step: 10 }))}</div>` : ''}
      <div class="sh-row"><span>${esc(T('off_port'))}</span><div class="chips">${PORTS.map(x => chip('data-oport', x.id, esc(x.label), x.id === s.port)).join('')}</div></div>
    </div>
    <div class="card sh-sec">
      <div class="tsub">4 · ${esc(T('copies'))}</div>
      <div class="chips">${[1, 2, 3].map(x => chip('data-ocopies', x, String(x), x === s.copies)).join('')}</div>
      <label class="switch"><span>${esc(T('verify'))}</span><input type="checkbox" data-f="verify" ${s.verify ? 'checked' : ''}></label>
    </div>`;
}

// ---------- sun ----------
const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } };
const addDays = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// The day as the sun's path, coloured by the light it gives: blue below the horizon, gold low in the
// sky, plain daylight in between. A real clock across, the sun's real rise and fall up and down.
function sunArc(day, at, T, now) {
  const gM = day.goldenMorning, gE = day.goldenEvening, bM = day.blueMorning, bE = day.blueEvening;
  if (!day.sunrise || !day.sunset || !gE || !bE) return '';
  const W = 320, H = 136, horizon = 104, top = 18;
  const start = +(bM?.from || day.sunrise) - 15 * 60000, end = +bE.to + 15 * 60000;
  const fx = (t) => (t - start) / (end - start);
  // Height follows the real clock: the sun is up between sunrise and sunset, below the horizon outside.
  const dayLen = +day.sunset - +day.sunrise;
  const fy = (t) => Math.sin(((t - +day.sunrise) / dayLen) * Math.PI);
  const X = (t) => 12 + fx(t) * (W - 24);
  const Y = (t) => horizon - fy(t) * (horizon - top);
  const pts = (a, z, n = 24) => Array.from({ length: n + 1 }, (_, i) => a + ((z - a) * i) / n);
  const line = (a, z) => pts(a, z).map((t, i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(t).toFixed(1)}`).join(' ');
  const seg = (a, z, cls) => `<path d="${line(+a, +z)}" class="a-seg ${cls}"/>`;

  // Where the sun is drawn: now on today's page, else at sunset — the answer.
  const t = now ? Math.min(Math.max(+now, start), end) : +day.sunset;
  const sunUp = t >= +day.sunrise && t <= +day.sunset;
  const path = line(start, t, 48);
  const label = (tt, text, dy, anchor = 'middle', cls = '') =>
    `<text x="${X(tt).toFixed(1)}" y="${(Y(tt) + dy).toFixed(1)}" text-anchor="${anchor}" class="a-lab ${cls}">${text}</text>`;
  const dot = (tt) => `<circle cx="${X(tt).toFixed(1)}" cy="${Y(tt).toFixed(1)}" r="3" class="a-dot"/>`;

  return `<svg viewBox="0 0 ${W} ${H}" class="sun-arc" role="img">
    <defs>
      <linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky-top"/><stop offset="1" class="sky-low"/></linearGradient>
      <radialGradient id="sung"><stop offset="0" class="sun-core"/><stop offset="1" class="sun-halo"/></radialGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${horizon}" rx="12" class="a-sky"/>
    <rect x="0" y="${horizon}" width="${W}" height="${H - horizon}" class="a-ground"/>
    <line x1="0" y1="${horizon}" x2="${W}" y2="${horizon}" class="a-horizon"/>
    ${bM ? seg(start, bM.to, 'blue') : ''}${gM ? seg(gM.from, gM.to, 'gold') : ''}
    ${seg(gM?.to || day.sunrise, gE.from, 'day')}${seg(gE.from, gE.to, 'gold')}${seg(bE.from, end, 'blue')}
    ${dot(day.sunrise)}${dot(day.sunset)}
    ${label(day.sunrise, `↑ ${at(day.sunrise)}`, 22, 'start')}
    ${label(day.sunset, `${at(day.sunset)} ↓`, 22, 'end', 'strong')}
    <g class="a-sun ${sunUp ? '' : 'down'}">
      <circle r="15" fill="url(#sung)"/><circle r="7" class="a-sun-core"/>
      <animateMotion dur="1.4s" fill="freeze" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines=".25 .1 .25 1" path="${path}"/>
    </g>
  </svg>`;
}

function sunTool(T, lang) {
  const s = S.sun;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const chip = (attr, val, label, on) => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;
  const name = (x) => (lang === 'he' ? x.he : x.en);

  const countries = placeData.countries || [];
  const country = countries.find(c => c.code === s.country) || countries[0];
  const cityList = country?.cities || [];
  const city = cityList[Math.min(s.city, cityList.length - 1)] || null;
  const here = s.lat != null && s.lon != null;
  const lat = here ? s.lat : city?.lat ?? 32.0853;
  const lon = here ? s.lon : city?.lon ?? 34.7818;
  // The times belong to the place: its own clock, or the phone's when "my location" is on.
  const tz = here ? deviceZone() : zoneOf(country, city);
  const at = (d) => localTime(d, tz);
  const placeName = here ? T('my_location') : city ? name(city) : '';

  // Today and tomorrow are the place's today and tomorrow, not the phone's.
  const today = todayIn(tz);
  if (s.dateMode === 'today') s.date = today;
  if (s.dateMode === 'tomorrow') s.date = addDays(today, 1);
  const [y, m, d] = s.date.split('-').map(Number);
  const day = sunDay(new Date(Date.UTC(y, m - 1, d)), lat, lon);
  const span = (w) => (w ? `${at(w.from)} – ${at(w.to)}` : '—');
  const dayWord = s.dateMode === 'today' ? T('today') : s.dateMode === 'tomorrow' ? T('tomorrow')
    : new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  // Today's page says what the light is doing right now.
  const status = s.dateMode === 'today' && !day.polar ? sunStatus(day) : null;
  const answer = day.polar
    ? `<div class="card sh-answer warn"><p class="sh-line">${esc(T('polar'))}</p></div>`
    : `<div class="card sh-answer ok">
    <div class="fov-top"><b class="sh-big">${at(day.sunset)}</b><span class="sh-small">${esc(Tp('sun_at', { place: placeName, day: dayWord }))}</span></div>
    <p class="sh-line"><span class="k-gold-t">${esc(T('golden'))}</span> ${span(day.goldenEvening)} · <span class="k-blue-t">${esc(T('blue'))}</span> ${span(day.blueEvening)}</p>
    ${status ? `<p class="sun-status ${status.key}">${esc(Tp(status.key, { t: hm(status.ms / 3600000) }))}</p>` : ''}
    ${sunArc(day, at, T, s.dateMode === 'today' ? new Date() : null)}
    <p class="tnote">${esc(Tp('sun_morning', { rise: at(day.sunrise), gold: span(day.goldenMorning), blue: span(day.blueMorning), len: hm(day.dayLengthHours) }))}</p>
    ${tz && tz !== deviceZone() ? `<p class="tnote">${esc(Tp('tz_note', { place: placeName, tz }))}</p>` : ''}
    <details class="src-more">
      <summary><span class="src-badge ok">NOAA</span> ${esc(T('sun_calc'))} <span class="src-i">ⓘ</span></summary>
      <p>${esc(T('sun_src'))}</p>
    </details>
  </div>`;

  const dateOther = s.dateMode === 'pick';
  return `${answer}
    <div class="card sh-sec">
      <div class="tsub">1 · ${esc(T('place'))}</div>
      <div class="sun-country">${sel('country', countries.map(c => ({ v: c.code, l: name(c) })), s.country)}</div>
      <div class="chips fov-models">${cityList.map((c, i) => chip('data-scity', i, esc(name(c)), !here && i === s.city)).join('')}${chip('data-geo', 1, `${icons.pin || '◎'} ${esc(T('my_location'))}`, here)}</div>
    </div>
    <div class="card sh-sec">
      <div class="tsub">2 · ${esc(T('date'))}</div>
      <div class="chips">${chip('data-sdate', 'today', esc(T('today')), s.dateMode === 'today')}${chip('data-sdate', 'tomorrow', esc(T('tomorrow')), s.dateMode === 'tomorrow')}${chip('data-sdate', 'pick', esc(T('other_date')), dateOther)}</div>
      ${dateOther ? `<div class="sh-custom"><input type="date" data-f="date" value="${esc(s.date)}"></div>` : ''}
    </div>`;
}

// ---------- LUT bank ----------
// Maker, then camera, then one answer: the log it records, the LUT to monitor with, and the maker's own
// download. A camera that records two logs (Canon Log 2 and 3) gets both, the current one first.
function lutsTool(T, lang) {
  const logs = lutData.logs || [];
  if (!logs.length) return `<p class="tnote">—</p>`;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const chip = (attr, val, label, on) => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;

  const brands = [...new Set(logs.map(g => g.brand))];
  const brand = brands.includes(S.luts.brand) ? S.luts.brand : brands[0];
  const models = [...new Set(logs.filter(g => g.brand === brand).flatMap(g => g.cameras.map(c => c.name)))];
  const model = models.includes(S.luts.model) ? S.luts.model : '';
  const hits = model ? logs.filter(g => g.brand === brand && g.cameras.some(c => c.name === model)) : [];

  const answerFor = (g, i) => {
    const cam = g.cameras.find(c => c.name === model);
    const url = cam?.url || g.url;
    return `<div class="card sh-answer ok lut-answer ${i ? 'second' : ''}">
      ${i ? `<div class="tsub">${esc(T('lut_also'))}</div>` : `<p class="sh-small">${esc(Tp('lut_records', { cam: model }))}</p>`}
      <b class="lut-log">${esc(g.name)}</b>
      <p class="sh-line">${esc(T('lut_monitor'))}: <b>${esc(g.monitor)}</b></p>
      ${i && url === (hits[0].cameras.find(c => c.name === model)?.url || hits[0].url) ? '' : `<a class="btn primary lut-dl" href="${esc(url)}" target="_blank" rel="noopener">${esc(T('lut_download'))} ↗</a>`}
      ${(lang === 'he' ? g.howHe : g.howEn) ? `<p class="tnote">${esc(lang === 'he' ? g.howHe : g.howEn)}</p>` : ''}
      <details class="src-more">
        <summary><span class="src-badge ok">${esc(T('src_official'))}</span> ${esc(g.source)} <span class="src-i">ⓘ</span></summary>
        ${(lang === 'he' ? g.noteHe : g.noteEn) ? `<p>${esc(lang === 'he' ? g.noteHe : g.noteEn)}</p>` : ''}
        ${g.luts?.length ? `<p>${esc(T('lut_files'))}: ${g.luts.map(esc).join(' · ')}</p>` : ''}
        <p>${esc(T('lut_disclaimer'))}</p>
      </details>
    </div>`;
  };

  const answer = hits.length ? hits.map(answerFor).join('')
    : `<div class="card sh-answer warn"><p class="sh-line">${esc(T('lut_pick'))}</p></div>`;
  return `${answer}
    <div class="card sh-sec">
      <div class="tsub">1 · ${esc(T('camera_step'))}</div>
      <div class="chips">${brands.map(x => chip('data-lutbrand', x, esc(x), x === brand)).join('')}</div>
      <div class="chips fov-models">${models.map(m => chip('data-lutmodel', m, esc(m), m === model)).join('')}</div>
    </div>`;
}

// ---------- hours report ----------

function hoursTool(T, lang) {
  const s = S.hours;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const chip = (attr, val, label, on) => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;
  const r = hoursReport(s);
  const money = (v) => `₪${num(v, 0)}`;
  // The day drawn as one bar: regular, the first overtime tier, the rest.
  const total = Math.max(r.worked, s.base);
  const seg = (h, cls) => (h > 0 ? `<i class="${cls}" style="width:${((h / total) * 100).toFixed(1)}%"></i>` : '');
  const parts = [`${hm(r.regular)} ${T('hr_regular')}`, r.tier1 && `${hm(r.tier1)} ${Tp('hr_at', { p: s.tier1pct })}`, r.tier2 && `${hm(r.tier2)} ${Tp('hr_at', { p: s.tier2pct })}`].filter(Boolean);
  const breakOther = ![0, 30, 45, 60].includes(s.breaks) || s.customBreaks;

  return `<div class="card sh-answer ${r.tier1 ? 'warn-soft' : 'ok'}">
      <div class="fov-top"><b class="sh-big">${hm(r.worked)}</b><span class="sh-small">${esc(T('worked'))}</span></div>
      <div class="hr-bar">${seg(r.regular, 'reg')}${seg(r.tier1, 't1')}${seg(r.tier2, 't2')}</div>
      <p class="sh-line">${esc(parts.join(' · '))}</p>
      ${r.pay != null ? `<p class="sh-line"><b>${esc(T('hr_pay'))}: ${money(r.pay)}</b>${r.pay > s.dayRate ? ` · ${esc(Tp('hr_pay_split', { day: money(s.dayRate), ot: money(r.pay - s.dayRate) }))}` : ''}</p>` : ''}
      <p class="sh-line">${esc(T('next_call'))}: <b>${r.nextCall}</b>${r.nextDay ? ` · ${esc(T('next_day'))}` : ''} <span class="tnote">(${esc(Tp('hr_rest', { h: s.turnaround }))})</span></p>
    </div>
    <div class="card sh-sec">
      <div class="tsub">1 · ${esc(T('hr_times'))}</div>
      <div class="hr-times">${field(T('call_time'), `<input type="time" data-f="call" value="${esc(s.call)}">`)}${field(T('wrap_time'), `<input type="time" data-f="wrap" value="${esc(s.wrap)}">`)}</div>
      <div class="sh-row"><span>${esc(T('hr_breaks'))}</span><div class="chips">${[0, 30, 45, 60].map(x => chip('data-hbreak', x, x ? `${x}′` : '0', !breakOther && x === s.breaks)).join('')}${chip('data-hbreak-custom', 1, esc(T('other_val')), breakOther)}</div></div>
      ${breakOther ? `<div class="sh-custom">${field(T('break_min'), numIn('breaks', s.breaks, { min: 0, max: 600, step: 5 }))}</div>` : ''}
    </div>
    <div class="card sh-sec">
      <div class="tsub">2 · ${esc(T('hr_rules'))}</div>
      <div class="sh-row"><span>${esc(T('hr_day'))}</span><div class="chips">${[8, 9, 10, 12].map(x => chip('data-hbase', x, `${x}h`, x === s.base)).join('')}</div></div>
      <div class="sh-row"><span>${esc(T('hr_first'))}</span><div class="chips">${[1, 2, 3].map(x => chip('data-ht1h', x, `${x}h`, x === s.tier1h)).join('')}${[125, 150].map(x => chip('data-ht1p', x, `${x}%`, x === s.tier1pct)).join('')}</div></div>
      <div class="sh-row"><span>${esc(T('hr_after'))}</span><div class="chips">${[150, 175, 200].map(x => chip('data-ht2p', x, `${x}%`, x === s.tier2pct)).join('')}</div></div>
      <div class="sh-row"><span>${esc(T('turnaround_h'))}</span><div class="chips">${[8, 10, 11, 12].map(x => chip('data-hturn', x, `${x}h`, x === s.turnaround)).join('')}</div></div>
    </div>
    <div class="card sh-sec">
      <div class="tsub">3 · ${esc(T('hr_rate'))}</div>
      <div class="sh-custom">${field('₪', numIn('dayRate', s.dayRate || '', { min: 0, max: 100000, step: 50 }))}</div>
      <p class="tnote">${esc(T('hr_rate_note'))}</p>
    </div>`;
}

// ---------- units ----------
// One category at a time: type a value in one unit and read it in all the others. Battery, ND and
// temperature are their own small calculators because they do not scale from zero.
const UNIT_TABS = ['length', 'weight', 'data', 'rate', 'battery', 'nd', 'temp'];
function unitsTool(T, lang) {
  const s = S.units;
  const Tp = (k, p) => T(k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? '');
  const chip = (attr, val, label, on) => `<button class="chip pick ${on ? 'on' : ''}" ${attr}="${esc(val)}">${label}</button>`;
  const tab = UNIT_TABS.includes(s.group) ? s.group : 'length';
  const tabs = `<div class="card sh-sec"><div class="chips">${UNIT_TABS.map(k => chip('data-utab', k, esc(T('u_' + k)), k === tab)).join('')}</div></div>`;
  const row = (label, value, cls = '') => `<div class="u-row ${cls}"><span>${esc(label)}</span><b>${value}</b></div>`;
  let body = '';

  if (['length', 'weight', 'data', 'rate'].includes(tab)) {
    const g = UNIT_GROUPS.find(x => x.id === tab);
    const from = g.units.find(u => u.id === s.from) || g.units[0];
    body = `<div class="card sh-answer ok">
        <div class="u-input">${numIn('value', s.value)}<span>${esc(from.label)}</span></div>
        <div class="chips">${g.units.map(u => chip('data-ufrom', u.id, esc(u.label), u.id === from.id)).join('')}</div>
        <div class="u-list">${g.units.filter(u => u.id !== from.id).map(u => row(u.label, num(convert(g.id, from.id, u.id, s.value), 3))).join('')}</div>
      </div>`;
  } else if (tab === 'battery') {
    const wh = s.batMode === 'wh' ? Number(s.wh) : mahToWh(s.mah, s.volts);
    const fly = flightCheck(wh);
    body = `<div class="card sh-answer ${fly.level === 'ok' ? 'ok' : 'warn'}">
        <div class="fov-top"><b class="sh-big">${num(wh, 0)}</b><span class="sh-small">Wh</span></div>
        <p class="sh-line fly-${fly.level}">${esc(T(fly.key))}</p>
        <div class="chips">${chip('data-ubat', 'mah', 'mAh + V', s.batMode !== 'wh')}${chip('data-ubat', 'wh', 'Wh', s.batMode === 'wh')}</div>
        ${s.batMode === 'wh'
          ? `<div class="hr-times">${field('Wh', numIn('wh', s.wh, { min: 1, max: 2000, step: 1 }))}</div>`
          : `<div class="hr-times">${field('mAh', numIn('mah', s.mah, { min: 1, max: 100000, step: 10 }))}${field(T('volts'), numIn('volts', s.volts, { min: 1, max: 60, step: 0.1 }))}</div>`}
        <details class="src-more"><summary><span class="src-badge ok">IATA</span> ${esc(T('fly_src_short'))} <span class="src-i">ⓘ</span></summary><p>${esc(T('fly_src'))}</p></details>
      </div>`;
  } else if (tab === 'nd') {
    const kind = ['density', 'factor', 'stops'].includes(s.ndKind) ? s.ndKind : 'density';
    const r = ndFrom(kind, s.nd);
    const common = { density: [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1], factor: [2, 4, 8, 16, 64, 256, 1000], stops: [1, 2, 3, 4, 5, 6, 7, 10] }[kind];
    body = `<div class="card sh-answer ok">
        <div class="fov-top"><b class="sh-big">${num(r.stops, 1)}</b><span class="sh-small">${esc(T('nd_stops'))}</span></div>
        <div class="chips">${['density', 'factor', 'stops'].map(k => chip('data-undk', k, esc(T('nd_' + k)), k === kind)).join('')}</div>
        <div class="chips fov-models">${common.map(v => chip('data-und', v, kind === 'factor' ? `ND${v}` : String(v), Number(s.nd) === v)).join('')}</div>
        <div class="u-input">${numIn('nd', s.nd, { min: 0, max: 10000, step: 'any' })}<span>${esc(T('nd_' + kind))}</span></div>
        <div class="u-list">
          ${row(T('nd_density'), num(r.density, 1))}${row(T('nd_factor'), `ND${num(r.factor, 0)}`)}${row(T('nd_stops'), num(r.stops, 1))}${row(T('nd_light'), `${num(r.light * 100, r.light < 0.01 ? 2 : 1)}%`)}
        </div>
      </div>`;
  } else {
    const unit = s.tempUnit === 'f' ? 'f' : 'c';
    const other = unit === 'c' ? `${num(cToF(s.temp), 1)} °F` : `${num(fToC(s.temp), 1)} °C`;
    body = `<div class="card sh-answer ok">
        <div class="fov-top"><b class="sh-big">${other}</b></div>
        <div class="u-input">${numIn('temp', s.temp, { min: -100, max: 300, step: 0.5 })}<span>°${unit.toUpperCase()}</span></div>
        <div class="chips">${chip('data-utemp', 'c', '°C', unit === 'c')}${chip('data-utemp', 'f', '°F', unit === 'f')}</div>
      </div>`;
  }
  return body + tabs;
}

// ---------- wiring ----------
function wire(root, ctx, id, T, lang) {
  const s = S[id];
  const redraw = () => ctx.render();

  root.querySelectorAll('[data-f]').forEach(el => {
    el.onchange = () => {
      const k = el.dataset.f;
      if (el.type === 'checkbox') s[k] = el.checked;
      else if (el.type === 'date' || el.tagName === 'SELECT' && Number.isNaN(Number(el.value))) s[k] = el.value;
      else s[k] = el.type === 'number' || !Number.isNaN(Number(el.value)) ? Number(el.value) : el.value;

      if (id === 'fov' && k === 'distance') s.focal = 0;
      if (id === 'media' && k === 'card') s.cardPicked = true;
      if (id === 'fov' && k === 'cam') s.cam = el.value;
      if (id === 'fov' && k === 'camBrand') { s.camBrand = el.value; s.cam = ''; }
      if (id === 'shutter' && k === 'fps') { s.speed = shutterChoices(s.fps, s.mains, 'speed').recommended?.value ?? s.speed; s.angle = shutterChoices(s.fps, s.mains, 'angle').recommended?.value ?? s.angle; }
      if (id === 'offload' && k === 'gb') s.fromMedia = false;
      if (id === 'sun' && k === 'country') { s.lat = null; s.lon = null; s.city = 0; }
      redraw();
    };
  });

  const un = S.units, hr = S.hours;
  root.querySelectorAll('[data-utab]').forEach(b => { b.onclick = () => { un.group = b.dataset.utab; const g = UNIT_GROUPS.find(x => x.id === un.group); if (g && !g.units.some(u => u.id === un.from)) un.from = g.units[0].id; ctx.render(); }; });
  root.querySelectorAll('[data-ufrom]').forEach(b => { b.onclick = () => { un.from = b.dataset.ufrom; ctx.render(); }; });
  root.querySelectorAll('[data-ubat]').forEach(b => { b.onclick = () => { un.batMode = b.dataset.ubat; ctx.render(); }; });
  root.querySelectorAll('[data-undk]').forEach(b => { b.onclick = () => { const r = ndFrom(un.ndKind, un.nd); un.ndKind = b.dataset.undk; un.nd = un.ndKind === 'factor' ? Math.round(r.factor) : Math.round(r[un.ndKind] * 10) / 10; ctx.render(); }; });
  root.querySelectorAll('[data-und]').forEach(b => { b.onclick = () => { un.nd = Number(b.dataset.und); ctx.render(); }; });
  root.querySelectorAll('[data-utemp]').forEach(b => { b.onclick = () => { if (b.dataset.utemp !== un.tempUnit) un.temp = Math.round((b.dataset.utemp === 'f' ? cToF(un.temp) : fToC(un.temp)) * 10) / 10; un.tempUnit = b.dataset.utemp; ctx.render(); }; });
  root.querySelectorAll('[data-hbreak]').forEach(b => { b.onclick = () => { Object.assign(hr, { breaks: Number(b.dataset.hbreak), customBreaks: false }); ctx.render(); }; });
  root.querySelector('[data-hbreak-custom]')?.addEventListener('click', () => { hr.customBreaks = true; ctx.render(); });
  for (const [attr, key] of [['hbase', 'base'], ['ht1h', 'tier1h'], ['ht1p', 'tier1pct'], ['ht2p', 'tier2pct'], ['hturn', 'turnaround']]) {
    root.querySelectorAll(`[data-${attr}]`).forEach(b => { b.onclick = () => { hr[key] = Number(b.dataset[attr]); ctx.render(); }; });
  }
  root.querySelectorAll('[data-lutbrand]').forEach(b => { b.onclick = () => { S.luts.brand = b.dataset.lutbrand; S.luts.model = ''; ctx.render(); }; });
  root.querySelectorAll('[data-lutmodel]').forEach(b => { b.onclick = () => { S.luts.model = b.dataset.lutmodel; ctx.render(); }; });
  root.querySelectorAll('[data-lens]').forEach(b => { b.onclick = () => { S.fov.focal = Number(b.dataset.lens); ctx.render(); }; });
  root.querySelector('[data-lens-reset]')?.addEventListener('click', () => { S.fov.focal = 0; ctx.render(); });
  root.querySelectorAll('[data-cbrand]').forEach(b => { b.onclick = () => { Object.assign(S.fov, { camBrand: b.dataset.cbrand, cam: '', focal: 0, picking: true }); ctx.render(); }; });
  root.querySelectorAll('[data-cmodel]').forEach(b => { b.onclick = () => { Object.assign(S.fov, { cam: b.dataset.cmodel, focal: 0, picking: false, fromProject: false }); ctx.render(); }; });
  // A new camera starts again from the card its maker's table used.
  const newCam = (m) => Object.assign(m, { fmt: '', cardPicked: false, customCard: false });
  root.querySelectorAll('[data-mbrand]').forEach(b => { b.onclick = () => { S.media.brand = b.dataset.mbrand; S.media.cam = ''; newCam(S.media); ctx.render(); }; });
  root.querySelectorAll('[data-mcam]').forEach(b => { b.onclick = () => { S.media.cam = b.dataset.mcam; newCam(S.media); ctx.render(); }; });
  root.querySelectorAll('[data-mres]').forEach(b => { b.onclick = () => {
    // keep the codec when the new frame size has it
    const fmts = media.formatsOf(media.cameras.find(c => c.id === S.media.cam));
    const cur = fmts.find(f => f.key === S.media.fmt);
    const at = fmts.filter(f => f.res === b.dataset.mres);
    S.media.fmt = (at.find(f => f.codec === cur?.codec) || at[0])?.key || '';
    ctx.render();
  }; });
  root.querySelectorAll('[data-mfmt]').forEach(b => { b.onclick = () => { S.media.fmt = b.dataset.mfmt; ctx.render(); }; });
  root.querySelectorAll('[data-mfps]').forEach(b => { b.onclick = () => { S.media.fps = fpsVal(b.dataset.mfps); ctx.render(); }; });
  root.querySelectorAll('[data-mtype]').forEach(b => { b.onclick = () => {
    const t = media.mediaOf(media.cameras.find(c => c.id === S.media.cam)).find(x => x.type === b.dataset.mtype);
    Object.assign(S.media, { mtype: t.type, card: t.sizes[t.sizes.length >> 1], cardPicked: true, customCard: false });
    ctx.render();
  }; });
  root.querySelectorAll('[data-mcard]').forEach(b => { b.onclick = () => { Object.assign(S.media, { card: Number(b.dataset.mcard), cardPicked: true, customCard: false }); ctx.render(); }; });
  root.querySelector('[data-mcard-custom]')?.addEventListener('click', () => { Object.assign(S.media, { customCard: true, cardPicked: true }); ctx.render(); });
  // The media tool hands over the day's footage and the card it goes on.
  root.querySelector('[data-to-offload]')?.addEventListener('click', (e) => {
    Object.assign(S.offload, { gb: Number(e.currentTarget.dataset.toOffload), fromMedia: true, customGb: false, cardGb: media.usableGb(S.media.mtype, S.media.card) });
    if (READERS.some(x => x.id === S.media.mtype)) Object.assign(S.offload, { reader: S.media.mtype, readOther: false });
    ctx.navigate('#/tools/offload');
  });
  const off = S.offload;
  root.querySelectorAll('[data-ogb]').forEach(b => { b.onclick = () => { Object.assign(off, { gb: Number(b.dataset.ogb), customGb: false, fromMedia: false }); ctx.render(); }; });
  root.querySelector('[data-ogb-custom]')?.addEventListener('click', () => { off.customGb = true; ctx.render(); });
  root.querySelectorAll('[data-oread]').forEach(b => { b.onclick = () => { Object.assign(off, { reader: b.dataset.oread, readOther: false }); ctx.render(); }; });
  root.querySelector('[data-oread-custom]')?.addEventListener('click', () => { off.readOther = true; ctx.render(); });
  root.querySelectorAll('[data-odrive]').forEach(b => { b.onclick = () => { Object.assign(off, { drive: b.dataset.odrive, writeOther: false }); ctx.render(); }; });
  root.querySelector('[data-odrive-custom]')?.addEventListener('click', () => { off.writeOther = true; ctx.render(); });
  root.querySelectorAll('[data-oreaders]').forEach(b => { b.onclick = () => { off.readers = Number(b.dataset.oreaders); ctx.render(); }; });
  root.querySelectorAll('[data-oport]').forEach(b => { b.onclick = () => { off.port = b.dataset.oport; ctx.render(); }; });
  root.querySelectorAll('[data-ocopies]').forEach(b => { b.onclick = () => { off.copies = Number(b.dataset.ocopies); ctx.render(); }; });
  root.querySelectorAll('[data-mhours]').forEach(b => { b.onclick = () => { S.media.hours = Number(b.dataset.mhours); S.media.customHours = false; ctx.render(); }; });
  root.querySelector('[data-mhours-custom]')?.addEventListener('click', () => { S.media.customHours = true; ctx.render(); });
  root.querySelectorAll('[data-unit]').forEach(b => { b.onclick = () => { S.fov.unit = b.dataset.unit; ctx.render(); }; });
  const fdist = root.querySelector('[data-fdist]');
  if (fdist) fdist.onchange = () => { const v = Number(fdist.value); if (v > 0) { S.fov.distance = fromUnit(v, S.fov.unit); S.fov.focal = 0; } ctx.render(); };
  root.querySelectorAll('[data-shot]').forEach(b => { b.onclick = () => { S.fov.shot = b.dataset.shot; S.fov.focal = 0; ctx.render(); }; });
  // Dragging the distance redraws everything but the slider itself, so the drag is never interrupted.
  const dist = root.querySelector('[data-dist]');
  if (dist) dist.oninput = () => {
    S.fov.distance = sliderToDist(Number(dist.value));
    S.fov.focal = 0;
    const tpl = document.createElement('template');
    tpl.innerHTML = fovTool(T, lang, ctx);
    tpl.content.querySelectorAll('[data-part]').forEach(fresh => {
      const part = fresh.dataset.part;
      if (part === 'dist') { const n = root.querySelector('[data-part="dist"] [data-fdist]'); const v = toUnit(S.fov.distance, S.fov.unit); if (n) n.value = num(v, v < 10 ? 1 : 0); return; }
      root.querySelector(`[data-part="${part}"]`)?.replaceWith(fresh);
    });
    wire(root, ctx, id, T, lang);
  };
  // Frame rate and shutter. A new frame rate or mains frequency moves the shutter to the recommended
  // value, so nobody is left on a combination that no longer makes sense.
  const sh = S.shutter;
  const recommend = () => {
    sh.speed = shutterChoices(sh.fps, sh.mains, 'speed').recommended?.value ?? sh.speed;
    sh.angle = shutterChoices(sh.fps, sh.mains, 'angle').recommended?.value ?? sh.angle;
  };
  root.querySelectorAll('[data-fps]').forEach(b => { b.onclick = () => { sh.fps = Number(b.dataset.fps); sh.customFps = false; recommend(); redraw(); }; });
  root.querySelector('[data-fps-custom]')?.addEventListener('click', () => { sh.customFps = true; redraw(); });
  root.querySelectorAll('[data-mains]').forEach(b => { b.onclick = () => { sh.mains = Number(b.dataset.mains); recommend(); redraw(); }; });
  root.querySelectorAll('[data-proj]').forEach(b => { b.onclick = () => { sh.projectFps = Number(b.dataset.proj); redraw(); }; });
  root.querySelectorAll('[data-shv]').forEach(b => { b.onclick = () => { sh[sh.mode === 'angle' ? 'angle' : 'speed'] = Number(b.dataset.shv); redraw(); }; });
  root.querySelectorAll('[data-shmode]').forEach(b => { b.onclick = () => {
    const to = b.dataset.shmode;
    if (to === sh.mode) return;
    const secs = sh.mode === 'angle' ? timeFromAngle(sh.fps, sh.angle) : 1 / sh.speed;
    if (to === 'angle') sh.angle = Math.round(angleFromTime(sh.fps, secs) * 10) / 10;
    else sh.speed = Math.round(1 / secs);
    sh.mode = to; redraw();
  }; });

  root.querySelector('[data-vf-start]')?.addEventListener('click', async () => {
    if (!fovView) return;
    const ok = await openViewfinder({ ...fovView, T, onClose: (mm) => { S.fov.focal = mm; ctx.render(); } });
    if (ok === false) toast(T('vf_denied'), { kind: 'err', ms: 4000 });
  });
  root.querySelector('[data-calc]')?.addEventListener('toggle', (e) => { S.fov.calcOpen = e.currentTarget.open; });
  root.querySelectorAll('[data-fstep]').forEach(b => { b.onclick = () => {
    const stops = fovView?.stops; if (!stops) return;
    const i = stops.findIndex(x => x.mm === fovView.focal) + Number(b.dataset.fstep);
    if (i < 0 || i >= stops.length) { feel.end(); return; }
    S.fov.focal = stops[i].mm; feel.detent(); ctx.render();
  }; });
  root.querySelectorAll('[data-cfmt]').forEach(b => { b.onclick = () => { S.fov.fmt = b.dataset.cfmt; S.fov.picking = true; ctx.render(); }; });
  // the page's distance changes the frame, not the lens
  const fd2 = root.querySelector('[data-fdist2]');
  if (fd2) fd2.onchange = () => { const v = Number(fd2.value); if (v > 0) S.fov.distance = fromUnit(v, S.fov.unit); ctx.render(); };
  root.querySelectorAll('[data-cmode]').forEach(b => { b.onclick = () => { S.fov.modes = { ...(S.fov.modes || {}), [S.fov.cam]: b.dataset.cmode }; feel.detent(); ctx.render(); }; });
  root.querySelector('[data-cchange]')?.addEventListener('click', () => { S.fov.picking = true; ctx.render(); });

  root.querySelectorAll('[data-scity]').forEach(b => { b.onclick = () => { Object.assign(S.sun, { city: Number(b.dataset.scity), lat: null, lon: null }); redraw(); }; });
  root.querySelectorAll('[data-sdate]').forEach(b => { b.onclick = () => { S.sun.dateMode = b.dataset.sdate; redraw(); }; });
  root.querySelector('[data-geo]')?.addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { S.sun.lat = pos.coords.latitude; S.sun.lon = pos.coords.longitude; redraw(); },
      () => {},
      { timeout: 8000 },
    );
  });
}
