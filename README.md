# NSS Financials - Accounts Payable

NSS Financials is the finance system of Northstar Studio Services (soundstages, lighting and
grip rental, production vehicles in Burbank, Atlanta and Albuquerque). This repository is the
browser rendition of the Accounts Payable 5250 session used by the AP desk: vendor and PO
inquiry, receiving inquiry, voucher entry with duplicate check and three-way match, open
voucher maintenance, the daily ACH payment proposal and vendor bank detail review.

It is a plain static site with no build step. GitHub Pages serves it from the root of `main`:
https://quinndarling21.github.io/nss-financials/

Sign-on profiles: APDESK (AP Desk), MBELL, NCASTILLO, ERUIZ.

## Screens

| Screen ID | Screen |
|-----------|--------|
| (none)    | Sign On (NSSPROD, QINTER) |
| APMENU    | Accounts Payable menu |
| APV010    | Vendor inquiry, by vendor number or part of the name |
| APP020    | Purchase order inquiry (PO number or contract number such as CTR-2207) |
| APR030    | Receiving inquiry by PO |
| APV040    | Voucher entry: duplicate check, PO/receipt match, post |
| APV050    | Open vouchers: 2=Change hold, 5=Display, filter by vendor |
| APP060    | Payment proposal for the day's ACH run (MMDD-A) and release |
| APV070    | Vendor bank detail review (read only) |

## Function keys

| Key | Action |
|-----|--------|
| Enter | Submit the screen |
| F3 | Exit to the AP menu; on the menu, sign off |
| F5 | Refresh |
| F10 | Post (APV040) or release (APP060) |
| F12 or Esc | Cancel: back one screen or close a window |
| Tab / Shift+Tab | Next / previous input field |
| Page Down / Page Up | Page through lists |

Every entry in the function key line at the bottom of the screen can also be clicked, as can
menu lines, `More...`, voucher numbers in the open voucher list and the Y/N choices on the
release prompt.

## Layout

- `index.html`, `css/terminal.css`: the 80 x 24 session window.
- `js/`: display handling, working storage, AP rules (`ledger.js`) and one module per screen
  under `js/screens/`.
- `data/`: the baseline ledger: vendor master, purchase orders, receipts, contracts, vouchers
  on file, payment runs and user profiles.
- `epoch.json`: baseline epoch number (see Operations).

## Operations

Working data (posted vouchers, PO quantities invoiced, pay holds, payment run status and the
signed-on session) is kept in the browser's local storage under `nssfin.state.v1`.

It is reloaded from the baseline in `data/` at the start of each business day
(America/Los_Angeles) or when the number in `epoch.json` changes. The check runs whenever the
page is loaded and whenever the Sign On screen is submitted; a reload returns the session to
Sign On. To reload every workstation from the baseline during the day, increase the number in
`epoch.json` and push to `main`. If `epoch.json` cannot be read, the session keeps its current
working data.

Bank details are never changed from this session. Bank changes go through Vendor Master
maintenance (VMS) with dual approval.
