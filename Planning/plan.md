Before I lock the schedule, I'll check two known delay points, Google Play's testing requirement and Apple's business-account paperwork, so they don't surprise you.# Speqtus ordering app: project plan

**How to read this:** "Day 1–4" are your four working days each week (pick the same four weekdays and stick to them). Every day is 4 hours, every week 16 hours. Times are working hours only; waiting for approvals costs nothing.

**Assumptions:** the catalog holds a few hundred product rows (I haven't counted them, and if it's over ~800 the data-cleanup weeks need one more week). You're learning some parts as you go. The start date is Monday 28 September 2026.

---

## 1. High-level overview

**What we're building:** an ordering app for doctors and clinics to browse Speqtus Medical's instrument catalog, find items fast, and place or repeat orders in a few taps. It works as a website, an Android app and an iPhone app, built on free services.

**Important reality check:** the full vision (three platforms, saved sets, offline use, WhatsApp updates, online payment) does not fit into the first 10 weeks at 16 hours/week. So the plan is staged. Doctors get a working website and Android app by Week 10, and the extras and the iPhone app follow afterwards.

| Phase | Weeks | Hours | Result |
|---|---|---|---|
| 0. Prepare | 1 | 16 | Decisions made, accounts open, paperwork submitted |
| 1. Catalog data | 2–3 | 32 | Clean product spreadsheet with images |
| 2. Foundation | 4 | 16 | Catalog stored online, automatically updated |
| 3. Core app | 5–7 | 48 | Doctors can browse, search, sign up, order |
| 4. Owner tools + website | 8–9 | 32 | Owner manages orders; website live |
| 5. Pilot | 10–11 | 32 | 12+ real users test on Android; fixes |
| 6. "Hook" features | 12–14 | 48 | Saved sets, offline, WhatsApp, payments |
| 7. iPhone + stores | 15–16 | 32 | Android and iPhone apps in stores |
| 8. Launch | 17–18 | 32 | All ~40 doctors onboarded; hand-over |
| **Total** | **18** | **288** | |

**Money:** about $124 in the first year is unavoidable ($99 Apple yearly + $25 Google one-time). Payment fees are a percentage per sale, WhatsApp messages cost paise each, and I recommend a $25/month database upgrade once real orders start.

**Plain-language glossary**
- **Database:** an organized digital filing cabinet for products, users and orders.
- **Backend:** the behind-the-scenes part that stores data and enforces who can see what.
- **OCR:** software that reads text out of pictures.
- **Art No:** the article number that identifies each instrument size.
- **Build:** packaging the app into an installable file.
- **Pilot:** a small real-world trial before the full launch.

---

## 2. Detailed task breakdown

### Phase 0: Prepare (Week 1)

**T0.1 Talk to 5 doctors (3h).** *What:* short calls asking how they buy instruments today, who places the orders, and what annoys them. *Why:* the app must beat their current habit (probably a phone call). *Result:* one page of notes plus a list of 12+ friendly pilot users. *Needs first:* nothing.

**T0.2 Get materials and set business rules with Speqtus (4h).** *What:* ask for original catalog files, product photos, price list, logo, GST and business details. Then agree the rules: who sees prices, how orders get approved, payment terms, returns. *Why:* the catalog has no prices, and these rules decide what we build. *Result:* a folder of files and a signed-off one-page "business rules" sheet. *Needs first:* nothing.

**T0.3 Create free accounts and start slow paperwork (5h).** *What:* open accounts for code storage (GitHub), backend (Supabase), hosting and images (Cloudflare), app building (Expo) and a shared Google Drive/Sheet. Then start the business-identity number request (D-U-N-S), Razorpay business verification and WhatsApp Business verification. *Why:* approvals take days or weeks, and they run without using your hours. *Result:* accounts ready, paperwork submitted. *Needs first:* T0.2 (business documents).

**T0.4 Set up your computer and warm up (4h).** *What:* install the tools and follow a starter tutorial until a sample app shows on your phone. *Why:* removes setup surprises later. *Result:* a "Hello" app on your phone. *Needs first:* T0.3.

### Phase 1: Catalog data (Weeks 2–3)

**T1.1 Build the "catalog reader" (10h).** *What:* a small program that turns each PDF page into a picture, finds each product block, crops the photo, and reads the name, Art No and sizes. *Why:* the PDF is flat pictures, and retyping several hundred items by hand would take far longer. *Result:* cropped product images plus a draft spreadsheet. *Needs first:* T0.4. If Speqtus supplied a proper spreadsheet in T0.2, this shrinks a lot and the saved hours become buffer.

**T1.2 Test and run on all pages (6h).** *What:* try it on 10 pages, measure mistakes, adjust, then run on all 105 pages. *Why:* catches repeating errors early. *Result:* a draft spreadsheet for the whole catalog. *Needs first:* T1.1.

**T1.3 Review and correct the data (9h).** *What:* go through the spreadsheet row by row, fixing names, Art Nos and sizes, and matching each row to its image. *Why:* a wrong Art No means the wrong instrument ships, so accuracy matters most here. *Result:* a clean "master catalog" Google Sheet. *Needs first:* T1.2.

**T1.4 Tag items by specialty (4h).** *What:* add columns such as Ortho, ENT, Gynae, plus common procedure sets. *Why:* the catalog is organized by instrument type, but doctors think by specialty and tray. *Result:* a tagged catalog. *Needs first:* T1.3 and your notes from T0.1.

**T1.5 Prepare images and shared folders (3h).** *What:* clean up or upscale images, name them by Art No, and organize the Drive folder. *Why:* consistent names let automation match photos to products, and staff can maintain it later. *Result:* a tidy Drive folder plus a finalized Sheet layout. *Needs first:* T1.3 (swap in originals if received).

### Phase 2: Foundation (Week 4)

**T2.1 Design storage and create the backend (6h).** *What:* set up the database with sections for products, sizes, doctors, orders and saved sets, plus privacy rules (doctors see only their own orders). *Why:* everything else stands on it. *Result:* a structured, empty database. *Needs first:* T0.3, T1.3.

**T2.2 Sheet-to-database sync (4h).** *What:* a script that copies the Google Sheet into the database automatically. *Why:* staff edit a spreadsheet and the app updates itself. *Result:* the full catalog stored online. *Needs first:* T2.1.

**T2.3 Image pipeline (4h).** *What:* automatically shrink photos into several sizes and upload them to Cloudflare's fast storage. *Why:* fast on hospital Wi-Fi, and avoids Google Drive's limits. *Result:* every product has quick-loading pictures. *Needs first:* T2.1, T1.5.

**T2.4 Nightly backup (2h).** *What:* a daily copy of the database saved to Drive. *Why:* protects order data. *Result:* automatic backups. *Needs first:* T2.1.

### Phase 3: Core app (Weeks 5–7)

**T3.1 App skeleton and look and feel (6h).** *What:* create the app project that runs on phone and browser, with logo, colors and menus. *Why:* one foundation serves all three platforms. *Result:* a branded empty app. *Needs first:* T0.4, T2.1.

**T3.2 Browse categories and products (10h).** *What:* screens for home, the 24 categories, product lists and product detail with sizes and Art No. *Why:* the core of the catalog experience. *Result:* a doctor can browse the whole catalog. *Needs first:* T3.1, T2.2, T2.3.

**T3.3 Search (5h).** *What:* a search box that accepts names or Art Nos and forgives typos. *Why:* the fastest route for repeat buyers. *Result:* working search. *Needs first:* T3.2.

**T3.4 Sign-up, login and doctor profile (8h).** *What:* sign-in with Google or an email code, plus a form for name, hospital, registration number, phone and address. *Why:* we need to know who is ordering. *Result:* working accounts. *Needs first:* T3.1, T0.2.

**T3.5 Price-visibility rule (3h).** *What:* hide prices until the owner approves an account. *Why:* the catalog is quote-based. *Result:* enforced rule (tested with dummy prices). *Needs first:* T3.4.

**T3.6 Cart and order request (10h).** *What:* add sizes to a cart, pick an address, add notes, and submit as an "order request" (no payment yet). *Why:* simplest safe first version; the owner confirms each order. *Result:* orders get recorded. *Needs first:* T3.2, T3.4.

**T3.7 My orders and reorder (4h).** *What:* a list of past orders with status and an "order again" button. *Why:* the main habit-forming feature. *Result:* working history and reorder. *Needs first:* T3.6.

**T3.8 Polish (2h).** Friendly error messages, loading indicators and empty-screen text.

### Phase 4: Owner tools and website (Weeks 8–9)

**T4.1 Owner admin screens (12h).** *What:* approve doctors, view and update orders (New, Confirmed, Dispatched, Delivered), and set prices. *Why:* the owner runs the business without touching technical tools. *Result:* the owner can operate from one screen. *Needs first:* T3.4, T3.6.

**T4.2 Alerts (9h).** *What:* an email to the owner on each new order, and a phone pop-up (push notification) to the doctor when the status changes. *Why:* nobody has to keep refreshing. *Result:* automatic alerts. *Needs first:* T4.1.

**T4.3 Publish the website and web address (5h).** *What:* put the web version online at an address like shop.speqtusmedical.com. *Why:* the first version doctors can actually open. *Result:* live website. *Needs first:* T3.x, domain access from Speqtus.

**T4.4 End-to-end test and fixes (6h).** *What:* act as doctor and owner: sign up, get approved, order, update status, reorder. *Why:* catch breaks before real users do. *Result:* a fixed bug list. *Needs first:* T4.1–T4.3.

### Phase 5: Pilot (Weeks 10–11)

**T5.1 Android test build and Google Play test track (4h).** *What:* create an installable Android version and upload it to Google Play's testing area. *Why:* real phones behave differently from browsers. *Result:* pilot users can install the app. *Needs first:* T4.4, Play account (see Risk 4).

**T5.2 Pilot onboarding and feedback (7h).** *What:* personally set up 12+ users, watch them use it, and collect complaints. *Why:* real usage shows what you missed. *Result:* a prioritized feedback list. *Needs first:* T5.1, list from T0.1.

**T5.3 Fixes (13h).** *What:* fix problems in the order: broken, then confusing, then nice-to-have. *Why:* pilot trust matters. *Result:* a stable app. *Needs first:* T5.2.

**T5.4 User guide and legal pages (4h).** *What:* a one-page WhatsApp-shareable guide, plus a privacy policy and terms (both app stores require the policy; have Speqtus's accountant or lawyer glance at it). *Result:* documents ready. *Needs first:* nothing technical.

**T5.5 Buffer (4h).**

### Phase 6: Hook features (Weeks 12–14)

**T6.1 Saved sets and faster reorder (11h).** *What:* doctors save lists such as "my minor OT set" and reorder them in two taps. *Why:* the main reason to keep using the app instead of phoning. *Result:* saved sets. *Needs first:* T3.7, T5.3.

**T6.2 Offline catalog (5h).** *What:* the catalog stays readable without internet after first load. *Why:* weak signal in wards and OTs. *Result:* offline browsing. *Needs first:* T3.2. This is the task most likely to overrun.

**T6.3 WhatsApp sharing and order updates (16h).** *What:* a "share on WhatsApp" button (free), plus automatic WhatsApp status messages through WhatsApp Business, which needs pre-approved message templates. *Why:* WhatsApp is where doctors already are. *Result:* sharing and status messages. *Needs first:* Meta verification from T0.3, T4.2.

**T6.4 Razorpay online payments (11h).** *What:* UPI, cards and netbanking in test mode first, plus "bank transfer" and "pay on delivery" options. *Why:* lets doctors pay instantly if they choose. *Result:* payments working in test mode. *Needs first:* Razorpay verification from T0.3, T3.6, T0.2 rules.

**T6.5 Invoices and payment go-live (5h).** *What:* the owner attaches an invoice PDF to an order and the doctor downloads it; then switch payments to live and run a small real transaction. *Why:* doctors need paperwork. *Result:* live payments. *Needs first:* T6.4. Automatic GST invoice generation is postponed because it needs your accountant's rules and would not fit in these hours.

### Phase 7: iPhone and store release (Weeks 15–16)

**T7.1 Store listings (4h).** Name, description, icon, screenshots and forms for both stores. *Needs first:* T5.4.

**T7.2 Android public release (3h).** Publish to Google Play once its testing requirement is met. *Needs first:* T5.1, plus Risk 4.

**T7.3 iPhone build, TestFlight and fixes (9h).** *What:* build the iOS version in the cloud (no Mac needed), test via Apple's TestFlight, and fix iPhone-specific layout issues. *Needs first:* Apple developer enrollment (Week 11–12), T5.3.

**T7.4 App Store submission and review rounds (9h).** *What:* submit with a demo login and notes (reviewers must be able to log in and see prices), then answer questions or fix rejections. *Why:* first-time rejections are common. *Needs first:* T7.1, T7.3.

**T7.5 Final test on all platforms (4h).** Run the full checklist on the website, Android and iPhone.

**T7.6 Buffer (3h).**

### Phase 8: Launch (Weeks 17–18)

**T8.1 Onboard all ~40 doctors (16h).** WhatsApp announcement with the link, personal calls to the first ones, daily checks of errors and orders, quick fixes.

**T8.2 Review costs and feedback (6h).** Check free-tier usage (database size, image bandwidth), decide which upgrades to buy, and list next features.

**T8.3 Hand-over documents (5h).** How to add products via the Sheet, approve doctors, and recover if something breaks; where every account lives (use a password manager). *Result:* someone else could run it.

**T8.4 Buffer (5h).**

---

## 3. Week-by-week schedule

**Week 1: Prepare** (from 28 Sep)
- Day 1: T0.1 doctor calls 3h; T0.2 send materials request 1h
- Day 2: T0.2 business rules meeting 3h; T0.3 create accounts 1h
- Day 3: T0.3 accounts 1h; submit D-U-N-S, Razorpay, WhatsApp paperwork 3h
- Day 4: T0.4 install tools and starter tutorial 4h
- Outcome: rules agreed, paperwork submitted, "Hello" app on your phone.
- Watch: Speqtus responding slowly, which is the biggest risk to the whole plan.

**Week 2: Catalog reader**
- Day 1–2: T1.1 build reader, 8h
- Day 3: T1.1 finish 2h; T1.2 test on 10 pages 2h
- Day 4: T1.2 tune and run all 105 pages 4h
- Outcome: draft spreadsheet plus cropped images.
- Watch: photos too small or blurry to read.

**Week 3: Clean the data**
- Day 1–2: T1.3 review rows 8h
- Day 3: T1.3 finish 1h; T1.4 tags 3h
- Day 4: T1.4 finish 1h; T1.5 images and Drive folder 3h
- Outcome: master catalog Sheet plus tidy image folder.
- Checkpoint: is the data accurate enough to build on?

**Week 4: Foundation**
- Day 1: T2.1 design and create backend 4h
- Day 2: T2.1 access rules 2h; T2.2 sync 2h
- Day 3: T2.2 finish 2h; T2.3 image pipeline 2h
- Day 4: T2.3 finish 2h; T2.4 backup 2h
- Outcome: the catalog is stored online and updates from the Sheet.

**Week 5: Browse screens**
- Day 1: T3.1 app skeleton 4h
- Day 2: T3.1 look and feel 2h; T3.2 home and categories 2h
- Day 3: T3.2 product list 4h
- Day 4: T3.2 product detail with sizes 4h
- Outcome: browse the whole catalog on phone and browser.

**Week 6: Search and accounts**
- Day 1: T3.3 search 4h
- Day 2: T3.3 finish 1h; T3.4 login 3h
- Day 3: T3.4 profile form 4h
- Day 4: T3.4 finish 1h; T3.5 price rule 3h
- Outcome: search works; people can register.
- Watch: login setup is fiddly, so keep buffer in mind.

**Week 7: Ordering**
- Day 1–2: T3.6 cart and order request, 8h
- Day 3: T3.6 finish 2h; T3.7 order history 2h
- Day 4: T3.7 reorder 2h; T3.8 polish 2h
- Outcome: a test doctor can place and repeat an order.
- Checkpoint: demo it to Speqtus's owner.

**Week 8: Owner tools**
- Day 1–3: T4.1 admin screens 12h
- Day 4: T4.2 email alerts 4h
- Outcome: the owner can approve doctors, set prices and update orders.

**Week 9: Website live**
- Day 1: T4.2 push notifications 4h
- Day 2: T4.2 finish 1h; T4.3 publish website 3h
- Day 3: T4.3 web address 2h; T4.4 end-to-end test 2h
- Day 4: T4.4 fix bugs 4h
- Outcome: live website.
- Checkpoint: ready for real users?

**Week 10: Pilot begins** (from 30 Nov)
- Day 1: T5.1 Android test build and Play test track 4h
- Day 2: T5.2 onboard pilot users 4h
- Day 3: T5.2 gather feedback 3h; T5.3 fixes 1h
- Day 4: T5.3 fixes 4h
- Outcome: 12+ people using it.
- Watch: recruiting enough testers (see Risk 4).

**Week 11: Fix and document**
- Day 1–2: T5.3 fixes 8h
- Day 3: T5.4 user guide 2h; privacy policy and terms 2h
- Day 4: T5.5 buffer 4h
- Outcome: stable app, documents ready.
- Action: enroll in the Apple developer program this week or next.
- Checkpoint: does the pilot feedback say people will keep using it?

**Week 12: Saved sets and offline**
- Day 1–2: T6.1 saved sets 8h
- Day 3: T6.1 finish 3h; T6.2 start 1h
- Day 4: T6.2 offline catalog 4h
- Outcome: saved sets working; offline in progress.

**Week 13: WhatsApp**
- Day 1: T6.3 share buttons 3h; connection setup 1h
- Day 2: T6.3 set up and submit message templates 4h
- Day 3: T6.3 connect order updates 4h
- Day 4: T6.3 testing 2h; buffer 2h
- Outcome: WhatsApp sharing and status messages.
- Watch: template approval time is outside your control.

**Week 14: Payments**
- Day 1–2: T6.4 Razorpay in test mode 8h
- Day 3: T6.4 payment options 3h; T6.5 invoice upload 1h
- Day 4: T6.5 invoices and live-payment checks 4h
- Outcome: payments and invoices working.
- Watch: the holiday season may delay verification.

**Week 15: iPhone**
- Day 1: T7.1 store listings 4h
- Day 2: T7.2 Android release 3h; T7.3 iPhone build 1h
- Day 3–4: T7.3 TestFlight and iPhone fixes 8h
- Outcome: Android live; iPhone version in testing.

**Week 16: App Store**
- Day 1: T7.4 prepare and submit 4h
- Day 2: T7.4 answer review questions 4h
- Day 3: T7.4 finish 1h; T7.5 final test 3h
- Day 4: T7.5 finish 1h; T7.6 buffer 3h
- Outcome: iPhone app submitted.
- Watch: review rounds can add days.

**Week 17: Launch** (from 18 Jan 2027)
- Day 1–2: T8.1 announce and onboard doctors 8h
- Day 3–4: T8.1 monitor and fix 8h
- Outcome: all ~40 doctors invited and ordering.

**Week 18: Wrap-up**
- Day 1: T8.2 cost and feedback review 4h
- Day 2: T8.2 finish 2h; T8.3 hand-over docs 2h
- Day 3: T8.3 finish 3h; T8.4 buffer 1h
- Day 4: T8.4 buffer 4h
- Outcome: project complete and handed over.

---

## 4. Total estimated duration

**18 weeks planned (288 hours), finishing around 31 January 2027.** Because explicit buffer is only about 14 hours (5%), the realistic finish is **20 to 22 weeks**. Treat the end of February 2027 as the outside date.

## 5. Milestones and checkpoints

- **M1 (Week 1):** business rules agreed, paperwork submitted
- **M2 (Week 3):** clean master catalog. *Checkpoint: is the data accurate?*
- **M3 (Week 4):** catalog stored online, auto-updating
- **M4 (Week 7):** a test doctor can browse and order
- **M5 (Week 9):** website live. *Checkpoint: ready for real users?*
- **M6 (Week 10):** pilot starts
- **M7 (Week 11):** pilot feedback fixed. *Checkpoint: will people keep using it?*
- **M8 (Week 14):** WhatsApp and payments working
- **M9 (Week 16):** Android live and iPhone submitted
- **M10 (Week 17):** all ~40 doctors onboarded
- **M11 (Week 18):** hand-over complete

## 6. What to prepare or learn first

**Prepare (Week 1):** the catalog PDF (done), Speqtus's business and GST details, logo, product source files, a list of 12+ friendly pilot users, and a password manager for all accounts.

**Learn, lightly:**
- The basics of an Expo (React Native) app, via its official starter tutorial.
- How a database stores data and how Google Sheets connects to it.
- What an app store review involves.

You don't need deep expertise in any of these before starting.

## 7. Risks and what could slip the timeline

1. **Speqtus is slow to provide files or decisions.** Biggest risk. Ask in Week 1 and follow up weekly.
2. **The catalog has more products than assumed.** Above ~800 rows, add a week to T1.3.
3. **Image quality is poor.** Cropped images from the PDF are small, so the fix is to get the originals early.
4. **Google Play's testing rule.** New personal developer accounts must run a closed test with at least 12 opted-in testers for 14 continuous days before applying for production access. Organization accounts, registered with a D-U-N-S number, are exempt. Our pilot in Week 10 doubles as this test, so make sure 12+ people stay opted in the whole time or the clock restarts.
5. **Apple or D-U-N-S paperwork is slow.** Start in Week 1. If it is late, publish Android first and delay iPhone. That doesn't stop launch.
6. **WhatsApp template approval or Razorpay verification takes longer than planned.** The app works without them; they are add-ons.
7. **College exams and deadlines.** Plan an "exam freeze" and shift the schedule rather than compressing weeks.
8. **Scope creep.** New ideas go on a "later" list, never mid-phase.
9. **Offline mode, payments and app-store review are the likeliest tasks to overrun.**

**Buffer:** 14 explicit hours, plus the 2–4 spare weeks up to the outside date. If a week slips, push the whole plan one week rather than cramming work into extra days.

## 8. Final completion checklist

**Data and setup**
- [ ] Master catalog Sheet is accurate and tagged
- [ ] Images load fast for every product
- [ ] Nightly backups are running

**App**
- [ ] Browse, search, sign-up, cart and order request all work
- [ ] Prices show only for approved doctors
- [ ] Owner can approve doctors, set prices and update orders
- [ ] Saved sets, reorder and offline catalog work
- [ ] WhatsApp sharing and status messages work
- [ ] Online payment and invoice download work

**Release**
- [ ] Website live on Speqtus's own address
- [ ] Android app on Google Play
- [ ] iPhone app approved on the App Store
- [ ] Privacy policy and terms published

**Launch and hand-over**
- [ ] All ~40 doctors invited and ordering
- [ ] Free-tier usage reviewed and upgrade decisions made
- [ ] Hand-over guide written; passwords in a password manager