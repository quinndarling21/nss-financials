// Vouchers on file at the start of the business day. Due date is invoice date plus vendor terms.
// Line poLine is the PO line number; contract lines carry poLine null.
export const VOUCHERS = [
  {
    no: '0004802', vendor: '10117', invoice: '87964', invDate: '2026-08-26', amount: 5987.20, tax: 0,
    po: '118702', vouchered: '2026-08-28', enteredBy: 'MBELL', status: 'Paid', holdReason: '',
    paidDate: '2026-09-10', paidRun: '0910-A',
    lines: [{ poLine: 1, item: 'FUEL-BUR', desc: 'Fleet fuel, Burbank lot', qty: 5987.20, price: 1.00 }],
  },
  {
    no: '0004804', vendor: '10233', invoice: 'PLH-0926', invDate: '2026-09-01', amount: 28500.00, tax: 0,
    po: 'CTR-2207', vouchered: '2026-09-02', enteredBy: 'MBELL', status: 'Paid', holdReason: '',
    paidDate: '2026-09-10', paidRun: '0910-A',
    lines: [{ poLine: null, item: 'CTR-2207', desc: 'Atlanta Lot B lease', qty: 1, price: 28500.00 }],
  },
  {
    no: '0004806', vendor: '10408', invoice: 'SLW-3261', invDate: '2026-09-09', amount: 874.00, tax: 0,
    po: '118698', vouchered: '2026-09-11', enteredBy: 'NCASTILLO', status: 'Open', holdReason: '',
    lines: [
      { poLine: 1, item: 'SLW-TWL', desc: 'Stage towel service, weekly', qty: 4, price: 64.80 },
      { poLine: 2, item: 'SLW-WRD', desc: 'Wardrobe cleaning, per rack', qty: 10, price: 39.80 },
      { poLine: 3, item: 'SLW-DRP', desc: 'Muslin drape laundering', qty: 4, price: 54.20 },
    ],
  },
  {
    no: '0004807', vendor: '10356', invoice: 'VG-54907', invDate: '2026-09-10', amount: 1843.38, tax: 171.38,
    po: '118690', vouchered: '2026-09-14', enteredBy: 'NCASTILLO', status: 'Open', holdReason: '',
    lines: [
      { poLine: 3, item: 'VGS-FLG4', desc: 'Floppy flag 4x4 black', qty: 6, price: 86.00 },
      { poLine: 4, item: 'VGS-APB', desc: 'Apple box set, full', qty: 8, price: 32.50 },
      { poLine: 5, item: 'VGS-DUV', desc: 'Duvetyne 12x20 black', qty: 4, price: 224.00 },
    ],
  },
  {
    no: '0004809', vendor: '10291', invoice: 'CSR-7688', invDate: '2026-09-12', amount: 4275.00, tax: 0,
    po: '118695', vouchered: '2026-09-15', enteredBy: 'ERUIZ', status: 'Open', holdReason: '',
    lines: [
      { poLine: 1, item: 'CSR-RIG', desc: 'Truss rigging labor, Stage 4', qty: 45, price: 62.00 },
      { poLine: 3, item: 'CSR-SPN', desc: 'Spanset and shackle kit rental', qty: 6, price: 247.50 },
    ],
  },
  {
    no: '0004810', vendor: '10377', invoice: 'RGG-10902', invDate: '2026-09-14', amount: 3960.00, tax: 0,
    po: '118711', vouchered: '2026-09-17', enteredBy: 'MBELL', status: 'Open', holdReason: '',
    lines: [
      { poLine: 1, item: 'RGG-G70', desc: '70 kW tow generator, unit-week', qty: 4, price: 595.00 },
      { poLine: 2, item: 'RGG-CBL', desc: 'Feeder cable set, unit-week', qty: 4, price: 140.00 },
      { poLine: 3, item: 'RGG-DLV', desc: 'Delivery and pickup', qty: 1, price: 1020.00 },
    ],
  },
  {
    no: '0004811', vendor: '10144', invoice: 'TP-2026-0912', invDate: '2026-09-22', amount: 2148.36, tax: 0,
    po: '118500', vouchered: '2026-09-24', enteredBy: 'MBELL', status: 'Open', holdReason: '',
    lines: [{ poLine: 2, item: 'UTL-TMP', desc: 'Temporary power drops, stages', qty: 2148.36, price: 1.00 }],
  },
  {
    no: '0004812', vendor: '10117', invoice: '88213', invDate: '2026-09-26', amount: 6412.50, tax: 0,
    po: '118702', vouchered: '2026-09-30', enteredBy: 'MBELL', status: 'Open', holdReason: '',
    lines: [{ poLine: 1, item: 'FUEL-BUR', desc: 'Fleet fuel, Burbank lot', qty: 6412.50, price: 1.00 }],
  },
  {
    no: '0004815', vendor: '10356', invoice: 'VG-55120', invDate: '2026-09-24', amount: 3184.00, tax: 296.00,
    po: '118690', vouchered: '2026-09-29', enteredBy: 'NCASTILLO', status: 'Open', holdReason: '',
    lines: [
      { poLine: 1, item: 'VGS-C40', desc: '40 in. C-stand w/ grip arm', qty: 16, price: 118.00 },
      { poLine: 2, item: 'VGS-SB25', desc: 'Sandbag 25 lb', qty: 40, price: 25.00 },
    ],
  },
  {
    no: '0004817', vendor: '10291', invoice: 'CSR-7741', invDate: '2026-09-25', amount: 9620.00, tax: 0,
    po: '118695', vouchered: '2026-09-29', enteredBy: 'NCASTILLO', status: 'Open', holdReason: '',
    lines: [
      { poLine: 1, item: 'CSR-RIG', desc: 'Truss rigging labor, Stage 4', qty: 120, price: 62.00 },
      { poLine: 2, item: 'CSR-MTR', desc: '1-ton chain motor rental', qty: 8, price: 272.50 },
    ],
  },
  {
    no: '0004819', vendor: '10408', invoice: 'SLW-3302', invDate: '2026-09-27', amount: 1275.40, tax: 0,
    po: '118698', vouchered: '2026-09-30', enteredBy: 'NCASTILLO', status: 'Open', holdReason: '',
    lines: [
      { poLine: 1, item: 'SLW-TWL', desc: 'Stage towel service, weekly', qty: 4, price: 64.80 },
      { poLine: 2, item: 'SLW-WRD', desc: 'Wardrobe cleaning, per rack', qty: 16, price: 39.80 },
      { poLine: 3, item: 'SLW-DRP', desc: 'Muslin drape laundering', qty: 7, price: 54.20 },
    ],
  },
  {
    no: '0004822', vendor: '10144', invoice: 'Q3-2026-0417', invDate: '2026-09-30', amount: 14880.22, tax: 0,
    po: '118500', vouchered: '2026-10-01', enteredBy: 'MBELL', status: 'Open', holdReason: '',
    lines: [{ poLine: 1, item: 'UTL-ELEC', desc: 'Electric service, Burbank stages', qty: 14880.22, price: 1.00 }],
  },
  {
    no: '0004826', vendor: '10377', invoice: 'RGG-10933', invDate: '2026-09-29', amount: 4410.00, tax: 0,
    po: '118711', vouchered: '2026-10-02', enteredBy: 'NCASTILLO', status: 'Open', holdReason: '',
    lines: [
      { poLine: 1, item: 'RGG-G70', desc: '70 kW tow generator, unit-week', qty: 6, price: 595.00 },
      { poLine: 2, item: 'RGG-CBL', desc: 'Feeder cable set, unit-week', qty: 6, price: 140.00 },
    ],
  },
  {
    no: '0004831', vendor: '10356', invoice: 'VG-55188', invDate: '2026-10-01', amount: 2265.75, tax: 210.65,
    po: '118719', vouchered: '2026-10-05', enteredBy: 'NCASTILLO', status: 'Open', holdReason: '',
    lines: [
      { poLine: 1, item: 'VGS-GT2B', desc: 'Gaffer tape 2 in. black', qty: 48, price: 21.45 },
      { poLine: 2, item: 'VGS-SC8', desc: 'Sash cord #8, 100 ft', qty: 10, price: 41.80 },
      { poLine: 3, item: 'VGS-MAF', desc: 'Mafer clamp w/ stud', qty: 15, price: 40.50 },
    ],
  },
  {
    no: '0004834', vendor: '10291', invoice: 'CSR-7802', invDate: '2026-10-01', amount: 5316.00, tax: 0,
    po: '118728', vouchered: '2026-10-05', enteredBy: 'NCASTILLO', status: 'Held', holdReason: 'PRICE VAR BUYER',
    lines: [
      { poLine: 1, item: 'CSR-TRS', desc: '12 in. box truss 10 ft, rental', qty: 12, price: 405.00 },
      { poLine: 2, item: 'CSR-BAS', desc: 'Truss base plate, rental', qty: 4, price: 114.00 },
    ],
  },
  {
    no: '0004838', vendor: '10408', invoice: 'SLW-3349', invDate: '2026-10-02', amount: 979.00, tax: 0,
    po: '118698', vouchered: '2026-10-06', enteredBy: 'ERUIZ', status: 'Open', holdReason: '',
    lines: [
      { poLine: 1, item: 'SLW-TWL', desc: 'Stage towel service, weekly', qty: 4, price: 64.80 },
      { poLine: 2, item: 'SLW-WRD', desc: 'Wardrobe cleaning, per rack', qty: 14, price: 39.80 },
      { poLine: 3, item: 'SLW-DRP', desc: 'Muslin drape laundering', qty: 3, price: 54.20 },
    ],
  },
];
