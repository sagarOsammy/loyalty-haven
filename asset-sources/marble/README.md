# Resort marble paving, 11 October 2026

Original deterministic texture output guided by Sammy's supplied resort reference. No third-party maps are incorporated. `build_marble.py` uses Python, Pillow and NumPy to generate three 2048px JPEG maps and a provenance record with output hashes.

The current warm atlas contains 64 beige/taupe slabs, each 1.5 metres square at runtime. Cloudy mineral deposits, irregular veins, shallow joints and honed roughness variation provide the marble finish. Color uses sRGB, normal and roughness maps use linear interpretation. The 12-metre atlas repeat is shared across the plaza, avenue, forecourt and taupe inlays.

The first pale marble maps and `provenance.json` are retained. Following Sammy's feedback, the generator now writes separate `marble-resort-warm-*.jpg` derivatives and `provenance-warm.json`. The material also uses a warm ivory tint, lower clearcoat and higher roughness to reduce whitening from environment highlights.

Original concrete maps remain byte-identical in `public/assets/`. This stage changes only the paving. It adds no furnishings or lights and is awaiting local visual acceptance before the fountain stage or publication.
