// Single-figure project diagrams, mounted into [data-diagram] by index.html.
// Hantavirus facts come from github.com/Sweekrit-B/dsc-148-hantavirus-preds (notebooks/final_project.ipynb outputs).

declare global {
  interface Window {
    mountDiagram?: (el: HTMLElement) => void
  }
}

export const H = 44 // box height
export const box = (x: number, y: number, w: number, title: string, sub: string, cls: string) =>
  `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${H}" rx="3"/>` +
  `<text class="t-box" x="${x + w / 2}" y="${y + (sub ? 18 : 27)}" text-anchor="middle">${title}</text>` +
  (sub ? `<text class="t-muted" x="${x + w / 2}" y="${y + 34}" text-anchor="middle">${sub}</text>` : '')
// A data store: a cylinder with its label inside.
export const cyl = (x: number, y: number, w: number, h: number, label: string, cls: string) => {
  const ry = 4
  return `<path class="${cls}" d="M${x} ${y + ry} a${w / 2} ${ry} 0 0 1 ${w} 0 v${h - 2 * ry} a${w / 2} ${ry} 0 0 1 ${-w} 0 z"/>` +
    `<path class="${cls} lid" d="M${x} ${y + ry} a${w / 2} ${ry} 0 0 0 ${w} 0"/>` +
    `<text class="t-muted" x="${x + w / 2}" y="${y + h / 2 + 6}" text-anchor="middle">${label}</text>`
}
// A document with a folded corner.
export const doc = (x: number, y: number, w: number, h: number, label: string, cls = 'out') =>
  `<path class="${cls}" d="M${x} ${y} H${x + w - 8} L${x + w} ${y + 8} V${y + h} H${x} Z"/><path class="${cls}" d="M${x + w - 8} ${y} V${y + 8} H${x + w}"/>` +
  `<text class="t-muted" x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle">${label}</text>`
export const arrow = (d: string) => `<path class="flow" d="${d}" marker-end="url(#hv-head)"/>`

function hantaFigure() {
  const SRC = ['Clinical · 10k', 'Country-year', 'Open-Meteo', 'World Bank']
  const sy = (i: number) => 20 + i * 32 // source rows
  const R2 = 200, mid2 = R2 + H / 2 // modeling row
  const R3 = 300, mid3 = R3 + H / 2 // final model row
  const FY = R2 + 8, FW = 14 // fold strip
  return `<svg class="ml-fig hv" viewBox="0 0 1000 362" role="img" aria-label="Hantavirus mortality pipeline. Clinical records, country-year epidemiology, Open-Meteo climate and World Bank indicators are merged on country and year, cleaned of outcome-leaking columns and one-hot encoded, then split 80/20. The training set goes through three stages: a logistic-regression baseline without the added features; logistic regression, random forest, XGBoost and LightGBM; then a 5-fold cross-validated grid search, where each parameter set is fit on four folds and scored by average precision on the fifth, followed by sigmoid calibration and an F2/MCC threshold search. The final model is calibrated LightGBM at a 0.12 threshold, explained with SHAP and served in a demo. It is evaluated on the held-out test set with bootstrap confidence intervals, McNemar and Cochran's Q tests.">
  <defs><marker id="hv-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" class="head"/></marker></defs>
  ${SRC.map((s, i) => cyl(20, sy(i), 110, 24, s, 'src')).join('')}
  ${SRC.map((_, i) => arrow(`M130 ${sy(i) + 12} L178 78`)).join('')}
  ${cyl(180, 58, 100, 40, 'Merged', 'data')}
  <text class="t-muted" x="230" y="116" text-anchor="middle">country + year</text>
  ${arrow('M280 78 H318')}
  ${box(320, 56, 180, 'Clean', 'drop leakage · one-hot', 'step')}
  ${arrow('M500 78 L546 54')}${arrow('M500 78 L546 102')}
  ${cyl(548, 40, 100, 28, 'Test 20%', 'data')}
  ${cyl(548, 88, 100, 28, 'Train 80%', 'data')}
  ${arrow('M648 54 H708')}
  <text class="t-muted" x="678" y="46" text-anchor="middle">held out</text>
  ${box(710, 32, 270, 'Evaluate on test', "bootstrap CI · McNemar · Cochran's Q", 'out')}
  ${arrow(`M648 102 H668 V156 H70 V${R2 - 2}`)}
  <text class="t-axis" x="70" y="${R2 - 12}" text-anchor="middle">STAGE 1</text>
  <text class="t-axis" x="228" y="${R2 - 12}" text-anchor="middle">STAGE 2</text>
  ${box(20, R2, 100, 'Baseline LR', 'no added data', 'model')}
  ${arrow(`M120 ${mid2} H146`)}
  ${box(148, R2, 160, 'Initial models', 'LR · RF · XGB · LGBM', 'model')}
  ${arrow(`M308 ${mid2} H336`)}
  <rect class="stage" x="338" y="166" width="604" height="104" rx="4"/>
  <text class="t-axis" x="932" y="${R2 - 12}" text-anchor="end">STAGE 3</text>
  <rect class="grid" x="350" y="176" width="330" height="86" rx="3"/>
  <text class="t-axis" x="362" y="191">GRID SEARCH · 5-FOLD CV</text>
  ${[0, 1, 2, 3, 4].map((i) => `<rect class="${i === 4 ? 'fold val' : 'fold'}" x="${366 + i * (FW + 2)}" y="${FY}" width="${FW}" height="28"/>`).join('')}
  ${arrow(`M446 ${FY + 14} H474`)}
  ${box(476, R2, 90, 'Fit', '4 folds', 'model')}
  ${arrow(`M566 ${mid2} H586`)}
  ${box(588, R2, 82, 'Score AP', '1 fold', 'step')}
  ${arrow(`M629 ${R2 + H} V254 H406 V${FY + 30}`)}
  ${arrow(`M680 ${mid2} H704`)}
  ${box(706, R2, 100, 'Calibrate', 'sigmoid', 'step')}
  ${arrow(`M806 ${mid2} H830`)}
  ${box(832, R2, 100, 'Threshold', 'F2 / MCC', 'step')}
  ${arrow(`M882 ${R2 + H} V${R3 - 2}`)}
  ${box(832, R3, 100, 'LightGBM', 't = 0.12', 'final')}
  ${arrow(`M932 ${mid3} H972 V78`)}
  ${arrow(`M832 ${mid3} L796 ${R3 + 8}`)}${arrow(`M832 ${mid3} L796 ${R3 + 36}`)}
  ${doc(708, R3 - 4, 86, 24, 'SHAP')}
  ${doc(708, R3 + 24, 86, 24, 'Demo')}
</svg>
<div class="rv-key hv-key">${[['--after', 'raw data'], ['--hv-green', 'processed data'], ['--hv-purple', 'processing step'], ['--before', 'model'], ['--hv-teal', 'output']].map(([c, l]) => `<span><i style="--s:var(${c})"></i>${l}</span>`).join('')}</div>`
}

// Hotel Booking Analysis: data → EDA → two regressions, each with its significance test and headline result.
// Every number is from the hw3 R output (hotel_bookings.csv, 119,390 rows).
function hotelFigure() {
  const A = 34, B = 124 // row tops: cancellations, price
  const mA = A + H / 2, mB = B + H / 2, mid = (mA + mB) / 2
  return `<svg class="ml-fig hv" viewBox="0 0 1000 ${B + H + 16}" role="img" aria-label="Hotel booking analysis pipeline. 119,390 bookings go through exploratory analysis with rate tables and boxplots, then two regressions. Cancellations: a logistic regression of cancellation on deposit type and lead time, tested with a deviance test against the lead-time-only model; non-refundable deposits carry 287 times the odds of cancelling. Price: a linear model of average daily rate on market segment by hotel, tested with a partial F-test against the hotel-only model; corporate stays at resorts cost 26 euros a night less than at city hotels.">
  <defs><marker id="hv-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" class="head"/></marker></defs>
  ${cyl(20, mid - 22, 130, 44, 'Bookings · 119K', 'src')}
  ${arrow(`M150 ${mid} H178`)}
  ${box(180, mid - H / 2, 170, 'EDA', '', 'step')}
  ${arrow(`M350 ${mid} L388 ${mA}`)}${arrow(`M350 ${mid} L388 ${mB}`)}
  <text class="t-axis" x="390" y="${A - 12}">CANCELLATIONS</text>
  <text class="t-axis" x="390" y="${B - 12}">PRICE</text>
  ${box(390, A, 230, 'Logistic regression', 'cancel ~ deposit + lead time', 'model')}
  ${box(390, B, 230, 'Linear regression', 'ADR ~ segment × hotel', 'model')}
  ${arrow(`M620 ${mA} H658`)}${arrow(`M620 ${mB} H658`)}
  ${box(660, A, 150, 'Deviance test', 'vs lead time only', 'step')}
  ${box(660, B, 150, 'Partial F-test', 'vs hotel only', 'step')}
  ${arrow(`M810 ${mA} H848`)}${arrow(`M810 ${mB} H848`)}
  ${box(850, A, 130, '287× odds', 'non-refundable', 'out')}
  ${box(850, B, 130, '−€26 / night', 'resort, corporate', 'out')}
</svg>
<div class="rv-key hv-key">${[['--after', 'raw data'], ['--hv-purple', 'analysis step'], ['--before', 'model'], ['--hv-teal', 'result']].map(([c, l]) => `<span><i style="--s:var(${c})"></i>${l}</span>`).join('')}</div>`
}

// Power Outage Prediction: predict an outage's cause category from climate and region features.
// Facts from github.com/Sweekrit-B/powerOutageML (README): 1,534 outages, baseline tree 57.9%, tuned tree 64.8%, forest 69.4%, fairness p = 0.26.
function powerFigure() {
  const A = 34, B = 124, C = 180, D = 252 // rows: baseline, tuned tree, forest, fairness
  const mA = A + H / 2, mB = B + H / 2, mC = C + H / 2, mid = (mA + mB) / 2
  return `<svg class="ml-fig hv" viewBox="0 0 1000 ${D + H + 12}" role="img" aria-label="Power outage cause prediction pipeline. 1,534 major outages are imputed (categories sampled from their observed distribution, numbers with the median) and encoded. The baseline is an untuned decision tree on 11 climate and region features, at 57.9% accuracy. The final pipeline adds a season feature and a hurricane flag, then grid-searches a decision tree (max depth 8, min split 5, 64.8%) and a random forest (90 trees, max depth 36, 69.4%). A permutation test of the forest's accuracy for rural versus urban areas gives p = 0.26, so no unfairness is detected.">
  <defs><marker id="hv-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" class="head"/></marker></defs>
  ${cyl(20, mid - 22, 130, 44, '1,534 outages', 'src')}
  <text class="t-muted" x="85" y="${mid + 40}" text-anchor="middle">predict: cause category</text>
  ${arrow(`M150 ${mid} H178`)}
  ${box(180, mid - H / 2, 190, 'Impute + encode', 'sampled · median · one-hot', 'step')}
  ${arrow(`M370 ${mid} L418 ${mA}`)}${arrow(`M370 ${mid} L418 ${mB}`)}
  <text class="t-axis" x="420" y="${A - 12}">BASELINE</text>
  <text class="t-axis" x="420" y="${B - 12}">FINAL</text>
  ${box(420, A, 180, 'Decision tree', 'no tuning', 'model')}
  ${arrow(`M600 ${mA} H828`)}
  ${box(420, B, 180, 'Feature eng.', 'season · hurricane flag', 'step')}
  ${arrow(`M600 ${mB} H623`)}
  <rect class="grid" x="625" y="112" width="185" height="124" rx="3"/>
  <text class="t-axis" x="625" y="104">GRID SEARCH · CV</text>
  ${box(637, B, 161, 'Decision tree', 'depth 8 · split 5', 'model')}
  ${box(637, C, 161, 'Random forest', '90 trees · depth 36', 'final')}
  ${arrow(`M798 ${mB} H828`)}${arrow(`M798 ${mC} H828`)}
  ${box(830, A, 150, '57.9%', 'accuracy', 'out')}
  ${box(830, B, 150, '64.8%', 'accuracy', 'out')}
  ${box(830, C, 150, '69.4%', 'accuracy', 'out')}
  ${arrow(`M905 ${C + H} V${D - 2}`)}
  ${box(830, D, 150, 'Fairness test', 'rural/urban p = 0.26', 'step')}
</svg>
<div class="rv-key hv-key">${[['--after', 'raw data'], ['--hv-purple', 'processing step'], ['--before', 'model'], ['--hv-teal', 'result']].map(([c, l]) => `<span><i style="--s:var(${c})"></i>${l}</span>`).join('')}</div>`
}

// Aletheia: a Streamlit dashboard calling Letta agents and Gemini 2.5 Flash, with a JSON profile per user.
// Facts from github.com/siddharthsiva/aletheia (backend/letta_calls.py, insurance_probe.py, pill_identifier.py, health_dashboard.py).
function aletheiaFigure() {
  const top = (i: number) => 24 + i * 56, mid = (i: number) => top(i) + H / 2
  const IN = ['records PDF', 'medication', 'missed dose', 'pill photo', 'insurer name']
  return `<svg class="ml-fig hv" viewBox="0 0 1000 ${top(4) + H + 12}" role="img" aria-label="Aletheia architecture. A Streamlit dashboard sends five kinds of input to agents. An uploaded records PDF is read with pypdf and parsed by a Letta document-parser agent, which writes medical history, doctor notes and vitals to the user's JSON profile. A medication goes to a Letta medicine-explainer agent; a missed dose goes to a Letta conversational agent for advice. A pill photo is read by Gemini 2.5 Flash vision into drug details, then explained by a Letta pill-explainer agent. An insurer name goes to a Gemini 2.5 Flash insurance probe that returns a trust index from 0 to 10, alternatives and reviews.">
  <defs><marker id="hv-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" class="head"/></marker></defs>
  <rect class="src" x="20" y="${top(0)}" width="150" height="${top(4) + H - top(0)}" rx="3"/>
  <text class="t-box" x="95" y="${(top(0) + top(4) + H) / 2 - 2}" text-anchor="middle">Streamlit</text>
  <text class="t-muted" x="95" y="${(top(0) + top(4) + H) / 2 + 16}" text-anchor="middle">dashboard</text>
  ${IN.map((s, i) => `${arrow(`M170 ${mid(i)} H338`)}<text class="t-muted" x="254" y="${mid(i) - 7}" text-anchor="middle">${s}</text>`).join('')}
  ${box(340, top(0), 200, 'Document parser', 'pypdf text → history', 'model')}
  ${box(340, top(1), 200, 'Medicine explainer', 'plain-English effects', 'model')}
  ${box(340, top(2), 200, 'Conversation', 'missed-dose advice', 'model')}
  ${box(340, top(3), 200, 'Label reader', 'vision → drug details', 'step')}
  ${box(340, top(4), 200, 'Insurance probe', 'trust index 0–10', 'step')}
  ${arrow(`M540 ${mid(3)} H578`)}
  ${box(580, top(3), 200, 'Pill explainer', 'ingredients · effects', 'model')}
  ${arrow(`M540 ${mid(0)} H818`)}
  <text class="t-muted" x="680" y="${mid(0) - 7}" text-anchor="middle">writes</text>
  ${cyl(820, top(0), 160, 100, '', 'data')}
  <text class="t-box" x="900" y="${top(0) + 38}" text-anchor="middle">User profile</text>
  <text class="t-muted" x="900" y="${top(0) + 58}" text-anchor="middle">history · notes</text>
  <text class="t-muted" x="900" y="${top(0) + 76}" text-anchor="middle">vitals · meds</text>
</svg>
<div class="rv-key hv-key">${[['--after', 'Streamlit UI'], ['--before', 'Letta agent'], ['--hv-purple', 'Gemini 2.5 Flash'], ['--hv-green', 'JSON store']].map(([c, l]) => `<span><i style="--s:var(${c})"></i>${l}</span>`).join('')}</div>`
}

// TallyUp: React web app → Express API → MongoDB, with groups nested to any depth.
// Facts from github.com/zfischer42/TallyUp (backend/src/models, routes/routes.ts, web-app/package.json).
function tallyFigure() {
  const top = (i: number) => 40 + i * 76, CH = 60 // collection rows
  const chip = (x: number, y: number, w: number, label: string, h = 28) =>
    `<rect class="fld" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/><text class="t-muted" x="${x + 10}" y="${y + h / 2 + 4}">${label}</text>`
  const coll = (i: number, title: string, sub: string, body: string) =>
    `<rect class="data" x="552" y="${top(i)}" width="390" height="${CH}" rx="3"/>` +
    `<text class="t-box" x="566" y="${top(i) + 26}">${title}</text><text class="t-muted" x="566" y="${top(i) + 44}">${sub}</text>${body}`
  const cy = top(1) + CH / 2 // container middle
  const COL1: [string, string][] = [['Dashboard', 'groups · subgroups'], ['Balance sheet', 'paid · owed · balance'], ['Payment modal', 'request · split · settle']]
  const COL2: [string, string][] = [['/user', 'create · get'], ['/group', 'create · add subgroup'], ['/pair', 'add · split · update']]
  return `<svg class="ml-fig hv" viewBox="0 0 1000 ${top(2) + CH + 24}" role="img" aria-label="TallyUp architecture. A React and Vite web app with a dashboard, balance sheet and payment modal calls an Express API over REST with Axios. The API has user, group and pair routes, and reads and writes MongoDB through Mongoose. MongoDB holds three collections: users, whose groups array nests subgroups of the same schema to any depth; groups, with embedded members and references to their subgroups; and transactions, with amount, sender, receiver and whether the request is fulfilled. Users reference groups, and group members reference transactions.">
  <defs><marker id="hv-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" class="head"/></marker></defs>
  <text class="t-axis" x="20" y="18">WEB APP · REACT + VITE</text>
  <rect class="stage" x="20" y="26" width="194" height="${top(2) + CH + 14 - 26}" rx="4"/>
  ${COL1.map(([t, s], i) => box(32, top(i) + 8, 170, t, s, 'src')).join('')}
  ${arrow(`M214 ${cy} H278`)}
  <text class="t-muted" x="246" y="${cy - 8}" text-anchor="middle">Axios</text>
  <text class="t-axis" x="280" y="18">EXPRESS API</text>
  <rect class="stage" x="280" y="26" width="194" height="${top(2) + CH + 14 - 26}" rx="4"/>
  ${COL2.map(([t, s], i) => box(292, top(i) + 8, 170, t, s, 'step')).join('')}
  ${arrow(`M474 ${cy} H538`)}
  <text class="t-muted" x="506" y="${cy - 8}" text-anchor="middle">Mongoose</text>
  <text class="t-axis" x="540" y="18">MONGODB</text>
  <rect class="stage" x="540" y="26" width="440" height="${top(2) + CH + 14 - 26}" rx="4"/>
  ${coll(0, 'User', 'any depth', chip(680, top(0) + 8, 250, 'groups[ ]', 44) + chip(770, top(0) + 16, 150, 'subGroups[ ] ↻'))}
  ${coll(1, 'Group', 'paid · owed', chip(680, top(1) + 16, 104, 'members[ ]') + chip(794, top(1) + 16, 136, 'subGroups → ↻'))}
  ${coll(2, 'Transaction', 'payments', chip(680, top(2) + 16, 74, 'amount') + chip(762, top(2) + 16, 90, 'from → to') + chip(860, top(2) + 16, 76, 'fulfilled'))}
  <path class="ref" d="M942 ${top(0) + 30} H960 V${top(1) + 22} H944" marker-end="url(#hv-head)"/>
  <path class="ref" d="M942 ${top(1) + 40} H970 V${top(2) + 30} H944" marker-end="url(#hv-head)"/>
</svg>
<div class="rv-key hv-key">${[['--after', 'client'], ['--hv-purple', 'API route'], ['--hv-green', 'collection'], ['--text-muted', 'ObjectId reference']].map(([c, l]) => `<span><i style="--s:var(${c})"></i>${l}</span>`).join('')}</div>`
}

// ML Paper Recommender: query and abstracts share one text cleaner, then TF-IDF and cosine similarity rank the papers.
// Facts from github.com/Sweekrit-B/lumaa-spring-2025-ai-ml-sweekritb (paper_recc.py, streamlit_ui.py).
function paperFigure() {
  const A = 24, B = 104, mA = A + H / 2, mB = B + H / 2, mid = (mA + mB) / 2
  return `<svg class="ml-fig hv" viewBox="0 0 1000 ${B + H + 12}" role="img" aria-label="Paper recommender pipeline. A free-text query is spell-checked with autocorrect. The query and 500 arXiv abstracts go through the same normalizer: lowercase, URLs and punctuation removed, stopwords dropped, then lemmatized and stemmed. A TF-IDF vectorizer is fit on all 501 texts, cosine similarity scores the query against each abstract, and the top k papers (up to 50) are returned with a percent match.">
  <defs><marker id="hv-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" class="head"/></marker></defs>
  ${box(20, A, 150, 'Query', '', 'src')}
  ${arrow(`M170 ${mA} H198`)}
  ${box(200, A, 120, 'Spell-check', '', 'step')}
  ${cyl(20, B, 150, H, '500 arXiv abstracts', 'src')}
  ${arrow(`M320 ${mA} L348 ${mid - 8}`)}${arrow(`M170 ${mB} H300 L348 ${mid + 8}`)}
  ${box(350, mid - H / 2, 180, 'Normalize', 'stopwords · lemma · stem', 'step')}
  ${arrow(`M530 ${mid} H558`)}
  ${box(560, mid - H / 2, 120, 'TF-IDF', 'fit on 501 texts', 'model')}
  ${arrow(`M680 ${mid} H708`)}
  ${box(710, mid - H / 2, 120, 'Cosine sim.', 'query vs 500', 'model')}
  ${arrow(`M830 ${mid} H858`)}
  ${box(860, mid - H / 2, 120, 'Top k', 'k ≤ 50 · % match', 'out')}
</svg>
<div class="rv-key hv-key">${[['--after', 'input'], ['--hv-purple', 'text processing'], ['--before', 'vectorize + score'], ['--hv-teal', 'result']].map(([c, l]) => `<span><i style="--s:var(${c})"></i>${l}</span>`).join('')}</div>`
}

// Airline Satisfaction: clean and encode, split 80/20, then a grid-searched random forest and an early-stopped XGBoost.
// Facts from github.com/Sweekrit-B/Airline-Predictions (data_cleaning.py, preprocessing1.py, preprocessing2.py).
function airlineFigure() {
  const mid = 78
  return `<svg class="ml-fig hv" viewBox="0 0 1000 200" role="img" aria-label="Airline satisfaction pipeline. The train and test CSVs are combined, missing values filled, flight distance log-transformed and categories ordinal-encoded; exploratory plots compare each feature with satisfaction. The data is split 80/20. A random forest is tuned with GridSearchCV over 24 settings of tree count, depth and bootstrap, and XGBoost trains 500 trees at a 0.05 learning rate with early stopping on a 25% validation split. Both are evaluated on the held-out test set with accuracy, confusion matrices and feature importances, and the findings went into a stakeholder presentation.">
  <defs><marker id="hv-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" class="head"/></marker></defs>
  ${cyl(20, 40, 110, 28, 'train.csv', 'src')}
  ${cyl(20, 88, 110, 28, 'test.csv', 'src')}
  ${arrow(`M130 54 L168 ${mid - 6}`)}${arrow(`M130 102 L168 ${mid + 6}`)}
  ${box(170, mid - H / 2, 170, 'Clean + encode', 'log distance · ordinal', 'step')}
  ${arrow(`M255 ${mid + H / 2} V146`)}
  ${box(170, 148, 170, 'EDA', '', 'step')}
  ${arrow(`M340 ${mid} L378 54`)}${arrow(`M340 ${mid} L378 102`)}
  ${cyl(380, 40, 100, 28, 'Train 80%', 'data')}
  ${cyl(380, 88, 100, 28, 'Test 20%', 'data')}
  ${arrow('M480 54 L518 42')}${arrow('M480 54 L518 106')}
  ${box(520, 20, 190, 'Random forest', 'grid search · 24 sets', 'model')}
  ${box(520, 84, 190, 'XGBoost', '500 trees · early stop', 'model')}
  ${arrow(`M710 42 L748 ${mid - 8}`)}${arrow(`M710 106 L748 ${mid + 8}`)}
  ${box(750, mid - H / 2, 230, '96% accuracy', '', 'out')}
  ${arrow(`M480 102 H496 V160 H800 V${mid + H / 2 + 2}`)}
  <text class="t-muted" x="648" y="176" text-anchor="middle">held out</text>
  ${arrow(`M930 ${mid + H / 2} V148`)}
  ${doc(860, 150, 120, 30, 'Stakeholder deck')}
</svg>
<div class="rv-key hv-key">${[['--after', 'raw data'], ['--hv-green', 'processed data'], ['--hv-purple', 'processing step'], ['--before', 'model'], ['--hv-teal', 'output']].map(([c, l]) => `<span><i style="--s:var(${c})"></i>${l}</span>`).join('')}</div>`
}

// Shared look for the three-column app architectures (To Do List App, Calendar App).
const fld = (x: number, y: number, w: number, label: string, h = 28) =>
  `<rect class="fld" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/><text class="t-muted" x="${x + 10}" y="${y + h / 2 + 4}">${label}</text>`
export const key = (items: [string, string][]) =>
  `<div class="rv-key hv-key">${items.map(([c, l]) => `<span><i style="--s:var(${c})"></i>${l}</span>`).join('')}</div>`
export const HEAD = '<defs><marker id="hv-head" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" class="head"/></marker></defs>'

// To Do List App: React + Vite → Express → MongoDB Atlas.
// Facts from github.com/Sweekrit-B/to-do-app (backend/src/app.ts, routes, models; frontend/src).
function todoFigure() {
  const top = (i: number) => 40 + i * 76, CH = 60, cy = top(1) + CH / 2
  const T = top(0) + 38, U = top(1) + 38 // collection rows
  const coll = (y: number, title: string, sub: string, body: string) =>
    `<rect class="data" x="552" y="${y}" width="390" height="${CH}" rx="3"/>` +
    `<text class="t-box" x="566" y="${y + 26}">${title}</text><text class="t-muted" x="566" y="${y + 44}">${sub}</text>${body}`
  const COL1: [string, string][] = [['Home', 'TaskForm · TaskList'], ['Task detail', 'edit · assign'], ['api/ wrappers', 'typed fetch()']]
  const COL2: [string, string][] = [['/api/task', 'CRUD + validators'], ['/api/tasks', 'list all'], ['/api/user', 'get · create']]
  const H3 = top(2) + CH + 14 - 26
  return `<svg class="ml-fig hv" viewBox="0 0 1000 ${top(2) + CH + 24}" role="img" aria-label="To-do app architecture. A React and Vite frontend with a home page (task form and task list), a task detail page and typed fetch wrappers calls an Express API with JSON. The API has a task route for create, read, update and delete with request validators, a tasks route that lists all tasks, and a user route. It stores data in MongoDB Atlas through Mongoose: tasks with a title, a checked flag, a creation date and an assignee that references a user, and users with a name and profile picture URL.">
  ${HEAD}
  <text class="t-axis" x="20" y="18">FRONTEND · REACT + VITE</text>
  <rect class="stage" x="20" y="26" width="194" height="${H3}" rx="4"/>
  ${COL1.map(([t, s], i) => box(32, top(i) + 8, 170, t, s, 'src')).join('')}
  ${arrow(`M214 ${cy} H278`)}
  <text class="t-muted" x="246" y="${cy - 8}" text-anchor="middle">JSON</text>
  <text class="t-axis" x="280" y="18">EXPRESS API</text>
  <rect class="stage" x="280" y="26" width="194" height="${H3}" rx="4"/>
  ${COL2.map(([t, s], i) => box(292, top(i) + 8, 170, t, s, 'step')).join('')}
  ${arrow(`M474 ${cy} H538`)}
  <text class="t-muted" x="506" y="${cy - 8}" text-anchor="middle">Mongoose</text>
  <text class="t-axis" x="540" y="18">MONGODB ATLAS</text>
  <rect class="stage" x="540" y="26" width="440" height="${H3}" rx="4"/>
  ${coll(T, 'Task', 'dateCreated', fld(680, T + 16, 52, 'title') + fld(740, T + 16, 80, 'isChecked') + fld(828, T + 16, 94, 'assignee →'))}
  ${coll(U, 'User', 'profile', fld(680, U + 16, 52, 'name') + fld(740, U + 16, 130, 'profilePictureURL'))}
  <path class="ref" d="M942 ${T + 30} H962 V${U + 30} H944" marker-end="url(#hv-head)"/>
</svg>
${key([['--after', 'frontend'], ['--hv-purple', 'API route'], ['--hv-green', 'collection'], ['--text-muted', 'ObjectId reference']])}`
}

// Bioinformatics Algos: one small worked example per algorithm, computed here with the repo's parameters.
// Facts from github.com/Sweekrit-B/bioinfo-algos (needleman-wunsch, hidden-markov-model, burrows-wheeler).
function bioFigure() {
  // Needleman–Wunsch on ACGT vs AGT: match +1, mismatch −1, gap −1, traceback preferring the diagonal.
  const a = 'ACGT', b = 'AGT', C = 30, gx = 60, gy = 74
  const S = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? -j : j === 0 ? -i : 0)))
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    S[i][j] = Math.max(S[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 1 : -1), S[i - 1][j] - 1, S[i][j - 1] - 1)
  const path = new Set<string>(['0,0'])
  let top = '', bot = ''
  for (let i = a.length, j = b.length; i > 0 || j > 0;) {
    path.add(`${i},${j}`)
    if (i && j && S[i][j] === S[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 1 : -1)) { top = a[--i] + top; bot = b[--j] + bot }
    else if (i && S[i][j] === S[i - 1][j] - 1) { top = a[--i] + top; bot = '-' + bot }
    else { top = '-' + top; bot = b[--j] + bot }
  }
  const nw = S.map((row, i) => row.map((v, j) =>
    `<rect class="${path.has(`${i},${j}`) ? 'bio-path' : 'bio-cell'}" x="${gx + j * C}" y="${gy + i * C}" width="${C}" height="${C}"/>` +
    `<text class="t-muted" x="${gx + j * C + C / 2}" y="${gy + i * C + C / 2 + 4}" text-anchor="middle">${v}</text>`).join('')).join('') +
    [...b].map((ch, j) => `<text class="t-box" x="${gx + (j + 1.5) * C}" y="${gy - 8}" text-anchor="middle">${ch}</text>`).join('') +
    [...a].map((ch, i) => `<text class="t-box" x="${gx - 10}" y="${gy + (i + 1.5) * C + 4}" text-anchor="end">${ch}</text>`).join('')

  // HMM: two states, log-space Viterbi on the repo's test sequence. N = noncoding, C = coding.
  const seq = 'CGAAAAAAATCG', NUC = 'ACGT'
  const tr = [[0.8, 0.2], [0.4, 0.6]], em = [[0.2, 0.3, 0.3, 0.2], [0.4, 0.2, 0.2, 0.2]], L = Math.log
  let v = [L(tr[0][0]) + L(em[0][NUC.indexOf(seq[0])]), L(tr[0][1]) + L(em[1][NUC.indexOf(seq[0])])]
  const back: number[][] = []
  for (let t = 1; t < seq.length; t++) {
    const e = NUC.indexOf(seq[t]), nv = [0, 0], bp = [0, 0]
    for (let s = 0; s < 2; s++) {
      const from = [v[0] + L(tr[0][s]), v[1] + L(tr[1][s])]
      bp[s] = from[1] > from[0] ? 1 : 0
      nv[s] = from[bp[s]] + L(em[s][e])
    }
    back.push(bp); v = nv
  }
  const states = [v[1] > v[0] ? 1 : 0]
  for (let t = back.length - 1; t >= 0; t--) states.unshift(back[t][states[0]])
  const hx = 360, cw = 22
  const node = (x: number, s: number, label: string) =>
    `<circle class="${s ? 'bio-c' : 'bio-n'}" cx="${x}" cy="118" r="26"/><text class="t-box" x="${x}" y="122" text-anchor="middle">${label}</text>` +
    em[s].map((p, k) => `<rect class="${s ? 'bio-c' : 'bio-n'}" x="${x - 26 + k * 14}" y="${190 - p * 100}" width="10" height="${p * 100}"/><text class="t-muted" x="${x - 21 + k * 14}" y="204" text-anchor="middle">${NUC[k]}</text>`).join('')
  const hmm = node(hx + 70, 0, 'N') + node(hx + 230, 1, 'C') +
    `<path class="flow" d="M${hx + 96} 110 H${hx + 202}" marker-end="url(#hv-head)"/><text class="t-muted" x="${hx + 150}" y="102" text-anchor="middle">0.2</text>` +
    `<path class="flow" d="M${hx + 204} 128 H${hx + 98}" marker-end="url(#hv-head)"/><text class="t-muted" x="${hx + 150}" y="144" text-anchor="middle">0.4</text>` +
    `<path class="flow" d="M${hx + 56} 96 C${hx + 46} 66 ${hx + 94} 66 ${hx + 84} 96" marker-end="url(#hv-head)"/><text class="t-muted" x="${hx + 70}" y="66" text-anchor="middle">0.8</text>` +
    `<path class="flow" d="M${hx + 216} 96 C${hx + 206} 66 ${hx + 254} 66 ${hx + 244} 96" marker-end="url(#hv-head)"/><text class="t-muted" x="${hx + 230}" y="66" text-anchor="middle">0.6</text>` +
    [...seq].map((ch, t) => `<rect class="${states[t] ? 'bio-c' : 'bio-n'}" x="${hx + 18 + t * cw}" y="226" width="${cw - 2}" height="24"/><text class="t-box" x="${hx + 18 + t * cw + (cw - 2) / 2}" y="242" text-anchor="middle">${ch}</text>`).join('')

  // Burrows–Wheeler: sorted rotations of ACTACGG$, first and last columns, and the rows that start with the read.
  const text = 'ACTACGG$', read = 'TACG'
  const rots = [...text].map((_, i) => text.slice(i) + text.slice(0, i)).sort()
  const bx = 720, rw = 15, rh = 19, by = 70
  const bwt = rots.map((r, i) => [...r].map((ch, k) => {
    const cls = r.startsWith(read) && k < read.length ? 'bio-path' : k === 0 ? 'bio-f' : k === r.length - 1 ? 'bio-l' : 'bio-cell'
    return `<rect class="${cls}" x="${bx + k * (rw + 2)}" y="${by + i * rh}" width="${rw}" height="${rh - 2}"/><text class="t-muted" x="${bx + k * (rw + 2) + rw / 2}" y="${by + i * rh + 12}" text-anchor="middle">${ch}</text>`
  }).join('')).join('') +
    `<text class="t-muted" x="${bx + rw / 2}" y="${by - 8}" text-anchor="middle">F</text><text class="t-muted" x="${bx + 7 * (rw + 2) + rw / 2}" y="${by - 8}" text-anchor="middle">L</text>`
  const at = text.indexOf(read)

  return `<svg class="ml-fig hv" viewBox="0 0 1000 264" role="img" aria-label="Three bioinformatics algorithms, each on a small worked example. Needleman–Wunsch aligns ACGT with AGT using match +1, mismatch −1 and gap −1; the dynamic-programming grid's traceback gives ${top} over ${bot} with score ${S[a.length][b.length]}. A two-state hidden Markov model (noncoding N, coding C; stay probabilities 0.8 and 0.6) labels the sequence ${seq} with the Viterbi path ${states.map((s) => (s ? 'C' : 'N')).join('')}. The Burrows–Wheeler transform sorts the rotations of ACTACGG$, and the read ${read} is found at positions ${at} to ${at + read.length - 1}.">
  ${HEAD}
  <text class="t-axis" x="20" y="22">NEEDLEMAN–WUNSCH</text>
  ${nw}
  <line class="bio-split" x1="330" y1="10" x2="330" y2="254"/>
  <text class="t-axis" x="${hx}" y="22">HIDDEN MARKOV MODEL</text>
  ${hmm}
  <line class="bio-split" x1="690" y1="10" x2="690" y2="254"/>
  <text class="t-axis" x="${bx}" y="22">BURROWS–WHEELER</text>
  ${bwt}
</svg>
${key([['--before', 'traceback / match'], ['--after', 'noncoding (N)'], ['--hv-purple', 'coding (C)'], ['--hv-green', 'first column'], ['--hv-teal', 'last column (BWT)']])}`
}

// Calendar App: Kotlin activities read and write the device calendar through Android's CalendarContract provider.
// Facts from github.com/Sweekrit-B/Calendar-Test (MainActivity.kt, CalendarActivity.kt).
function calendarFigure() {
  const t = (i: number) => 34 + i * 64, mid = t(1) + H / 2
  return `<svg class="ml-fig hv" viewBox="0 0 1000 ${t(2) + H + 22}" role="img" aria-label="Calendar app architecture. Two Kotlin activities, an event form (name, date, time and guest email) and a calendar list built with RecyclerView adapters, go through Android's ContentResolver with calendar read and write permissions. The form inserts an event and an invited attendee; the list queries calendars and their events. These live in the CalendarContract provider's Calendars, Events and Attendees tables, which the device syncs with the Google account.">
  ${HEAD}
  <text class="t-axis" x="20" y="18">ANDROID APP · KOTLIN</text>
  <rect class="stage" x="20" y="26" width="230" height="${t(2) + H + 8 - 26}" rx="4"/>
  ${box(32, t(0) + 16, 206, 'Event form', 'name · date · time · email', 'src')}
  ${box(32, t(2) - 16, 206, 'Calendar list', '', 'src')}
  ${arrow(`M238 ${t(0) + 16 + H / 2} L298 ${mid - 8}`)}<text class="t-muted" x="282" y="${t(0) + 26}" text-anchor="middle">insert</text>
  ${arrow(`M238 ${t(2) - 16 + H / 2} L298 ${mid + 8}`)}<text class="t-muted" x="282" y="${t(2) + 46}" text-anchor="middle">query</text>
  ${box(300, mid - H / 2, 180, 'ContentResolver', '', 'step')}
  ${[0, 1, 2].map((i) => arrow(`M480 ${mid} L536 ${t(i) + H / 2}`)).join('')}
  <text class="t-axis" x="540" y="18">CALENDAR PROVIDER</text>
  <rect class="stage" x="528" y="26" width="244" height="${t(2) + H + 8 - 26}" rx="4"/>
  ${box(540, t(0), 220, 'Calendars', 'id · name · account', 'data')}
  ${box(540, t(1), 220, 'Events', 'title · start · end · tz', 'data')}
  ${box(540, t(2), 220, 'Attendees', 'email · invited', 'data')}
  <path class="ref" d="M772 ${mid - 6} H818" marker-end="url(#hv-head)"/><path class="ref" d="M820 ${mid + 6} H774" marker-end="url(#hv-head)"/>
  <text class="t-muted" x="796" y="${mid - 14}" text-anchor="middle">sync</text>
  ${cyl(822, mid - 30, 158, 60, 'Google account', 'src')}
</svg>
${key([['--after', 'app / account'], ['--hv-purple', 'Android API'], ['--hv-green', 'provider table'], ['--text-muted', 'system sync']])}`
}

// Urtecho Lab, MASLD classifier: outer 5-fold CV around 50-run feature selection and a Youden's J threshold.
// Redrawn from the lab's pipeline figure, with room between the stages.
function masldFigure() {
  const FX = 160, FY = 107, FH = 30 // fold strip
  const SRC = ['Clinical + labels', 'Taxa counts', 'Metabolic flux']
  const RF = { x: 636, y: 156 }, mid = RF.y + H / 2
  return `<svg class="ml-fig hv" viewBox="0 0 1000 412" role="img" aria-label="MASLD classifier pipeline. Clinical metadata with labels, gut taxa counts and metabolic fluxes are preprocessed and split into five folds. In each round of an outer cross-validation, one fold is held out. On the other four, feature selection runs 50 times: each run resamples the data with duplication and imputation, fits a random forest and keeps its top 20 features. Separately, a minimal random forest on a train/test split sweeps cutoffs to pick a decision threshold by Youden's J. A random forest on the selected top 20 features, using that threshold, is scored on the held-out fold by AUROC. After all five rounds, the final features train the final model on all the data.">
  ${HEAD}
  ${SRC.map((s, i) => cyl(20, 70 + i * 90, 120, 34, s, 'src') + arrow(`M140 ${87 + i * 90} L158 ${FY + 75}`)).join('')}
  <text class="t-axis" x="${FX}" y="${FY - 12}">5 FOLDS</text>
  ${[0, 1, 2, 3, 4].map((i) => `<rect class="${i === 4 ? 'fold val' : 'fold'}" x="${FX}" y="${FY + i * FH}" width="56" height="${FH - 3}"/><text class="t-muted" x="${FX + 28}" y="${FY + i * FH + 18}" text-anchor="middle">${i + 1}</text>`).join('')}
  <text class="t-axis" x="240" y="30">OUTER CV · EACH FOLD HELD OUT ONCE</text>
  <rect class="stage" x="240" y="40" width="578" height="330" rx="4"/>
  ${arrow(`M216 ${mid} H252`)}
  ${cyl(254, mid - 25, 78, 50, '4 folds', 'data')}
  ${arrow('M332 170 L350 122')}${arrow('M332 186 L350 286')}
  <rect class="grid" x="360" y="68" width="236" height="120" rx="3"/>
  <rect class="grid" x="352" y="60" width="236" height="120" rx="3" style="fill:var(--surface)"/>
  <text class="t-axis" x="366" y="82">FEATURE SELECTION × 50</text>
  ${cyl(364, 106, 70, 44, 'resample', 'data')}
  ${arrow('M434 128 H448')}${box(450, 106, 56, 'RF', '', 'model')}
  ${arrow('M506 128 H520')}${doc(522, 106, 56, 44, 'Top 20', 'step')}
  <rect class="grid" x="352" y="220" width="236" height="136" rx="3"/>
  <text class="t-axis" x="366" y="242">YOUDEN'S J THRESHOLD</text>
  ${cyl(364, 264, 70, 44, 'split', 'data')}
  ${arrow('M434 286 H448')}${box(450, 264, 56, 'RF', 'minimal', 'model')}
  ${arrow('M506 286 H520')}${doc(522, 264, 56, 44, 'Cutoff', 'step')}
  <path class="flow" d="M550 308 V334 H478 V310" marker-end="url(#hv-head)"/>
  <text class="t-muted" x="514" y="350" text-anchor="middle">sweep</text>
  ${arrow(`M596 122 H674 V${RF.y - 2}`)}
  <text class="t-muted" x="632" y="112" text-anchor="middle">top 20</text>
  ${arrow(`M588 286 H662 V${RF.y + H + 2}`)}
  <text class="t-muted" x="622" y="276" text-anchor="middle">threshold</text>
  ${box(RF.x, RF.y, 76, 'RF', 'top 20', 'model')}
  ${arrow(`M${RF.x + 76} ${mid} H728`)}
  ${box(730, RF.y, 74, 'Results', 'AUROC', 'out')}
  ${arrow(`M${FX + 28} ${FY + 5 * FH - 3} V386 H690 V${RF.y + H + 2}`)}
  <text class="t-muted" x="420" y="402" text-anchor="middle">held-out fold</text>
  ${arrow(`M818 ${mid} H844`)}
  ${doc(846, RF.y, 138, H, 'Final features', 'step')}
  ${arrow(`M915 ${RF.y + H} V${RF.y + H + 26}`)}
  ${box(846, RF.y + H + 28, 138, 'Final model', 'all data', 'final')}
</svg>
${key([['--after', 'raw data'], ['--hv-green', 'processed data'], ['--hv-purple', 'selection step'], ['--before', 'random forest'], ['--hv-teal', 'result']])}`
}

// Urtecho Lab, promoter language model: DNABERT-2 fine-tuned to predict promoter strength from DNA sequence.
// Facts from model.ipynb (StrengthPredictor: all-layer softmax mix, attention pooling, MLP head; test Spearman 0.823 vs 0.711 k-mer ridge).
function promoterFigure() {
  const mid = 96, L0 = 264, LW = 8, LG = 3
  return `<svg class="ml-fig hv" viewBox="0 0 1000 176" role="img" aria-label="Promoter strength model. 119,548 promoter sequences are split into DNABERT-2's byte-pair tokens and run through its 12 transformer layers (117M parameters). Instead of using only the last layer, a learned softmax weight mixes all 12. Attention pooling with a learned query vector turns the tokens into one vector, and an MLP head (768 to 384 to 1) predicts log expression. On the test set it reaches a Spearman correlation of 0.82, against 0.71 for a k-mer ridge baseline.">
  ${HEAD}
  ${cyl(20, mid - 28, 104, 56, '119K promoters', 'src')}
  ${arrow(`M124 ${mid} H146`)}
  ${box(148, mid - H / 2, 90, 'Tokenize', 'BPE', 'data')}
  ${arrow(`M238 ${mid} H${L0 - 2}`)}
  <text class="t-axis" x="${L0}" y="${mid - 62}">DNABERT-2</text>
  ${Array.from({ length: 12 }, (_, i) => `<rect class="model" x="${L0 + i * (LW + LG)}" y="${mid - 46}" width="${LW}" height="92" rx="2"/>`).join('')}
  <text class="t-muted" x="${L0 + 6 * (LW + LG) - 1}" y="${mid + 64}" text-anchor="middle">12 layers · 117M</text>
  ${arrow(`M${L0 + 12 * (LW + LG)} ${mid} H428`)}
  ${box(430, mid - H / 2, 110, 'Layer mix', 'learned weights', 'step')}
  ${arrow(`M540 ${mid} H564`)}
  ${box(566, mid - H / 2, 110, 'Attn pool', 'learned query', 'step')}
  ${arrow(`M676 ${mid} H700`)}
  ${box(702, mid - H / 2, 100, 'MLP head', '768→384→1', 'step')}
  ${arrow(`M802 ${mid} H826`)}
  ${box(828, mid - H / 2, 152, 'Strength', 'ρ 0.82 · ridge 0.71', 'out')}
</svg>
${key([['--after', 'sequences'], ['--hv-green', 'tokens'], ['--before', 'pretrained DNABERT-2'], ['--hv-purple', 'new trainable layers'], ['--hv-teal', 'prediction']])}`
}

// Rana Lab, neuron detection: CaImAn's CNN classifier scores each candidate's spatial footprint; tuned cutoffs keep the neurons.
// Patches are real crops of the lab's "Accepted Components" map (450×450). 10–15 neurons at 90% is from resume.json.
function caimanFigure() {
  const IMG = 'project-images/rana/accepted-components.png', cy = 150
  const crop = (x: number, y: number, s: number, px: number, py: number, r = 16) =>
    `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="${px - r} ${py - r} ${2 * r} ${2 * r}"><image href="${IMG}" width="450" height="450"/></svg><rect class="patch" x="${x}" y="${y}" width="${s}" height="${s}"/>`
  // A stack of feature maps drawn back to front, each offset up and right.
  const stack = (x: number, y: number, n: number, s: number) =>
    Array.from({ length: n }, (_, k) => `<rect class="model" x="${x + k * 6}" y="${y - k * 6}" width="${s}" height="${s}" rx="2"/>`).join('')
  const PATCHES: [number, number][] = [[287, 291], [243, 52], [129, 47], [330, 185]] // three accepted, one rejected
  const label = (x: number, t: string) => `<text class="t-muted" x="${x}" y="226" text-anchor="middle">${t}</text>`
  return `<svg class="ml-fig hv" viewBox="0 0 1000 290" role="img" aria-label="Neuron detection with CaImAn, run headless on a server with tuned hyperparameters. Each candidate component's spatial footprint is cut into a small patch and scored by CaImAn's CNN classifier: convolution and pooling layers, a dense layer and a softmax that gives the probability the patch is a neuron. Tuned cutoffs keep the neurons and reject the rest, giving the accepted-components map: 10 to 15 neurons per recording at 90% accuracy.">
  ${HEAD}
  <text class="t-axis" x="20" y="22">CANDIDATES</text>
  ${PATCHES.map(([px, py], i) => crop(20, 34 + i * 62, 56, px, py)).join('')}
  ${PATCHES.map((_, i) => arrow(`M76 ${62 + i * 62} L146 ${cy}`)).join('')}
  <text class="t-axis" x="150" y="22">CAIMAN CNN · HEADLESS SERVER RUN</text>
  ${crop(150, cy - 42, 84, 287, 291)}
  ${arrow(`M234 ${cy} H258`)}
  ${stack(262, cy - 30, 4, 72)}
  ${arrow(`M352 ${cy} H372`)}
  ${stack(376, cy - 22, 6, 58)}
  ${arrow(`M464 ${cy} H484`)}
  ${stack(488, cy - 12, 6, 40)}
  ${arrow(`M560 ${cy} H570`)}
  ${Array.from({ length: 8 }, (_, k) => `<circle class="model" cx="578" cy="${cy - 38 + k * 11}" r="4"/>`).join('')}
  ${arrow(`M586 ${cy} H634`)}
  <circle class="out" cx="646" cy="${cy - 14}" r="7"/><circle class="bio-cell" cx="646" cy="${cy + 14}" r="7"/>
  ${label(192, 'patch')}${label(316, 'conv')}${label(430, 'conv')}${label(530, 'pool')}${label(578, 'dense')}${label(652, 'p(neuron)')}
  ${arrow(`M656 ${cy} H684`)}
  ${box(686, cy - H / 2, 100, 'Cutoffs', 'tuned', 'step')}
  ${arrow(`M786 ${cy} H818`)}
  <text class="t-muted" x="802" y="${cy - 8}" text-anchor="middle">keep</text>
  ${arrow(`M736 ${cy + H / 2} V${cy + 60}`)}
  <text class="t-muted" x="736" y="${cy + 76}" text-anchor="middle">reject</text>
  <svg x="820" y="62" width="164" height="164" viewBox="0 0 450 450"><image href="${IMG}" width="450" height="450"/></svg>
  <rect class="patch" x="820" y="62" width="164" height="164"/>
  <text class="t-muted" x="902" y="248" text-anchor="middle">10–15 neurons · 90%</text>
</svg>
${key([['--after', 'footprint patch'], ['--before', 'CNN layers'], ['--hv-purple', 'tuned cutoff'], ['--hv-teal', 'neuron']])}`
}

// Rana Lab, telomere length in HIV− vs latent HIV+ T cells from nanopore reads.
// Facts from telomeres_dhenu (README-Rana.md, data_analysis.py, jlat_demultiplexing.py, sequence_detection.py, length_detection.py, minimap_query.py, telogator2.py).
function telomereFigure() {
  const A = 48, mA = A + H / 2 // ingest row
  const B = 214, mB = B + H / 2 // per-read row
  const LINES: [string, string][] = [['Jurkat · HIV−', 'hivneg'], ['J-Lat 10.6 · HIV+', 'hivpos'], ['J-Lat 8.4 · HIV+', 'hivpos']]
  return `<svg class="ml-fig hv" viewBox="0 0 1000 272" role="img" aria-label="Telomere length pipeline comparing HIV-negative Jurkat T cells with latently HIV-infected J-Lat 10.6 and 8.4 cells. Nanopore FASTQ files are combined, and NCRF finds reads with TTAGGG telomere repeats using nanopore scoring. Reads are demultiplexed into the three cell lines by 24-base barcodes in their first and last 300 bases; HG002 reads run through the same steps as a benchmark. For each cell line, reads with the telomere adapter at their ends are kept, TeloBP finds the telomere boundary to measure length, and minimap2 and Telogator2 assign each read to its chromosome arm, so telomere length can be compared between HIV-negative and HIV-positive cells arm by arm.">
  ${HEAD}
  ${cyl(20, A, 120, H, 'Nanopore reads', 'src')}
  ${arrow(`M140 ${mA} H162`)}
  ${box(164, A, 104, 'Combine', '', 'step')}
  ${arrow(`M268 ${mA} H290`)}
  ${box(292, A, 140, 'NCRF', 'TTAGGG repeats', 'step')}
  ${arrow(`M432 ${mA} H454`)}
  ${box(456, A, 150, 'Demultiplex', 'cell-line barcodes', 'step')}
  ${LINES.map(([t, cls], i) => {
    const y = 24 + i * 34
    return arrow(`M606 ${mA} L638 ${y + 14}`) + `<rect class="${cls}" x="640" y="${y}" width="200" height="28" rx="3"/><text class="t-muted" x="652" y="${y + 18}">${t}</text>`
  }).join('')}
  ${cyl(20, 124, 120, 40, 'HG002 control', 'src')}
  ${arrow(`M140 144 H362 V${A + H + 2}`)}
  <text class="t-muted" x="252" y="136" text-anchor="middle">benchmark</text>
  ${arrow(`M740 126 V172 H240 V${B - 2}`)}
  <text class="t-muted" x="490" y="164" text-anchor="middle">each cell line</text>
  ${box(160, B, 160, 'Adapter filter', 'TeloTag at read ends', 'step')}
  ${arrow(`M320 ${mB} H342`)}
  ${box(344, B, 150, 'Telomere length', 'TeloBP boundary', 'step')}
  ${arrow(`M494 ${mB} H516`)}
  ${box(518, B, 170, 'Chromosome arm', 'minimap2 · Telogator2', 'step')}
  ${arrow(`M688 ${mB} H710`)}
  ${box(712, B, 268, 'HIV− vs HIV+', 'telomere length per chromosome arm', 'out')}
</svg>
${key([['--after', 'reads'], ['--hv-purple', 'processing step'], ['--hv-green', 'HIV− (Jurkat)'], ['--hv-red', 'latent HIV+ (J-Lat)'], ['--hv-teal', 'comparison']])}`
}

// General Atomics, every model tested: point predictors tuned by grid-search CV, then quantile ensembles with prediction intervals.
// Facts from general-atomics-fusion (scandb_tglf_prediction_training.ipynb, tglf_uncertainty.ipynb, d3d_surrogate.ipynb).
export function gaModelsFigure() {
  const mid = 150
  // Small glyphs drawn inside each model card (x, y = the glyph box's top-left, 86 × 26).
  const net = (x: number, y: number, cols: number[]) => {
    const cx = cols.map((_, i) => x + 8 + (i * 70) / Math.max(1, cols.length - 1))
    const pts = cols.map((n, i) => Array.from({ length: n }, (_, k) => [cx[i], y + 13 + (k - (n - 1) / 2) * 6] as [number, number]))
    const e = pts.slice(1).map((c, i) => c.map(([x2, y2]) => pts[i].map(([x1, y1]) => `M${x1} ${y1}L${x2} ${y2}`).join('')).join('')).join('')
    return `<path class="glyph" d="${e}"/>${pts.flat().map(([px, py]) => `<circle class="glyph-dot" cx="${px}" cy="${py}" r="2"/>`).join('')}`
  }
  const tree = (x: number, y: number) => `<path class="glyph" d="M${x} ${y + 20}L${x + 9} ${y + 2}L${x + 18} ${y + 20}Z M${x + 9} ${y + 20}V${y + 26}"/>`
  const GLYPH: Record<string, (x: number, y: number) => string> = {
    ridge: (x, y) => [[6, 20], [20, 17], [33, 14], [47, 12], [60, 7], [74, 5]].map(([dx, dy]) => `<circle class="glyph-dot" cx="${x + dx}" cy="${y + dy + (dx % 3) - 1}" r="2"/>`).join('') + `<path class="glyph" d="M${x + 2} ${y + 22}L${x + 80} ${y + 3}"/>`,
    rf: (x, y) => tree(x + 6, y) + tree(x + 34, y) + tree(x + 62, y),
    xgb: (x, y) => tree(x + 2, y) + `<text class="t-muted" x="${x + 28}" y="${y + 17}">+</text>` + tree(x + 36, y) + `<text class="t-muted" x="${x + 62}" y="${y + 17}">+</text>` + tree(x + 70, y),
    mlp: (x, y) => net(x, y, [3, 4, 4, 1]),
    tglfnn: (x, y) => net(x, y, [3, 4, 4, 2, 3]),
    minimal: (x, y) => net(x, y, [3, 4, 3]),
    linear: (x, y) => net(x, y, [3, 3]),
  }
  const card = (x: number, y: number, w: number, title: string, sub: string, glyph: string, cls = 'model') =>
    `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="80" rx="3"/>` +
    `<text class="t-box" x="${x + w / 2}" y="${y + 18}" text-anchor="middle">${title}</text>` +
    GLYPH[glyph](x + w / 2 - 43, y + (sub ? 26 : 36)) +
    `<text class="t-muted" x="${x + w / 2}" y="${y + 70}" text-anchor="middle">${sub}</text>`
  const POINT: [string, string, string][] = [['Ridge', 'baseline', 'ridge'], ['Random forest', '', 'rf'], ['XGBoost', '', 'xgb'], ['MLP', '', 'mlp']]
  const QUANT: [string, string, string, string][] = [['TGLFNN', '64 · 64 · 8', 'tglfnn', 'final'], ['Minimal', '60 ReLU', 'minimal', 'model'], ['Linear', 'no hidden layer', 'linear', 'model']]
  return `<svg class="ml-fig hv" viewBox="0 0 1000 300" role="img" aria-label="Every TGLF surrogate model tested. TGLF runs are split by case and scaled. Point predictors, tuned with cross-validated grid search: a ridge baseline, a scikit-learn random forest, XGBoost and a PyTorch MLP. Quantile ensembles of five seeds each, which predict the 5th, 50th and 95th percentile of every flux: TGLFNN with hidden layers of 64, 64 and 8 units, a minimal network with one 60-unit layer, and a linear model with no hidden layer. All are compared by R², nRMSE and interval coverage, and the TGLFNN ensemble is the surrogate carried forward, giving a median with a 90% interval.">
  ${HEAD}
  ${cyl(20, mid - 28, 112, 56, 'TGLF runs', 'src')}
  ${arrow(`M132 ${mid} H150`)}
  ${box(152, mid - H / 2, 124, 'Preprocess', 'split by case', 'step')}
  ${arrow(`M276 ${mid} L304 88`)}${arrow(`M276 ${mid} L304 212`)}
  <text class="t-axis" x="306" y="24">POINT MODELS · GRID-SEARCH CV</text>
  <rect class="stage" x="306" y="32" width="484" height="112" rx="4"/>
  ${POINT.map(([t, s, g], i) => card(318 + i * 116, 48, 108, t, s, g)).join('')}
  <text class="t-axis" x="306" y="168">QUANTILE ENSEMBLES · 5 SEEDS · 90% INTERVALS</text>
  <rect class="stage" x="306" y="176" width="484" height="112" rx="4"/>
  ${QUANT.map(([t, s, g, cls], i) => card(318 + i * 156, 192, 148, t, s, g, cls)).join('')}
  ${arrow('M790 88 L812 140')}${arrow('M790 212 L812 160')}
  ${box(814, mid - H / 2, 166, 'Compare', 'R² · nRMSE · coverage', 'step')}
  ${arrow(`M897 ${mid + H / 2} V${mid + 50}`)}
  ${box(814, mid + 52, 166, 'TGLFNN ensemble', 'median ± 90%', 'out')}
</svg>
${key([['--after', 'TGLF data'], ['--hv-purple', 'processing'], ['--before', 'model tested'], ['--hv-teal', 'chosen surrogate']])}`
}

// General Atomics, DIII-D database: the surrogate failed on a held-out profile; out-of-range inputs were the cause; a wider 8,000-run database fixed it.
// Facts from d3d_surrogate.ipynb (sections 7–9); per-flux R² from resume.json.
function gaDiiidFigure() {
  const A = 40, mA = A + H / 2, B = 152, mB = B + H / 2
  return `<svg class="ml-fig hv" viewBox="0 0 1000 214" role="img" aria-label="DIII-D database. Quantile ensembles trained on 7,384 TGLF runs from two team databases were tested on a held-out 13-radius DIII-D profile and failed, with R² between −1.75 and −0.99. The cause was out-of-range inputs: the electron density gradient RLNS_e lay outside the training range at 9 of the 13 radii. A new 8,000-run database was generated on an HPC cluster with wider ranges and the safety factor and magnetic shear varied too; retrained on it, the models reached R² of 0.58 to 0.69 on the same held-out profile.">
  ${HEAD}
  <text class="t-axis" x="20" y="${A - 12}">BEFORE</text>
  ${cyl(20, A, 150, H, '7,384 team runs', 'src')}
  ${arrow(`M170 ${mA} H192`)}
  ${box(194, A, 140, 'Ensemble', 'quantile networks', 'model')}
  ${arrow(`M334 ${mA} H356`)}
  ${box(358, A, 140, 'Held-out profile', '13 radii', 'step')}
  ${arrow(`M498 ${mA} H520`)}
  ${box(522, A, 160, 'R² −1.75 to −0.99', 'all three fluxes', 'bad')}
  ${arrow(`M682 ${mA} H704`)}
  ${box(706, A, 274, 'Out-of-range inputs', 'RLNS_e outside at 9 of 13 radii', 'step')}
  <text class="t-axis" x="20" y="${B - 12}">AFTER</text>
  ${arrow(`M843 ${A + H} V${B - 24} H95 V${B - 2}`)}
  <text class="t-muted" x="470" y="${B - 30}" text-anchor="middle">new database</text>
  ${box(20, B, 150, '8,000 runs', 'HPC · wider ranges', 'data')}
  ${arrow(`M170 ${mB} H192`)}
  ${box(194, B, 140, 'Retrain', '+ q and shear', 'model')}
  ${arrow(`M334 ${mB} H356`)}
  ${box(358, B, 140, 'Held-out profile', 'same 13 radii', 'step')}
  ${arrow(`M498 ${mB} H520`)}
  ${box(522, B, 160, 'R² 0.58 to 0.69', 'all three fluxes', 'out')}
</svg>
${key([['--after', 'team data'], ['--hv-green', 'new database'], ['--before', 'surrogate'], ['--hv-purple', 'check'], ['--hv-red', 'failure'], ['--hv-teal', 'after the fix']])}`
}

// CSE 151B, LLM fine-tuning efficiency: the supplied loop vs the final loop, same 20-minute T4 budget.
// Facts from the team write-up (CSE151B_GROUP_WRITEUP_JAMS.pdf) and algorithm.py.
function llmftFigure() {
  const A = 40, B = 136, C = B + H + 44 // rows: baseline, final, LR schedule
  const mA = A + H / 2, mB = B + H / 2, mid = (mA + mB) / 2
  return `<svg class="ml-fig hv" viewBox="0 0 1000 ${C + H + 16}" role="img" aria-label="Fine-tuning TinyStories-33M for 20 minutes on a Colab T4, baseline against the final method. Both start from the same 50,000 training stories. The supplied baseline tokenizes each batch inside the training loop and trains in FP32 at a constant learning rate of 1e-5; it sees 5.5 million real tokens and reaches validation perplexity 3.145, hard-token loss 3.52. The final method pre-tokenizes once, sorts stories by length and pads each batch only to its longest story, trains with FP16 autocast, and uses a learning rate that warms up and then follows a cosine decay over the time budget. It sees 16.0 million real tokens, 2.9 times as many, and reaches perplexity 3.061, hard-token loss 3.46. Perplexity is measured on 1,000 validation stories; hard-token loss on the 6,852 positions the base model found hardest.">
  ${HEAD}
  ${cyl(20, mid - 22, 130, 44, '50,000 stories', 'src')}
  ${arrow(`M150 ${mid} L198 ${mA}`)}${arrow(`M150 ${mid} L198 ${mB}`)}
  <text class="t-axis" x="200" y="${A - 12}">BASELINE</text>
  <text class="t-axis" x="200" y="${B - 12}">FINAL</text>
  ${box(200, A, 170, 'Tokenize per batch', 'inside the loop', 'step')}
  ${box(200, B, 170, 'Pre-tokenize', 'sorted · pad to longest', 'step')}
  <text class="t-axis" x="388" y="20">TRAINING · 20 MIN ON A T4</text>
  <rect class="stage" x="388" y="28" width="214" height="${C + H + 10 - 28}" rx="4"/>
  ${arrow(`M370 ${mA} H398`)}${arrow(`M370 ${mB} H398`)}
  ${box(400, A, 190, 'TinyStories-33M', 'FP32 · flat LR 1e-5', 'model')}
  ${box(400, B, 190, 'TinyStories-33M', 'FP16 autocast', 'final')}
  ${box(400, C, 190, 'LR schedule', 'warmup → cosine decay', 'step')}
  ${arrow(`M495 ${C} V${B + H + 2}`)}
  ${arrow(`M590 ${mA} H748`)}${arrow(`M590 ${mB} H748`)}
  <text class="t-muted" x="669" y="${mA - 8}" text-anchor="middle">5.5M tokens</text>
  <text class="t-muted" x="669" y="${mB - 8}" text-anchor="middle">16.0M tokens · 2.9×</text>
  ${box(750, A, 230, 'Perplexity 3.145', 'hard-token loss 3.52', 'out')}
  ${box(750, B, 230, 'Perplexity 3.061', 'hard-token loss 3.46', 'out')}
  <text class="t-muted" x="865" y="${C + 18}" text-anchor="middle">perplexity: 1,000 validation stories</text>
  <text class="t-muted" x="865" y="${C + 36}" text-anchor="middle">hard: 6,852 hardest tokens</text>
</svg>
${key([['--after', 'training data'], ['--hv-purple', 'processing'], ['--before', 'model'], ['--hv-teal', 'result']])}`
}

const DIAGRAMS: Record<string, () => string> = { hanta: hantaFigure, hotel: hotelFigure, power: powerFigure, aletheia: aletheiaFigure, tally: tallyFigure, paper: paperFigure, airline: airlineFigure, todo: todoFigure, bio: bioFigure, calendar: calendarFigure, masld: masldFigure, promoter: promoterFigure, caiman: caimanFigure, telomere: telomereFigure, gaModels: gaModelsFigure, gaDiiid: gaDiiidFigure, llmft: llmftFigure }

window.mountDiagram = (el) => {
  el.innerHTML = DIAGRAMS[el.dataset.diagram ?? '']?.() ?? ''
  const svg = el.querySelector('svg')
  if (!svg) return
  // Labels are in viewBox units; --k scales them back to the page's type sizes.
  new ResizeObserver(([e]) => {
    if (e.contentRect.width) svg.style.setProperty('--k', String(svg.viewBox.baseVal.width / e.contentRect.width))
  }).observe(svg)
}
