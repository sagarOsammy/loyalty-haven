# Alliance expansion, 15 September 2026

Sammy approved extending the existing aircraft style to SkyTeam and oneworld in session `01a0a578-f3b5-7f22-b7fd-7013c41801d1`.

The five derivatives reuse the approved smooth cabin, cockpit glazing, swept airfoils, recessed engine fans and landing gear. Each has its own paint materials and projected airline text. Simple tail initials are authored identifiers. These are generic airliner approximations with artist-selected colors, not exact aircraft types or current replica liveries.

`prepare_alliances.py` reads the builder portion of the preserved realism script without changing or rerunning its export steps. Outputs go to `LOYALTY_ALLIANCE_OUT`, defaulting to a temporary folder. `alliance-aircraft.blend` retains editable components. Runtime files are batched by material. Individual preview images reimport the serialized GLBs before rendering. Source and output hashes are in `provenance.json`.

Color context was checked against [Finnair's historical blue identity](https://company.finnair.com/en/437730-437730), [Vietnam Airlines corporate identity](https://www.vietnamairlines.com/~/media/FilesDownload/AboutUs/Corporate-Identity/GSM_W.ashx), and [Qatar Airways livery announcement](https://www.qatarairways.com/en-na/press-releases/2006/Mar/aboutus_news_08march06.html). These references establish broad identity context only. No external logos or images are embedded in the new models.

The original generators, all previous GLBs, saved balances and resort composition remain preserved.
